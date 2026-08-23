const db = require('../db');

async function enqueueJob(type, payload, scheduledAt = null) {
  try {
    const query = scheduledAt 
      ? 'INSERT INTO background_jobs (type, payload, next_run_at) VALUES ($1, $2, $3)'
      : 'INSERT INTO background_jobs (type, payload) VALUES ($1, $2)';
    
    const params = scheduledAt ? [type, payload, scheduledAt] : [type, payload];
    await db.query(query, params);
  } catch (error) {
    console.error('Failed to enqueue job:', error);
  }
}

module.exports = { enqueueJob };
