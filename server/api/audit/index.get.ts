import { assertRateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const userContext = requirePermission(event, 'audit:read')
  assertRateLimit(event, 'audit-read', `${userContext.id}:${clientIp(event)}`, 60, 60_000)
  const query = getQuery(event), search = String(query.search || '').trim().slice(0, 140), action = String(query.action || '').slice(0, 80), user = String(query.user || '').slice(0, 140), page = Math.min(10_000, Math.max(1, Number(query.page) || 1)), limit = 50
  const sortColumn = ({ createdAt: 'created_at', userName: 'user_name', action: 'action', entity: 'entity', ipAddress: 'ip_address' } as Record<string, string>)[String(query.sort)] || 'created_at'
  const direction = query.direction === 'asc' ? 'ASC' : 'DESC', sql = db()
  const rows = await sql`SELECT id, user_name, action, entity, entity_id, details, ip_address, created_at,
    COUNT(*) OVER()::int AS total FROM audit_logs
    WHERE (${action}='' OR action=${action}) AND (${user}='' OR user_name ILIKE ${'%' + user + '%'})
      AND (${search}='' OR action ILIKE ${'%' + search + '%'} OR entity ILIKE ${'%' + search + '%'} OR user_name ILIKE ${'%' + search + '%'})
    ORDER BY ${sql(sortColumn)} ${sql.unsafe(direction)} NULLS LAST, id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`
  return { items: rows.map(({ total: _total, ...row }) => row), total: rows[0]?.total || 0, page, limit }
})
