import { z } from 'zod'

const schema = z.object({ targetProfit: z.coerce.number().nonnegative(), defaultChannelId: z.coerce.number().int().positive() })

export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const input = await validatedBody(event, schema)
  await db()`UPDATE app_settings SET target_profit=${input.targetProfit}, default_channel_id=${input.defaultChannelId} WHERE id=1`
  await audit(event, 'SETTINGS_UPDATED', 'settings', 1, input)
  return { ok: true }
})
