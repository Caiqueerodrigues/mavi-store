export default defineEventHandler(async (event) => {
  const user = requirePermission(event, 'orders:write'), input = await validatedBody(event, orderCreateSchema)
  const [customer] = await db()`SELECT id,name FROM customers WHERE id=${input.customerId} AND active=true`
  const [serviceType] = await db()`SELECT id,name FROM service_types WHERE id=${input.serviceTypeId} AND active=true`
  if (!customer || !serviceType) throw createApiError({ statusCode: 400, message: 'Selecione um cliente e um tipo de serviço ativos' })
  try {
    const [row] = await db()`INSERT INTO orders (customer_id, customer_name, service_type_id, order_type, product_description, material, color, order_date, due_date,
      quantity, unit_price, paid_amount, payment_status, status, sizes, withdrawal_date, withdrawn_by, notes, created_by, updated_by)
      VALUES (${input.customerId}, ${customer.name}, ${input.serviceTypeId}, ${serviceType.name}, ${input.productDescription}, ${input.material || null}, ${input.color || null},
      ${input.orderDate}, ${input.dueDate || null}, ${input.quantity}, ${input.unitPrice}, ${input.paidAmount}, ${input.paymentStatus}, ${input.status}, ${JSON.stringify(input.sizes)}::jsonb,
      ${input.withdrawalDate || null}, ${input.withdrawnBy || null}, ${input.notes || null}, ${user.id}, ${user.id}) RETURNING *`
    await audit(event, 'ORDER_CREATED', 'order', row!.id, { orderNumber: row!.orderNumber })
    setResponseStatus(event, 201); return mapOrder(row)
  } catch (error: any) { if (error?.code === '23505') throw createApiError({ statusCode: 409, message: 'Número de pedido já existe' }); throw error }
})
