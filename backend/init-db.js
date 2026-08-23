const fs = require('fs');
const path = require('path');
const db = require('./db');

async function initializeDatabase() {
  try {
    console.log('Checking database schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema to ensure tables exist
    await db.query(schema);
    
    console.log('Database schema successfully initialized/verified.');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  }
}

initializeDatabase().then(() => {
  // Gracefully close pool so script can exit
  db.pool.end();
});
