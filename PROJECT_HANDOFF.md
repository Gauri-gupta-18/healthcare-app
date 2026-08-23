# Healthcare Appointment & Follow-up Manager - Final Handoff Package

## SECTION 1 — PROJECT PURPOSE
The Healthcare Appointment & Follow-up Manager is a web application that allows patients to search for doctors, book appointments, and provide pre-visit symptoms. It enables doctors to view schedules, use AI to summarize patient symptoms before a visit, and generate AI-powered post-visit summaries and medication schedules based on clinical notes. Administrators manage doctor profiles, specializations, working hours, and leaves.

## SECTION 2 — CURRENT STATUS
**What is completed:**
- Full backend API (Auth, Admin, Doctor, Patient flows).
- Premium frontend UI (White/Teal aesthetics) using React/Vanilla CSS.
- PostgreSQL Database structure with strict unique constraints preventing double bookings.
- Background worker script (`worker.js`) for polling jobs (Emails, Reminders).
- Google Gemini LLM integration for pre/post visit summaries.
- Railway deployment configurations.

**What was QA-tested:**
- Registration/Login, Role-based access, Appointment booking, AI integration, Backend validations, Frontend UI rendering, and Deployment configuration validity.

**What is pending:**
- Production provisioning (Actually deploying to Railway and entering real API keys).

**What must NOT be changed:**
- The database schema constraints (specifically the unique constraint on `appointments`) and the background worker polling mechanism unless absolutely necessary.

## SECTION 3 — FINAL ARCHITECTURE
```text
[Browser/Client (React SPA)] 
        | (HTTP / JSON)
[Node.js / Express.js Backend] 
        |
        +-- [Services] -> (Gemini LLM API)
        +-- [Services] -> (Google Calendar API)
        +-- [Services] -> (SMTP / Nodemailer)
        |
[PostgreSQL Database] 
  (Stores users, appointments, background_jobs)
```

## SECTION 4 — REPOSITORY STRUCTURE
- `/backend`: Node.js Express API.
  - `/routes`: Express routers (`auth.js`, `admin.js`, `doctor.js`, `appointments.js`, `calendar.js`).
  - `/services`: Integrations (`email.js`, `llm.js`, `jobs.js`, `calendar.js`).
  - `index.js`: Main Express server.
  - `worker.js`: Background job polling script (runs alongside `index.js`).
  - `init-db.js`: Script to auto-initialize DB schema on startup.
  - `schema.sql`: Raw database definitions.
- `/frontend`: Vite + React SPA.
  - `/src/components`: UI components (`PatientPortal.jsx`, `DoctorPortal.jsx`, `AdminPortal.jsx`).
  - `App.css`: Premium Vanilla CSS styling.
- `docker-compose.yml`: Local reproduction environment.

## SECTION 5 — TECHNOLOGY STACK
- **Frontend**: React 18, Vite, Vanilla CSS.
- **Backend**: Node.js 18+, Express.js 4.
- **Database**: PostgreSQL 15 (using `pg` driver).
- **AI/LLM**: `@google/generative-ai` (Gemini 1.5 Flash).
- **Email**: `nodemailer` (SMTP).
- **Calendar**: `googleapis` (OAuth2).

## SECTION 6 — ROLES
- **Patient**: Can search doctors by specialization, book slots, input symptoms.
- **Doctor**: Can view assigned appointments, see AI pre-visit summaries, input clinical notes, and generate AI post-visit summaries.
- **Admin**: Can create/edit doctor profiles, define working hours/slot durations, and assign leave days (which auto-cancels overlapping appointments).

## SECTION 7 — COMPLETE USER FLOWS
- **Patient booking**: Login -> Search specialization -> Select slot -> Enter symptoms -> DB transaction -> Success -> Email queued.
- **Doctor consultation**: Login -> View 'scheduled' appointment -> See AI summary -> Consult -> Enter Notes/Prescription -> Save -> AI Post-visit generated -> Status 'completed' -> Email queued.
- **Admin doctor management**: Login -> Dashboard -> Manage Doctors -> Create/Edit Profile (Name, Specialization, Slot Duration).
- **Cancellation**: Patient/Admin clicks cancel -> Status updated to 'cancelled' -> Email queued.
- **Rescheduling**: Patient clicks reschedule -> Select new slot -> DB validates availability -> Update -> Email queued.
- **Doctor leave**: Admin adds leave date -> DB queried for overlapping 'scheduled' appointments -> Appointments marked 'cancelled' -> Emails queued to affected patients.

## SECTION 8 — APPOINTMENT CONCURRENCY
Double-booking is prevented entirely at the PostgreSQL database level using a `UNIQUE(doctor_id, appointment_date, start_time)` constraint on the `appointments` table. When concurrent users attempt to book the exact same slot, the database safely rejects the slower transaction with a `23505` constraint violation error, which the backend translates into a "Slot no longer available" error. No complex application-layer distributed locks are used.

## SECTION 9 — DOCTOR LEAVE
When an Admin sets a leave date for a doctor, the `admin.js` route queries all `scheduled` appointments for that doctor on that date. It updates their status to `cancelled` and explicitly enqueues an email job in the `background_jobs` table for every affected patient, notifying them of the cancellation due to doctor unavailability.

## SECTION 10 — LLM
- **Provider**: Google (Google AI Studio)
- **Model**: Gemini 1.5 Flash
- **Pre-visit prompt**: Takes patient symptoms. Outputs JSON with `urgency`, `chief_complaint`, `suggested_questions`.
- **Post-visit prompt**: Takes clinical notes and prescription. Outputs JSON with `explanation`, `medication_schedule`, `follow_up_steps`.
- **DB storage**: Stored in `appointments` table under `ai_pre_visit_summary` and `ai_post_visit_summary`.
- **Failure fallback**: If the LLM throws an error (e.g. timeout, quota), a `.catch` block flags the appointment row with `llm_failure = TRUE`. The booking/consultation transaction still succeeds, and the UI falls back to displaying raw user input.

## SECTION 11 — EMAIL
- **Provider**: Agnostic (Any SMTP provider like SendGrid, Ethereal, Gmail).
- **Events**: Booking confirmation, cancellation, rescheduling, leave conflict cancellation, 24-hour reminders, daily medication reminders.
- **Retry mechanism**: The `worker.js` script polls the `background_jobs` table. If sending fails, `attempts` is incremented.
- **Failure handling**: Once `attempts >= 3`, the job status is marked as `failed` and left in the table for manual inspection.

## SECTION 12 — GOOGLE CALENDAR
- **OAuth flow**: Patient accesses `/api/auth/calendar/init` to get auth URL. Redirects to Google, returns to `/api/auth/calendar/callback` with a code.
- **Required credentials**: Client ID, Client Secret (from Google Cloud Console).
- **Redirect URI**: Must precisely match `http(s)://<your-backend-url>/api/auth/calendar/callback`.
- **Create/update/delete behavior**: Supported via `googleapis` SDK. Enqueued via the background job system to prevent blocking the main request cycle.
- **Failure handling**: Same as emails. Fails up to 3 times before being marked `failed`.

## SECTION 13 — BACKGROUND JOBS
Tasks are inserted into the `background_jobs` PostgreSQL table. The `worker.js` script (booted alongside the Express API) runs a `setInterval` loop every 5 seconds. It fetches pending jobs using a `FOR UPDATE SKIP LOCKED` query (to prevent concurrent worker collisions if scaled), executes the task (Email/Calendar), and deletes the row on success or increments attempts on failure. Reminders (24-hour and daily medication) are triggered by a 24-hour cron `setInterval` inside `worker.js` that queries upcoming/completed appointments and pushes email jobs into the queue.

## SECTION 14 — DATABASE
- `users`: Core identity (id, name, email, password_hash, role).
- `doctor_profiles`: Doctor metadata (user_id FK, specialisation, slot_duration_minutes).
- `working_hours`: Doctor availability schedules (doctor_id FK, day_of_week, start_time, end_time).
- `leave_days`: Doctor unavailable dates (doctor_id FK, leave_date).
- `appointments`: Booking records (patient_id, doctor_id, date, times, status, symptoms, notes, AI summaries JSON).
- `background_jobs`: Task queue (id, type, payload JSON, status, attempts).

## SECTION 15 — ENVIRONMENT VARIABLES
| Variable | Required | Purpose | Example | Where to obtain |
|---|---|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection | `postgresql://user:pass@host:5432/db` | Railway / DB Provider |
| `PORT` | No | API Port | `5000` | Injected by Railway |
| `FRONTEND_URL` | Yes | CORS security | `https://my-frontend.app` | Railway Frontend Service |
| `JWT_SECRET` | Yes | Token signing | `super_secret_key` | Make it up |
| `GEMINI_API_KEY` | Yes | LLM access | `AIzaSy...` | Google AI Studio |
| `SMTP_HOST` | Yes | Email sending | `smtp.gmail.com` | Email Provider |
| `SMTP_PORT` | Yes | Email sending | `587` | Email Provider |
| `SMTP_USER` | Yes | Email sending | `user@email.com` | Email Provider |
| `SMTP_PASS` | Yes | Email sending | `password` | Email Provider |
| `GOOGLE_CLIENT_ID` | No | Calendar OAuth | `123-abc.apps...` | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET`| No | Calendar OAuth | `GOCSPX-...` | Google Cloud Console |
| `GOOGLE_REDIRECT_URI`| No | Calendar OAuth | `https://backend/api/auth...`| Google Cloud Console |
| `VITE_API_URL` | Yes | Frontend API target | `https://my-backend.app/api` | Railway Backend Service |

## SECTION 16 — LOCAL SETUP
1. Ensure PostgreSQL is running locally on port 5432 with a database named `healthcare` and user `user`/`password`. (Alternatively, run `docker-compose up -d db` to spin up just the DB).
2. Configure `backend/.env` with local variables.
3. Open two terminals.
4. Terminal 1: `cd backend && npm install && npm start`
5. Terminal 2: `cd frontend && npm install && npm run dev`
6. Access `http://localhost:5173`.

## SECTION 17 — RAILWAY DEPLOYMENT
1. Link GitHub repository to Railway.
2. Provision a new PostgreSQL plugin in Railway.
3. Create a New Service -> GitHub Repo -> Target `/backend`. Set Start Command to `npm start`.
4. Create a New Service -> GitHub Repo -> Target `/frontend`. Set Start Command to `npm start`.
5. Generate Public Domains for both services.
6. Configure Backend Variables (`DATABASE_URL`, `FRONTEND_URL`, `GEMINI_API_KEY`, etc.).
7. Configure Frontend Variables (`VITE_API_URL` pointing to backend domain).
8. Wait for deploy. The `init-db.js` script in the backend automatically structures the database!

## SECTION 18 — GOOGLE CALENDAR PRODUCTION SETUP
1. Go to Google Cloud Console.
2. Enable "Google Calendar API".
3. Setup OAuth Consent screen.
4. Create OAuth Client ID (Web Application).
5. Add Authorized Redirect URI matching your Railway Backend public domain (e.g. `https://my-backend.up.railway.app/api/auth/calendar/callback`).
6. Place the ID and Secret in Railway Backend Environment Variables.

## SECTION 19 — EMAIL PRODUCTION SETUP
1. Create an account with SendGrid (or use Gmail App Passwords).
2. Obtain SMTP Host, Port, Username, and Password.
3. Add these to the Railway Backend Environment Variables (`SMTP_HOST`, etc.).

## SECTION 20 — FINAL SMOKE TEST
- [ ] **Login**: Create Admin, Doctor, and Patient accounts.
- [ ] **Booking**: Patient books a slot.
- [ ] **Double-booking**: Two patients attempt to book the exact same slot; second fails safely.
- [ ] **AI summary**: Doctor views the appointment and sees the AI pre-visit summary.
- [ ] **Doctor consultation**: Doctor enters clinical notes.
- [ ] **Post-visit summary**: Verify AI generates the patient-friendly summary and medication schedule.
- [ ] **Email**: Verify confirmation email is received by patient.
- [ ] **Calendar**: Verify event is added (if Calendar OAuth completed).
- [ ] **Cancellation**: Patient cancels; verify email received.
- [ ] **Leave handling**: Admin adds leave date; verify overlapping appointments disappear and emails are sent.
- [ ] **Medication reminder**: Manually trigger worker cron or wait 24h to verify daily reminder emails.

## SECTION 21 — TROUBLESHOOTING
- **Network Error on Frontend**: `VITE_API_URL` is configured incorrectly. Fix: Ensure it exactly matches the backend domain + `/api`.
- **CORS Error**: `FRONTEND_URL` in backend is configured incorrectly. Fix: Ensure it matches the exact frontend domain.
- **Relation "users" does not exist**: Database was not initialized. Fix: Ensure `init-db.js` is running via the `npm start` command in `package.json`.
- **Emails not sending**: SMTP credentials wrong. Fix: Check backend logs for SMTP auth errors and update variables.
- **Booking succeeds but AI summary is blank**: Gemini API key is missing or invalid. Check backend logs for `llm_failure` flag.

## SECTION 22 — DO NOT CHANGE
- The PostgreSQL UNIQUE constraints in `backend/schema.sql`.
- The `FOR UPDATE SKIP LOCKED` logic in `backend/worker.js`.
- The async LLM `promise.catch` decoupling logic in `backend/routes/appointments.js` and `doctor.js`. 

## SECTION 23 — FINAL DEPLOYMENT CHECKLIST
- [ ] PostgreSQL provisioned.
- [ ] Backend deployed.
- [ ] Frontend deployed.
- [ ] Environment variables configured in both services.
- [ ] Gemini API key verified.
- [ ] SMTP verified.
- [ ] Google Calendar OAuth Redirect URI updated to production domain.
- [ ] Smoke test completed.
