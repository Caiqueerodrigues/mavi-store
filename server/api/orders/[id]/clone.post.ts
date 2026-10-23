export default defineEventHandler(async (event) => {
  const user = requirePermission(event, 'orders:write'), id = Number(getRouterParam(event, 'id'))
  const [source] = await db()`SELECT * FROM orders WHERE id=${id} AND deleted_at IS NULL`
  if (!source) throw createApiError({ statusCode: 404, message: 'Pedido não encontrado' })
  const [row] = await db()`INSERT INTO orders (customer_id, customer_name, service_type_id, order_type, product_description, material, color, order_date, due_date,
    quantity, unit_price, paid_amount, payment_status, status, sizes, notes, created_by, updated_by)
    VALUES (${source.customerId}, ${source.customerName}, ${source.serviceTypeId}, ${source.orderType}, ${source.productDescription}, ${source.material}, ${source.color}, CURRENT_DATE,
      ${source.dueDate}, ${source.quantity}, ${source.unitPrice}, 0, 'pending', 'pending', ${JSON.stringify(Array.isArray(source.sizes) ? source.sizes : [])}::jsonb, ${source.notes}, ${user.id}, ${user.id}) RETURNING *`
  await audit(event, 'ORDER_CLONED', 'order', row!.id, { sourceId: id, orderNumber: row!.orderNumber })
  setResponseStatus(event, 201); return mapOrder(row)
})
