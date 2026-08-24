const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/doctors
// Optional query: ?specialisation=Cardiologist
router.get('/', async (req, res) => {
  const { specialisation } = req.query;

  try {
    let query = `
      SELECT u.id as user_id, u.name, dp.id as doctor_id, dp.specialisation, dp.slot_duration_minutes
      FROM users u
      JOIN doctor_profiles dp ON u.id = dp.user_id
    `;
    const params = [];

    if (specialisation) {
      query += ` WHERE dp.specialisation ILIKE $1`;
      params.push(`%${specialisation}%`);
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
