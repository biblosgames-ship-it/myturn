-- Paso 1: Configuración de formulario personalizado en Tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS enable_custom_form BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_form_config JSONB DEFAULT '[]'::jsonb;

-- Paso 2: Almacenamiento de respuestas en Appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS custom_form_responses JSONB DEFAULT '{}'::jsonb;
