-- Paso 1: Agregar campos de suscripción a la tabla Tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days');

-- Paso 2: Actualizar planes existentes a Professional para su periodo de prueba
UPDATE public.tenants 
SET plan_id = 'Professional' 
WHERE plan_id = 'Free' OR plan_id IS NULL;
