-- Migration v15: Fix client appointments RLS
-- Problem: The existing "Appointments isolation" policy uses tenant_id = public.tenant_id()
-- which returns NULL for client users who have no tenant_id,
-- meaning clients (phone users with fresh accounts) can't INSERT or SELECT appointments.
-- Fix: Add explicit policies for clients to insert and read appointments across any tenant.

-- 1. Allow any authenticated user to INSERT an appointment in any tenant
--    (The check is just that they are logged in)
CREATE POLICY "Allow clients to book appointments"
ON public.appointments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Allow any user (anonymous included) to SELECT appointments
--    (This is needed so the public queue view works without login)
CREATE POLICY "Allow public to view appointments"
ON public.appointments FOR SELECT
USING (true);

-- 3. Allow a user to UPDATE their own appointment (e.g. cancel it)
CREATE POLICY "Allow clients to cancel own appointment"
ON public.appointments FOR UPDATE
USING (client_user_id = auth.uid())
WITH CHECK (client_user_id = auth.uid());
