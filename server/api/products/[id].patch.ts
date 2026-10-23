export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const id = Number(getRouterParam(event, 'id'))
  const input = await validatedBody(event, productActiveSchema)
  const rows = await db()`UPDATE products SET active=${input.active}, updated_at=NOW() WHERE id=${id} RETURNING id`
  if (!rows.length) throw createApiError({ statusCode: 404, message: 'Produto não encontrado' })

  await audit(event, input.active ? 'PRODUCT_ACTIVATED' : 'PRODUCT_DEACTIVATED', 'product', id)
  setResponseStatus(event, 204)
})
