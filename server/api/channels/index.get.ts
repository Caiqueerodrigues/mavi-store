export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const page = getPagination(event)
  const rows = await db()`SELECT id, name, fixed_fee::float8, percentage_fee::float8, active, COUNT(*) OVER()::int AS _total FROM sales_channels ORDER BY active DESC, name LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}`
  const items = rows.map(({ _total, ...r }) => ({ id: r.id, name: r.name, fixedFee: r.fixedFee, percentageFee: r.percentageFee, active: r.active }))
  return page ? { items, total: rows[0]?._total || 0, ...page } : items
})
