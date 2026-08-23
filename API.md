# API Documentation

## Authentication (`/api/auth`)
- `POST /register` - Register a patient. Body: `name`, `email`, `password`.
- `POST /login` - General login. Body: `email`, `password`. Returns JWT.

## Admin (`/api/admin`) - Requires Admin JWT
- `POST /doctors` - Create doctor profile.
- `PUT /doctors/:id` - Edit doctor profile.
- `POST /doctors/:id/working-hours` - Bulk replace working hours.
- `POST /doctors/:id/leave-days` - Add leave date and cascade cancellations.

## Public/Patient (`/api/doctors`) - Requires Patient JWT
- `GET /` - List doctors. Query: `?specialisation=...`

## Appointments (`/api/appointments`) - Requires Patient JWT
- `GET /doctors/:id/slots?date=YYYY-MM-DD` - Get available slots.
- `POST /` - Book appointment. Body: `doctor_id`, `appointment_date`, `start_time`, `symptoms`.
- `POST /:id/cancel` - Cancel appointment.
- `PUT /:id/reschedule` - Reschedule appointment. Body: `new_date`, `new_start_time`.

## Doctor (`/api/doctor`) - Requires Doctor JWT
- `GET /appointments` - List own appointments.
- `POST /appointments/:id/notes` - Submit post-visit notes. Body: `clinical_notes`, `prescription`.

## Calendar (`/api/auth/calendar`)
- `GET /init` - Start OAuth 2.0 flow.
- `GET /callback` - OAuth 2.0 callback URL.
