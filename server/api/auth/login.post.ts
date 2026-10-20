import { compare } from "bcryptjs";
import { createHash } from "node:crypto";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});
const attempts = new Map<string, { count: number; resetAt: number }>();
const dummyHash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttxv1eYlXrGQ7qkF8QjWdEcBv8Le";
const windowMs = 15 * 60_000;
const accountKey = (email: string) =>
  `account:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`;

function consumeAttempt(key: string, now: number) {
  if (attempts.size > 10_000)
    for (const [entry, value] of attempts) if (value.resetAt <= now) attempts.delete(entry);
  if (attempts.size >= 10_000 && !attempts.has(key))
    throw createError({ statusCode: 429, statusMessage: "Muitas tentativas. Aguarde 15 minutos." });
  const current = attempts.get(key);
  if (current && current.resetAt > now && current.count >= 5)
    throw createError({ statusCode: 429, statusMessage: "Muitas tentativas. Aguarde 15 minutos." });
  if (!current || current.resetAt <= now) attempts.set(key, { count: 0, resetAt: now + windowMs });
}

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  const input = await validatedBody(event, schema);
  const ip = clientIp(event);
  const account = accountKey(input.email);
  const monotonicNow = performance.now();
  consumeAttempt(ip, monotonicNow);
  consumeAttempt(account, monotonicNow);
  const [row] =
    await db()`SELECT id, name, email, role, password_hash, active, must_change_password FROM users
    WHERE LOWER(email)=LOWER(${input.email}) AND deleted_at IS NULL`;
  const passwordMatches = await compare(input.password, row?.passwordHash || dummyHash);
  if (!row || !passwordMatches) {
    attempts.get(ip)!.count++;
    attempts.get(account)!.count++;
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
  attempts.delete(account);
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
