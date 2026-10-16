export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const input = await validatedBody(event, productSchema)
  const id = await db().begin(async (tx) => {
    const [row] = await tx`INSERT INTO products (name, sku, category, color, current_price)
      VALUES (${input.name}, ${input.sku || null}, ${input.category}, ${input.color || null}, ${input.currentPrice}) RETURNING id`
    await saveComponents(tx as any, row!.id, input.components)
    return row!.id as number
  })
  setResponseStatus(event, 201)
  await audit(event, 'PRODUCT_CREATED', 'product', id, { name: input.name })
  return (await listProducts(id))[0]
})
