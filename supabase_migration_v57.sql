-- ==============================================================================
-- MIGRATION V57: FIX RLS POLICIES FOR SERVICES AND STAFF MEMBERS
-- Permite que los dueños de negocio y los administradores globales (SuperAdmin)
-- puedan guardar, editar y eliminar servicios y equipo sin bloqueos de RLS.
-- ==============================================================================

-- 0. Asegurar que las columnas necesarias existan en 'tenants' y 'users'
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS owner TEXT,
ADD COLUMN IF NOT EXISTS owner_email TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client',
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 1. Helper function para validar si el usuario autenticado es SuperAdmin
CREATE OR REPLACE FUNCTION public.is_superadmin() 
RETURNS BOOLEAN AS $$
  SELECT 
    COALESCE((auth.jwt() ->> 'email') IN ('admin@myturn.app', 'miturno.me@gmail.com'), false)
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'));
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Asegurar que los correos administradores globales tengan el rol 'superadmin' en public.users
UPDATE public.users 
SET role = 'superadmin' 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE LOWER(email) IN ('admin@myturn.app', 'miturno.me@gmail.com')
);

-- ==============================================================================
-- 3. POLÍTICAS RLS PARA TABLA 'services' (Servicios)
-- ==============================================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read services" ON public.services;
DROP POLICY IF EXISTS "Anyone can read services" ON public.services;
DROP POLICY IF EXISTS "Services isolation" ON public.services;
DROP POLICY IF EXISTS "Owners manage services" ON public.services;
DROP POLICY IF EXISTS "Public read access for Services" ON public.services;
DROP POLICY IF EXISTS "Owners and admins manage services" ON public.services;

-- Permitir lectura pública de los servicios de cada negocio
CREATE POLICY "Public read services" ON public.services 
FOR SELECT USING (true);

-- Permitir crear, editar y borrar servicios a:
-- a) SuperAdmin global (por rol o correo verificado)
-- b) Dueño del negocio (por tenant_id asociado al usuario)
-- c) Dueño designado en la tabla tenants (por correo de propietario)
CREATE POLICY "Owners and admins manage services" ON public.services 
FOR ALL TO authenticated
USING (
  public.is_superadmin()
  OR
  tenant_id = public.tenant_id()
  OR
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  OR
  tenant_id IN (
    SELECT id FROM public.tenants 
    WHERE LOWER(COALESCE(owner_email, '')) = LOWER(auth.jwt() ->> 'email') 
       OR LOWER(COALESCE(owner, '')) = LOWER(auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  public.is_superadmin()
  OR
  tenant_id = public.tenant_id()
  OR
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  OR
  tenant_id IN (
    SELECT id FROM public.tenants 
    WHERE LOWER(COALESCE(owner_email, '')) = LOWER(auth.jwt() ->> 'email') 
       OR LOWER(COALESCE(owner, '')) = LOWER(auth.jwt() ->> 'email')
  )
);

-- ==============================================================================
-- 4. POLÍTICAS RLS PARA TABLA 'staff_members' (Equipo / Barberos)
-- ==============================================================================
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read staff" ON public.staff_members;
DROP POLICY IF EXISTS "Owners manage staff" ON public.staff_members;
DROP POLICY IF EXISTS "Owners and admins manage staff" ON public.staff_members;

CREATE POLICY "Public read staff" ON public.staff_members 
FOR SELECT USING (true);

CREATE POLICY "Owners and admins manage staff" ON public.staff_members 
FOR ALL TO authenticated
USING (
  public.is_superadmin()
  OR
  tenant_id = public.tenant_id()
  OR
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  OR
  tenant_id IN (
    SELECT id FROM public.tenants 
    WHERE LOWER(COALESCE(owner_email, '')) = LOWER(auth.jwt() ->> 'email') 
       OR LOWER(COALESCE(owner, '')) = LOWER(auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  public.is_superadmin()
  OR
  tenant_id = public.tenant_id()
  OR
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  OR
  tenant_id IN (
    SELECT id FROM public.tenants 
    WHERE LOWER(COALESCE(owner_email, '')) = LOWER(auth.jwt() ->> 'email') 
       OR LOWER(COALESCE(owner, '')) = LOWER(auth.jwt() ->> 'email')
  )
);
