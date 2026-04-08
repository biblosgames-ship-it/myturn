-- V39: REFUERZO DE POLÍTICAS PARA GESTIÓN DE PERSONAL (SaaS)
-- Este script asegura que el dueño del negocio pueda actualizar la info de sus profesionales

-- 1. Políticas EXPLICITAS para staff_members
DROP POLICY IF EXISTS "Staff isolation" ON public.staff_members;
DROP POLICY IF EXISTS "Owners manage staff" ON public.staff_members;

CREATE POLICY "Owners manage staff" ON public.staff_members 
    FOR ALL TO authenticated
    USING (
        tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        OR 
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin')
    )
    WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        OR 
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin')
    );

-- 2. Asegurar lectura pública (para que se vea en el BookingFlow)
DROP POLICY IF EXISTS "Public read access for Staff" ON public.staff_members;
CREATE POLICY "Public read access for Staff" ON public.staff_members FOR SELECT USING (true);


NOTIFY pgrst, 'reload schema';
