-- v31: Funcionalidad de Favoritos para Negocios Guardados
ALTER TABLE public.saved_tenants 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.saved_tenants.is_favorite IS 'Permite al cliente destacar negocios para que aparezcan primero en su lista.';
