export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const query = getQuery(event), search = String(query.search || '').trim().slice(0, 120), active = String(query.active || ''), page = getPagination(event)
  const sortColumn = ({ name: 'name', percentageFee: 'percentage_fee', fixedFee: 'fixed_fee', active: 'active' } as Record<string, string>)[String(query.sort)] || 'name'
  const direction = query.direction === 'desc' ? 'DESC' : 'ASC', sql = db()
  const rows = await sql`SELECT id, name, fixed_fee::float8, percentage_fee::float8, active, COUNT(*) OVER()::int AS _total FROM sales_channels
    WHERE (${search}='' OR name ILIKE ${'%' + search + '%'}) AND (${active}='' OR active=${active === 'true'})
    ORDER BY ${sql(sortColumn)} ${sql.unsafe(direction)}, id ASC LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}`
  const items = rows.map(({ _total, ...r }) => ({ id: r.id, name: r.name, fixedFee: r.fixedFee, percentageFee: r.percentageFee, active: r.active }))
  return page ? { items, total: rows[0]?._total || 0, ...page } : items
})
