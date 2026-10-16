import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(2).max(140),
  email: z.string().trim().email().max(200)
})

export default defineEventHandler(async (event) => {
  const current = requirePermission(event, 'dashboard:read')
  const input = await validatedBody(event, schema)
  try {
    const [row] = await db()`UPDATE users
      SET name=${input.name}, email=${input.email.toLowerCase()}, updated_at=NOW()
      WHERE id=${current.id} AND active=TRUE AND deleted_at IS NULL
      RETURNING id, name, email, role, must_change_password`
    if (!row) throw createError({ statusCode: 404, statusMessage: 'Usuário não encontrado' })
    await audit(event, 'USER_PROFILE_UPDATED', 'user', current.id, { name: input.name, email: input.email })
    return { user: { id: row.id, name: row.name, email: row.email, role: row.role, mustChangePassword: row.mustChangePassword } }
  } catch (error: any) {
    if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'E-mail já cadastrado' })
    throw error
  }
})
