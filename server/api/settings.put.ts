import { z } from 'zod'

const schema = z.object({ targetProfit: z.coerce.number().nonnegative(), defaultChannelId: z.coerce.number().int().positive() })

export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const input = await validatedBody(event, schema)
  const [channel] = await db()`SELECT id FROM sales_channels WHERE id=${input.defaultChannelId} AND active=true`
  if (!channel) throw createError({ statusCode: 400, statusMessage: 'Selecione um canal de venda ativo' })
  await db()`UPDATE app_settings SET target_profit=${input.targetProfit}, default_channel_id=${input.defaultChannelId} WHERE id=1`
  await audit(event, 'SETTINGS_UPDATED', 'settings', 1, input)
  return { ok: true }
})
