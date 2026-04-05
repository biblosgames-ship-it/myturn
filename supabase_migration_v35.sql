-- Agregar opción para requerir confirmación manual de citas
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS require_confirmation BOOLEAN DEFAULT FALSE;
