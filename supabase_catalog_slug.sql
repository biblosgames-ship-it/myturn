-- Script para Fase 3: Enrutamiento SaaS y Catálogos

-- 1. Añadir la columna 'slug' a la tabla tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- (Opcional) Generar un slug temporal para los tenants existentes que no tengan
UPDATE public.tenants SET slug = lower(regexp_replace(name, '\s+', '-', 'g')) WHERE slug IS NULL;
