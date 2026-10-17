export default defineEventHandler(async (event) => {
  requirePermission(event, "orders:read");
  const query = getQuery(event), activeOnly = query.active === "true", page = getPagination(event);
  const rows = activeOnly
    ? await db()`SELECT id,name,base_price,active,COUNT(*) OVER()::int AS _total FROM service_types WHERE active=TRUE ORDER BY name LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}`
    : await db()`SELECT id,name,base_price,active,COUNT(*) OVER()::int AS _total FROM service_types ORDER BY active DESC,name LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}`;
  const items = rows.map(({ _total, ...row }) => ({ ...row, basePrice: Number(row.basePrice) }));
  return page ? { items, total: rows[0]?._total || 0, ...page } : items;
});
