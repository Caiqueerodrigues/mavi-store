export default defineEventHandler(async (event) => {
  const user = requirePermission(event, 'costs:manage')
  const input = await validatedBody(event, payableServiceSchema)
  const totalAmount = input.quantity * input.agreedAmount
  const [row] = await db()`INSERT INTO payable_services (order_date, delivery_date, agreed_amount, quantity, service_type_id, service_type_name, recipient_name, total_amount, payment_date, payment_status, created_by, updated_by)
    VALUES (${input.orderDate}, ${input.deliveryDate || null}, ${input.agreedAmount}, ${input.quantity}, NULL, ${input.serviceTypeName}, ${input.recipientName}, ${totalAmount}, ${input.paymentDate || null}, ${input.paymentStatus}, ${user.id}, ${user.id}) RETURNING *`
  await audit(event, 'PAYABLE_SERVICE_CREATED', 'payable_service', row!.id, { serviceType: row!.serviceTypeName, totalAmount: Number(row!.totalAmount) })
  setResponseStatus(event, 201)
  return mapPayableService(row)
})
