import { db, ensureDatabase } from '../utils/db'

export default defineNitroPlugin(async () => {
  await ensureDatabase()
  const [migrationState] = await db()`
    SELECT COUNT(*)::int AS count, MAX(created_at)::text AS latest
    FROM drizzle.__drizzle_migrations
  `
  console.info('[database] Migrações verificadas no startup.', {
    appliedCount: migrationState?.count ?? 0,
    latestAppliedAt: migrationState?.latest ?? null,
  })
})
