export async function listProducts(productId?: number) {
  const sql = db()
  const filter = productId ? sql`AND p.id = ${productId}` : sql``
  const rows = await sql`
    WITH costs AS (
      SELECT pc.product_id,
        COALESCE(SUM((m.purchase_price / m.purchase_quantity) * pc.quantity * (1 + pc.waste_percent)), 0) AS production_cost
      FROM product_components pc JOIN materials m ON m.id = pc.material_id
      GROUP BY pc.product_id
    )
    SELECT p.*, COALESCE(c.production_cost, 0)::float8 AS production_cost,
      sc.fixed_fee::float8, sc.percentage_fee::float8, s.target_profit::float8,
      ((COALESCE(c.production_cost, 0) + sc.fixed_fee + s.target_profit) / (1 - sc.percentage_fee))::float8 AS minimum_price,
      (p.current_price * (1 - sc.percentage_fee) - sc.fixed_fee - COALESCE(c.production_cost, 0))::float8 AS current_profit
    FROM products p
    CROSS JOIN app_settings s
    JOIN sales_channels sc ON sc.id = s.default_channel_id
    LEFT JOIN costs c ON c.product_id = p.id
    WHERE p.active = TRUE ${filter}
    ORDER BY p.name
  `
  const ids = rows.map((r) => r.id)
  const components = ids.length ? await sql`
    SELECT pc.id, pc.product_id, pc.material_id, m.name AS material_name, m.unit,
      pc.quantity::float8, pc.waste_percent::float8,
      (m.purchase_price / m.purchase_quantity)::float8 AS unit_cost,
      ((m.purchase_price / m.purchase_quantity) * pc.quantity * (1 + pc.waste_percent))::float8 AS total_cost
    FROM product_components pc JOIN materials m ON m.id = pc.material_id
    WHERE pc.product_id IN ${sql(ids)} ORDER BY pc.id
  ` : []
  return rows.map((r) => ({
    id: r.id, name: r.name, sku: r.sku, category: r.category, color: r.color,
    currentPrice: Number(r.currentPrice), productionCost: r.productionCost,
    minimumPrice: r.minimumPrice, expectedProfit: r.targetProfit, currentProfit: r.currentProfit,
    components: components.filter((c) => c.productId === r.id).map((c) => ({
      id: c.id, materialId: c.materialId, materialName: c.materialName, unit: c.unit,
      quantity: c.quantity, wastePercent: c.wastePercent, unitCost: c.unitCost, totalCost: c.totalCost
    }))
  }))
}

export async function saveComponents(tx: ReturnType<typeof db>, productId: number, components: Array<{ materialId: number, quantity: number, wastePercent: number }>) {
  await tx`DELETE FROM product_components WHERE product_id = ${productId}`
  for (const item of components) {
    await tx`INSERT INTO product_components (product_id, material_id, quantity, waste_percent)
      VALUES (${productId}, ${item.materialId}, ${item.quantity}, ${item.wastePercent})`
  }
}
