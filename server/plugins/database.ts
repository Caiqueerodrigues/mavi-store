export default defineNitroPlugin(async () => {
  await ensureDatabase()
  console.info('[database] Schema inicializado e migrações aplicadas.')
})
