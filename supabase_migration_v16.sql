-- Migration v16: Añadir started_at para rastrear el tiempo real del cronómetro en la cola

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
