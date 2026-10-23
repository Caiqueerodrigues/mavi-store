export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const input = await validatedBody(event, materialSchema)
  const [row] = await db()`
    INSERT INTO materials (name, supplier, cost_type, unit, purchase_price, purchase_quantity, active)
    VALUES (${input.name}, ${input.supplier || null}, ${input.costType}, ${input.unit.toUpperCase()}, ${input.purchasePrice}, ${input.yieldQuantity}, ${input.active})
    RETURNING id
  `
  setResponseStatus(event, 201)
  await audit(event, 'MATERIAL_CREATED', 'material', row!.id, { name: input.name })
  return { id: row!.id }
})
