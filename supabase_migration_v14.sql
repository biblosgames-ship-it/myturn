-- Migration v14: Add phone column to users
-- Purpose: Fix "Could not find the 'phone' column" error in Client Hub.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Refresh the schema cache for the current session (if possible)
-- In Supabase dashboard, running this will update the PostgREST cache.
COMMENT ON COLUMN public.users.phone IS 'User contact phone number';
