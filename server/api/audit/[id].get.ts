import { assertRateLimit } from "../../utils/rate-limit";

export default defineEventHandler(async (event) => {
  const user = requirePermission(event, "audit:read");
  assertRateLimit(event, "audit-read", `${user.id}:${clientIp(event)}`, 60, 60_000);
  const id = requirePositiveRouteId(event);
  const [row] = await db()`SELECT id, user_id, user_name, action, entity, entity_id, details,
    ip_address, user_agent, created_at FROM audit_logs WHERE id=${id}`;
  if (!row) throw createApiError({ statusCode: 404, message: "Registro de auditoria não encontrado" });
  return row;
});
