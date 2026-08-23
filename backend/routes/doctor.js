const express = require('express');
const db = require('../db');
const { authorize } = require('../middleware/auth');
const { generatePostVisitSummary } = require('../services/llm');

const router = express.Router();

router.use(authorize('doctor'));

// View appointments for the logged-in doctor
router.get('/appointments', async (req, res) => {
  try {
    const profileRes = await db.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }
    const doctorId = profileRes.rows[0].id;

    const appointments = await db.query(
      `SELECT a.*, u.name as patient_name 
       FROM appointments a 
       JOIN users u ON a.patient_id = u.id 
       WHERE a.doctor_id = $1 
       ORDER BY a.appointment_date, a.start_time`,
      [doctorId]
    );

    res.json(appointments.rows);
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit post-visit notes (Phase 7)
router.post('/appointments/:id/notes', async (req, res) => {
  const appointmentId = req.params.id;
  const { clinical_notes, prescription } = req.body;

  if (!clinical_notes || !prescription) {
    return res.status(400).json({ error: 'Clinical notes and prescription are required.' });
  }

  try {
    // Save notes immediately
    await db.query(
      `UPDATE appointments 
       SET clinical_notes = $1, prescription = $2, status = 'completed' 
       WHERE id = $3 AND doctor_id = (SELECT id FROM doctor_profiles WHERE user_id = $4)`,
      [clinical_notes, prescription, appointmentId, req.user.id]
    );

    // Call LLM async
    generatePostVisitSummary(clinical_notes, prescription).then(async (summary) => {
      await db.query(
        `UPDATE appointments 
         SET patient_summary = $1, medication_schedule = $2, follow_up_steps = $3 
         WHERE id = $4`,
        [summary.explanation, JSON.stringify(summary.medication_schedule), JSON.stringify(summary.follow_up_steps), appointmentId]
      );
    }).catch(async (err) => {
      console.error('LLM Failed during post-visit summary:', appointmentId);
      await db.query('UPDATE appointments SET llm_failure = TRUE WHERE id = $1', [appointmentId]);
    });

    res.json({ message: 'Notes and prescription saved successfully.' });
  } catch (error) {
    console.error('Error saving post-visit notes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
