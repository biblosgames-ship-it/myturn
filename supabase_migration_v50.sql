-- ==============================================================================
-- v50: FIX INFINITE RECURSION IN USERS & TENANTS RLS POLICIES
-- ==============================================================================

-- 1. Helper functions with SECURITY DEFINER (bypasses RLS to avoid recursion loops)
CREATE OR REPLACE FUNCTION public.tenant_id() 
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_role() 
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Drop all recursive / conflicting policies on public.users
DROP POLICY IF EXISTS "Users within same tenant can read each other" ON public.users;
DROP POLICY IF EXISTS "Users read own and team" ON public.users;
DROP POLICY IF EXISTS "Allow individual read" ON public.users;
DROP POLICY IF EXISTS "Allow individual insert" ON public.users;
DROP POLICY IF EXISTS "Allow individual update" ON public.users;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.users;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.users;
DROP POLICY IF EXISTS "Users manage own profile" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile and team" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 3. Create clean, non-recursive policies on public.users
CREATE POLICY "Users can read own profile and team" ON public.users
FOR SELECT TO authenticated
USING (
    id = auth.uid() 
    OR 
    (tenant_id IS NOT NULL AND tenant_id = public.tenant_id())
    OR
    public.get_auth_role() IN ('admin', 'superadmin')
);

CREATE POLICY "Users can insert own profile" ON public.users
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE TO authenticated
USING (
    id = auth.uid() 
    OR 
    public.get_auth_role() IN ('admin', 'superadmin')
)
WITH CHECK (
    id = auth.uid() 
    OR 
    public.get_auth_role() IN ('admin', 'superadmin')
);

-- 4. Fix policies on public.tenants to use the SECURITY DEFINER helpers
DROP POLICY IF EXISTS "Allow updates for owners and admins" ON public.tenants;
DROP POLICY IF EXISTS "Owners update own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Allow system updates for Tenants" ON public.tenants;

CREATE POLICY "Allow updates for owners and admins" ON public.tenants
FOR UPDATE TO authenticated
USING (
    id = public.tenant_id()
    OR 
    public.get_auth_role() IN ('admin', 'superadmin')
)
WITH CHECK (
    id = public.tenant_id()
    OR 
    public.get_auth_role() IN ('admin', 'superadmin')
);
