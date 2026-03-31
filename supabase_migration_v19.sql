-- Migration v19: Add address, map_url, rating and reviews columns to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS map_url TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS rating_value NUMERIC(3,1) DEFAULT 5.0;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 1;
