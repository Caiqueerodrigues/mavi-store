export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  await ensureDatabase()
  const rows = await db()`
    SELECT id, name, supplier, unit, purchase_price::float8, purchase_quantity::float8,
      (purchase_price / purchase_quantity)::float8 AS unit_cost, active
    FROM materials ORDER BY active DESC, name
  `
  return rows.map((r) => ({ ...r, purchasePrice: r.purchasePrice, purchaseQuantity: r.purchaseQuantity, unitCost: r.unitCost }))
})
