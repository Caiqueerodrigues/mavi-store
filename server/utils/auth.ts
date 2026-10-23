import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { H3Event } from "h3";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
};
export type Role = "admin" | "manager" | "operator" | "viewer";
type Permission =
  | "dashboard:read"
  | "costs:manage"
  | "orders:read"
  | "orders:write"
  | "orders:delete"
  | "pdf:generate"
  | "users:manage"
  | "audit:read";

const permissions: Record<Role, Permission[]> = {
  admin: [
    "dashboard:read",
    "costs:manage",
    "orders:read",
    "orders:write",
    "orders:delete",
    "pdf:generate",
    "users:manage",
    "audit:read",
  ],
  manager: [
    "dashboard:read",
    "costs:manage",
    "orders:read",
    "orders:write",
    "orders:delete",
    "pdf:generate",
  ],
  operator: ["dashboard:read", "orders:read", "orders:write", "pdf:generate"],
  viewer: ["dashboard:read", "orders:read"],
};

const accessCookie = "mavi_access";
const refreshCookie = "mavi_refresh";
export const csrfCookie = "mavi_csrf";
const encoder = new TextEncoder();

function config() {
  const c = useRuntimeConfig();
  const accessSecret = String(c.jwtAccessSecret);
  const refreshSecret = String(c.jwtRefreshSecret);
  if (
    accessSecret.length < 32 ||
    refreshSecret.length < 32 ||
    accessSecret === refreshSecret ||
    (process.env.NODE_ENV === "production" &&
      (accessSecret.includes("change-me") || refreshSecret.includes("change-me")))
  )
    throw new Error("JWT secrets must be distinct, unpredictable and have at least 32 characters");
  if (process.env.NODE_ENV === "production") {
    const origin = String(c.appOrigin || "");
    if (!origin || new URL(origin).protocol !== "https:")
      throw new Error("NUXT_APP_ORIGIN must be a valid HTTPS origin in production");
    if (String(c.cookieSecure).toLowerCase() !== "true")
      throw new Error("NUXT_COOKIE_SECURE must be true in production");
  }
  return c;
}
function cookieOptions(maxAge: number, httpOnly = true) {
  const c = config();
  return {
    httpOnly,
    secure: String(c.cookieSecure).toLowerCase() === "true",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export function clientIp(event: H3Event) {
  const trustProxy = String(useRuntimeConfig().trustProxy).toLowerCase() === "true";
  return getRequestIP(event, { xForwardedFor: trustProxy }) || "unknown";
}

async function signToken(
  user: AuthUser,
  type: "access" | "refresh",
  jti: string,
  seconds: number,
  sessionId: string,
) {
  const c = config();
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    type,
    sid: sessionId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(user.id))
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .setIssuer("mavi-custos")
    .setAudience("mavi-web")
    .sign(
      encoder.encode(
        type === "access" ? c.jwtAccessSecret : c.jwtRefreshSecret,
      ),
    );
}

export async function issueSession(event: H3Event, user: AuthUser) {
  const accessJti = randomUUID(),
    refreshJti = randomUUID();
  const [access, refresh] = await Promise.all([
    signToken(user, "access", accessJti, 15 * 60, refreshJti),
    signToken(user, "refresh", refreshJti, 24 * 3600, refreshJti),
  ]);
  await db()`INSERT INTO refresh_sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
    VALUES (${refreshJti}, ${user.id}, ${digest(refresh)}, NOW() + INTERVAL '1 day',
      ${clientIp(event)}, ${getHeader(event, "user-agent")?.slice(0, 500) || null})`;
  setCookie(event, accessCookie, access, cookieOptions(15 * 60));
  setCookie(event, refreshCookie, refresh, cookieOptions(24 * 3600));
  const csrf = randomBytes(32).toString("base64url");
  setCookie(event, csrfCookie, csrf, cookieOptions(24 * 3600, false));
  return csrf;
}

export async function verifyAccess(event: H3Event): Promise<AuthUser | null> {
  const token = getCookie(event, accessCookie);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      encoder.encode(config().jwtAccessSecret),
      { issuer: "mavi-custos", audience: "mavi-web" },
    );
    if (payload.type !== "access" || typeof payload.sid !== "string") return null;
    const [row] =
      await db()`SELECT u.id, u.name, u.email, u.role, u.must_change_password
        FROM users u
        WHERE u.id=${Number(payload.sub)} AND u.active=TRUE AND u.deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM refresh_sessions s WHERE s.id=${payload.sid} AND s.user_id=u.id AND s.revoked_at IS NULL AND s.expires_at > clock_timestamp())`;
    return row
      ? {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          mustChangePassword: row.mustChangePassword,
        }
      : null;
  } catch {
    return null;
  }
}

export async function rotateRefresh(event: H3Event) {
  const token = getCookie(event, refreshCookie);
  if (!token)
    throw createApiError({ statusCode: 401, message: "Sessão expirada" });
  try {
    const { payload } = await jwtVerify(
      token,
      encoder.encode(config().jwtRefreshSecret),
      { issuer: "mavi-custos", audience: "mavi-web" },
    );
    if (payload.type !== "refresh" || !payload.jti || !payload.sub)
      throw new Error("invalid token");
    const jti = payload.jti,
      subject = Number(payload.sub);
    return await db().begin(async (tx) => {
      const [session] =
        await tx`SELECT * FROM refresh_sessions WHERE id=${jti} AND revoked_at IS NULL AND expires_at > clock_timestamp() FOR UPDATE`;
      if (!session || session.tokenHash !== digest(token))
        throw new Error("invalid session");
      const [row] =
        await tx`SELECT id, name, email, role, must_change_password FROM users WHERE id=${subject} AND active=TRUE AND deleted_at IS NULL`;
      if (!row) throw new Error("invalid user");
      await tx`UPDATE refresh_sessions SET revoked_at=NOW() WHERE id=${jti}`;
      const user: AuthUser = {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        mustChangePassword: row.mustChangePassword,
      };
      return user;
    });
  } catch {
    clearAuthCookies(event);
    throw createApiError({ statusCode: 401, message: "Sessão expirada" });
  }
}

export async function revokeSession(event: H3Event) {
  const token = getCookie(event, refreshCookie);
  if (token)
    await db()`UPDATE refresh_sessions SET revoked_at=NOW() WHERE token_hash=${digest(token)} AND revoked_at IS NULL`;
  clearAuthCookies(event);
}
export function clearAuthCookies(event: H3Event) {
  deleteCookie(event, accessCookie, { path: "/" });
  deleteCookie(event, refreshCookie, { path: "/" });
  deleteCookie(event, csrfCookie, { path: "/" });
}
export function requirePermission(event: H3Event, permission: Permission) {
  const user = (event.context as any).user as AuthUser | undefined;
  if (!user)
    throw createApiError({ statusCode: 401, message: "Não autenticado" });
  if (!permissions[user.role]?.includes(permission))
    throw createApiError({
      statusCode: 403,
      message: "Permissão insuficiente",
    });
  return user;
}
export function assertCsrf(event: H3Event) {
  const cookie = getCookie(event, csrfCookie),
    header = getHeader(event, "x-csrf-token");
  if (!cookie || !header || cookie !== header)
    throw createApiError({
      statusCode: 403,
      message: "Token CSRF inválido",
    });
  assertSameOrigin(event);
}
export function assertSameOrigin(event: H3Event) {
  const configuredOrigin = String(useRuntimeConfig().appOrigin || "").replace(/\/$/, "");
  const source = getHeader(event, "origin") || getHeader(event, "referer");
  const host = getHeader(event, "host");
  const expected = configuredOrigin || (host ? `${getRequestProtocol(event)}://${host}` : "");
  let sourceOrigin = "";
  try { sourceOrigin = source ? new URL(source).origin : ""; } catch { /* rejected below */ }
  if (!sourceOrigin || !expected || sourceOrigin !== new URL(expected).origin)
    throw createApiError({ statusCode: 403, message: "Origem inválida" });
}
