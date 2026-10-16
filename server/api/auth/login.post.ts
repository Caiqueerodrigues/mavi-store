import { compare } from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});
const attempts = new Map<string, { count: number; resetAt: number }>();

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  const ip = getRequestIP(event) || "unknown";
  const current = attempts.get(ip);
  const monotonicNow = performance.now();
  if (current && current.resetAt > monotonicNow && current.count >= 5)
    throw createError({
      statusCode: 429,
      statusMessage: "Muitas tentativas. Aguarde 15 minutos.",
    });
  if (!current || current.resetAt <= monotonicNow)
    attempts.set(ip, { count: 0, resetAt: monotonicNow + 15 * 60_000 });
  const input = await validatedBody(event, schema);
  const [row] =
    await db()`SELECT id, name, email, role, password_hash, active, must_change_password FROM users
    WHERE LOWER(email)=LOWER(${input.email}) AND deleted_at IS NULL`;
  if (!row || !(await compare(input.password, row.passwordHash))) {
    attempts.get(ip)!.count++;
    await audit(event, "AUTH_LOGIN_FAILED", "auth", input.email, {
      reason: "invalid_credentials",
    });
    throw createError({
      statusCode: 401,
      statusMessage: "E-mail ou senha inválidos",
    });
  }
  if (!row.active) {
    await audit(event, "AUTH_LOGIN_BLOCKED", "auth", row.id, {
      reason: "inactive_user",
    });
    throw createError({
      statusCode: 403,
      statusMessage: "Usuário inativo. Procure um administrador para liberar seu acesso.",
    });
  }
  attempts.delete(ip);
  const user: AuthUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    mustChangePassword: row.mustChangePassword,
  };
  (event.context as any).user = user;
  await issueSession(event, user);
  await db()`UPDATE users SET last_login_at=NOW() WHERE id=${user.id}`;
  await audit(event, "AUTH_LOGIN", "auth", user.id);
  return { user };
});
