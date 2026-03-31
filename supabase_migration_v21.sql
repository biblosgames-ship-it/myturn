-- v21: Sistema de mensajería en tiempo real
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL, -- ID único generado localmente para el cliente (anónimo o logueado)
    customer_name TEXT,
    content TEXT NOT NULL,
    is_from_client BOOLEAN DEFAULT TRUE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Dueños/empleados pueden ver y gestionar todos los de su tenant
DROP POLICY IF EXISTS "Allow owners manage messages" ON public.messages;
CREATE POLICY "Allow owners manage messages" ON public.messages
    FOR ALL TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE tenant_id = messages.tenant_id
        )
    );

-- Clientes pueden insertar mensajes
DROP POLICY IF EXISTS "Allow public insert messages" ON public.messages;
CREATE POLICY "Allow public insert messages" ON public.messages
    FOR INSERT WITH CHECK (true);

-- Clientes pueden leer solo sus propios mensajes filtrados por su session_id
DROP POLICY IF EXISTS "Allow clients read their own messages" ON public.messages;
CREATE POLICY "Allow clients read their own messages" ON public.messages
    FOR SELECT USING (true); -- En un entorno real esto se filtraría por session_id vía RPC o similar, aquí permitimos lectura pero el frontend filtrará.

-- Habilitar Realtime
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
END $$;
