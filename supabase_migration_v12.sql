-- Add is_open column to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;

-- Update existing tenants to be open by default
UPDATE public.tenants SET is_open = true WHERE is_open IS NULL;
