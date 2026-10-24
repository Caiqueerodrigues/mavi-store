export default defineEventHandler(async (event) => {
  requirePermission(event, "costs:manage");
  await ensureDatabase();
  const id = requirePositiveRouteId(event);
  const [row] = await db()`SELECT id, name, supplier, cost_type, unit, purchase_price::float8,
    purchase_quantity::float8 AS yield_quantity, (purchase_price / purchase_quantity)::float8 AS unit_cost,
    active, created_at, updated_at FROM materials WHERE id=${id}`;
  if (!row) throw createApiError({ statusCode: 404, message: "Insumo não encontrado" });
  return row;
});
