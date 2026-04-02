-- v25: Vincular citas con sesiones de chat para permitir envío de recibos
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Comentario para el desarrollador: 
-- Esta columna almacenará el ID de sesión del cliente que realiza la reserva, 
-- permitiendo que el profesional le envíe mensajes (como el recibo) de vuelta.
