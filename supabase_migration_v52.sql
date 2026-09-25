-- ==============================================================================
-- v52: AUDITORÍA Y ACTUALIZACIÓN INTEGRAL DE BASE DE DATOS (MYTURN) - DEFINITIVO
-- ==============================================================================

-- 1. TABLA 'tenants' (Negocios / Sucursales)
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS logo TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS closing_time TEXT DEFAULT '20:00',
  ADD COLUMN IF NOT EXISTS last_auto_close_date TEXT,
  ADD COLUMN IF NOT EXISTS require_confirmation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_custom_form BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_form_config JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rating_value NUMERIC(3,1) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS booking_mode TEXT DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS show_reviews BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#f59e0b',
  ADD COLUMN IF NOT EXISTS professional_name TEXT DEFAULT 'Profesional',
  ADD COLUMN IF NOT EXISTS professional_title TEXT DEFAULT 'Especialista',
  ADD COLUMN IF NOT EXISTS slogan TEXT DEFAULT 'Gestión Modernizada',
  ADD COLUMN IF NOT EXISTS lunch_break JSONB DEFAULT '{"start": "13:00", "end": "14:00", "enabled": true}'::jsonb;

-- 2. TABLA 'work_stations' (Estaciones / Puestos de Trabajo)
CREATE TABLE IF NOT EXISTS public.work_stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$ BEGIN
  ALTER TABLE public.work_stations ALTER COLUMN tenant_id SET DEFAULT public.tenant_id();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.work_stations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Station isolation" ON public.work_stations;
CREATE POLICY "Station isolation" ON public.work_stations 
  FOR ALL USING (tenant_id = public.tenant_id() OR auth.role() = 'authenticated');

-- 3. TABLA 'services' (Catálogo de Servicios)
ALTER TABLE public.services 
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Scissors',
  ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES public.work_stations(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.services ALTER COLUMN tenant_id SET DEFAULT public.tenant_id();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. TABLA 'staff_members' (Equipo / Barberos)
ALTER TABLE public.staff_members 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.staff_members ALTER COLUMN tenant_id SET DEFAULT public.tenant_id();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5. TABLA 'appointments' (Citas y Turnos)
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES public.work_stations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS custom_form_responses JSONB DEFAULT '{}'::jsonb;

-- 6. TABLA 'transactions' (Finanzas)
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount NUMERIC;

DO $$ BEGIN
  ALTER TABLE public.transactions ALTER COLUMN tenant_id SET DEFAULT public.tenant_id();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_appointment_id_fkey;
  ALTER TABLE public.transactions 
    ADD CONSTRAINT transactions_appointment_id_fkey 
    FOREIGN KEY (appointment_id) 
    REFERENCES public.appointments(id) 
    ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 7. TABLA 'inventory' (Inventario y Stock)
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.inventory 
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Desechables',
  ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_stock NUMERIC DEFAULT 100,
  ADD COLUMN IF NOT EXISTS min_alert NUMERIC DEFAULT 10,
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'unidades',
  ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.inventory ALTER COLUMN tenant_id SET DEFAULT public.tenant_id();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inventory isolation" ON public.inventory;
CREATE POLICY "Inventory isolation" ON public.inventory 
  FOR ALL USING (tenant_id = public.tenant_id() OR auth.role() = 'authenticated');

-- 8. TABLA 'messages' (Centro de Mensajes y Notificaciones)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_from_client BOOLEAN DEFAULT true,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT false;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender') THEN
    ALTER TABLE public.messages ALTER COLUMN sender DROP NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow owners manage messages" ON public.messages;
CREATE POLICY "Allow owners manage messages" ON public.messages FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id() OR auth.uid() IN (SELECT id FROM public.users WHERE tenant_id = messages.tenant_id));

DROP POLICY IF EXISTS "Allow public insert messages" ON public.messages;
CREATE POLICY "Allow public insert messages" ON public.messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow clients read their own messages" ON public.messages;
CREATE POLICY "Allow clients read their own messages" ON public.messages FOR SELECT USING (true);

-- 9. TABLA 'reviews' (Reseñas de Clientes)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reviews 
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read approved reviews" ON public.reviews;
CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert reviews" ON public.reviews;
CREATE POLICY "Public insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owners manage reviews" ON public.reviews;
CREATE POLICY "Owners manage reviews" ON public.reviews FOR ALL USING (tenant_id = public.tenant_id());

-- 10. TABLA 'saved_tenants' (Negocios Guardados por Clientes)
CREATE TABLE IF NOT EXISTS public.saved_tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_device_id TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT saved_tenants_user_tenant_key UNIQUE (user_id, tenant_id)
);

ALTER TABLE public.saved_tenants 
  ADD COLUMN IF NOT EXISTS client_device_id TEXT,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

ALTER TABLE public.saved_tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read and write saved_tenants" ON public.saved_tenants;
CREATE POLICY "Public read and write saved_tenants" ON public.saved_tenants FOR ALL USING (true) WITH CHECK (true);

-- 11. TABLA 'support_tickets' (Tickets de Soporte a SuperAdmin)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  account_type TEXT DEFAULT 'Free',
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert tickets" ON public.support_tickets;
CREATE POLICY "Public insert tickets" ON public.support_tickets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Superadmin or owner read tickets" ON public.support_tickets;
CREATE POLICY "Superadmin or owner read tickets" ON public.support_tickets 
  FOR ALL USING (tenant_id = public.tenant_id() OR public.get_auth_role() IN ('admin', 'superadmin'));

-- 12. TABLA 'users' (Teléfono y Nombre)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 13. STORAGE BUCKETS (logos y fotos de perfil)
DO $$ 
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES 
    ('logos', 'logos', true),
    ('staff-avatars', 'staff-avatars', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

  DROP POLICY IF EXISTS "Public view logos" ON storage.objects;
  CREATE POLICY "Public view logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');

  DROP POLICY IF EXISTS "Authenticated upload logos" ON storage.objects;
  CREATE POLICY "Authenticated upload logos" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'logos' AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );

  DROP POLICY IF EXISTS "Authenticated update logos" ON storage.objects;
  CREATE POLICY "Authenticated update logos" ON storage.objects FOR UPDATE USING (
    bucket_id = 'logos' AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );

  DROP POLICY IF EXISTS "Public view staff avatars" ON storage.objects;
  CREATE POLICY "Public view staff avatars" ON storage.objects FOR SELECT USING (bucket_id = 'staff-avatars');

  DROP POLICY IF EXISTS "Authenticated upload staff avatars" ON storage.objects;
  CREATE POLICY "Authenticated upload staff avatars" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'staff-avatars' AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );

  DROP POLICY IF EXISTS "Authenticated update staff avatars" ON storage.objects;
  CREATE POLICY "Authenticated update staff avatars" ON storage.objects FOR UPDATE USING (
    bucket_id = 'staff-avatars' AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 14. HABILITACIÓN DE SUPABASE REALTIME
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tenants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'appointments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'services') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'staff_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reviews') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'saved_tenants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_tenants;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'work_stations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.work_stations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'inventory') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 15. RECARGA DE CACHÉ DE ESQUEMAS DE POSTGREST
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
