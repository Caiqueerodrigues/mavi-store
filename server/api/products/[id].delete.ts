export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const id = Number(getRouterParam(event, 'id'))
  const rows = await db()`UPDATE products SET active=FALSE, updated_at=NOW() WHERE id=${id} RETURNING id`
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado' })
  await audit(event, 'PRODUCT_DELETED', 'product', id)
  setResponseStatus(event, 204)
})
