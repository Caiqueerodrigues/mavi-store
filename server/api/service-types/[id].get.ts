export default defineEventHandler(async (event) => {
  requirePermission(event, "orders:read");
  const id = requirePositiveRouteId(event);
  const [row] = await db()`SELECT id, name, base_price, active FROM service_types WHERE id=${id}`;
  if (!row) throw createApiError({ statusCode: 404, message: "Tipo de serviço não encontrado" });
  return { ...row, basePrice: Number(row.basePrice) };
});
