export default defineEventHandler(async (event) => {
  requirePermission(event, "orders:read");
  const query = getQuery(event), search = String(query.search || "").trim().slice(0, 120), active = String(query.active || ""), page = getPagination(event);
  const sortColumn = ({ name: "name", basePrice: "base_price", active: "active" } as Record<string, string>)[String(query.sort)] || "name";
  const direction = query.direction === "desc" ? "DESC" : "ASC", sql = db();
  const rows = await sql`SELECT id,name,base_price,active,COUNT(*) OVER()::int AS _total FROM service_types
    WHERE (${search}='' OR name ILIKE ${'%' + search + '%'}) AND (${active}='' OR active=${active === 'true'})
    ORDER BY ${sql(sortColumn)} ${sql.unsafe(direction)}, id ASC LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}`;
  const items = rows.map(({ _total, ...row }) => ({ ...row, basePrice: Number(row.basePrice) }));
  return page ? { items, total: rows[0]?._total || 0, ...page } : items;
});
