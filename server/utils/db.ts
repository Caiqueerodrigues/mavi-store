import postgres from 'postgres'
import { hash } from 'bcryptjs'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { resolve } from 'node:path'

let client: ReturnType<typeof postgres> | undefined
let ready: Promise<void> | undefined

function runtimeDatabaseConfig() {
  try {
    return useRuntimeConfig()
  } catch {
    return {
      databaseUrl: process.env.NUXT_DATABASE_URL,
      databaseAdminUrl: process.env.NUXT_DATABASE_ADMIN_URL,
      appTimeZone: process.env.NUXT_APP_TIME_ZONE || 'America/Sao_Paulo'
    }
  }
}

export function db() {
  if (!client) {
    const config = runtimeDatabaseConfig()
    if (!config.databaseUrl) throw new Error('NUXT_DATABASE_URL é obrigatório para acessar o banco')
    client = postgres(config.databaseUrl, { max: 10, prepare: false, transform: postgres.camel, connection: { TimeZone: String(config.appTimeZone || 'America/Sao_Paulo') } })
  }
  return client
}

export async function closeDatabase() {
  if (!client) return
  await client.end()
  client = undefined
  ready = undefined
}

export function ensureDatabase() {
  if (!ready) {
    ready = createDatabaseIfNeeded().then(migrateAndSeed).catch((error) => {
      ready = undefined
      throw error
    })
  }
  return ready
}

async function createDatabaseIfNeeded() {
  const config = runtimeDatabaseConfig()
  const adminUrl = String(config.databaseAdminUrl || '')
  if (!adminUrl) return

  const targetUrl = new URL(String(config.databaseUrl))
  const databaseName = decodeURIComponent(targetUrl.pathname.replace(/^\//, ''))
  const ownerName = decodeURIComponent(targetUrl.username)
  if (!databaseName || !ownerName || databaseName.includes('\u0000') || ownerName.includes('\u0000')) {
    throw new Error('NUXT_DATABASE_URL deve informar usuario e nome de banco validos')
  }

  const admin = postgres(adminUrl, { max: 1, prepare: false })
  try {
    const existing = await admin`SELECT 1 FROM pg_database WHERE datname = ${databaseName}`
    if (existing.length === 0) {
      const quotedName = `"${databaseName.replace(/"/g, '""')}"`
      const quotedOwner = `"${ownerName.replace(/"/g, '""')}"`
      try {
        await admin.unsafe(`CREATE DATABASE ${quotedName} OWNER ${quotedOwner}`)
      } catch (error: any) {
        if (error?.code !== '42P04') throw error
      }
    }
  } finally {
    await admin.end()
  }
}

async function migrateAndSeed() {
  const sql = db()
  await sql.begin(async (tx) => {
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(120) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
    const applied = new Set((await tx`SELECT version FROM schema_migrations`).map((row: any) => row.version))
    const schemaStatements = `
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        name VARCHAR(160) NOT NULL,
        supplier VARCHAR(160),
        unit VARCHAR(20) NOT NULL DEFAULT 'UN',
        purchase_price NUMERIC(12,4) NOT NULL CHECK (purchase_price >= 0),
        purchase_quantity NUMERIC(12,4) NOT NULL DEFAULT 1 CHECK (purchase_quantity > 0),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sales_channels (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        fixed_fee NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (fixed_fee >= 0),
        percentage_fee NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (percentage_fee >= 0 AND percentage_fee < 1)
      );
      CREATE TABLE IF NOT EXISTS app_settings (
        id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        target_profit NUMERIC(12,4) NOT NULL DEFAULT 5 CHECK (target_profit >= 0),
        default_channel_id INTEGER REFERENCES sales_channels(id)
      );
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(160) NOT NULL,
        sku VARCHAR(80) NOT NULL UNIQUE,
        category VARCHAR(60) NOT NULL DEFAULT 'Sandália',
        color VARCHAR(120),
        current_price NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (current_price >= 0),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS product_components (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        material_id INTEGER NOT NULL REFERENCES materials(id),
        quantity NUMERIC(12,4) NOT NULL CHECK (quantity > 0),
        waste_percent NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (waste_percent >= 0),
        UNIQUE(product_id, material_id)
      );
      CREATE INDEX IF NOT EXISTS idx_components_product ON product_components(product_id);
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(140) NOT NULL,
        email VARCHAR(200) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(30) NOT NULL CHECK (role IN ('admin','manager','operator','viewer')),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS refresh_sessions (
        id UUID PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash CHAR(64) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        replaced_by UUID,
        ip_address VARCHAR(64),
        user_agent VARCHAR(500),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_sessions(user_id, revoked_at);
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(40) NOT NULL UNIQUE,
        customer_name VARCHAR(160) NOT NULL,
        order_type VARCHAR(40) NOT NULL,
        product_description VARCHAR(300) NOT NULL,
        material VARCHAR(180),
        color VARCHAR(120),
        order_date DATE NOT NULL,
        due_date DATE,
        quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(12,4) NOT NULL CHECK (unit_price >= 0),
        paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
        status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_production','ready','delivered','cancelled')),
        sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
        withdrawal_date DATE,
        withdrawn_by VARCHAR(160),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_orders_active_date ON orders(deleted_at, order_date DESC);
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        user_name VARCHAR(140),
        action VARCHAR(80) NOT NULL,
        entity VARCHAR(80) NOT NULL,
        entity_id VARCHAR(80),
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        ip_address VARCHAR(64),
        user_agent VARCHAR(500),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
    `.split(';').map((statement) => statement.trim()).filter(Boolean)
    if (!applied.has('001_initial_schema')) {
      for (const statement of schemaStatements) await tx.unsafe(statement)
      await tx`INSERT INTO schema_migrations (version) VALUES ('001_initial_schema')`
    }
    if (!applied.has('002_refresh_session_ttl')) {
      await tx`UPDATE refresh_sessions SET expires_at=LEAST(expires_at, created_at + INTERVAL '1 day') WHERE revoked_at IS NULL`
      await tx`INSERT INTO schema_migrations (version) VALUES ('002_refresh_session_ttl')`
    }

  })
  await migrate(drizzle(sql), { migrationsFolder: resolve(process.cwd(), 'drizzle') })
  await secureInitialAdmin(sql)
}

async function secureInitialAdmin(sql: ReturnType<typeof postgres>) {
  const initialPassword = 'Teste@123'
  const initialName = 'Caique Rodrigues Almeida'
  const initialEmail = 'caiquerodriguesalmeida@gmail.com'
  const compromisedSeedHash = '$2b$12$pqz5SplEj6MKNLthaTkhNO03QJ4vevQdTpf6GsKu0XDNKFlRUFhhu'
  const [seeded] = await sql`SELECT id FROM users WHERE password_hash=${compromisedSeedHash} LIMIT 1`
  const [adminCount] = await sql`SELECT COUNT(*)::int AS count FROM users WHERE role='admin' AND active=TRUE AND deleted_at IS NULL`
  if (!seeded && Number(adminCount?.count || 0) > 0) return

  const passwordHash = await hash(initialPassword, 12)
  if (seeded)
    await sql`UPDATE users SET password_hash=${passwordHash}, must_change_password=TRUE, updated_at=NOW() WHERE password_hash=${compromisedSeedHash}`
  if (Number(adminCount?.count || 0) === 0)
    await sql`INSERT INTO users (name, email, password_hash, role, must_change_password)
      VALUES (${initialName}, ${initialEmail}, ${passwordHash}, 'admin', TRUE)`
}

