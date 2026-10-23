import { compare, hash } from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({ currentPassword: z.string().min(8).max(200), newPassword: z.string().min(12).max(200)
  .regex(/[A-Z]/, 'Inclua uma letra maiúscula').regex(/[a-z]/, 'Inclua uma letra minúscula').regex(/[0-9]/, 'Inclua um número').regex(/[^A-Za-z0-9]/, 'Inclua um símbolo') })

export default defineEventHandler(async (event) => {
  const user = requirePermission(event, 'dashboard:read')
  const input = await validatedBody(event, schema)
  const [row] = await db()`SELECT password_hash FROM users WHERE id=${user.id}`
  if (!row || !await compare(input.currentPassword, row.passwordHash)) throw createApiError({ statusCode: 422, message: 'Senha atual incorreta' })
  await db()`UPDATE users SET password_hash=${await hash(input.newPassword, 12)}, must_change_password=FALSE, updated_at=NOW() WHERE id=${user.id}`
  await db()`UPDATE refresh_sessions SET revoked_at=NOW() WHERE user_id=${user.id} AND revoked_at IS NULL`
  const updatedUser = { ...user, mustChangePassword: false }
  await issueSession(event, updatedUser)
  await audit(event, 'USER_PASSWORD_CHANGED', 'user', user.id)
  return { user: updatedUser }
})
