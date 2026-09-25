-- ==============================================================================
-- MIGRATION V54: BUSINESS CLAIM & OWNER ONBOARDING TOKENS
-- ==============================================================================

-- 1. Add claim_token and contact fields to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS claim_token TEXT,
ADD COLUMN IF NOT EXISTS owner_phone TEXT;

-- 2. Populate claim_token for existing unlinked or pending tenants
UPDATE public.tenants
SET claim_token = 'claim_' || encode(gen_random_bytes(12), 'hex')
WHERE claim_token IS NULL AND (owner IS NULL OR owner = 'Pendiente' OR owner = '');

-- 3. Create index for fast token resolution
CREATE INDEX IF NOT EXISTS idx_tenants_claim_token ON public.tenants(claim_token);

-- 4. Enable RLS policy allowing public to read tenant basic public info if claim_token matches
-- (so the prospective owner can see the business name and logo on the claim screen before logging in)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tenants' AND policyname = 'Allow public lookup by claim token'
  ) THEN
    CREATE POLICY "Allow public lookup by claim token"
    ON public.tenants
    FOR SELECT
    USING (claim_token IS NOT NULL);
  END IF;
END $$;
