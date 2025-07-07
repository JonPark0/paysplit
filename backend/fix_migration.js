import Database from './src/utils/database.js';

async function fixMigration() {
    const db = new Database(process.env.DATABASE_PATH || '/app/database/paysplit.db');
    
    try {
        // Initialize database connection
        await db.init();
        console.log('Database connected');
        
        // Delete the incomplete migration record
        await db.run('DELETE FROM migrations WHERE name = ?', ['001_create_tables']);
        console.log('Deleted incomplete migration record');
        
        // Re-run migrations (will now create all tables properly)
        await db.runMigrations();
        console.log('Re-ran migrations successfully');
        
        // Check what tables exist now
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table';");
        console.log('Tables after fix:', tables.map(t => t.name));
        
        await db.close();
        console.log('Migration fix completed successfully');
        
    } catch (error) {
        console.error('Migration fix failed:', error);
        await db.close();
        process.exit(1);
    }
}

fixMigration();