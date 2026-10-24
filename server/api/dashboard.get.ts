export default defineEventHandler(async (event) => {
  requirePermission(event, 'dashboard:read')
  const query = getQuery(event)
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(query.from || '')) ? String(query.from) : ''
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(query.to || '')) ? String(query.to) : ''
  const [period] = await db()`SELECT
    to_char(COALESCE(NULLIF(${from}::text, '')::date, date_trunc('month', CURRENT_DATE)::date), 'YYYY-MM-DD') AS date_from,
    to_char(LEAST(COALESCE(NULLIF(${to}::text, '')::date, CURRENT_DATE), CURRENT_DATE), 'YYYY-MM-DD') AS date_to`
  if (period!.dateFrom > period!.dateTo) throw createApiError({ statusCode: 422, message: 'A data inicial não pode ser maior que a data final' })
  const [summary] = await db()`SELECT COUNT(*)::int AS orders,
    COALESCE(SUM(quantity * unit_price), 0)::float8 AS total_value,
    COALESCE(SUM(paid_amount), 0)::float8 AS paid_value,
    COUNT(*) FILTER (WHERE payment_status='paid')::int AS paid_orders,
    COUNT(*) FILTER (WHERE withdrawal_date IS NOT NULL OR status='delivered')::int AS withdrawn,
    COUNT(*) FILTER (WHERE status='ready')::int AS ready,
    COUNT(*) FILTER (WHERE status='in_production')::int AS in_production
    FROM orders WHERE deleted_at IS NULL AND order_date >= ${period!.dateFrom} AND order_date < (${period!.dateTo}::date + INTERVAL '1 day')`
  const byService = await db()`SELECT order_type AS name, COUNT(*)::int AS orders,
    COALESCE(SUM(quantity * unit_price), 0)::float8 AS total,
    COALESCE(SUM(paid_amount), 0)::float8 AS paid
    FROM orders WHERE deleted_at IS NULL AND order_date >= ${period!.dateFrom} AND order_date < (${period!.dateTo}::date + INTERVAL '1 day')
    GROUP BY order_type ORDER BY total DESC`
  const byCustomer = await db()`SELECT customer_id AS id, customer_name AS name, COUNT(*)::int AS orders,
    COALESCE(SUM(quantity * unit_price), 0)::float8 AS total,
    COALESCE(SUM(paid_amount), 0)::float8 AS paid
    FROM orders WHERE deleted_at IS NULL AND order_date >= ${period!.dateFrom} AND order_date < (${period!.dateTo}::date + INTERVAL '1 day')
    GROUP BY customer_id, customer_name ORDER BY total DESC, customer_name ASC LIMIT 10`
  const statuses = await db()`SELECT status AS name, COUNT(*)::int AS total
    FROM orders WHERE deleted_at IS NULL AND order_date >= ${period!.dateFrom} AND order_date < (${period!.dateTo}::date + INTERVAL '1 day')
    GROUP BY status ORDER BY total DESC`
  const recentOrders = await db()`SELECT id, order_number, customer_name, product_description,
    quantity::float8, (quantity * unit_price)::float8 AS total, status
    FROM orders WHERE deleted_at IS NULL
    ORDER BY created_at DESC, id DESC LIMIT 6`
  return { period: { from: period!.dateFrom, to: period!.dateTo }, summary, byService, byCustomer, statuses, recentOrders }
})
