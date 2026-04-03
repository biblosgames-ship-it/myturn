-- v28: Abrir lectura pública de servicios y reseñas para clientes
-- 1. Servicios
DROP POLICY IF EXISTS "Services isolation" ON public.services;
DROP POLICY IF EXISTS "Anyone can read services" ON public.services;

-- Política para que cualquiera pueda VER los servicios de cualquier negocio
CREATE POLICY "Anyone can read services" ON public.services 
    FOR SELECT USING (true);

-- Política para que los dueños gestionen SOLO sus servicios
CREATE POLICY "Owners manage services" ON public.services 
    FOR ALL TO authenticated
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- 2. Reseñas (Reviews)
DROP POLICY IF EXISTS "Reviews isolation" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;

-- Política para lectura pública de reseñas aprobadas
CREATE POLICY "Anyone can read approved reviews" ON public.reviews
    FOR SELECT USING (is_approved = true OR auth.uid() IN (SELECT id FROM public.users WHERE tenant_id = reviews.tenant_id));

-- Política para que dueños gestionen sus reseñas
CREATE POLICY "Owners manage their reviews" ON public.reviews
    FOR ALL TO authenticated
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));
