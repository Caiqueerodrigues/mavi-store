export default defineEventHandler(async (event) => {
  requirePermission(event, 'orders:read')
  const query = getQuery(event), search = String(query.search || ''), status = String(query.status || '')
  const rows = await db()`SELECT * FROM orders WHERE deleted_at IS NULL
    AND (${search}='' OR order_number ILIKE ${'%' + search + '%'} OR customer_name ILIKE ${'%' + search + '%'} OR product_description ILIKE ${'%' + search + '%'})
    AND (${status}='' OR status=${status}) ORDER BY order_date DESC, id DESC`
  return rows.map(mapOrder)
})
