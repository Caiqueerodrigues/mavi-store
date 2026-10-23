export default defineEventHandler(async (event) => {
  const user = requirePermission(event, 'orders:delete'), id = Number(getRouterParam(event, 'id'))
  const [row] = await db()`UPDATE orders SET deleted_at=NOW(), updated_by=${user.id}, updated_at=NOW() WHERE id=${id} AND deleted_at IS NULL RETURNING order_number`
  if (!row) throw createApiError({ statusCode: 404, message: 'Pedido não encontrado' })
  await audit(event, 'ORDER_DELETED', 'order', id, { orderNumber: row.orderNumber })
  setResponseStatus(event, 204)
})
