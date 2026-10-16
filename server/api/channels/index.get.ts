export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const rows = await db()`SELECT id, name, fixed_fee::float8, percentage_fee::float8 FROM sales_channels ORDER BY name`
  return rows.map((r) => ({ id: r.id, name: r.name, fixedFee: r.fixedFee, percentageFee: r.percentageFee }))
})
