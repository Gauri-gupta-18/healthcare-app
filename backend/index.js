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
    const { generatePreVisitSummary } = require('./services/llm');
    const result = await generatePreVisitSummary("I have a headache and a slight fever.");
    res.json({ success: true, result });
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
