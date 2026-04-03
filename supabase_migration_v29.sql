-- v29: Acceso Administrativo, Multi-tenant y Corrección de IDs

-- 1. Asegurar que la tabla services tenga un ID autogenerado por defecto
ALTER TABLE public.services ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Tabla de Servicios (Services) - RLS
DROP POLICY IF EXISTS "Owners manage services" ON public.services;
CREATE POLICY "Owners manage services" ON public.services 
    FOR ALL TO authenticated
    USING (
        tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        OR 
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin')
    )
    WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        OR 
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin')
    );

-- 3. Tabla de Reseñas (Reviews) - RLS
DROP POLICY IF EXISTS "Owners manage their reviews" ON public.reviews;
CREATE POLICY "Owners manage their reviews" ON public.reviews
    FOR ALL TO authenticated
    USING (
        tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        OR 
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin')
    )
    WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        OR 
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin')
    );

-- 4. Configuración del Negocio (Tabla Tenants) - RLS
DROP POLICY IF EXISTS "Allow updates for owners and admins" ON public.tenants;
CREATE POLICY "Allow updates for owners and admins" ON public.tenants
    FOR UPDATE TO authenticated
    USING (
        id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        OR 
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin')
    )
    WITH CHECK (
        id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        OR 
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin')
    );

-- 5. Asegurar lectura pública extendida de negocios
DROP POLICY IF EXISTS "Public read access for Tenants" ON public.tenants;
CREATE POLICY "Public read access for Tenants" ON public.tenants FOR SELECT USING (true);
