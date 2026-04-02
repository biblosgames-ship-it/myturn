-- v24: Permitir eliminación de citas con transacciones vinculadas (Cascade Delete)
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_appointment_id_fkey;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_appointment_id_fkey 
FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) 
ON DELETE CASCADE;
