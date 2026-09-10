const fs = require('fs');
const path = require('path');
const db = require('./config/db.js');

async function runSqlFile(filePath) {
    console.log(`Executing ${filePath}...`);
    const sql = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
    
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    const connection = await db.getConnection();
    
    for (let statement of statements) {
        await connection.query(statement);
    }
    console.log(`Successfully executed ${filePath}`);
}

async function setup() {
    try {
        await runSqlFile('database/schema.sql');
        await runSqlFile('database/seed.sql');
        
        console.log('Database setup complete!');
    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        process.exit();
    }
}

setup();
