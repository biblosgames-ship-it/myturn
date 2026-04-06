-- 1. Create bucket for staff avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('staff-avatars', 'staff-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS for the bucket with UNIQUE NAMES
DROP POLICY IF EXISTS "Public Access Staff Avatars" ON storage.objects;
CREATE POLICY "Public Access Staff Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'staff-avatars');

DROP POLICY IF EXISTS "Authenticated Upload Staff Avatars" ON storage.objects;
CREATE POLICY "Authenticated Upload Staff Avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'staff-avatars');

DROP POLICY IF EXISTS "Authenticated Delete Staff Avatars" ON storage.objects;
CREATE POLICY "Authenticated Delete Staff Avatars" ON storage.objects FOR DELETE USING (bucket_id = 'staff-avatars');

