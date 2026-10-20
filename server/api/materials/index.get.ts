export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  await ensureDatabase()
  const page = getPagination(event)
  const rows = await db()`
    SELECT id, name, supplier, unit, purchase_price::float8, purchase_quantity::float8 AS yield_quantity,
      (purchase_price / purchase_quantity)::float8 AS unit_cost, active, COUNT(*) OVER()::int AS _total
    FROM materials ORDER BY active DESC, name LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}
  `
  const items = rows.map(({ _total, ...r }) => ({ ...r, purchasePrice: r.purchasePrice, yieldQuantity: r.yieldQuantity, unitCost: r.unitCost }))
  return page ? { items, total: rows[0]?._total || 0, ...page } : items
})
