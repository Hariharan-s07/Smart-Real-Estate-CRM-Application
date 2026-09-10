const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const dbPromise = open({
    filename: path.join(__dirname, '../../database/database.sqlite'),
    driver: sqlite3.Database
}).then(async (db) => {
    await db.run('PRAGMA foreign_keys = ON');
    return db;
});

const queryDb = async (sql, params = []) => {
    const db = await dbPromise;
    
    // Strip MySQL specific syntax that SQLite doesn't understand
    let processedSql = sql.replace(/FOR UPDATE/gi, '');
    
    const isSelect = processedSql.trim().match(/^(SELECT|SHOW|DESCRIBE|EXPLAIN|PRAGMA)/i);
    if (isSelect) {
        const rows = await db.all(processedSql, params);
        return [rows, []];
    } else {
        const result = await db.run(processedSql, params);
        return [{ insertId: result.lastID, affectedRows: result.changes }, []];
    }
};

module.exports = {
    query: queryDb,
    getConnection: async () => {
        const db = await dbPromise;
        return {
            beginTransaction: async () => await db.run('BEGIN TRANSACTION'),
            commit: async () => await db.run('COMMIT'),
            rollback: async () => await db.run('ROLLBACK'),
            query: queryDb,
            release: () => {} // No-op for sqlite
        };
    }
};
