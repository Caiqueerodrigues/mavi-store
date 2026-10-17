export default defineEventHandler(async (event) => {
  requirePermission(event, 'orders:read')
  const query = getQuery(event), search = String(query.search || ''), status = String(query.status || ''), paymentStatus = String(query.paymentStatus || '')
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(query.from || '')) ? String(query.from) : ''
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(query.to || '')) ? String(query.to) : ''
  const rows = await db()`SELECT * FROM orders WHERE deleted_at IS NULL
    AND (${search}='' OR order_number ILIKE ${'%' + search + '%'} OR customer_name ILIKE ${'%' + search + '%'} OR product_description ILIKE ${'%' + search + '%'})
    AND (${status}='' OR status=${status})
    AND (${paymentStatus}='' OR payment_status=${paymentStatus})
    AND (${from}='' OR order_date >= ${from}::date)
    AND (${to}='' OR order_date < (LEAST(${to}::date, CURRENT_DATE) + INTERVAL '1 day'))
    ORDER BY order_date DESC, id DESC`
  return rows.map(mapOrder)
})
