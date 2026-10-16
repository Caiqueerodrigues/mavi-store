import postgres from 'postgres'
import { hash } from 'bcryptjs'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { resolve } from 'node:path'

let client: ReturnType<typeof postgres> | undefined
let ready: Promise<void> | undefined

export function db() {
  if (!client) {
    const config = useRuntimeConfig()
    client = postgres(config.databaseUrl, { max: 10, prepare: false, transform: postgres.camel, connection: { TimeZone: String(config.appTimeZone || 'America/Sao_Paulo') } })
  }
  return client
}

export function ensureDatabase() {
  if (!ready) ready = migrateAndSeed()
  return ready
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
        sku VARCHAR(80) UNIQUE,
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
        order_type VARCHAR(40) NOT NULL DEFAULT 'CORTE',
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

    const config = useRuntimeConfig()
    const adminCount = Number((await tx`SELECT COUNT(*)::int AS admin_count FROM users WHERE role='admin'`)[0]?.adminCount || 0)
    if (adminCount === 0 && config.adminInitialPassword) {
      const passwordHash = await hash(config.adminInitialPassword, 12)
      await tx`INSERT INTO users (name, email, password_hash, role, must_change_password)
        VALUES ('Administrador', 'admin@mavicustos.local', ${passwordHash}, 'admin', TRUE)`
    }

    if (applied.has('003_initial_catalog')) return
    const count = Number((await tx`SELECT COUNT(*)::int AS count FROM materials`)[0]?.count || 0)
    if (count > 0) {
      await seedExtendedCatalog(tx)
      await tx`INSERT INTO schema_migrations (version) VALUES ('003_initial_catalog')`
      return
    }

    await tx`
      INSERT INTO sales_channels (name, fixed_fee, percentage_fee)
      VALUES ('Shopee', 4.50, 0.20), ('Venda direta', 0, 0)
    `
    await tx`INSERT INTO app_settings (id, target_profit, default_channel_id) VALUES (1, 5, 1)`
    await tx`
      INSERT INTO materials (name, supplier, unit, purchase_price, purchase_quantity) VALUES
      ('Base geral da sandália', 'Composição da planilha', 'PAR', 12.423, 1),
      ('Tira Nice Ouro Light', 'Fornecedor atual', 'MT', 5.90, 1),
      ('Tira Mônaco Bco Cristal', 'Fornecedor atual', 'MT', 5.90, 1),
      ('Tira Colmeia 4mm Bco Cristal', 'Fornecedor atual', 'MT', 3.90, 1),
      ('Tira Paris Camurça Bco/Cristal', 'Fornecedor atual', 'MT', 3.50, 1),
      ('Trança Spectro Dourado', 'Fornecedor atual', 'MT', 2.00, 1),
      ('Sola All Star', 'Noroeste', 'PAR', 3.30, 1),
      ('Forro', 'Noroeste', 'MT', 12.64, 1),
      ('Material Spectro Ouro', 'Noroeste', 'MT', 26.90, 1),
      ('Manta strass', 'Compofram', 'MT', 16.00, 1),
      ('Fivela', 'VL Bandeirantes', 'UN', 19.00, 100)
    `
    await tx`
      INSERT INTO products (name, sku, category, color, current_price) VALUES
      ('Ana', 'ANA-OURO', 'Sandália', 'Ouro', 37.99),
      ('Luíza', 'LUIZA-CRISTAL', 'Sandália', 'Rosa / Preto / Branco', 33.99),
      ('Pietra', 'PIETRA-COLMEIA', 'Sandália', 'Rosa / Preto / Branco', 32.99),
      ('Patricia', 'PATRICIA-PARIS', 'Sandália', 'Rosa / Preto / Branco', 32.99),
      ('Lara', 'LARA-DOURADO', 'Sandália', 'Ouro', 29.99)
    `
    await tx`INSERT INTO product_components (product_id, material_id, quantity) SELECT p.id, 1, 1 FROM products p`
    await tx`INSERT INTO product_components (product_id, material_id, quantity) SELECT id, 2, 0.97 FROM products WHERE name = 'Ana'`
    await tx`INSERT INTO product_components (product_id, material_id, quantity) SELECT id, 3, 0.97 FROM products WHERE name = 'Luíza'`
    await tx`INSERT INTO product_components (product_id, material_id, quantity) SELECT id, 4, 1.07 FROM products WHERE name = 'Pietra'`
    await tx`INSERT INTO product_components (product_id, material_id, quantity) SELECT id, 5, 0.99 FROM products WHERE name = 'Patricia'`
    await tx`INSERT INTO product_components (product_id, material_id, quantity) SELECT id, 6, 1 FROM products WHERE name = 'Lara'`
    await seedExtendedCatalog(tx)
    await tx`INSERT INTO schema_migrations (version) VALUES ('003_initial_catalog')`
  })
  await migrate(drizzle(sql), { migrationsFolder: resolve(process.cwd(), 'drizzle') })
}

async function seedExtendedCatalog(tx: any) {
  const extraMaterials = [
    ['Base cabedal Lívia', 'Composição Cabedal', 'PAR', 15.185], ['Enfeite Flor/Laço/Borboleta', 'Produção própria', 'PAR', 1.52],
    ['Enfeite Strass Lívia', 'Compofram', 'PAR', 1.225], ['Enfeite Ágata', 'Produção própria', 'PAR', 2.04], ['Enfeite Carol', 'Produção própria', 'PAR', 1.59],
    ['Palmilha corte tênis', 'Produção própria', 'PAR', .25], ['Montagem tênis', 'Produção própria', 'PAR', 4], ['Corte cabedal tênis', 'Produção própria', 'PAR', .5],
    ['Embalagem Shopee', 'Shopee', 'UN', .19], ['Waster', 'Produção própria', 'PAR', .8], ['Pesponto tênis', 'Produção própria', 'PAR', 1.5],
    ['Caixa para tênis', 'Fornecedor atual', 'UN', .9], ['Enfeite emborrachado', 'Silvana/Quemil', 'PAR', 2],
    ['Cabedal cacharrel', 'Noroeste', 'PAR', 1.5], ['Palmilha EVA forrada', 'Noroeste', 'PAR', .3333333333], ['Cabedal nylon', 'Noroeste', 'PAR', 1.75]
  ]
  for (const [name, supplier, unit, price] of extraMaterials) await tx`INSERT INTO materials (name,supplier,unit,purchase_price,purchase_quantity)
    SELECT ${name},${supplier},${unit},${price},1 WHERE NOT EXISTS (SELECT 1 FROM materials WHERE name=${name})`
  const extraProducts = [
    ['Lívia Flor','CAB-LIVIA-FLOR','Sandália de cabedal','',33.99],['Lívia Laço','CAB-LIVIA-LACO','Sandália de cabedal','',33.99],
    ['Lívia Borboleta','CAB-LIVIA-BORB','Sandália de cabedal','',36.63],['Lívia Strass','CAB-LIVIA-STRASS','Sandália de cabedal','',34.63],
    ['Ágata','CAB-AGATA','Sandália de cabedal','',34.65],['Carol','CAB-CAROL','Sandália de cabedal','',33.99],
    ['Tênis Cacharrel','TENIS-CACHARREL','Tênis','',34.49],['Tênis Nylon','TENIS-NYLON','Tênis','',32.99]
  ]
  for (const [name, sku, category, color, price] of extraProducts) await tx`INSERT INTO products (name,sku,category,color,current_price)
    VALUES (${name},${sku},${category},${color || null},${price}) ON CONFLICT (sku) DO NOTHING`
  const links: Record<string,string[]> = {
    'CAB-LIVIA-FLOR':['Base cabedal Lívia','Enfeite Flor/Laço/Borboleta'], 'CAB-LIVIA-LACO':['Base cabedal Lívia','Enfeite Flor/Laço/Borboleta'],
    'CAB-LIVIA-BORB':['Base cabedal Lívia','Enfeite Flor/Laço/Borboleta'], 'CAB-LIVIA-STRASS':['Base cabedal Lívia','Enfeite Strass Lívia'],
    'CAB-AGATA':['Base cabedal Lívia','Enfeite Ágata'], 'CAB-CAROL':['Base cabedal Lívia','Enfeite Carol'],
    'TENIS-CACHARREL':['Palmilha corte tênis','Montagem tênis','Corte cabedal tênis','Embalagem Shopee','Waster','Sola All Star','Pesponto tênis','Caixa para tênis','Enfeite emborrachado','Cabedal cacharrel','Palmilha EVA forrada'],
    'TENIS-NYLON':['Palmilha corte tênis','Montagem tênis','Corte cabedal tênis','Embalagem Shopee','Waster','Sola All Star','Pesponto tênis','Caixa para tênis','Cabedal nylon','Palmilha EVA forrada']
  }
  for (const [sku, names] of Object.entries(links)) for (const materialName of names) await tx`INSERT INTO product_components (product_id,material_id,quantity)
    SELECT p.id,m.id,1 FROM products p,materials m WHERE p.sku=${sku} AND m.name=${materialName}
    ON CONFLICT (product_id,material_id) DO NOTHING`
}
