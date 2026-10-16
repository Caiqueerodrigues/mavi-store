export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const [row] = await db()`
    SELECT s.target_profit::float8, s.default_channel_id, c.name AS channel_name
    FROM app_settings s JOIN sales_channels c ON c.id=s.default_channel_id WHERE s.id=1`
  return { targetProfit: row!.targetProfit, defaultChannelId: row!.defaultChannelId, channelName: row!.channelName }
})
