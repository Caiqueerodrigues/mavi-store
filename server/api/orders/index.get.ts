export default defineEventHandler(async (event) => {
  requirePermission(event, 'orders:read')
  const query = getQuery(event), search = String(query.search || ''), status = String(query.status || ''), paymentStatus = String(query.paymentStatus || '')
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(query.from || '')) ? String(query.from) : ''
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(query.to || '')) ? String(query.to) : ''
  const page = getPagination(event), sortColumn = ({ orderNumber: 'order_number', customerName: 'customer_name', orderDate: 'order_date', totalQuantity: 'quantity', totalValue: 'sort_total_value', paymentStatus: 'payment_status', status: 'status' } as Record<string, string>)[String(query.sort)] || 'order_date'
  const direction = query.direction === 'asc' ? 'ASC' : 'DESC', sql = db()
  const rows = await sql`SELECT *, (quantity * unit_price)::float8 AS sort_total_value, COUNT(*) OVER()::int AS _total FROM orders WHERE deleted_at IS NULL
    AND (${search}='' OR order_number ILIKE ${'%' + search + '%'} OR customer_name ILIKE ${'%' + search + '%'} OR product_description ILIKE ${'%' + search + '%'})
    AND (${status}='' OR status=${status})
    AND (${paymentStatus}='' OR payment_status=${paymentStatus})
    AND (${from}='' OR order_date >= ${from}::date)
    AND (${to}='' OR order_date < (LEAST(${to}::date, CURRENT_DATE) + INTERVAL '1 day'))
    ORDER BY ${sql(sortColumn)} ${sql.unsafe(direction)} NULLS LAST, id DESC LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}`
  const items = rows.map(({ _total, ...row }) => mapOrder(row))
  return page ? { items, total: rows[0]?._total || 0, ...page } : items
})
