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
      
      // Doctors
      const doc1 = await db.query(`INSERT INTO users (name, email, password_hash, role) VALUES ('Sarah Jenkins', 'cardiologist@healthcare.com', $1, 'doctor') RETURNING id`, [hash]);
      await db.query(`INSERT INTO doctor_profiles (user_id, specialisation, slot_duration_minutes) VALUES ($1, 'Cardiologist', 30)`, [doc1.rows[0].id]);
      
      console.log('Seed data inserted.');
    }

    // Backfill ALL required specialisations
    const specsToBackfill = ['Cardiologist', 'Pediatrician', 'Dermatologist', 'Neurologist'];
    for (const spec of specsToBackfill) {
      const { rows } = await db.query('SELECT id FROM doctor_profiles WHERE specialisation = $1', [spec]);
      if (rows.length === 0) {
        try {
          console.log(`Backfilling missing ${spec}...`);
          const bcrypt = require('bcrypt');
          const hash = await bcrypt.hash('password123', 10);
          const nameMapping = {
            'Cardiologist': 'Sarah Jenkins',
            'Pediatrician': 'Emily Chen',
            'Dermatologist': 'Marcus Thorne',
            'Neurologist': 'Olivia Grant'
          };
          const name = nameMapping[spec] || `${spec} Specialist`;
          const email = `${spec.toLowerCase()}@healthcare.com`;
          
          let userId;
          const userRes = await db.query('SELECT id FROM users WHERE email = $1', [email]);
          if (userRes.rows.length > 0) {
            userId = userRes.rows[0].id;
          } else {
            const doc = await db.query(`INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'doctor') RETURNING id`, [name, email, hash]);
            userId = doc.rows[0].id;
          }
          const docRes = await db.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [userId]);
          if (docRes.rows.length === 0) {
            await db.query(`INSERT INTO doctor_profiles (user_id, specialisation, slot_duration_minutes) VALUES ($1, $2, 30)`, [userId, spec]);
          }
        } catch (e) {
          console.error(`Failed to backfill ${spec}:`, e);
        }
      }
    }

    // Backfill working hours for any doctor who doesn't have them
    const docsWithoutHours = await db.query(`
      SELECT dp.id FROM doctor_profiles dp
      LEFT JOIN working_hours wh ON dp.id = wh.doctor_id
      WHERE wh.id IS NULL
    `);
    
    if (docsWithoutHours.rows.length > 0) {
      console.log(`Backfilling working hours for ${docsWithoutHours.rows.length} doctor(s)...`);
      for (const doc of docsWithoutHours.rows) {
        // Add Mon-Fri (1-5) 9am to 5pm
        for (let day = 1; day <= 5; day++) {
          await db.query(
            'INSERT INTO working_hours (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
            [doc.id, day, '09:00:00', '17:00:00']
          );
        }
      }
    }

    // Forcefully clean up any old 'Dr. Dr. Test' names from previous seeds
    await db.query(`UPDATE users SET name = 'Emily Chen' WHERE email = 'pediatrician@healthcare.com'`);
    await db.query(`UPDATE users SET name = 'Marcus Thorne' WHERE email = 'dermatologist@healthcare.com'`);
    await db.query(`UPDATE users SET name = 'Olivia Grant' WHERE email = 'neurologist@healthcare.com'`);
    await db.query(`UPDATE users SET name = 'Sarah Jenkins' WHERE email = 'cardiologist@healthcare.com'`);
    
    // Clean up any remaining "Dr. " prefixes just in case
    await db.query(`UPDATE users SET name = REPLACE(name, 'Dr. Dr. ', '') WHERE role = 'doctor'`);
    await db.query(`UPDATE users SET name = REPLACE(name, 'Dr. ', '') WHERE role = 'doctor'`);

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
