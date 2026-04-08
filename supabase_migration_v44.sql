-- add notes column to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS admin_notes text;
