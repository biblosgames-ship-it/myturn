-- ==============================================================================
-- v53: MOTOR DE PUBLICIDAD, PROMOCIONES LOCALES Y NEGOCIOS DESTACADOS (MYTURN)
-- ==============================================================================

-- 1. ACTUALIZAR TABLA 'tenants' CON CAMPOS DE DESTACADO Y PROMOCIONES LOCALES
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_badge TEXT DEFAULT 'DESTACADO',
  ADD COLUMN IF NOT EXISTS custom_promotions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS show_global_ads BOOLEAN DEFAULT true;

-- Índice para acelerar la consulta de negocios destacados en el directorio
CREATE INDEX IF NOT EXISTS idx_tenants_featured ON public.tenants (is_featured DESC, rating_value DESC);

-- 2. TABLA 'platform_ads' (Anuncios y Campañas Globales del SuperAdmin)
CREATE TABLE IF NOT EXISTS public.platform_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  badge TEXT DEFAULT 'PROMO',
  image_url TEXT,
  target_url TEXT,
  type TEXT DEFAULT 'cintillo', -- 'cintillo' | 'banner' | 'popup'
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS en platform_ads
ALTER TABLE public.platform_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read platform ads" ON public.platform_ads;
CREATE POLICY "Public read platform ads" ON public.platform_ads 
  FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Superadmin manage platform ads" ON public.platform_ads;
CREATE POLICY "Superadmin manage platform ads" ON public.platform_ads 
  FOR ALL USING (auth.role() = 'authenticated');

-- 3. HABILITAR TIEMPO REAL PARA LA TABLA DE ANUNCIOS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'platform_ads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE platform_ads;
  END IF;
END $$;

-- 4. INSERTAR ANUNCIOS SEMILLA POR DEFECTO
INSERT INTO public.platform_ads (title, subtitle, badge, target_url, type, is_active, priority)
VALUES 
  ('¿Tienes un negocio o barbería?', 'Lleva tus turnos y cobros al siguiente nivel con MyTurn.', 'CRECE', '/barber_login', 'cintillo', true, 10),
  ('Descarga la WebApp en tu móvil', 'Agrégala a tu pantalla de inicio para acceder en 1 segundo.', 'APP', '/', 'cintillo', true, 5)
ON CONFLICT DO NOTHING;
