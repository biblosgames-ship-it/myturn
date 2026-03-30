-- MIGRACIÓN FASE 5: OPTIMIZACIÓN DE PRODUCCIÓN Y UNIFICACIÓN
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Habilitar Realtime para la tabla de Tenants (necesario para cambios de marca en vivo)
BEGIN;
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'tenants'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
    END IF;
  END $$;
COMMIT;

-- 2. Agregar columnas faltantes a 'transactions' para reportes detallados
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Índices de rendimiento para multi-inquilino (SaaS)
CREATE INDEX IF NOT EXISTS tenants_slug_idx ON public.tenants (slug);
CREATE INDEX IF NOT EXISTS appointments_tenant_date_idx ON public.appointments (tenant_id, date_time);
CREATE INDEX IF NOT EXISTS transactions_tenant_date_idx ON public.transactions (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS services_tenant_idx ON public.services (tenant_id);
CREATE INDEX IF NOT EXISTS staff_tenant_idx ON public.staff_members (tenant_id);

-- 4. Asegurar que el helper tenant_id() sea estable
CREATE OR REPLACE FUNCTION public.tenant_id() RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Comentario: Estas mejoras aseguran que el sistema escale correctamente y 
-- que las finanzas tengan toda la información necesaria.
