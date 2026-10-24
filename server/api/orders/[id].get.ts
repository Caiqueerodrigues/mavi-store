export default defineEventHandler(async (event) => {
  requirePermission(event, "orders:read");
  const id = requirePositiveRouteId(event);
  const [row] = await db()`SELECT * FROM orders WHERE id=${id} AND deleted_at IS NULL`;
  if (!row) throw createApiError({ statusCode: 404, message: "Pedido não encontrado" });
  return mapOrder(row);
});
