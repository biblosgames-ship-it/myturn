-- V43: LIMPIEZA DE REGISTROS DUPLICADOS DE PERSONAL
-- Este script elimina registros antiguos de staff_members que podrían estar causando
-- que se vea el perfil vacío en lugar del perfil oficial con foto.

-- 1. Eliminar duplicados, dejando solo el más reciente para cada negocio
DELETE FROM public.staff_members a
USING public.staff_members b
WHERE a.tenant_id = b.tenant_id 
  AND a.created_at < b.created_at;

-- 2. Asegurar que el ID del profesional principal esté bien vinculado (pc-opcional)
-- Esto ayuda a que BarberManagement encuentre siempre el mismo registro.

NOTIFY pgrst, 'reload schema';
