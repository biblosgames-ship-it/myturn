-- ==============================================================================
-- MIGRATION V59: TIENDA, INVENTARIO CONFIGURABLE Y PRODUCTOS PARA VENTA
-- Añade soporte para precios de venta al público, fotos, SKU y venta en caja
-- ==============================================================================

-- 1. Añadir columnas para catálogo de tienda y venta en caja en 'inventory'
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS sku TEXT;

-- 2. Asegurar índices de búsqueda por tenant y disponibilidad de venta
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_sale 
ON public.inventory(tenant_id, is_for_sale);

-- 3. Políticas RLS para aislamiento y permisos en 'inventory'
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read inventory" ON public.inventory;
DROP POLICY IF EXISTS "Owners manage inventory" ON public.inventory;
DROP POLICY IF EXISTS "Inventory isolation" ON public.inventory;

-- Permitir lectura de inventario/tienda
CREATE POLICY "Public read inventory" ON public.inventory 
FOR SELECT USING (true);

-- Permitir gestión completa a propietarios del negocio y SuperAdmin
CREATE POLICY "Owners manage inventory" ON public.inventory 
FOR ALL TO authenticated
USING (
  public.is_superadmin()
  OR
  tenant_id = public.tenant_id()
  OR
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
)
WITH CHECK (
  public.is_superadmin()
  OR
  tenant_id = public.tenant_id()
  OR
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

-- 4. Notificar a PostgREST para recargar la caché de esquema
NOTIFY pgrst, 'reload schema';
