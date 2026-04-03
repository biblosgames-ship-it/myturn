-- v27: Sistema de Tickets de Soporte Técnico
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    account_type TEXT, -- 'Professional' | 'Enterprise'
    category TEXT, -- 'Avería', 'Reporte', 'Sugerencia', 'Otro'
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Tenants can insert and see their own tickets
DROP POLICY IF EXISTS "Users can manage their own tickets" ON public.support_tickets;
CREATE POLICY "Users can manage their own tickets" ON public.support_tickets
    FOR ALL TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE tenant_id = support_tickets.tenant_id
        )
    );

-- Superadmins can see and manage all tickets
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;
CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
    FOR ALL TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'superadmin' OR role = 'admin'
        )
    );

-- Enable Realtime
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'support_tickets') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
    END IF;
END $$;
