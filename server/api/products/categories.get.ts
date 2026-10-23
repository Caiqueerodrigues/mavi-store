export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const rows = await db()`
    SELECT DISTINCT category FROM products
    WHERE category IS NOT NULL AND btrim(category) <> ''
    ORDER BY category
  `
  return rows.map((row) => row.category)
})
