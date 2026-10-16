export default defineEventHandler(async (event) => {
  requirePermission(event, 'audit:read')
  const query = getQuery(event), action = String(query.action || ''), user = String(query.user || ''), page = Math.max(1, Number(query.page) || 1), limit = 50
  const rows = await db()`SELECT id, user_name, action, entity, entity_id, details, ip_address, created_at,
    COUNT(*) OVER()::int AS total FROM audit_logs
    WHERE (${action}='' OR action=${action}) AND (${user}='' OR user_name ILIKE ${'%' + user + '%'})
    ORDER BY created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`
  return { items: rows.map(({ total: _total, ...row }) => row), total: rows[0]?.total || 0, page, limit }
})
