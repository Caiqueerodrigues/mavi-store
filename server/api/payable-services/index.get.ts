export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const query = getQuery(event)
  const search = String(query.search || '').trim()
  const paymentStatus = String(query.paymentStatus || '')
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(query.from || '')) ? String(query.from) : ''
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(query.to || '')) ? String(query.to) : ''
  const page = getPagination(event)
  const sortColumn = ({ orderDate: 'order_date', deliveryDate: 'delivery_date', serviceTypeName: 'service_type_name', recipientName: 'recipient_name', quantity: 'quantity', agreedAmount: 'agreed_amount', totalAmount: 'total_amount', paymentDate: 'payment_date', paymentStatus: 'payment_status' } as Record<string, string>)[String(query.sort)] || 'order_date'
  const direction = query.direction === 'asc' ? 'ASC' : 'DESC'
  const sql = db()
  const rows = await sql`SELECT id, order_date, delivery_date, quantity, agreed_amount::float8, service_type_name, recipient_name, total_amount::float8, payment_date, payment_status,
    COUNT(*) OVER()::int AS _total FROM payable_services
    WHERE (${search} = '' OR service_type_name ILIKE ${'%' + search + '%'} OR recipient_name ILIKE ${'%' + search + '%'})
      AND (${paymentStatus} = '' OR payment_status = ${paymentStatus})
      AND (${from} = '' OR order_date >= ${from}::date)
      AND (${to} = '' OR order_date < (${to}::date + INTERVAL '1 day'))
    ORDER BY ${sql(sortColumn)} ${sql.unsafe(direction)} NULLS LAST, id DESC
    LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}`
  const items = rows.map(({ _total, ...row }) => ({ ...row, agreedAmount: Number(row.agreedAmount), totalAmount: Number(row.totalAmount) }))
  return page ? { items, total: rows[0]?._total || 0, ...page } : items
})
