-- Add category column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Belleza';

-- Update existing tenants with a default category if needed
UPDATE tenants SET category = 'Belleza' WHERE category IS NULL;
