-- v23: Persistencia de anulación manual de cierre automático
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS last_auto_close_date TEXT;

COMMENT ON COLUMN public.tenants.last_auto_close_date IS 'Almacena la fecha (YYYY-MM-DD) del último cierre automático o anulación manual para evitar re-cierres en el mismo día.';
