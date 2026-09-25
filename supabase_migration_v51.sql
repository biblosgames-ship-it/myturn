-- ==============================================================================
-- v51: FIX TRANSACTIONS TABLE SCHEMA & RELOAD POSTGREST CACHE
-- ==============================================================================

-- 1. Agregar columnas requeridas por el frontend a la tabla transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount NUMERIC;

-- 2. Asegurar que el default para tenant_id esté configurado
DO $$ 
BEGIN
  ALTER TABLE public.transactions 
  ALTER COLUMN tenant_id SET DEFAULT public.tenant_id();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Si existían notas pero no descripción, respaldar a description
UPDATE public.transactions 
SET description = notes 
WHERE description IS NULL AND notes IS NOT NULL;

-- 4. Notificar a PostgREST para recargar la caché de esquemas inmediatamente
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
