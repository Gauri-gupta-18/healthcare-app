# Healthcare Appointment & AI Summary System

## 🚀 Live Demo
**Live Application (Patient & Doctor Portals):** [https://spectacular-compassion-production-9572.up.railway.app](https://spectacular-compassion-production-9572.up.railway.app)

---

## 🛠️ System Setup Guide

### 1. Prerequisites
- **Node.js**: v18 or later
- **PostgreSQL**: v13 or later

### 2. Installation
Clone the repository and install dependencies for both the frontend and backend:

```bash
git clone <your-repo-url>
cd Healthcare

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Variables
Create a `.env` file in the `backend` directory based on the `.env.example`:
```ini
DATABASE_URL=postgres://postgres:password@localhost:5432/healthcare
JWT_SECRET=your_jwt_secret
PORT=5000
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_google_gemini_api_key
```

Create a `.env` file in the `frontend` directory based on the `.env.example`:
```ini
VITE_API_URL=http://localhost:5000/api
```

### 4. Running the Application Locally
**Start the Backend (and initialize the DB automatically):**
```bash
cd backend
npm start
```
*Note: `npm start` automatically runs `node init-db.js` before starting the server. This guarantees the schema exists, seeds default Admin/Doctor accounts, and resets doctor passwords to `password123` to prevent lockout.*

**Start the Frontend:**
```bash
cd frontend
npm run dev
```

---

## 📚 API Documentation

### **Auth Routes** (`/api/auth`)
- `POST /register`: Register a new patient (Body: `name`, `email`, `password`)
- `POST /login`: Log in as any user (Body: `email`, `password`)
- `GET /me`: Get current logged-in profile

### **Doctor Routes** (`/api/doctors`)
- `GET /`: Get all registered doctors (Public)
- `GET /:id/slots?date=YYYY-MM-DD`: Get available time slots for a doctor

### **Appointment Routes** (`/api/appointments`)
- `POST /`: Book an appointment (Body: `doctor_id`, `appointment_date`, `start_time`, `symptoms`)
- `POST /:id/cancel`: Cancel an appointment
- `PUT /:id/reschedule`: Reschedule an appointment (Body: `new_date`, `new_start_time`)

### **Provider/Doctor Routes** (`/api/doctor`)
- `GET /appointments`: Get all appointments for the logged-in doctor
- `PUT /appointments/:id/notes`: Add clinical notes & prescription, triggers Post-Visit AI summary

### **Admin Routes** (`/api/admin`)
- `POST /doctors`: Create a new doctor
- `POST /doctors/:id/leave-days`: Add a leave day and cancel overlapping appointments

---

## 🗄️ Database Schema

The PostgreSQL database uses the following core tables:

1. **`users`**: Stores all accounts (patients, doctors, admins).
   - Columns: `id`, `name`, `email`, `password_hash`, `role`, `created_at`
2. **`doctor_profiles`**: Doctor-specific settings.
   - Columns: `id`, `user_id`, `specialisation`, `slot_duration_minutes`
3. **`working_hours`**: Weekly schedules for doctors.
   - Columns: `id`, `doctor_id`, `day_of_week`, `start_time`, `end_time`
4. **`leave_days`**: Specific dates a doctor is unavailable.
   - Columns: `id`, `doctor_id`, `leave_date`
5. **`appointments`**: Core booking logic and LLM outputs.
   - Columns: `id`, `patient_id`, `doctor_id`, `appointment_date`, `start_time`, `end_time`, `status`
   - AI Columns: `symptoms`, `urgency`, `chief_complaint`, `suggested_questions`, `clinical_notes`, `prescription`, `patient_summary`, `medication_schedule`, `follow_up_steps`

---

## 🤖 LLM Prompts (Google Gemini)

The system integrates Google Gemini AI using the `@google/generative-ai` SDK (`gemini-3.5-flash` model).

### **Pre-Visit Summary Prompt**
Executed when a patient books an appointment:
\`\`\`text
You are a medical AI assistant. Based on the following patient symptoms, generate a JSON response with:
1. urgency (Low, Medium, High)
2. chief_complaint (A brief summary of the main issue)
3. suggested_questions (An array of 3 specific questions for the doctor to ask the patient)

Symptoms: "{patient_symptoms}"

Return ONLY valid JSON in this exact structure:
{
  "urgency": "Medium",
  "chief_complaint": "Description",
  "suggested_questions": ["Q1", "Q2", "Q3"]
}
\`\`\`

### **Post-Visit Summary Prompt**
Executed when a doctor finalizes clinical notes:
\`\`\`text
You are a medical AI assistant. Based on the doctor's clinical notes and prescription, generate a patient-friendly summary in JSON format with:
1. explanation (A simple explanation of the consultation and diagnosis)
2. medication_schedule (An array of objects with 'medication', 'dosage', 'timing')
3. follow_up_steps (An array of strings detailing next steps or lifestyle advice)

Clinical Notes: "{doctor_notes}"
Prescription: "{doctor_prescription}"

Return ONLY valid JSON in this exact structure:
{
  "explanation": "Simple text...",
  "medication_schedule": [{"medication": "Drug", "dosage": "Amount", "timing": "When to take"}],
  "follow_up_steps": ["Step 1", "Step 2"]
}
\`\`\`

---

## 📅 Google Calendar Setup Steps

To integrate Google Calendar (if expanded in the future):
1. Go to the **Google Cloud Console**.
2. Create a new Project and enable the **Google Calendar API**.
3. Create **OAuth 2.0 Client IDs** (Web Application) and add your redirect URIs.
4. Download the `credentials.json` file.
5. In your Node application, use the `googleapis` package:
   ```javascript
   const { google } = require('googleapis');
   const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
   // Generate Auth URL -> Get Token -> google.calendar({ version: 'v3', auth: oauth2Client });
   ```
6. Add the OAuth flow to the `/api/auth` router so Doctors can grant calendar access.
