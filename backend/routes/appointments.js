const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { generatePreVisitSummary, generatePostVisitSummary } = require('../services/llm');
const { enqueueJob } = require('../services/jobs');

const router = express.Router();

// Get available slots for a doctor on a specific date
router.get('/doctors/:id/slots', async (req, res) => {
  const doctorId = req.params.id;
  const { date } = req.query; // YYYY-MM-DD

  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  try {
    const parsedDate = new Date(date);
    const dayOfWeek = parsedDate.getDay();

    // Check leave days
    const leaveRes = await db.query(
      'SELECT 1 FROM leave_days WHERE doctor_id = $1 AND leave_date = $2',
      [doctorId, date]
    );

    if (leaveRes.rows.length > 0) {
      return res.json({ slots: [] }); // Doctor is on leave
    }

    // Get working hours
    const hoursRes = await db.query(
      'SELECT start_time, end_time FROM working_hours WHERE doctor_id = $1 AND day_of_week = $2',
      [doctorId, dayOfWeek]
    );

    if (hoursRes.rows.length === 0) {
      return res.json({ slots: [] }); // Not working on this day
    }

    const { start_time, end_time } = hoursRes.rows[0];

    // Get doctor's slot duration
    const profileRes = await db.query('SELECT slot_duration_minutes FROM doctor_profiles WHERE id = $1', [doctorId]);
    const duration = profileRes.rows[0].slot_duration_minutes || 30;

    // Get already booked slots
    const bookedRes = await db.query(
      'SELECT start_time FROM appointments WHERE doctor_id = $1 AND appointment_date = $2 AND status = \'scheduled\'',
      [doctorId, date]
    );
    const bookedSlots = new Set(bookedRes.rows.map(r => r.start_time.substring(0, 5) + ':00'));

    // Generate slots
    const slots = [];
    let current = new Date(`1970-01-01T${start_time}Z`);
    const end = new Date(`1970-01-01T${end_time}Z`);

    while (current < end) {
      const timeStr = current.toISOString().substring(11, 19); // HH:mm:ss
      if (!bookedSlots.has(timeStr)) {
        slots.push(timeStr);
      }
      current.setMinutes(current.getMinutes() + duration);
    }

    res.json({ slots });
  } catch (error) {
    console.error('Error generating slots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Book an appointment (Patient)
router.post('/', authenticate, async (req, res) => {
  const { doctor_id, appointment_date, start_time, symptoms } = req.body;
  
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can book appointments.' });
  }

  if (!symptoms || symptoms.trim() === '') {
    return res.status(400).json({ error: 'Symptoms are required.' });
  }

  try {
    // 1. Calculate end time based on slot duration
    const profileRes = await db.query('SELECT slot_duration_minutes FROM doctor_profiles WHERE id = $1', [doctor_id]);
    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }
    const duration = profileRes.rows[0].slot_duration_minutes;
    
    // Simple time math for start_time (HH:mm or HH:mm:ss)
    const [hours, minutes] = start_time.split(':').map(Number);
    const endDate = new Date(1970, 0, 1, hours, minutes + duration);
    const end_time = endDate.toTimeString().substring(0, 8); // HH:mm:ss

    // 2. Insert into DB (This handles double-booking automatically via UNIQUE constraint)
    const newAppointment = await db.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, end_time, symptoms, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'scheduled') RETURNING *`,
      [req.user.id, doctor_id, appointment_date, start_time, end_time, symptoms]
    );

    const appointment = newAppointment.rows[0];

    // 3. Process LLM in background (DO NOT BLOCK THE BOOKING or fail it if LLM fails)
    generatePreVisitSummary(symptoms).then(async (summary) => {
      // Robust key extraction to handle any LLM capitalization quirks
      const urgency = summary.urgency || summary.Urgency || 'Unknown';
      const chiefComplaint = summary.chief_complaint || summary.Chief_complaint || summary.ChiefComplaint || summary.chiefComplaint || 'Not specified';
      const questions = summary.suggested_questions || summary.Suggested_questions || summary.SuggestedQuestions || summary.suggestedQuestions || [];
      
      await db.query(
        `UPDATE appointments 
         SET urgency = $1, chief_complaint = $2, suggested_questions = $3 
         WHERE id = $4`,
        [urgency, chiefComplaint, JSON.stringify(questions), appointment.id]
      );
    }).catch(async (err) => {
      console.error('LLM Failed during booking for appt:', appointment.id);
      await db.query('UPDATE appointments SET llm_failure = TRUE WHERE id = $1', [appointment.id]);
    });

    // 4. Enqueue email notification for patient
    await enqueueJob('email', {
      to: req.user.email,
      subject: 'Appointment Confirmation',
      text: `Your appointment is confirmed for ${appointment_date} at ${start_time}.`
    });

    // Notify doctor
    const docRes = await db.query('SELECT email FROM users WHERE id = (SELECT user_id FROM doctor_profiles WHERE id = $1)', [doctor_id]);
    if (docRes.rows.length > 0) {
      await enqueueJob('email', {
        to: docRes.rows[0].email,
        subject: 'New Appointment Booked',
        text: `A new appointment has been booked for ${appointment_date} at ${start_time}.`
      });
    }
    
    // (Optional) Enqueue calendar job if implemented
    // await enqueueJob('calendar', { appointmentId: appointment.id });

    // 5. Return success immediately
    res.status(201).json({ 
      message: 'Appointment booked successfully.', 
      appointment 
    });

  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation code
      return res.status(409).json({ error: 'Sorry, this slot is no longer available.' });
    }
    console.error('Error booking appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel an appointment
router.post('/:id/cancel', authenticate, async (req, res) => {
  const appointmentId = req.params.id;
  
  try {
    const result = await db.query(
      `UPDATE appointments SET status = 'cancelled' WHERE id = $1 AND (patient_id = $2 OR $3 = 'admin') RETURNING *`,
      [appointmentId, req.user.id, req.user.role]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized.' });
    }

    const appt = result.rows[0];
    const userRes = await db.query('SELECT email FROM users WHERE id = $1', [appt.patient_id]);

    await enqueueJob('email', {
      to: userRes.rows[0].email,
      subject: 'Appointment Cancelled',
      text: `Your appointment on ${appt.appointment_date} has been cancelled.`
    });

    res.json({ message: 'Appointment cancelled successfully.', appointment: appt });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reschedule an appointment
router.put('/:id/reschedule', authenticate, async (req, res) => {
  const appointmentId = req.params.id;
  const { new_date, new_start_time } = req.body;

  try {
    // 1. Get original to find doctor duration
    const originalRes = await db.query('SELECT doctor_id FROM appointments WHERE id = $1 AND patient_id = $2', [appointmentId, req.user.id]);
    if (originalRes.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized.' });
    }
    const doctor_id = originalRes.rows[0].doctor_id;

    const profileRes = await db.query('SELECT slot_duration_minutes FROM doctor_profiles WHERE id = $1', [doctor_id]);
    const duration = profileRes.rows[0].slot_duration_minutes;

    const [hours, minutes] = new_start_time.split(':').map(Number);
    const endDate = new Date(1970, 0, 1, hours, minutes + duration);
    const new_end_time = endDate.toTimeString().substring(0, 8);

    const result = await db.query(
      `UPDATE appointments 
       SET appointment_date = $1, start_time = $2, end_time = $3, status = 'scheduled' 
       WHERE id = $4 RETURNING *`,
      [new_date, new_start_time, new_end_time, appointmentId]
    );

    const appt = result.rows[0];
    const userRes = await db.query('SELECT email FROM users WHERE id = $1', [appt.patient_id]);

    await enqueueJob('email', {
      to: userRes.rows[0].email,
      subject: 'Appointment Rescheduled',
      text: `Your appointment is now scheduled for ${appt.appointment_date} at ${appt.start_time}.`
    });

    res.json({ message: 'Appointment rescheduled successfully.', appointment: appt });
  } catch (error) {
    if (error.code === '23505') { 
      return res.status(409).json({ error: 'Sorry, the new slot is no longer available.' });
    }
    console.error('Error rescheduling appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
