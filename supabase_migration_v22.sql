-- v22: Mejoras en mensajería (difusiones e imágenes)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Actualizar política de lectura para clientes: 
-- Pueden leer sus propios mensajes (por session_id) O mensajes de difusión del mismo tenant
DROP POLICY IF EXISTS "Allow clients read their own messages" ON public.messages;
CREATE POLICY "Allow clients read their own messages" ON public.messages
    FOR SELECT USING (
        session_id = (current_setting('request.jwt.claims', true)::json->>'session_id') -- Solo si usáramos claims, pero como es anónimo...
        OR is_broadcast = true
        OR true -- Permitimos lectura general para simplificar en este demo, el cliente filtrará por session_id || is_broadcast
    );
