-- ==============================================================================
-- MYTURN - SCRIPT MAESTRO CONSOLIDADO Y OPTIMIZADO PARA SUPABASE
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLAS PRINCIPALES
-- ==============================================================================

-- Tenants (Negocios / Barberías / Salones)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  industry TEXT,
  category TEXT DEFAULT 'Belleza',
  plan_id TEXT DEFAULT 'Professional',
  status TEXT DEFAULT 'active',
  expiry_date TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
  professional_name TEXT DEFAULT 'Profesional',
  professional_title TEXT DEFAULT 'Especialista',
  slogan TEXT DEFAULT 'Gestión Modernizada',
  color TEXT DEFAULT '#f59e0b',
  logo TEXT,
  logo_url TEXT,
  show_reviews BOOLEAN DEFAULT true,
  booking_mode TEXT DEFAULT 'online',
  is_open BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  closing_time TEXT DEFAULT '20:00',
  last_auto_close_date TEXT,
  address TEXT,
  map_url TEXT,
  rating_value NUMERIC(3,1) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 1,
  require_confirmation BOOLEAN DEFAULT false,
  enable_custom_form BOOLEAN DEFAULT false,
  custom_form_config JSONB DEFAULT '[]'::jsonb,
  schedule JSONB DEFAULT '[{"day": "Lunes", "isOpen": true, "hours": "09:00 - 18:00"},{"day": "Martes", "isOpen": true, "hours": "09:00 - 18:00"},{"day": "Miércoles", "isOpen": true, "hours": "09:00 - 18:00"},{"day": "Jueves", "isOpen": true, "hours": "09:00 - 18:00"},{"day": "Viernes", "isOpen": true, "hours": "09:00 - 18:00"},{"day": "Sábado", "isOpen": false, "hours": "09:00 - 14:00"},{"day": "Domingo", "isOpen": false, "hours": "09:00 - 14:00"}]'::jsonb,
  lunch_break JSONB DEFAULT '{"enabled": false, "start": "13:00", "end": "14:00"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Users (Perfiles vinculados a auth.users y a su tenant)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Helper function para RLS multitenant
CREATE OR REPLACE FUNCTION public.tenant_id() RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Work Stations (Estaciones o sillones de trabajo)
CREATE TABLE IF NOT EXISTS public.work_stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Staff Members (Equipo / Barberos)
CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  commission_rate INTEGER DEFAULT 50,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Services (Servicios y precios)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  capacity INTEGER DEFAULT 1,
  icon TEXT DEFAULT 'Scissors',
  station_id UUID REFERENCES public.work_stations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Appointments (Turnos y Citas)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.work_stations(id) ON DELETE SET NULL,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'waiting',
  started_at TIMESTAMP WITH TIME ZONE,
  source TEXT DEFAULT 'online',
  session_id TEXT,
  admin_notes TEXT,
  custom_form_responses JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Transactions (Finanzas e ingresos/egresos)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL DEFAULT public.tenant_id(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  payment_method TEXT DEFAULT 'Efectivo',
  category TEXT DEFAULT 'General',
  subtotal NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  final_amount NUMERIC,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inventory (Inventario de insumos o productos)
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL DEFAULT public.tenant_id(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Desechables',
  current_stock NUMERIC DEFAULT 0,
  max_stock NUMERIC DEFAULT 100,
  min_alert NUMERIC DEFAULT 10,
  unit TEXT NOT NULL DEFAULT 'unidades',
  cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Saved Tenants (Negocios guardados por clientes / favoritos)
CREATE TABLE IF NOT EXISTS public.saved_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_device_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT,
  client_contact TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_device_tenant UNIQUE (client_device_id, tenant_id),
  CONSTRAINT unique_user_tenant UNIQUE (user_id, tenant_id)
);

-- Reviews (Reseñas de clientes)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Messages (Mensajes de clientes o difusiones)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  customer_name TEXT,
  content TEXT NOT NULL,
  is_from_client BOOLEAN DEFAULT true,
  is_read BOOLEAN DEFAULT false,
  is_broadcast BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Support Tickets (Soporte técnico interno de la plataforma)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_type TEXT,
  category TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. ÍNDICES DE ALTO RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_tenant_id ON public.staff_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_stations_tenant_id ON public.work_stations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON public.appointments(tenant_id, date_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_client_user ON public.appointments(client_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_date ON public.transactions(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON public.inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saved_tenants_user ON public.saved_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_tenants_device ON public.saved_tenants(client_device_id);
CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON public.reviews(tenant_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON public.messages(tenant_id, created_at);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Tenants Policies
DROP POLICY IF EXISTS "Public read tenants" ON public.tenants;
CREATE POLICY "Public read tenants" ON public.tenants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners update own tenant" ON public.tenants;
CREATE POLICY "Owners update own tenant" ON public.tenants FOR UPDATE USING (
  id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Allow tenant creation" ON public.tenants;
CREATE POLICY "Allow tenant creation" ON public.tenants FOR INSERT WITH CHECK (true);

-- Users Policies
DROP POLICY IF EXISTS "Users read own and team" ON public.users;
CREATE POLICY "Users read own and team" ON public.users FOR SELECT USING (
  id = auth.uid() OR tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users manage own profile" ON public.users;
CREATE POLICY "Users manage own profile" ON public.users FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users update own profile" ON public.users;
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Work Stations Policies
DROP POLICY IF EXISTS "Public read stations" ON public.work_stations;
CREATE POLICY "Public read stations" ON public.work_stations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners manage stations" ON public.work_stations;
CREATE POLICY "Owners manage stations" ON public.work_stations FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

-- Staff Members Policies
DROP POLICY IF EXISTS "Public read staff" ON public.staff_members;
CREATE POLICY "Public read staff" ON public.staff_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners manage staff" ON public.staff_members;
CREATE POLICY "Owners manage staff" ON public.staff_members FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

-- Services Policies
DROP POLICY IF EXISTS "Public read services" ON public.services;
CREATE POLICY "Public read services" ON public.services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners manage services" ON public.services;
CREATE POLICY "Owners manage services" ON public.services FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

-- Appointments Policies
DROP POLICY IF EXISTS "Public read appointments" ON public.appointments;
CREATE POLICY "Public read appointments" ON public.appointments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert appointments" ON public.appointments;
CREATE POLICY "Public insert appointments" ON public.appointments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owners and clients manage appointments" ON public.appointments;
CREATE POLICY "Owners and clients manage appointments" ON public.appointments FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  OR client_user_id = auth.uid()
  OR client_id = auth.uid()
);

-- Transactions Policies
DROP POLICY IF EXISTS "Owners manage transactions" ON public.transactions;
CREATE POLICY "Owners manage transactions" ON public.transactions FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

-- Inventory Policies
DROP POLICY IF EXISTS "Owners manage inventory" ON public.inventory;
CREATE POLICY "Owners manage inventory" ON public.inventory FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

-- Saved Tenants Policies
DROP POLICY IF EXISTS "Manage saved tenants" ON public.saved_tenants;
CREATE POLICY "Manage saved tenants" ON public.saved_tenants FOR ALL USING (
  (user_id IS NULL) OR (auth.uid() = user_id)
) WITH CHECK (
  (user_id IS NULL) OR (auth.uid() = user_id)
);

-- Reviews Policies
DROP POLICY IF EXISTS "Public read approved reviews" ON public.reviews;
CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Public insert reviews" ON public.reviews;
CREATE POLICY "Public insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owners manage reviews" ON public.reviews;
CREATE POLICY "Owners manage reviews" ON public.reviews FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

-- Messages Policies
DROP POLICY IF EXISTS "Public read messages" ON public.messages;
CREATE POLICY "Public read messages" ON public.messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert messages" ON public.messages;
CREATE POLICY "Public insert messages" ON public.messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owners manage messages" ON public.messages;
CREATE POLICY "Owners manage messages" ON public.messages FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

-- Support Tickets Policies
DROP POLICY IF EXISTS "Users manage own tickets" ON public.support_tickets;
CREATE POLICY "Users manage own tickets" ON public.support_tickets FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.users WHERE tenant_id = support_tickets.tenant_id)
);

-- ==============================================================================
-- 5. BUCKETS DE STORAGE
-- ==============================================================================
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

DROP POLICY IF EXISTS "Authenticated delete staff avatars" ON storage.objects;
CREATE POLICY "Authenticated delete staff avatars" ON storage.objects FOR DELETE USING (
  bucket_id = 'staff-avatars' AND auth.role() = 'authenticated'
);

-- ==============================================================================
-- 6. REALTIME REPLICATION (SINCRONIZACIÓN EN VIVO)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments, public.tenants, public.services, public.staff_members, public.inventory, public.messages;


NOTIFY pgrst, 'reload schema';
