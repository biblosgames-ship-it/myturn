-- Script para Fase 1.5: Permitir a Clientes Anónimos Agendar Citas

-- 1. Permitir que cualquier persona pueda VER los negocios (Tenants), servicios y profesionales
CREATE POLICY "Public read access for Tenants" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Public read access for Services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Public read access for Staff" ON public.staff_members FOR SELECT USING (true);

-- 2. Permitir que cualquier persona pueda VER la Cola en Vivo (Appointments)
CREATE POLICY "Public read access for Appointments" ON public.appointments FOR SELECT USING (true);

-- 3. Permitir que cualquier persona pueda INSERTAR una nueva cita (Agendar)
CREATE POLICY "Public insert access for Appointments" ON public.appointments FOR INSERT WITH CHECK (true);
