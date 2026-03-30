-- SQL Migration v9: Enhanced Client Linking
-- Adds personal information to the saved_tenants link.

ALTER TABLE public.saved_tenants 
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_contact TEXT; -- Phone or Email

COMMENT ON COLUMN public.saved_tenants.client_contact IS 'Phone number or Email of the client for business identification';
