-- SQL Migration v48: Unique Constraint for Authenticated Saved Tenants
-- This allows upsert to work correctly for logged-in users.

-- 1. Remove any potential duplicates before adding the constraint
DELETE FROM public.saved_tenants a
USING public.saved_tenants b
WHERE a.id < b.id
  AND a.tenant_id = b.tenant_id
  AND (
    (a.user_id = b.user_id AND a.user_id IS NOT NULL) OR
    (a.client_device_id = b.client_device_id AND a.user_id IS NULL AND b.user_id IS NULL)
  );

-- 2. Add the unique constraint for user_id and tenant_id
-- We use a partial index or a conditional constraint if we want to allow multiple anonymous entries with same device? 
-- Actually, (client_device_id, tenant_id) is already unique.
-- We want (user_id, tenant_id) to be unique too.

ALTER TABLE public.saved_tenants 
ADD CONSTRAINT unique_user_tenant UNIQUE (user_id, tenant_id);
