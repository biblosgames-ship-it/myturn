-- ==============================================================================
-- MIGRATION V55: CUSTOMER DEBTS (CUENTAS POR COBRAR / FIADOS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.customer_debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  service_name TEXT,
  staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'partial', 'paid'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  due_date DATE,
  settled_at TIMESTAMP WITH TIME ZONE,
  settled_method TEXT -- 'efectivo', 'tarjeta', 'transferencia'
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_customer_debts_tenant ON public.customer_debts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_debts_status ON public.customer_debts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_debts_created_at ON public.customer_debts(created_at DESC);

-- Enable RLS
ALTER TABLE public.customer_debts ENABLE ROW LEVEL SECURITY;

-- Permissive policies for tenant-authenticated or anon client lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_debts' AND policyname = 'Allow select customer_debts'
  ) THEN
    CREATE POLICY "Allow select customer_debts"
    ON public.customer_debts FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_debts' AND policyname = 'Allow insert customer_debts'
  ) THEN
    CREATE POLICY "Allow insert customer_debts"
    ON public.customer_debts FOR INSERT
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_debts' AND policyname = 'Allow update customer_debts'
  ) THEN
    CREATE POLICY "Allow update customer_debts"
    ON public.customer_debts FOR UPDATE
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_debts' AND policyname = 'Allow delete customer_debts'
  ) THEN
    CREATE POLICY "Allow delete customer_debts"
    ON public.customer_debts FOR DELETE
    USING (true);
  END IF;
END $$;
