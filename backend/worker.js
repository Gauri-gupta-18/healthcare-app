const db = require('./db');
const { sendEmail } = require('./services/email');
// const { createEvent } = require('./services/calendar'); // To be integrated if needed

async function processJobs() {
  try {
    // Fetch one pending job that is due
    const result = await db.query(
      `UPDATE background_jobs 
       SET status = 'processing' 
       WHERE id = (
         SELECT id FROM background_jobs 
         WHERE status = 'pending' AND next_run_at <= CURRENT_TIMESTAMP 
         ORDER BY next_run_at ASC 
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       ) RETURNING *`
    );

    if (result.rows.length === 0) {
      return; // No jobs to process
    }

    const job = result.rows[0];
    
    try {
      if (job.type === 'email') {
        await sendEmail(job.payload);
      } else if (job.type === 'calendar') {
        // Handle calendar API calls here if queued
      }
      
      // Mark completed
      await db.query('UPDATE background_jobs SET status = \'completed\' WHERE id = $1', [job.id]);
    } catch (err) {
      console.error(`Job ${job.id} failed:`, err);
      // Retry logic: increment attempts, if < 3 set back to pending with delay
      if (job.attempts < 3) {
        await db.query(
          `UPDATE background_jobs 
           SET status = 'pending', attempts = attempts + 1, next_run_at = CURRENT_TIMESTAMP + interval '5 minutes', error_log = $2
           WHERE id = $1`,
          [job.id, err.message]
        );
      } else {
        await db.query('UPDATE background_jobs SET status = \'failed\', error_log = $2 WHERE id = $1', [job.id, err.message]);
      }
    }
  } catch (err) {
    console.error('Job processor error:', err);
  }
}

// Poll every 5 seconds for jobs
setInterval(processJobs, 5000);

// Daily cron for reminders (runs every 24 hours in a simple setup)
setInterval(async () => {
  try {
    // 1. Appointment reminders (24h before)
    const appts = await db.query(`
      SELECT a.id, a.appointment_date, a.start_time, u.email 
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      WHERE a.status = 'scheduled' 
      AND a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
    `);
    
    for (const appt of appts.rows) {
      await db.query('INSERT INTO background_jobs (type, payload) VALUES ($1, $2)', [
        'email',
        {
          to: appt.email,
          subject: 'Appointment Reminder',
          text: `Reminder: You have an appointment tomorrow at ${appt.start_time}.`
        }
      ]);
    }
    console.log(`Enqueued ${appts.rows.length} appointment reminders.`);

    // 2. Medication reminders (simplified daily check for completed appts with medication)
    const meds = await db.query(`
      SELECT a.id, a.medication_schedule, u.email 
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      WHERE a.status = 'completed' AND a.medication_schedule IS NOT NULL
    `);
    
    // In a real system, we'd check if the medication duration is still active.
    for (const med of meds.rows) {
      await db.query('INSERT INTO background_jobs (type, payload) VALUES ($1, $2)', [
        'email',
        {
          to: med.email,
          subject: 'Daily Medication Reminder',
          text: `Please remember to take your medication as prescribed.`
        }
      ]);
    }
  } catch (error) {
    console.error('Cron job error:', error);
  }
}, 24 * 60 * 60 * 1000); // Once a day

console.log('Background job worker and cron scheduler started.');
