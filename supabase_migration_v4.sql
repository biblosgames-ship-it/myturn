-- MIGRACIÓN FASE 4.6: CORRECCIÓN DE COLUMNAS FALTANTES
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Asegurar columna 'status' en tenants para permitir cambios de plan
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Refresh the schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

-- 2. Asegurar que las columnas de branding tengan valores por defecto si están vacías
UPDATE public.tenants SET status = 'active' WHERE status IS NULL;
UPDATE public.tenants SET plan_id = 'Free' WHERE plan_id IS NULL;

-- 3. Comentario: Esta columna es vital para el panel de SuperAdmin y la suspensión de cuentas.
