export default defineEventHandler(async (event) => {
  requirePermission(event, "orders:read");
  const id = requirePositiveRouteId(event);
  const [row] = await db()`SELECT id, name, phone, nickname, active FROM customers WHERE id=${id}`;
  if (!row) throw createApiError({ statusCode: 404, message: "Cliente não encontrado" });
  return row;
});
