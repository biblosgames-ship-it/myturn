-- SQL Migration v49: Fix RLS for saved_tenants
-- This allows logged-in users to update anonymous records (linking them to their account) 
-- and prevents the "new row violates row-level security policy" error.

DROP POLICY IF EXISTS "Allow management by user_id or device_id" ON public.saved_tenants;
DROP POLICY IF EXISTS "Manage own saved tenants" ON public.saved_tenants;

CREATE POLICY "Manage saved tenants" ON public.saved_tenants
FOR ALL
USING (
    (user_id IS NULL) OR (auth.uid() = user_id)
)
WITH CHECK (
    (user_id IS NULL) OR (auth.uid() = user_id)
);
