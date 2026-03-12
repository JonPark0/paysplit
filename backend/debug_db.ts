// @ts-nocheck
import Database from './src/utils/database.js';

async function checkDatabase() {
    const db = new Database(process.env.DATABASE_URL || 'postgresql://paysplit:paysplit@localhost:5432/paysplit');
    await db.init();
    
    const tables = await db.all(`
      SELECT table_name AS name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Tables:', tables);
    
    for (const table of tables) {
        if (table.name !== 'migrations') {
            try {
                const count = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
                console.log(`${table.name}: ${count.count} rows`);
            } catch (error) {
                console.log(`${table.name}: Error - ${error.message}`);
            }
        }
    }
    
    await db.close();
}

checkDatabase().catch(console.error);
