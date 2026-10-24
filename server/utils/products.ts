export async function listProducts(productId?: number, active: boolean | null = true, category?: string, includeComponents = true) {
  const sql = db()
  await sql.begin(async (tx) => {
    const version = '011_restore_spreadsheet_component_quantities'
    const applied = await tx`SELECT 1 FROM schema_migrations WHERE version=${version}`
    if (!applied.length) {
      await tx`WITH source(product_name,material_name,quantity) AS (VALUES
        ('Ana','Tira Nice Ouro Light',0.97),('Luíza','Tira Mônaco Bco Cristal',0.97),
        ('Pietra','Tira Colmeia 4mm Bco Cristal',1.07),('Patricia','Tira Paris Camurça Bco/Cristal',0.99),
        ('Lara','Trança Spectro Dourado',1.00),('Tênis Cacharrel','Forro Cacharrel',2.00),
        ('Tênis Cacharrel','EVA palmilha forrado 4mm',1.00),('Tênis Cacharrel','Sola All Star',1.00),
        ('Tênis Nylon','Forro Nylon',1.00),('Tênis Nylon','Forro Cacharrel',1.00),
        ('Tênis Nylon','EVA palmilha forrado 4mm',1.00),('Tênis Nylon','Sola All Star',1.00)
      ) UPDATE product_components pc SET quantity=source.quantity
        FROM source JOIN products p ON p.name=source.product_name JOIN materials m ON lower(m.name)=lower(source.material_name)
        WHERE pc.product_id=p.id AND pc.material_id=m.id`
      await tx`INSERT INTO schema_migrations (version) VALUES (${version})`
    }
  })
  const filter = productId ? sql`AND p.id = ${productId}` : sql``
  const activeFilter = active === null ? sql`` : sql`AND p.active = ${active}`
  const categoryFilter = category ? sql`AND p.category = ${category}` : sql``
  const rows = await sql`
    WITH costs AS (
      SELECT pc.product_id,
        COALESCE(SUM((m.purchase_price / m.purchase_quantity) * pc.quantity * (1 + pc.waste_percent)), 0) AS production_cost
      FROM product_components pc JOIN materials m ON m.id = pc.material_id
      GROUP BY pc.product_id
    )
    SELECT p.id, p.name, p.sku, p.category, p.color, p.variations, p.current_price, p.active,
      COALESCE(c.production_cost, 0)::float8 AS production_cost,
      sc.fixed_fee::float8, sc.percentage_fee::float8,
      COALESCE(p.target_profit,s.target_profit)::float8 AS target_profit,
      ((COALESCE(c.production_cost, 0) + sc.fixed_fee + COALESCE(p.target_profit,s.target_profit)) / (1 - sc.percentage_fee))::float8 AS minimum_price,
      (p.current_price * (1 - sc.percentage_fee) - sc.fixed_fee - COALESCE(c.production_cost, 0))::float8 AS current_profit
    FROM products p
    CROSS JOIN app_settings s
    JOIN sales_channels sc ON sc.id = s.default_channel_id
    LEFT JOIN costs c ON c.product_id = p.id
    WHERE TRUE ${activeFilter} ${categoryFilter} ${filter}
    ORDER BY p.name
  `
  const ids = rows.map((r) => r.id)
  const components = includeComponents
    ? ids.length
      ? await sql`
    SELECT pc.id, pc.product_id, pc.material_id, m.name AS material_name, m.unit,
      pc.quantity::float8, pc.waste_percent::float8,
      (m.purchase_price / m.purchase_quantity)::float8 AS unit_cost,
      ((m.purchase_price / m.purchase_quantity) * pc.quantity * (1 + pc.waste_percent))::float8 AS total_cost
    FROM product_components pc JOIN materials m ON m.id = pc.material_id
    WHERE pc.product_id IN ${sql(ids)} ORDER BY pc.id
      `
      : []
    : []
  return rows.map((r) => ({
    id: r.id, name: r.name, sku: r.sku, category: r.category, color: r.color, active: r.active,
    currentPrice: Number(r.currentPrice), productionCost: r.productionCost,
    minimumPrice: r.minimumPrice, expectedProfit: r.targetProfit, currentProfit: r.currentProfit,
    ...(includeComponents ? {
      variations: Array.isArray(r.variations) ? r.variations : [],
      components: components.filter((c) => c.productId === r.id).map((c) => ({
      id: c.id, materialId: c.materialId, materialName: c.materialName, unit: c.unit,
      quantity: c.quantity, wastePercent: c.wastePercent, unitCost: c.unitCost, totalCost: c.totalCost
    })) } : {})
  }))
}

export async function saveComponents(tx: ReturnType<typeof db>, productId: number, components: Array<{ materialId: number, quantity: number, wastePercent: number }>) {
  await tx`DELETE FROM product_components WHERE product_id = ${productId}`
  for (const item of components) {
    await tx`INSERT INTO product_components (product_id, material_id, quantity, waste_percent)
      VALUES (${productId}, ${item.materialId}, ${item.quantity}, ${item.wastePercent})`
  }
}
