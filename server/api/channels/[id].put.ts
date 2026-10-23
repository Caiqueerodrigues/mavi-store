export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createApiError({ statusCode: 400, message: 'Canal inválido' })
  const input = await validatedBody(event, channelSchema)
  try {
    const [row] = await db()`UPDATE sales_channels SET name=${input.name},fixed_fee=${input.fixedFee},percentage_fee=${input.percentageFee},active=${input.active},updated_at=NOW() WHERE id=${id} RETURNING id,name,fixed_fee::float8,percentage_fee::float8,active`
    if (!row) throw createApiError({ statusCode: 404, message: 'Canal não encontrado' })
    await audit(event, 'CHANNEL_UPDATED', 'channel', id, { name: input.name, fixedFee: input.fixedFee, percentageFee: input.percentageFee, active: input.active })
    return { id: row.id, name: row.name, fixedFee: row.fixedFee, percentageFee: row.percentageFee, active: row.active }
  } catch (error: any) {
    if (error?.code === '23505') throw createApiError({ statusCode: 409, message: 'Canal já cadastrado' })
    throw error
  }
})
