export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const id = Number(getRouterParam(event, 'id'))
  const input = await validatedBody(event, productSchema)
  await db().begin(async (tx) => {
    const rows = await tx`UPDATE products SET name=${input.name}, sku=${input.sku}, category=${input.category},
      color=${input.color || null}, current_price=${input.currentPrice}, updated_at=NOW() WHERE id=${id} RETURNING id`
    if (!rows.length) throw createApiError({ statusCode: 404, message: 'Produto não encontrado' })
    await saveComponents(tx as any, id, input.components)
  })
  await audit(event, 'PRODUCT_UPDATED', 'product', id, { name: input.name })
  return (await listProducts(id, null))[0]
})
