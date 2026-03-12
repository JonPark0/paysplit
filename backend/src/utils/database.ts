import { Pool, types } from 'pg'

types.setTypeParser(20, (value: string) => Number.parseInt(value, 10))
types.setTypeParser(1700, (value: string) => Number.parseFloat(value))

type SqlParams = Array<string | number | boolean | null>

const toPgPlaceholders = (sql: string, params: SqlParams): string => {
  if (!params || params.length === 0) {
    return sql
  }

  let index = 0
  return sql.replace(/\?/g, () => {
    index += 1
    return `$${index}`
  })
}

interface MigrationDefinition {
  name: string
  statements: string[]
}

class Database {
  private connectionString?: string

  private pool: Pool | null

  constructor(connectionString?: string) {
    this.connectionString = connectionString
    this.pool = null
  }

  async init(): Promise<Pool> {
    if (!this.connectionString) {
      throw new Error('DATABASE_URL is required')
    }

    this.pool = new Pool({
      connectionString: this.connectionString,
      ssl: process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : undefined
    })

    const client = await this.pool.connect()
    client.release()

    console.log('Connected to PostgreSQL database')
    await this.runMigrations()

    return this.pool
  }

  private getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool is not initialized')
    }

    return this.pool
  }

  async runMigrations(): Promise<void> {
    console.log('Running database migrations...')

    await this.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    const migrations: MigrationDefinition[] = [
      {
        name: '001_create_tables',
        statements: [
          `CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            name TEXT,
            admin_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            entry_code TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            last_activity TIMESTAMPTZ DEFAULT NOW(),
            settlement_status TEXT DEFAULT 'active',
            expires_at TIMESTAMPTZ,
            language TEXT DEFAULT 'ko'
          )`,
          `CREATE TABLE IF NOT EXISTS participants (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            joined_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT participants_room_id_fkey
              FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
          )`,
          `CREATE TABLE IF NOT EXISTS receipts (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            uploader_id TEXT NOT NULL,
            original_filename TEXT,
            encrypted_filename TEXT,
            total_amount NUMERIC(10,2) NOT NULL,
            currency TEXT DEFAULT 'KRW',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT receipts_room_id_fkey
              FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
            CONSTRAINT receipts_uploader_id_fkey
              FOREIGN KEY (uploader_id) REFERENCES participants(id)
          )`,
          `CREATE TABLE IF NOT EXISTS receipt_items (
            id TEXT PRIMARY KEY,
            receipt_id TEXT NOT NULL,
            name TEXT NOT NULL,
            price NUMERIC(10,2) NOT NULL,
            quantity INTEGER DEFAULT 1,
            category TEXT,
            CONSTRAINT receipt_items_receipt_id_fkey
              FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
          )`,
          `CREATE TABLE IF NOT EXISTS splits (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            participant_id TEXT NOT NULL,
            amount NUMERIC(10,2) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT splits_item_id_fkey
              FOREIGN KEY (item_id) REFERENCES receipt_items(id) ON DELETE CASCADE,
            CONSTRAINT splits_participant_id_fkey
              FOREIGN KEY (participant_id) REFERENCES participants(id)
          )`,
          `CREATE TABLE IF NOT EXISTS settlements (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            from_participant_id TEXT NOT NULL,
            to_participant_id TEXT NOT NULL,
            amount NUMERIC(10,2) NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            completed_at TIMESTAMPTZ,
            CONSTRAINT settlements_room_id_fkey
              FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
            CONSTRAINT settlements_from_participant_id_fkey
              FOREIGN KEY (from_participant_id) REFERENCES participants(id),
            CONSTRAINT settlements_to_participant_id_fkey
              FOREIGN KEY (to_participant_id) REFERENCES participants(id)
          )`,
          `CREATE TABLE IF NOT EXISTS activity_logs (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            participant_id TEXT,
            action TEXT NOT NULL,
            details TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT activity_logs_room_id_fkey
              FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
          )`,
          `CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            participant_id TEXT NOT NULL,
            token TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT sessions_room_id_fkey
              FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
            CONSTRAINT sessions_participant_id_fkey
              FOREIGN KEY (participant_id) REFERENCES participants(id)
          )`
        ]
      },
      {
        name: '002_create_indexes',
        statements: [
          'CREATE INDEX IF NOT EXISTS idx_rooms_entry_code ON rooms(entry_code)',
          'CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id)',
          'CREATE INDEX IF NOT EXISTS idx_receipts_room_id ON receipts(room_id)',
          'CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id)',
          'CREATE INDEX IF NOT EXISTS idx_splits_item_id ON splits(item_id)',
          'CREATE INDEX IF NOT EXISTS idx_settlements_room_id ON settlements(room_id)',
          'CREATE INDEX IF NOT EXISTS idx_activity_logs_room_id ON activity_logs(room_id)',
          'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)',
          'CREATE INDEX IF NOT EXISTS idx_rooms_settlement_status ON rooms(settlement_status)',
          'CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON rooms(last_activity)'
        ]
      },
      {
        name: '003_add_payer_to_receipts',
        statements: [
          'ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payer_id TEXT',
          'CREATE INDEX IF NOT EXISTS idx_receipts_payer_id ON receipts(payer_id)',
          `DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'receipts_payer_id_fkey'
              ) THEN
                ALTER TABLE receipts
                ADD CONSTRAINT receipts_payer_id_fkey
                FOREIGN KEY (payer_id) REFERENCES participants(id) ON DELETE SET NULL;
              END IF;
            END $$`
        ]
      }
    ]

    for (const migration of migrations) {
      const existing = await this.get<{ name: string }>('SELECT name FROM migrations WHERE name = ?', [migration.name])

      if (existing) {
        continue
      }

      const client = await this.getPool().connect()

      try {
        console.log(`Running migration: ${migration.name}`)
        await client.query('BEGIN')

        for (const statement of migration.statements) {
          await client.query(statement)
        }

        await client.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name])
        await client.query('COMMIT')
        console.log(`Migration ${migration.name} completed successfully`)
      } catch (error) {
        await client.query('ROLLBACK')
        console.error(`Migration ${migration.name} failed:`, error)
        throw error
      } finally {
        client.release()
      }
    }

    console.log('Database migrations completed')
  }

  async run(sql: string, params: SqlParams = []): Promise<{ id: string | number | null; changes: number }> {
    const query = toPgPlaceholders(sql, params)
    const result = await this.getPool().query(query, params)

    return {
      id: (result.rows?.[0] as { id?: string | number } | undefined)?.id ?? null,
      changes: result.rowCount ?? 0
    }
  }

  async get<T = Record<string, unknown>>(sql: string, params: SqlParams = []): Promise<T | null> {
    const query = toPgPlaceholders(sql, params)
    const result = await this.getPool().query(query, params)
    return (result.rows[0] as T) || null
  }

  async all<T = Record<string, unknown>>(sql: string, params: SqlParams = []): Promise<T[]> {
    const query = toPgPlaceholders(sql, params)
    const result = await this.getPool().query(query, params)
    return result.rows as T[]
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      console.log('Database connection closed')
    }
  }
}

export default Database
