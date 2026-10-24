export default defineEventHandler(async (event) => {
  requirePermission(event, 'users:manage')
  const query = getQuery(event), search = String(query.search || '').trim().slice(0, 140), active = String(query.active || ''), role = String(query.role || '').slice(0, 30), page = getPagination(event)
  const sortColumn = ({ name: 'name', role: 'role', active: 'active', lastLoginAt: 'last_login_at' } as Record<string, string>)[String(query.sort)] || 'name'
  const direction = query.direction === 'desc' ? 'DESC' : 'ASC', sql = db()
  const rows = await sql`SELECT id, name, email, role, active, last_login_at, COUNT(*) OVER()::int AS _total
    FROM users WHERE deleted_at IS NULL
      AND (${search}='' OR name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'})
      AND (${active}='' OR active=${active === 'true'}) AND (${role}='' OR role=${role})
    ORDER BY ${sql(sortColumn)} ${sql.unsafe(direction)} NULLS LAST, id ASC LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}`
  const items = rows.map(({ _total, ...row }) => row)
  return page ? { items, total: rows[0]?._total || 0, ...page } : items
})
