-- Migration v13: User Profile RLS (Phase 2 Fixes)
-- Purpose: Allow clients to manage their own profile records in the 'users' table.

-- 1. Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies if any (to avoid duplicates)
DROP POLICY IF EXISTS "Users can read own tenant" ON public.users;
DROP POLICY IF EXISTS "Users within same tenant can read each other" ON public.users;

-- 3. Policy: Allow users to INSERT their own record (for first-time Google logins)
-- CHECK (auth.uid() = id) ensures they can only insert a record with their own Auth ID.
CREATE POLICY "Enable insert for users based on user_id" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. Policy: Allow users to UPDATE their own record (for profile edits)
-- USING (auth.uid() = id) ensures they can only update their own record.
CREATE POLICY "Enable update for users based on user_id" 
ON public.users FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Policy: Allow users to SELECT (read) their own record
-- This is critical for the Hub to load their profile regardless of 'tenant_id'.
CREATE POLICY "Enable read access for users based on user_id" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- 6. Maintain compatibility for Owners/Admins (Same-tenant read)
-- This allows business owners to see the names of their staff/clients.
CREATE POLICY "Users within same tenant can read each other" 
ON public.users FOR SELECT 
USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));
