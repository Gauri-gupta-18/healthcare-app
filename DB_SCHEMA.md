# Database Schema

The Healthcare Appointment Manager uses a PostgreSQL database. Below is the schema breakdown.

## Tables

### 1. `users`
Stores all authenticatable identities in the system.
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `email` (VARCHAR, Unique)
- `password_hash` (VARCHAR)
- `role` (VARCHAR) - 'patient', 'doctor', or 'admin'
- `created_at` (TIMESTAMP)

### 2. `doctor_profiles`
Stores metadata specific to doctors.
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> `users.id`)
- `specialisation` (VARCHAR)
- `slot_duration_minutes` (INTEGER)

### 3. `working_hours`
Defines the weekly repeating schedule for doctors.
- `id` (UUID, Primary Key)
- `doctor_id` (UUID, Foreign Key -> `doctor_profiles.id`)
- `day_of_week` (INTEGER) - 0 = Sunday, 1 = Monday, etc.
- `start_time` (TIME)
- `end_time` (TIME)

### 4. `leave_days`
Defines specific dates a doctor is unavailable.
- `id` (UUID, Primary Key)
- `doctor_id` (UUID, Foreign Key -> `doctor_profiles.id`)
- `leave_date` (DATE)

### 5. `appointments`
Stores all booking records and AI outputs.
- `id` (UUID, Primary Key)
- `patient_id` (UUID, Foreign Key -> `users.id`)
- `doctor_id` (UUID, Foreign Key -> `doctor_profiles.id`)
- `appointment_date` (DATE)
- `start_time` (TIME)
- `end_time` (TIME)
- `status` (VARCHAR) - 'scheduled', 'completed', 'cancelled'
- `symptoms` (TEXT)
- `clinical_notes` (TEXT)
- `prescription` (TEXT)
- `urgency` (VARCHAR)
- `chief_complaint` (TEXT)
- `suggested_questions` (JSONB)
- `explanation` (TEXT)
- `medication_schedule` (JSONB)
- `follow_up_steps` (JSONB)
- `llm_failure` (BOOLEAN) - Default false. True if Gemini API failed.
- **CRITICAL CONSTRAINT**: `UNIQUE (doctor_id, appointment_date, start_time)` - This constraint fundamentally prevents double-booking race conditions at the database level.

### 6. `background_jobs`
A lightweight queue for asynchronous tasks like emails and calendar syncs.
- `id` (UUID, Primary Key)
- `type` (VARCHAR) - 'email', 'calendar'
- `payload` (JSONB) - The task arguments
- `status` (VARCHAR) - 'pending', 'processing', 'completed', 'failed'
- `attempts` (INTEGER) - Default 0
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
