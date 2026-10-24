export default defineEventHandler(async (event) => {
  requirePermission(event, "costs:manage");
  const id = requirePositiveRouteId(event);
  const [row] = await db()`SELECT id, name, fixed_fee::float8, percentage_fee::float8, active
    FROM sales_channels WHERE id=${id}`;
  if (!row) throw createApiError({ statusCode: 404, message: "Canal não encontrado" });
  return row;
});
