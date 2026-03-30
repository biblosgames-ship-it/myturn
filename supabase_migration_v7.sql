-- MIGRACIÓN FASE 7: INTEGRIDAD DE DATOS Y REALTIME TOTAL
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Asegurar columna 'icon' en la tabla de servicios
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Scissors';

-- 2. Habilitar Realtime para TODAS las tablas críticas (SaaS Sync)
BEGIN;
  DO $$ 
  BEGIN
    -- Lista de tablas a habilitar
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'services') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'staff_members') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_members;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'inventory') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transactions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;
  END $$;
COMMIT;

-- 3. Forzar recarga de esquema
NOTIFY pgrst, 'reload schema';
