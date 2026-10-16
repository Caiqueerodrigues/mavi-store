export default defineEventHandler(async (event) => {
  requirePermission(event, 'dashboard:read')
  const products = await listProducts()
  const [counts] = await db()`SELECT
    (SELECT COUNT(*)::int FROM products WHERE active) AS products,
    (SELECT COUNT(*)::int FROM materials WHERE active) AS materials`
  const totalCost = products.reduce((sum, item) => sum + item.productionCost, 0)
  const averageMargin = products.length
    ? products.reduce((sum, item) => sum + item.currentProfit, 0) / products.length : 0
  return {
    summary: { ...counts, averageCost: products.length ? totalCost / products.length : 0, averageProfit: averageMargin },
    products: products.slice().sort((a, b) => a.currentProfit - b.currentProfit).slice(0, 6)
  }
})
