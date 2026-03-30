-- MIGRACIÓN FASE 4.5: BRANDING AVANZADO Y PERSISTENCIA DE CONFIGURACIÓN
-- Ejecuta esto en el SQL Editor de Supabase

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

-- Comentario: Estos campos permiten que cada negocio guarde su propia identidad visual
-- y configuración de disponibilidad sin depender de datos quemados en el código.
