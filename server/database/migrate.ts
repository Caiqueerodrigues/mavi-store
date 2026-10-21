import { closeDatabase, ensureDatabase } from '../utils/db'

try {
  await ensureDatabase()
  console.log('Migrations do banco aplicadas com sucesso')
} catch (error) {
  console.error('Falha ao aplicar migrations do banco')
  console.error(error)
  process.exitCode = 1
} finally {
  await closeDatabase()
}
