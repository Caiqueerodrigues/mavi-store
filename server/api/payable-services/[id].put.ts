export default defineEventHandler(async (event) => {
  const user = requirePermission(event, 'costs:manage')
  const id = requirePositiveRouteId(event)
  const input = await validatedBody(event, payableServiceSchema)
  const [before] = await db()`SELECT * FROM payable_services WHERE id=${id}`
  if (!before) throw createApiError({ statusCode: 404, message: 'Conta a pagar não encontrada' })
  const totalAmount = input.quantity * input.agreedAmount
  const [row] = await db()`UPDATE payable_services SET order_date=${input.orderDate}, delivery_date=${input.deliveryDate || null}, agreed_amount=${input.agreedAmount},
    quantity=${input.quantity}, service_type_id=NULL, service_type_name=${input.serviceTypeName}, recipient_name=${input.recipientName}, total_amount=${totalAmount}, payment_date=${input.paymentDate || null},
    payment_status=${input.paymentStatus}, updated_by=${user.id}, updated_at=NOW() WHERE id=${id} RETURNING *`
  await audit(event, 'PAYABLE_SERVICE_UPDATED', 'payable_service', id, { before: mapPayableService(before), after: mapPayableService(row) })
  return mapPayableService(row)
})
