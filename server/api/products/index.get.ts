export default defineEventHandler((event) => {
  requirePermission(event, 'costs:manage')
  const activeQuery = String(getQuery(event).active ?? 'true')
  if (!['true', 'false', 'all'].includes(activeQuery)) {
    throw createApiError({ statusCode: 400, message: 'Filtro de situação inválido' })
  }
  const active = activeQuery === 'all' ? null : activeQuery !== 'false'
  const categoryQuery = getQuery(event).category
  const category = categoryQuery === undefined ? undefined : String(categoryQuery).trim()
  if (category !== undefined && (!category || category.length > 60)) {
    throw createApiError({ statusCode: 400, message: 'Filtro de categoria invÃ¡lido' })
  }
  return listProducts(undefined, active, category)
})
