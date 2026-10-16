export default defineEventHandler(async (event) => {
  requirePermission(event, 'orders:read')
  const activeOnly = getQuery(event).active === 'true'
  return activeOnly
    ? db()`SELECT id,name,phone,nickname,active FROM customers WHERE active=TRUE ORDER BY name`
    : db()`SELECT id,name,phone,nickname,active FROM customers ORDER BY active DESC,name`
})
