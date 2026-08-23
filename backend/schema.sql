CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctor_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialisation VARCHAR(255),
    slot_duration_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS working_hours (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    UNIQUE(doctor_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS leave_days (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    leave_date DATE NOT NULL,
    UNIQUE(doctor_id, leave_date)
);

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES users(id),
    doctor_id INTEGER REFERENCES doctor_profiles(id),
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    symptoms TEXT,
    urgency VARCHAR(50),
    chief_complaint TEXT,
    suggested_questions JSONB,
    clinical_notes TEXT,
    prescription TEXT,
    patient_summary TEXT,
    medication_schedule JSONB,
    follow_up_steps JSONB,
    llm_failure BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(doctor_id, appointment_date, start_time) 
);

CREATE TABLE IF NOT EXISTS background_jobs (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'email', 'calendar', 'medication_reminder'
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    next_run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_log TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

