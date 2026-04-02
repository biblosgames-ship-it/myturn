-- v26: Seguimiento estructurado de descuentos y subtotales en transacciones
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.transactions.discount_percent IS 'Porcentaje de descuento aplicado al servicio';
COMMENT ON COLUMN public.transactions.subtotal IS 'Monto original antes de aplicar descuentos';
