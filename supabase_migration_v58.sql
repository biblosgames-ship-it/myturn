-- ==============================================================================
-- MIGRATION V58: ENSURE 'duration_minutes' & 'duration' IN SERVICES TABLE
-- Corrige el error de "Could not find the 'duration' column of 'services' in the schema cache"
-- ==============================================================================

-- 1. Asegurar que las columnas de duracion existan en 'services'
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Scissors';

-- 2. Sincronizar datos para compatibilidad bidireccional
UPDATE public.services 
SET duration_minutes = COALESCE(duration_minutes, duration, 30),
    duration = COALESCE(duration, duration_minutes, 30);

-- 3. Recargar la cache de PostgREST para que detecte las columnas inmediatamente
NOTIFY pgrst, 'reload schema';
