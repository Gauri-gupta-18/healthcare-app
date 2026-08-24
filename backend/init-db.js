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
    
    // Seed data if empty
    const { rows } = await db.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) === 0) {
      console.log('Seeding initial data...');
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('password123', 10);
      
      // Admin
      await db.query(`INSERT INTO users (name, email, password_hash, role) VALUES ('System Admin', 'admin@healthcare.com', $1, 'admin')`, [hash]);
      
      // Doctor
      const doc = await db.query(`INSERT INTO users (name, email, password_hash, role) VALUES ('Sarah Jenkins', 'doctor@healthcare.com', $1, 'doctor') RETURNING id`, [hash]);
      await db.query(`INSERT INTO doctor_profiles (user_id, specialisation, slot_duration_minutes) VALUES ($1, 'Cardiologist', 30)`, [doc.rows[0].id]);
      
      console.log('Seed data inserted.');
    }

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
