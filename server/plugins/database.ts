export default defineNitroPlugin(async () => {
  await ensureDatabase()
})
