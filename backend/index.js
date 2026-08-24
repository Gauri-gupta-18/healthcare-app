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

app.get('/api/test-llm', async (req, res) => {
  try {
    // 1. Fetch available models for this specific API key
    const fetch = require('node-fetch') || global.fetch; // Use built-in fetch
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    res.json({ 
      success: true, 
      message: "Here are the AI models your API key has permission to use:", 
      models: data.models ? data.models.map(m => m.name) : data 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message, 
      stack: error.stack 
    });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  require('./worker');
});
