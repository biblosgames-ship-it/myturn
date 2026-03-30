-- SQL Migration v11: Auth-linked Saved Tenants & Appointments
-- Add user_id to saved_tenants to allow cross-device syncing for authenticated clients.

ALTER TABLE public.saved_tenants 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add client_id to appointments to link them to authenticated profiles
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow users to manage their OWN saved tenants if authenticated
DROP POLICY IF EXISTS "Allow anonymous management by device_id" ON public.saved_tenants;

CREATE POLICY "Manage own saved tenants" ON public.saved_tenants
    FOR ALL
    USING (
        (user_id IS NOT NULL AND auth.uid() = user_id) OR 
        (user_id IS NULL) -- Keep anonymous device-based access for guests
    )
    WITH CHECK (
        (user_id IS NOT NULL AND auth.uid() = user_id) OR 
        (user_id IS NULL)
    );

-- Allow clients to see their own appointments (RLS)
-- Note: Admin/Staff already have view access to all appointments via tenant_id isolation
DROP POLICY IF EXISTS "Clients see own appointments" ON public.appointments;
CREATE POLICY "Clients see own appointments" ON public.appointments
    FOR SELECT
    USING (client_id = auth.uid());
