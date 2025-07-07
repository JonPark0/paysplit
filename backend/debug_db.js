import Database from './src/utils/database.js';

async function checkDatabase() {
    const db = new Database('/var/www/paysplit/database/paysplit.db');
    await db.init();
    
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table';");
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