
-- 1. Create schedule rules table

CREATE TABLE IF NOT EXISTS availability_rules (
  rule_id SERIAL PRIMARY KEY,

  doctor_id INTEGER NOT NULL
    REFERENCES doctors(doctor_id)
    ON DELETE CASCADE,

  scheduling_type VARCHAR(10) NOT NULL
    CHECK (scheduling_type IN ('WAVE', 'STREAM')),

  recurrence_type VARCHAR(12) NOT NULL
    CHECK (recurrence_type IN ('ONCE', 'WEEKLY', 'DATES')),

  specific_date DATE,

  weekdays INTEGER[],

  selected_dates DATE[],

  start_time TIME NOT NULL,

  end_time TIME NOT NULL,

  interval_minutes INTEGER NOT NULL
    CHECK (interval_minutes > 0),

  capacity INTEGER NOT NULL DEFAULT 1
    CHECK (capacity > 0),

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (end_time > start_time)
);

-- 2. Add new columns to availability

ALTER TABLE availability
  ADD COLUMN IF NOT EXISTS rule_id INTEGER
    REFERENCES availability_rules(rule_id)
    ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS scheduling_type VARCHAR(10)
    NOT NULL DEFAULT 'WAVE',

  ADD COLUMN IF NOT EXISTS capacity INTEGER
    NOT NULL DEFAULT 1,

  ADD COLUMN IF NOT EXISTS booked_count INTEGER
    NOT NULL DEFAULT 0;

-- 3. Backfill existing bookings

UPDATE availability a
SET booked_count = (
  SELECT COUNT(*)::INTEGER
  FROM appointments ap
  WHERE ap.availability_id = a.availability_id
    AND ap.status IN ('BOOKED', 'PENDING_PAYMENT')
);

-- 4. Update availability status

UPDATE availability
SET status = CASE
  WHEN booked_count >= capacity THEN 'FULL'
  ELSE 'AVAILABLE'
END;

-- 5. Remove old single-booking restriction

DROP INDEX IF EXISTS one_active_booking_per_slot;

-- 6. Add booking lookup index

CREATE INDEX IF NOT EXISTS appointments_availability_status_idx
ON appointments(availability_id, status);

-- 7. Prevent duplicate doctor intervals

CREATE UNIQUE INDEX IF NOT EXISTS availability_doctor_date_start_unique
ON availability(doctor_id, slot_date, start_time);

-- 8. Capacity constraints

ALTER TABLE availability
  ADD CONSTRAINT availability_capacity_positive
  CHECK (capacity > 0),

  ADD CONSTRAINT availability_booked_count_nonnegative
  CHECK (booked_count >= 0),

  ADD CONSTRAINT availability_booked_within_capacity
  CHECK (booked_count <= capacity);
