-- Paso 1: Work Stations (Estaciones de Trabajo) - Enterprise Feature
-- Tabla principal de estaciones
CREATE TABLE IF NOT EXISTS public.work_stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.work_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Station isolation" ON public.work_stations
  FOR ALL USING (tenant_id = public.tenant_id());

-- Vincular servicios a estaciones (opcional por servicio)
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES public.work_stations(id) ON DELETE SET NULL;

-- Registrar la estación usada en cada cita
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES public.work_stations(id) ON DELETE SET NULL;

-- Habilitar realtime para work_stations
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_stations;
