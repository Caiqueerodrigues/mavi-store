export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const id = requirePositiveRouteId(event)
  const [row] = await db()`SELECT * FROM payable_services WHERE id=${id}`
  if (!row) throw createApiError({ statusCode: 404, message: 'Conta a pagar não encontrada' })
  return mapPayableService(row)
})
