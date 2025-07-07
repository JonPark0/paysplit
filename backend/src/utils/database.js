import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs/promises'

const { verbose } = sqlite3
const sqlite = verbose()

class Database {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
    }

    async init() {
        try {
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            await fs.mkdir(dbDir, { recursive: true });

            // Create database connection
            this.db = new sqlite.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    throw err;
                }
                console.log('Connected to SQLite database');
            });

            // Enable foreign keys
            await this.run('PRAGMA foreign_keys = ON');
            
            // Run migrations
            await this.runMigrations();
            
            return this.db;
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    async runMigrations() {
        console.log('Running database migrations...');
        
        // Check if migrations table exists
        await this.run(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Define migrations
        const migrations = [
            {
                name: '001_create_tables',
                sql: `
                    -- 방 테이블
                    CREATE TABLE IF NOT EXISTS rooms (
                        id TEXT PRIMARY KEY,
                        name TEXT,
                        admin_name TEXT NOT NULL,
                        password_hash TEXT NOT NULL,
                        entry_code TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                        settlement_status TEXT DEFAULT 'active',
                        expires_at DATETIME,
                        language TEXT DEFAULT 'ko'
                    );

                    -- 참가자 테이블
                    CREATE TABLE IF NOT EXISTS participants (
                        id TEXT PRIMARY KEY,
                        room_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        password_hash TEXT NOT NULL,
                        is_admin BOOLEAN DEFAULT FALSE,
                        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
                    );

                    -- 영수증 테이블
                    CREATE TABLE IF NOT EXISTS receipts (
                        id TEXT PRIMARY KEY,
                        room_id TEXT NOT NULL,
                        uploader_id TEXT NOT NULL,
                        original_filename TEXT,
                        encrypted_filename TEXT,
                        total_amount DECIMAL(10,2) NOT NULL,
                        currency TEXT DEFAULT 'KRW',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
                        FOREIGN KEY (uploader_id) REFERENCES participants(id)
                    );

                    -- 영수증 항목 테이블
                    CREATE TABLE IF NOT EXISTS receipt_items (
                        id TEXT PRIMARY KEY,
                        receipt_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        price DECIMAL(10,2) NOT NULL,
                        quantity INTEGER DEFAULT 1,
                        category TEXT,
                        FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
                    );

                    -- 분할 테이블
                    CREATE TABLE IF NOT EXISTS splits (
                        id TEXT PRIMARY KEY,
                        item_id TEXT NOT NULL,
                        participant_id TEXT NOT NULL,
                        amount DECIMAL(10,2) NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (item_id) REFERENCES receipt_items(id) ON DELETE CASCADE,
                        FOREIGN KEY (participant_id) REFERENCES participants(id)
                    );

                    -- 정산 테이블
                    CREATE TABLE IF NOT EXISTS settlements (
                        id TEXT PRIMARY KEY,
                        room_id TEXT NOT NULL,
                        from_participant_id TEXT NOT NULL,
                        to_participant_id TEXT NOT NULL,
                        amount DECIMAL(10,2) NOT NULL,
                        status TEXT DEFAULT 'pending',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        completed_at DATETIME,
                        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
                        FOREIGN KEY (from_participant_id) REFERENCES participants(id),
                        FOREIGN KEY (to_participant_id) REFERENCES participants(id)
                    );

                    -- 활동 로그 테이블
                    CREATE TABLE IF NOT EXISTS activity_logs (
                        id TEXT PRIMARY KEY,
                        room_id TEXT NOT NULL,
                        participant_id TEXT,
                        action TEXT NOT NULL,
                        details TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
                    );

                    -- 세션 테이블
                    CREATE TABLE IF NOT EXISTS sessions (
                        id TEXT PRIMARY KEY,
                        room_id TEXT NOT NULL,
                        participant_id TEXT NOT NULL,
                        token TEXT NOT NULL,
                        expires_at DATETIME NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
                        FOREIGN KEY (participant_id) REFERENCES participants(id)
                    );
                `
            },
            {
                name: '002_create_indexes',
                sql: `
                    -- 인덱스 생성
                    CREATE INDEX IF NOT EXISTS idx_rooms_entry_code ON rooms(entry_code);
                    CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id);
                    CREATE INDEX IF NOT EXISTS idx_receipts_room_id ON receipts(room_id);
                    CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
                    CREATE INDEX IF NOT EXISTS idx_splits_item_id ON splits(item_id);
                    CREATE INDEX IF NOT EXISTS idx_settlements_room_id ON settlements(room_id);
                    CREATE INDEX IF NOT EXISTS idx_activity_logs_room_id ON activity_logs(room_id);
                    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
                    CREATE INDEX IF NOT EXISTS idx_rooms_settlement_status ON rooms(settlement_status);
                    CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON rooms(last_activity);
                `
            }
        ];

        // Run each migration
        for (const migration of migrations) {
            const existing = await this.get(
                'SELECT name FROM migrations WHERE name = ?',
                [migration.name]
            );

            if (!existing) {
                console.log(`Running migration: ${migration.name}`);
                await this.run(migration.sql);
                await this.run(
                    'INSERT INTO migrations (name) VALUES (?)',
                    [migration.name]
                );
            }
        }

        console.log('Database migrations completed');
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database run error:', err);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Database get error:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database all error:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

export default Database