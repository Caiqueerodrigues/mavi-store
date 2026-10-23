export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  await ensureDatabase()
  const sql = db()
  await sql.begin(async (tx) => {
    const version = '010_material_cost_types_repair'
    const applied = await tx`SELECT 1 FROM schema_migrations WHERE version=${version}`
    if (!applied.length) {
      await tx`UPDATE materials SET cost_type=CASE
        WHEN lower(name) IN ('caixa','saquinho de embalagem') THEN 'packaging'
        WHEN lower(name) LIKE 'mão de obra%' OR lower(name) LIKE 'montagem%' THEN 'labor'
        WHEN lower(name) IN ('dublagem','palmilha corte','carimbo palmilha','pesponto palmilha','pesponto cabedal','pesponto tênis','corte cabedal','corte cabedal sandália','corte cabedal tênis','waster','enfeite flor','enfeite laço','enfeite borboleta','enfeite strass','enfeite ágata','enfeite carol') THEN 'service'
        ELSE 'material' END, updated_at=NOW()`
      await tx`INSERT INTO schema_migrations (version) VALUES (${version})`
    }
  })
  await sql.begin(async (tx) => {
    const version = '012_classify_production_labor'
    const applied = await tx`SELECT 1 FROM schema_migrations WHERE version=${version}`
    if (!applied.length) {
      await tx`UPDATE materials SET cost_type='labor',updated_at=NOW()
        WHERE lower(name) LIKE '%mão de obra%' OR lower(name) LIKE '%montagem%'
          OR lower(name) LIKE '%corte%' OR lower(name) LIKE '%pesponto%'
          OR lower(name) LIKE '%carimb%' OR lower(name) LIKE '%debrua%' OR lower(name)='waster'`
      await tx`INSERT INTO schema_migrations (version) VALUES (${version})`
    }
  })
  const query = getQuery(event), search = String(query.search || '').trim().slice(0, 120), active = String(query.active || ''), costType = String(query.costType || '').slice(0, 30), page = getPagination(event)
  const sortColumn = ({ name: 'name', costType: 'cost_type', supplier: 'supplier', purchasePrice: 'purchase_price', yieldQuantity: 'purchase_quantity', unitCost: 'unit_cost', active: 'active' } as Record<string, string>)[String(query.sort)] || 'name'
  const direction = query.direction === 'desc' ? 'DESC' : 'ASC'
  const rows = await sql`
    SELECT id, name, supplier, cost_type, unit, purchase_price::float8, purchase_quantity::float8 AS yield_quantity,
      (purchase_price / purchase_quantity)::float8 AS unit_cost, active, COUNT(*) OVER()::int AS _total
    FROM materials
    WHERE (${search}='' OR name ILIKE ${'%' + search + '%'} OR supplier ILIKE ${'%' + search + '%'} OR unit ILIKE ${'%' + search + '%'})
      AND (${active}='' OR active=${active === 'true'}) AND (${costType}='' OR cost_type=${costType})
    ORDER BY ${sql(sortColumn)} ${sql.unsafe(direction)}, id ASC LIMIT ${page?.limit ?? null} OFFSET ${page?.offset ?? 0}
  `
  const items = rows.map(({ _total, ...r }) => ({ ...r, purchasePrice: r.purchasePrice, yieldQuantity: r.yieldQuantity, unitCost: r.unitCost }))
  return page ? { items, total: rows[0]?._total || 0, ...page } : items
})
