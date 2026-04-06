-- Add capacity column to services table to support group bookings
ALTER TABLE services ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1;

-- Ensure existing services have a default capacity of 1
UPDATE services SET capacity = 1 WHERE capacity IS NULL;

-- Comment: Capacity represents the maximum number of simultaneous appointments for a specific service at the same date_time.
