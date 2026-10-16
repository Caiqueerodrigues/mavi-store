export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const input = await validatedBody(event, channelSchema)
  const [row] = await db()`INSERT INTO sales_channels (name, fixed_fee, percentage_fee)
    VALUES (${input.name}, ${input.fixedFee}, ${input.percentageFee}) RETURNING id`
  setResponseStatus(event, 201)
  await audit(event, 'CHANNEL_CREATED', 'channel', row!.id, { name: input.name })
  return { id: row!.id }
})
