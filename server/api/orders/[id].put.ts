export default defineEventHandler(async (event) => {
  const user = requirePermission(event, 'orders:write'), id = Number(getRouterParam(event, 'id')), input = await validatedBody(event, orderSchema)
  const paidAmount = input.paymentStatus === 'paid'
    ? Math.round((input.quantity * input.unitPrice + Number.EPSILON) * 100) / 100
    : 0
  const [customer] = await db()`SELECT id,name FROM customers WHERE id=${input.customerId} AND active=true`
  const [serviceType] = await db()`SELECT id,name FROM service_types WHERE id=${input.serviceTypeId} AND active=true`
  if (!customer || !serviceType) throw createApiError({ statusCode: 400, message: 'Selecione um cliente e um tipo de serviço ativos' })
  const [before] = await db()`SELECT * FROM orders WHERE id=${id} AND deleted_at IS NULL`
  if (!before) throw createApiError({ statusCode: 404, message: 'Pedido não encontrado' })
  const [row] = await db()`UPDATE orders SET customer_id=${input.customerId}, customer_name=${customer.name}, service_type_id=${input.serviceTypeId}, order_type=${serviceType.name},
    product_description=${input.productDescription}, material=${input.material || null}, color=${input.color || null}, order_date=${input.orderDate},
    due_date=${input.dueDate || null}, payment_date=${input.paymentDate || null}, quantity=${input.quantity}, unit_price=${input.unitPrice}, paid_amount=${paidAmount}, payment_status=${input.paymentStatus}, status=${input.status},
    sizes=${JSON.stringify(input.sizes)}::jsonb, withdrawal_date=${input.withdrawalDate || null}, withdrawn_by=${input.withdrawnBy || null}, notes=${input.notes || null},
    updated_by=${user.id}, updated_at=NOW() WHERE id=${id} AND deleted_at IS NULL RETURNING *`
  if (!row) throw createApiError({ statusCode: 404, message: 'Pedido não encontrado' })
  await audit(event, 'ORDER_UPDATED', 'order', id, { before: mapOrder(before), after: mapOrder(row) })
  return mapOrder(row)
})
