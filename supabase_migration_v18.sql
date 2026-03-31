-- Migration v18: Add closing_time column to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS closing_time TEXT DEFAULT '20:00';
