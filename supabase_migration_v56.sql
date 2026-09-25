-- ==============================================================================
-- MIGRATION V56: TENANTS OWNER & OWNER_EMAIL COLUMNS FOR AUTO-LINKING
-- ==============================================================================

-- 1. Ensure 'owner' and 'owner_email' columns exist in public.tenants
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS owner TEXT,
ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- 2. Indexes for fast lookup on login/claim
CREATE INDEX IF NOT EXISTS idx_tenants_owner_email ON public.tenants (LOWER(owner_email));
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants (owner);

-- 3. Comment explaining the auto-linking mechanism
COMMENT ON COLUMN public.tenants.owner_email IS 'Email address of the designated owner for seamless auto-linking upon registration or login';
