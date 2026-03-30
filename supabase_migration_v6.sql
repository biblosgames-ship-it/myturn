-- MIGRACIÓN FASE 6: ESTABILIZACIÓN DE MARCA Y ALMACENAMIENTO DE LOGOS
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Asegurar TODAS las columnas de branding en 'tenants'
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS professional_name TEXT DEFAULT 'Profesional',
ADD COLUMN IF NOT EXISTS professional_title TEXT DEFAULT 'Especialista',
ADD COLUMN IF NOT EXISTS slogan TEXT DEFAULT 'Gestión Modernizada',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#f59e0b',
ADD COLUMN IF NOT EXISTS show_reviews BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS booking_mode TEXT DEFAULT 'online',
ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '[
    {"day": "Lunes", "isOpen": true, "hours": "09:00 - 18:00"},
    {"day": "Martes", "isOpen": true, "hours": "09:00 - 18:00"},
    {"day": "Miércoles", "isOpen": true, "hours": "09:00 - 18:00"},
    {"day": "Jueves", "isOpen": true, "hours": "09:00 - 18:00"},
    {"day": "Viernes", "isOpen": true, "hours": "09:00 - 18:00"},
    {"day": "Sábado", "isOpen": false, "hours": "09:00 - 14:00"},
    {"day": "Domingo", "isOpen": false, "hours": "09:00 - 14:00"}
]'::jsonb,
ADD COLUMN IF NOT EXISTS lunch_break JSONB DEFAULT '{"start": "13:00", "end": "14:00", "enabled": true}'::jsonb;

-- 2. Crear Bucket de Storage para Logos (si no existe)
-- Nota: Esto requiere que tengas habilitado el servicio de Storage en Supabase
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de RLS para el Bucket 'logos'
-- Permitir lectura pública
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'logos');

-- Permitir que usuarios autenticados suban sus propios logos
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload logos" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Permitir que usuarios actualicen sus propios archivos en el bucket
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
CREATE POLICY "Users can update their own logos" ON storage.objects 
FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- 4. Forzar recarga de esquema para PostgREST
NOTIFY pgrst, 'reload schema';
