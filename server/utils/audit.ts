import type { H3Event } from 'h3'

export async function audit(event: H3Event, action: string, entity: string, entityId?: string | number, details: Record<string, unknown> = {}) {
  const user = (event.context as any).user
  await db()`INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, ip_address, user_agent)
    VALUES (${user?.id || null}, ${user?.name || null}, ${action}, ${entity}, ${entityId?.toString() || null},
      ${JSON.stringify(details)}, ${clientIp(event)}, ${getHeader(event, 'user-agent')?.slice(0, 500) || null})`
}
