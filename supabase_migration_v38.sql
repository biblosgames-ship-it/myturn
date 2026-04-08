-- V38: CORRECCIÓN DE POLÍTICAS PARA AVATARES DE PERSONAL
-- Ejecuta esto en el SQL Editor de Supabase si ya aplicaste v37

-- 1. Permitir ACTUALIZACIÓN (UPDATE) de archivos en el bucket 'staff-avatars'
DROP POLICY IF EXISTS "Authenticated Update Staff Avatars" ON storage.objects;
CREATE POLICY "Authenticated Update Staff Avatars" ON storage.objects 
FOR UPDATE USING (bucket_id = 'staff-avatars' AND auth.role() = 'authenticated');

-- 2. Asegurar que INSERT también permita subir nuevos archivos libremente
DROP POLICY IF EXISTS "Authenticated Upload Staff Avatars" ON storage.objects;
CREATE POLICY "Authenticated Upload Staff Avatars" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'staff-avatars' AND auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
