-- Migration v17: Add source column to appointments to distinguish walk-ins from online bookings
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'online';
