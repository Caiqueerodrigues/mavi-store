export default defineEventHandler(async (event) => {
  requirePermission(event, "orders:read");
  const activeOnly = getQuery(event).active === "true";
  const rows = activeOnly
    ? await db()`SELECT id,name,base_price,active FROM service_types WHERE active=TRUE ORDER BY name`
    : await db()`SELECT id,name,base_price,active FROM service_types ORDER BY active DESC,name`;
  return rows.map((row) => ({ ...row, basePrice: Number(row.basePrice) }));
});
