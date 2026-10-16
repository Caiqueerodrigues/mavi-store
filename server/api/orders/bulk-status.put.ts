import { z } from 'zod'

const schema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(500),
  status: z.enum(['pending', 'in_production', 'ready', 'delivered', 'completed', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'partial', 'paid', 'refunded']).optional()
}).refine(input => input.status || input.paymentStatus, { message: 'Informe o status a atualizar' })

export default defineEventHandler(async (event) => {
  const user = requirePermission(event, 'orders:write')
  const input = await validatedBody(event, schema)
  let rows: any[]
  if (input.status && input.paymentStatus) rows = await db()`UPDATE orders SET status=${input.status}, payment_status=${input.paymentStatus}, updated_by=${user.id}, updated_at=NOW() WHERE id IN ${db()(input.ids)} AND deleted_at IS NULL RETURNING *`
  else if (input.status) rows = await db()`UPDATE orders SET status=${input.status}, updated_by=${user.id}, updated_at=NOW() WHERE id IN ${db()(input.ids)} AND deleted_at IS NULL RETURNING *`
  else rows = await db()`UPDATE orders SET payment_status=${input.paymentStatus!}, updated_by=${user.id}, updated_at=NOW() WHERE id IN ${db()(input.ids)} AND deleted_at IS NULL RETURNING *`
  await audit(event, 'ORDERS_BULK_UPDATED', 'order', undefined, { ids: input.ids, status: input.status, paymentStatus: input.paymentStatus, count: rows.length })
  return rows.map(mapOrder)
})
