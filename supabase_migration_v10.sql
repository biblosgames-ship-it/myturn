-- SQL Migration v10: The Great Reset & Identity Alignment
-- Run this in the Supabase SQL Editor to clear all stale data and fix your account link.

-- 1. PURGE ALL TEST DATA (Start from Zero)
TRUNCATE public.appointments CASCADE;
TRUNCATE public.saved_tenants CASCADE;
-- TRUNCATE public.transactions CASCADE; -- Optional: uncomment if you want to clear finances too

-- 2. ENSURE IDENTITY ALIGNMENT
-- This ensures that the NEXT time you log into the dashboard, the system can find your business.
DO $$ 
DECLARE
    first_tenant_id UUID;
BEGIN
    -- Get the ID of the first (or only) tenant
    SELECT id INTO first_tenant_id FROM public.tenants LIMIT 1;
    
    -- If a tenant exists, ensure all 'owner' users are linked to it
    -- (This fixes the 'empty dashboard' if your user row was missing the link)
    IF first_tenant_id IS NOT NULL THEN
        UPDATE public.users 
        SET tenant_id = first_tenant_id 
        WHERE role = 'owner' OR tenant_id IS NULL;
        
        RAISE NOTICE 'Linked all owners to Tenant ID: %', first_tenant_id;
    END IF;
END $$;

-- 3. REFRESH CACHE
NOTIFY pgrst, 'reload schema';
