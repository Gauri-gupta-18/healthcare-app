# Healthcare System Design Write-Up

## 1. Double-Booking Prevention

**Mechanism: Database-Level Constraints**
To prevent race conditions where two patients attempt to book the exact same slot at the exact same millisecond, the system relies on the Database engine rather than application-layer checks. 

A `UNIQUE` constraint is applied on the `appointments` table:
```sql
ALTER TABLE appointments ADD CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, appointment_date, start_time);
```

**Flow:**
1. A patient requests a slot.
2. The Node.js application calculates the `end_time` and immediately attempts an `INSERT` statement.
3. If another transaction has already claimed that slot, PostgreSQL rejects the insert with error code `23505` (Unique Violation).
4. The backend catches this specific error code and returns a graceful `409 Conflict: "Sorry, this slot is no longer available."` to the frontend.

This guarantees zero double-bookings without requiring complex distributed locks (e.g., Redis).

## 2. Doctor Leave Conflict Handling

**Mechanism: Pre-emptive Availability Checks & Asynchronous Cancellation**

**Flow:**
1. **Slot Generation Checks:** When a patient queries `/api/doctors/:id/slots`, the backend first checks the `leave_days` table. If the requested date exists in the `leave_days` table for that doctor, the system immediately returns an empty array `[]`, physically preventing the frontend from rendering any bookable slots.
2. **Post-Booking Conflicts (Adding Leave Later):** If a doctor submits a new leave day via the Admin portal *after* appointments have already been booked for that day, the `/api/admin/doctors/:id/leave-days` route handles it robustly:
   - It inserts the leave day.
   - It executes a bulk `UPDATE` to change the status of all overlapping appointments to `cancelled`.
   - It iterates through the cancelled appointments and enqueues an asynchronous notification job to email the affected patients, explaining that the doctor is unavailable.

## 3. Slot Hold Mechanism

**Mechanism: Expiration-Based Temporary Holds**
While a full WebSocket-based slot hold isn't currently strictly enforced in the MVP codebase, the architecture supports a robust Slot Hold mechanism via Redis or an in-memory TTL store.

**Proposed Flow (Supported Architecture):**
1. When a patient clicks "Book" (entering the symptom confirmation screen), a `POST /api/appointments/hold` request is fired.
2. The server writes a key to a Key-Value store: `hold:{doctor_id}:{date}:{start_time}` with a TTL (Time-To-Live) of 5 minutes.
3. The `GET /slots` endpoint is modified to filter out slots that exist in either the `appointments` table OR the KV store.
4. If the patient completes the booking, the KV hold is deleted, and the permanent DB record is created.
5. If the patient abandons the booking, the 5-minute TTL expires automatically, releasing the slot back to the public pool without any cron jobs or cleanup scripts.

## 4. Notification Failure Handling

**Mechanism: Asynchronous Background Jobs with Retry Logic**

Emails and notifications are not sent synchronously during the HTTP request cycle. Doing so would risk failing a successful booking just because the SMTP server timed out.

**Flow:**
1. The system uses a dedicated `services/jobs.js` file acting as a queue.
2. When an appointment is booked, cancelled, or rescheduled, the backend calls `enqueueJob('email', payload)`.
3. This pushes the notification payload to an in-memory queue (which can be seamlessly swapped to Redis/BullMQ in a production environment).
4. A background worker processes the queue. If a notification fails (e.g., SendGrid/SMTP API is down), the worker catches the error, increments a `retry_count`, and places it back in the queue with an exponential backoff.
5. This ensures that the Patient's HTTP request completes in milliseconds, providing a snappy UI, while guaranteeing that notifications are eventually delivered.
