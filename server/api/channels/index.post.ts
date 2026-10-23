export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const input = await validatedBody(event, channelSchema)
  try {
    const [row] = await db()`INSERT INTO sales_channels (name, fixed_fee, percentage_fee, active)
      VALUES (${input.name}, ${input.fixedFee}, ${input.percentageFee}, ${input.active}) RETURNING id,name,fixed_fee::float8,percentage_fee::float8,active`
    setResponseStatus(event, 201)
    await audit(event, 'CHANNEL_CREATED', 'channel', row!.id, { name: input.name, fixedFee: input.fixedFee, percentageFee: input.percentageFee })
    return { id: row!.id, name: row!.name, fixedFee: row!.fixedFee, percentageFee: row!.percentageFee, active: row!.active }
  } catch (error: any) {
    if (error?.code === '23505') throw createApiError({ statusCode: 409, message: 'Canal já cadastrado' })
    throw error
  }
})
