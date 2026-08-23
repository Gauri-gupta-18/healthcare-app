# System Design (Healthcare Appointment Manager)

## Architecture Overview
The system follows a simple client-server architecture. The frontend is a Single Page Application (SPA) built with React and Vite. The backend is a monolithic Node.js Express server. Data is stored in a relational PostgreSQL database. This design was chosen for maximum reliability, simplicity, and ease of deployment on platforms like Railway.

## Database & Concurrency
The most critical requirement—preventing simultaneous double-booking—is solved entirely at the database layer. We use a PostgreSQL `UNIQUE` constraint on the `appointments` table for `(doctor_id, appointment_date, start_time)`. This guarantees that race conditions across multiple server instances or concurrent requests are safely rejected by the database engine without complex application-level distributed locks.

## Background Jobs
Instead of relying on heavy message brokers (Redis, Kafka) or task queues (Celery), background tasks (emails, calendar syncs, reminders) are handled via a `background_jobs` PostgreSQL table. A simple `worker.js` script runs inside the Node backend on a `setInterval` loop, polling for jobs. This keeps the deployment footprint to a single Node container and a single DB instance.

## LLM Integration
Google Gemini is integrated via the `@google/generative-ai` SDK. To prevent AI latency or failures from impacting core transactional flows, LLM calls are triggered asynchronously *after* database transactions complete. If the LLM fails, an `llm_failure` flag is logged against the appointment, allowing the application to gracefully fallback to displaying original user input.

## External Services
- **Emails**: Sent via `nodemailer` (SMTP).
- **Google Calendar**: Managed via `googleapis` OAuth2, utilizing tokens to insert/update/delete events on behalf of users.
