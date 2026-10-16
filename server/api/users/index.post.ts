import { hash } from 'bcryptjs'
import { z } from 'zod'

const strongPassword = z.string().min(12).max(200).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/)
const schema = z.object({ name: z.string().trim().min(2).max(140), email: z.string().email().max(200), role: z.enum(['admin','manager','operator','viewer']), password: strongPassword })
export default defineEventHandler(async (event) => {
  requirePermission(event, 'users:manage')
  const input = await validatedBody(event, schema)
  try {
    const [row] = await db()`INSERT INTO users (name, email, role, password_hash, must_change_password)
      VALUES (${input.name}, ${input.email.toLowerCase()}, ${input.role}, ${await hash(input.password, 12)}, TRUE) RETURNING id`
    await audit(event, 'USER_CREATED', 'user', row!.id, { name: input.name, email: input.email, role: input.role })
    setResponseStatus(event, 201); return { id: row!.id }
  } catch (error: any) {
    if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'E-mail já cadastrado' })
    throw error
  }
})
