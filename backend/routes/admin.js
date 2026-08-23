const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authorize } = require('../middleware/auth');
const { enqueueJob } = require('../services/jobs');

const router = express.Router();

// All routes here are strictly for admins
router.use(authorize('admin'));

// Create Doctor
router.post('/doctors', async (req, res) => {
  const { name, email, password, specialisation, slot_duration_minutes } = req.body;

  try {
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await db.query('BEGIN');

    const newUser = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, password_hash, 'doctor']
    );

    const doctorProfile = await db.query(
      'INSERT INTO doctor_profiles (user_id, specialisation, slot_duration_minutes) VALUES ($1, $2, $3) RETURNING id, specialisation, slot_duration_minutes',
      [newUser.rows[0].id, specialisation, slot_duration_minutes || 30]
    );

    await db.query('COMMIT');

    res.status(201).json({
      user: newUser.rows[0],
      profile: doctorProfile.rows[0]
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error creating doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit Doctor
router.put('/doctors/:id', async (req, res) => {
  const doctorId = req.params.id; // This is the doctor_profiles.id
  const { name, specialisation, slot_duration_minutes } = req.body;

  try {
    await db.query('BEGIN');
    
    // Get user_id for the doctor
    const profileRes = await db.query('SELECT user_id FROM doctor_profiles WHERE id = $1', [doctorId]);
    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    const userId = profileRes.rows[0].user_id;

    if (name) {
      await db.query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
    }

    const updatedProfile = await db.query(
      'UPDATE doctor_profiles SET specialisation = COALESCE($1, specialisation), slot_duration_minutes = COALESCE($2, slot_duration_minutes) WHERE id = $3 RETURNING *',
      [specialisation, slot_duration_minutes, doctorId]
    );

    await db.query('COMMIT');
    res.json(updatedProfile.rows[0]);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error updating doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set Working Hours (bulk replace for a doctor)
router.post('/doctors/:id/working-hours', async (req, res) => {
  const doctorId = req.params.id;
  const { hours } = req.body; // Array of { day_of_week, start_time, end_time }

  try {
    await db.query('BEGIN');
    
    // Clear existing hours
    await db.query('DELETE FROM working_hours WHERE doctor_id = $1', [doctorId]);
    
    // Insert new hours
    for (const h of hours) {
      await db.query(
        'INSERT INTO working_hours (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
        [doctorId, h.day_of_week, h.start_time, h.end_time]
      );
    }
    
    await db.query('COMMIT');
    res.json({ message: 'Working hours updated successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error updating working hours:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set Leave Days
router.post('/doctors/:id/leave-days', async (req, res) => {
  const doctorId = req.params.id;
  const { leave_date } = req.body;

  try {
    await db.query('BEGIN');
    
    await db.query(
      'INSERT INTO leave_days (doctor_id, leave_date) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [doctorId, leave_date]
    );

    // Phase 4: Doctor Leave Conflicts - handle existing appointments
    // Cancel overlapping appointments
    const overlapping = await db.query(
      `UPDATE appointments 
       SET status = 'cancelled' 
       WHERE doctor_id = $1 
         AND appointment_date = $2 
         AND status = 'scheduled'
       RETURNING id, patient_id, appointment_date, start_time`,
      [doctorId, leave_date]
    );

    // Enqueue emails for affected patients
    for (const appt of overlapping.rows) {
      const userRes = await db.query('SELECT email FROM users WHERE id = $1', [appt.patient_id]);
      if (userRes.rows.length > 0) {
        await enqueueJob('email', {
          to: userRes.rows[0].email,
          subject: 'Appointment Cancelled',
          text: `Your appointment on ${appt.appointment_date} at ${appt.start_time} has been cancelled due to doctor unavailability.`
        });
      }
    }

    await db.query('COMMIT');

    res.json({ 
      message: 'Leave day added successfully',
      cancelled_appointments: overlapping.rows
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error setting leave days:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
