-- MIGRACIÓN FASE 4: SOPORTE PARA INVITACIONES Y SLUGS
-- Copia y pega esto en el SQL Editor de tu proyecto en Supabase

-- 1. Agregar columnas faltantes a la tabla 'tenants'
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS owner TEXT DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT 'Ubicación Pendiente',
ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'Free',
ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=100&h=100&fit=crop',
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days');


-- 2. Actualizar Políticas RLS para la tabla 'tenants'
-- Eliminamos todas las posibles versiones previas para evitar conflictos
DROP POLICY IF EXISTS "Public read access for Tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can read own tenant" ON public.tenants;
DROP POLICY IF EXISTS "SuperAdmin insert access" ON public.tenants;
DROP POLICY IF EXISTS "SuperAdmin all access" ON public.tenants;
DROP POLICY IF EXISTS "Allow system inserts for Tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow system updates for Tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow system deletes for Tenants" ON public.tenants;

-- Permitir que CUALQUIERA pueda ver los negocios (necesario para el Hub y las páginas públicas)
CREATE POLICY "Public read access for Tenants" ON public.tenants FOR SELECT USING (true);

-- Permitir que el SuperAdmin e Invitaciones puedan INSERTAR
CREATE POLICY "Allow system inserts for Tenants" ON public.tenants FOR INSERT WITH CHECK (true);

-- Permitir que el sistema ACTUALICE los negocios (necesario para el registro con invitación)
CREATE POLICY "Allow system updates for Tenants" ON public.tenants FOR UPDATE USING (true);

-- Permitir BORRAR (necesario para la funcionalidad de 'Eliminar Negocio' del SuperAdmin)
CREATE POLICY "Allow system deletes for Tenants" ON public.tenants FOR DELETE USING (true);


-- 3. Crear tabla de Inventario (Suministros)
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL DEFAULT public.tenant_id(),
  name TEXT NOT NULL,
  category TEXT,
  current_stock NUMERIC DEFAULT 0,
  max_stock NUMERIC DEFAULT 100,
  unit TEXT DEFAULT 'unidades',
  min_alert NUMERIC DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para Inventario
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Política de aislamiento por Negocio (Suelo)
DROP POLICY IF EXISTS "Inventory isolation" ON public.inventory;
CREATE POLICY "Inventory isolation" ON public.inventory 
FOR ALL USING (tenant_id = public.tenant_id());


-- 4. Políticas para la tabla 'users' (Perfil de Usuario)
-- Permitir que un usuario cree su propio perfil tras registrarse
DROP POLICY IF EXISTS "Allow individual insert" ON public.users;
CREATE POLICY "Allow individual insert" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Permitir que un usuario vea su propio perfil
DROP POLICY IF EXISTS "Allow individual read" ON public.users;
CREATE POLICY "Allow individual read" ON public.users FOR SELECT USING (auth.uid() = id);

-- Permitir que un usuario actualice su propio perfil
DROP POLICY IF EXISTS "Allow individual update" ON public.users;
CREATE POLICY "Allow individual update" ON public.users FOR UPDATE USING (auth.uid() = id);


