-- 1. Create bucket for staff avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('staff-avatars', 'staff-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS for the bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'staff-avatars');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'staff-avatars');
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'staff-avatars');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'staff-avatars');
