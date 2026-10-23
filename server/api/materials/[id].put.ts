export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const id = Number(getRouterParam(event, 'id'))
  const input = await validatedBody(event, materialSchema)
  const rows = await db()`
    UPDATE materials SET name=${input.name}, supplier=${input.supplier || null}, cost_type=${input.costType}, unit=${input.unit.toUpperCase()},
      purchase_price=${input.purchasePrice}, purchase_quantity=${input.yieldQuantity}, active=${input.active}, updated_at=NOW()
    WHERE id=${id} RETURNING id
  `
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Insumo não encontrado' })
  await audit(event, 'MATERIAL_UPDATED', 'material', id, { name: input.name })
  return { id }
})
