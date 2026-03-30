-- SQL Migration v8: Saved Tenants
-- This table tracks which businesses a client has "linked" to their hub.

CREATE TABLE IF NOT EXISTS public.saved_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_device_id TEXT NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_device_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.saved_tenants ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert/select their own device data (Anonymous access for simplicity in this MVP)
CREATE POLICY "Allow anonymous management by device_id" ON public.saved_tenants
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Enable Realtime for saved_tenants
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_tenants;
