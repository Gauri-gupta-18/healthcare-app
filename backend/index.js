const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctor');
const doctorsRoutes = require('./routes/doctors');
const calendarRoutes = require('./routes/calendar');
const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*', 
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/calendar', calendarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/doctors', doctorsRoutes);

app.get('/api/test-llm', (req, res) => {
  const https = require('https');
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
  
  https.get(url, (resp) => {
    let data = '';
    resp.on('data', (chunk) => data += chunk);
    resp.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        res.json({
          success: true,
          message: "Here are the AI models your API key has permission to use:",
          models: parsed.models ? parsed.models.map(m => m.name) : parsed
        });
      } catch (e) {
        res.json({ success: false, raw: data });
      }
    });
  }).on("error", (err) => {
    res.status(500).json({ success: false, error: err.message });
  });
});
app.get('/api/test-db', async (req, res) => {
  const db = require('./db');
  try {
    const result = await db.query("SELECT id, name, email, role FROM users WHERE role = 'doctor'");
    res.json(result.rows);
  } catch (err) {
    res.json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  require('./worker');
});
