-- v30: Soporte para Ventana de Agendamiento (Cutoff Time)
-- Agrega un campo opcional 'booking_end_time' dentro de los objetos del array 'schedule'.

-- Nota: No se requiere ALTER TABLE estructural ya que 'schedule' es un JSONB flexible.
-- Esta migración documenta el cambio y opcionalmente podría usarse para migrar datos existentes,
-- aunque no es estrictamente necesario si el código frontend maneja valores nulos.

COMMENT ON COLUMN public.tenants.schedule IS 'Esquema JSON esperado para cada elemento: {"day": "Lunes", "isOpen": true, "hours": "09:00-18:00", "booking_end_time": "12:00"} (opcional)';

-- Actualizar la recarga de esquema
NOTIFY pgrst, 'reload schema';
