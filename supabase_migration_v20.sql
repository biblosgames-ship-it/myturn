-- v20: Crear tabla de reseñas con moderación
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Lectura condicionada: El público solo ve las aprobadas
DROP POLICY IF EXISTS "Allow public read approved reviews" ON public.reviews;
CREATE POLICY "Allow public read approved reviews" ON public.reviews
    FOR SELECT USING (is_approved = TRUE);

-- Los dueños/empleados del tenant pueden ver todas las de su negocio
DROP POLICY IF EXISTS "Allow owners read all reviews" ON public.reviews;
CREATE POLICY "Allow owners read all reviews" ON public.reviews
    FOR SELECT TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE tenant_id = reviews.tenant_id
        )
    );

-- Inserción abierta para cualquier usuario (clientes de MyTurn)
DROP POLICY IF EXISTS "Allow public insert reviews" ON public.reviews;
CREATE POLICY "Allow public insert reviews" ON public.reviews
    FOR INSERT WITH CHECK (true);

-- Actualización solo para dueños (para aprobar/rechazar)
DROP POLICY IF EXISTS "Allow owners update reviews" ON public.reviews;
CREATE POLICY "Allow owners update reviews" ON public.reviews
    FOR UPDATE TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE tenant_id = reviews.tenant_id
        )
    );

-- Habilitar Realtime para la tabla de reseñas (esto puede fallar si ya está, pero no detiene el proceso)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reviews') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
    END IF;
END $$;
