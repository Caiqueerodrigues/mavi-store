import { db, ensureDatabase } from '../utils/db'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export default defineNitroPlugin(async () => {
  const migrationsFolder = resolve(process.cwd(), 'drizzle')
  const journal = JSON.parse(await readFile(resolve(migrationsFolder, 'meta/_journal.json'), 'utf8'))
  const latestMigration = journal.entries.at(-1)
  if (!latestMigration) throw new Error('Journal de migrations vazio ou inválido')

  await ensureDatabase()
  const [migrationState] = await db()`
    SELECT COUNT(*)::int AS count, MAX(created_at)::text AS latest
    FROM drizzle.__drizzle_migrations
  `
  if (Number(migrationState?.latest ?? 0) < latestMigration.when) {
    throw new Error(
      `Banco com migrations pendentes: esperado ${latestMigration.tag} (${latestMigration.when}), ` +
      `última aplicada ${migrationState?.latest ?? 'nenhuma'}`,
    )
  }
  console.info('[database] Migrações verificadas no startup.', {
    appliedCount: migrationState?.count ?? 0,
    latestAppliedAt: migrationState?.latest ?? null,
    latestMigration: latestMigration.tag,
  })
})
