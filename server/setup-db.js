const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runSqlFile(connection, filePath) {
    console.log(`Executing ${filePath}...`);
    const sql = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
    
    // Split by semicolons, ignoring semicolons within quotes.
    // A simpler approach for these simple scripts is to use multipleStatements: true in connection
    // But since we create the connection with multiple statements below, we can just run it.
    await connection.query(sql);
    console.log(`Successfully executed ${filePath}`);
}

async function setup() {
    let connection;
    try {
        // First connect without database to create it
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        await runSqlFile(connection, 'database/schema.sql');
        await runSqlFile(connection, 'database/seed.sql');
        
        console.log('Database setup complete!');
    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

setup();
