import { hash } from 'bcryptjs'
import { z } from 'zod'

const strongPassword = z.string().min(12).max(200).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/)
const schema = z.object({ name: z.string().trim().min(2).max(140), email: z.string().email().max(200), role: z.enum(['admin','manager','operator','viewer']), active: z.boolean(), password: strongPassword.optional().or(z.literal('')) })
export default defineEventHandler(async (event) => {
  const actor = requirePermission(event, 'users:manage'), id = Number(getRouterParam(event, 'id'))
  const input = await validatedBody(event, schema)
  if (actor.id === id && !input.active) throw createApiError({ statusCode: 422, message: 'Você não pode desativar seu próprio usuário' })
  const rows = input.password
    ? await db()`UPDATE users SET name=${input.name}, email=${input.email.toLowerCase()}, role=${input.role}, active=${input.active}, password_hash=${await hash(input.password, 12)}, must_change_password=TRUE, updated_at=NOW() WHERE id=${id} AND deleted_at IS NULL RETURNING id`
    : await db()`UPDATE users SET name=${input.name}, email=${input.email.toLowerCase()}, role=${input.role}, active=${input.active}, updated_at=NOW() WHERE id=${id} AND deleted_at IS NULL RETURNING id`
  if (!rows.length) throw createApiError({ statusCode: 404, message: 'Usuário não encontrado' })
  if (!input.active || input.password) await db()`UPDATE refresh_sessions SET revoked_at=NOW() WHERE user_id=${id} AND revoked_at IS NULL`
  await audit(event, 'USER_UPDATED', 'user', id, { name: input.name, email: input.email, role: input.role, active: input.active, passwordReset: Boolean(input.password) })
  return { id }
})
