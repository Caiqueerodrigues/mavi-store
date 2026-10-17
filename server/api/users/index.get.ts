export default defineEventHandler(async (event) => {
  requirePermission(event, 'users:manage')
  const page = getPagination(event)
  const rows = await db()`SELECT id, name, email, role, active, must_change_password, last_login_at, created_at, COUNT(*) OVER()::int AS _total
    FROM users WHERE deleted_at IS NULL ORDER BY name LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}`
  const items = rows.map(({ _total, ...row }) => row)
  return page ? { items, total: rows[0]?._total || 0, ...page } : items
})
