-- Migration v34: Performance & Scalability (Indexing tenant_id)
-- Ensure all foreign keys used for multi-tenant isolation are indexed for fast lookups

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_tenant_id ON public.staff_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON public.appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON public.transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_id ON public.inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON public.messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saved_tenants_tenant_id ON public.saved_tenants(tenant_id);

-- Commentary: With these indexes, Row Level Security (RLS) filters will be O(log N) instead of O(N),
-- meaning the app will be just as fast with 1,000 businesses as it would be with 1,000,000.
