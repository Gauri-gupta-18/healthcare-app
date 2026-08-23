# 🏥 Healthcare Appointment & Follow-up Manager

![React](https://img.shields.io/badge/React-18-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)

A modern, full-stack web application designed to streamline patient-doctor interactions. It allows patients to seamlessly book appointments and provide symptoms, while empowering doctors with AI-generated pre-visit summaries and automated post-visit follow-ups.

## ✨ Key Features

- **🧑‍⚕️ Role-Based Access**: Dedicated portals for Patients, Doctors, and Administrators.
- **📅 Smart Booking System**: Robust appointment scheduling with database-level concurrency control to strictly prevent double-bookings.
- **🧠 AI Integrations (Powered by Google Gemini)**:
  - *Pre-Visit*: Automatically analyzes patient symptoms to provide doctors with an urgency assessment and suggested questions.
  - *Post-Visit*: Generates patient-friendly visit summaries, medication schedules, and follow-up steps from raw clinical notes.
- **📧 Automated Notifications**: Asynchronous background worker handles email dispatch for confirmations, cancellations, and daily medication reminders.
- **🗓️ Google Calendar Sync**: Automatically pushes appointments to Google Calendar.
- **🛡️ Secure & Reliable**: Built with JWT authentication and strict transactional safety.

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Vanilla CSS (Premium Teal/White Aesthetics)
- **Backend**: Node.js, Express.js 4
- **Database**: PostgreSQL 15
- **AI/LLM**: Google Gemini 1.5 Flash API
- **Email Service**: Nodemailer / SMTP
- **Job Queue**: Native PostgreSQL Polling (`worker.js`)

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v15+)

### 1. Database Setup
Ensure PostgreSQL is running on port `5432` with a database named `healthcare` (or use the provided `docker-compose.yml` to spin it up).

### 2. Backend Setup
```bash
cd backend
npm install
# Copy the example environment file and update the variables
cp .env.example .env
npm start
```
*Note: The backend will automatically initialize the database schema on first startup.*

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

## 📚 Documentation Directory

For deep technical dives, architecture details, and deployment guides, please refer to the following internal documentation:

- 📖 **[Project Handoff & Architecture](./PROJECT_HANDOFF.md)** *(Start Here)*
- 🔌 **[API Documentation](./API.md)**
- 🗄️ **[Database Schema](./DB_SCHEMA.md)**
- 🏗️ **[System Design](./SYSTEM_DESIGN.md)**
- ☁️ **[Deployment Guide](./DEPLOYMENT.md)**
- 🤖 **[LLM Prompts](./LLM_PROMPTS.md)**
