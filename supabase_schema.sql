-- 1. Create the base Tenants table (Businesses)
CREATE TABLE public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  plan_id TEXT DEFAULT 'Free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the Users table (extends auth.users to link them to a tenant)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable General Row Level Security
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Helper Function (Crucial for SaaS Multi-tenant security)
-- This function gets the active user's tenant_id
CREATE OR REPLACE FUNCTION public.tenant_id() RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 5. Staff Members
CREATE TABLE public.staff_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL DEFAULT public.tenant_id(),
  name TEXT NOT NULL,
  role TEXT,
  commission_rate INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff isolation" ON public.staff_members FOR ALL USING (tenant_id = public.tenant_id());

-- 6. Services
CREATE TABLE public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL DEFAULT public.tenant_id(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services isolation" ON public.services FOR ALL USING (tenant_id = public.tenant_id());

-- 7. Appointments (Turnos)
CREATE TABLE public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL DEFAULT public.tenant_id(),
  client_name TEXT NOT NULL,
  client_user_id UUID REFERENCES auth.users(id),
  service_id UUID REFERENCES public.services(id),
  staff_id UUID REFERENCES public.staff_members(id),
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Appointments isolation" ON public.appointments FOR ALL USING (tenant_id = public.tenant_id());

-- 8. Transactions (Finanzas)
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL DEFAULT public.tenant_id(),
  appointment_id UUID REFERENCES public.appointments(id),
  staff_id UUID REFERENCES public.staff_members(id),
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'ingreso' or 'egreso'
  payment_method TEXT DEFAULT 'Efectivo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transactions isolation" ON public.transactions FOR ALL USING (tenant_id = public.tenant_id());

-- 9. Basic Read Policies for Users/Tenants
CREATE POLICY "Users can read own tenant" ON public.tenants FOR SELECT USING (id = public.tenant_id());
CREATE POLICY "Users within same tenant can read each other" ON public.users FOR SELECT USING (tenant_id = public.tenant_id());

-- Turn on Realtime for the Appointments table (Live Queue)
alter publication supabase_realtime add table public.appointments;
