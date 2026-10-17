export default defineEventHandler(async (event) => {
  requirePermission(event, 'orders:read')
  const query = getQuery(event), activeOnly = query.active === 'true', page = getPagination(event)
  const rows = activeOnly
    ? await db()`SELECT id,name,phone,nickname,active,COUNT(*) OVER()::int AS _total FROM customers WHERE active=TRUE ORDER BY name LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}`
    : await db()`SELECT id,name,phone,nickname,active,COUNT(*) OVER()::int AS _total FROM customers ORDER BY active DESC,name LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}`
  const items = rows.map(({ _total, ...row }) => row)
  return page ? { items, total: rows[0]?._total || 0, ...page } : items
})
