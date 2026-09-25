import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Plus, Minus, AlertTriangle, RefreshCcw, Tag, Box, X, 
  Loader2, ShoppingBag, DollarSign, Search, Edit3, Trash2, 
  Upload, CheckCircle2, TrendingUp, Sparkles, CreditCard, ChevronRight,
  Filter, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { compressImage, formatBytes } from '../lib/imageCompression';

export interface Product {
  id: string;
  tenant_id?: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  currentStock: number;
  maxStock: number;
  unit: string;
  minAlert: number;
  isForSale: boolean;
  imageUrl?: string;
  sku?: string;
}

interface InventoryManagementProps {
  tenantId?: string;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({ tenantId: propTenantId }) => {
  const [tenantId, setTenantId] = useState<string | null>(propTenantId || null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'store' | 'supplies' | 'low_stock'>('all');
  
  // Product creation / edit state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Cuidado Capilar',
    price: 15,
    cost: 8,
    currentStock: 10,
    maxStock: 50,
    unit: 'unidades',
    minAlert: 3,
    isForSale: true,
    imageUrl: '',
    sku: ''
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Quick Counter Sale (POS express) state
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [quickSaleCart, setQuickSaleCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [quickSaleMethod, setQuickSaleMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [quickSaleSuccess, setQuickSaleSuccess] = useState<string | null>(null);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // 1. Resolve Effective Tenant ID
  useEffect(() => {
    if (propTenantId) {
      setTenantId(propTenantId);
      return;
    }
    const resolveTenant = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();
          if (dbUser?.tenant_id) {
            setTenantId(dbUser.tenant_id);
          }
        }
      } catch (e) {
        console.warn('Error resolving user tenant in InventoryManagement:', e);
      }
    };
    resolveTenant();
  }, [propTenantId]);

  // 2. Fetch Products
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('inventory').select('*').order('name', { ascending: true });
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;

      if (data) {
        setProducts(data.map((p: any) => ({
          id: p.id,
          tenant_id: p.tenant_id,
          name: p.name,
          category: p.category || 'Otros',
          price: Number(p.price || 0),
          cost: Number(p.cost || 0),
          currentStock: Number(p.current_stock || 0),
          maxStock: Number(p.max_stock || 100),
          unit: p.unit || 'unidades',
          minAlert: Number(p.min_alert || 5),
          isForSale: p.is_for_sale !== false,
          imageUrl: p.image_url || '',
          sku: p.sku || ''
        })));
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [tenantId]);

  // 3. Quick stock adjust (+1 / -1)
  const updateStock = async (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const newStock = Math.max(0, product.currentStock + delta);
    
    // Optimistic Update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, currentStock: newStock } : p));

    try {
      const { error } = await supabase
        .from('inventory')
        .update({ current_stock: newStock })
        .eq('id', id);

      if (error) {
        console.error("Error updating stock:", error);
        fetchProducts(); // Rollback
      }
    } catch (err) {
      fetchProducts();
    }
  };

  // 4. Handle Image Upload with Compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 450, maxHeight: 450, quality: 0.85 });
      const fileName = `products/prod_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;

      // Try uploading to 'logos' bucket
      const { error: upErr } = await supabase.storage.from('logos').upload(fileName, compressed.file, {
        contentType: 'image/webp',
        upsert: true
      });

      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
        setProductForm(prev => ({ ...prev, imageUrl: publicUrl }));
      } else {
        // Fallback: Use generated preview data URL
        setProductForm(prev => ({ ...prev, imageUrl: compressed.previewUrl }));
      }
    } catch (err) {
      console.warn("Could not upload compressed image, reading local preview:", err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProductForm(prev => ({ ...prev, imageUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // 5. Open Create Modal
  const openCreateModal = () => {
    setEditingId(null);
    setProductForm({
      name: '',
      category: 'Cuidado Capilar',
      price: 15,
      cost: 8,
      currentStock: 10,
      maxStock: 50,
      unit: 'unidades',
      minAlert: 3,
      isForSale: true,
      imageUrl: '',
      sku: ''
    });
    setModalMode('create');
  };

  // 6. Open Edit Modal
  const openEditModal = (p: Product) => {
    setEditingId(p.id);
    setProductForm({
      name: p.name,
      category: p.category,
      price: p.price,
      cost: p.cost,
      currentStock: p.currentStock,
      maxStock: p.maxStock,
      unit: p.unit,
      minAlert: p.minAlert,
      isForSale: p.isForSale,
      imageUrl: p.imageUrl || '',
      sku: p.sku || ''
    });
    setModalMode('edit');
  };

  // 7. Save Product (Insert / Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      alert("Por favor ingresa el nombre del producto.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: productForm.name.trim(),
        category: productForm.category,
        price: Number(productForm.price) || 0,
        cost: Number(productForm.cost) || 0,
        current_stock: Number(productForm.currentStock) || 0,
        max_stock: Number(productForm.maxStock) || 100,
        unit: productForm.unit || 'unidades',
        min_alert: Number(productForm.minAlert) || 5,
        is_for_sale: productForm.isForSale,
        image_url: productForm.imageUrl || null,
        sku: productForm.sku?.trim() || null
      };

      if (tenantId) {
        payload.tenant_id = tenantId;
      }

      if (modalMode === 'edit' && editingId) {
        const { error } = await supabase
          .from('inventory')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert(payload);

        if (error) throw error;
      }

      await fetchProducts();
      setModalMode(null);
      setEditingId(null);
    } catch (err: any) {
      console.error("Error saving product:", err);
      alert(`Error al guardar producto: ${err.message || 'Intente nuevamente'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 8. Delete Product
  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`¿Estás seguro de eliminar el producto "${p.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', p.id);
      if (error) throw error;
      setProducts(prev => prev.filter(x => x.id !== p.id));
    } catch (err: any) {
      alert(`Error eliminando producto: ${err.message}`);
    }
  };

  // 9. Quick POS Sale Handlers
  const openQuickSaleModal = () => {
    setQuickSaleCart([]);
    setQuickSaleSuccess(null);
    setShowQuickSale(true);
  };

  const addToQuickCart = (product: Product) => {
    if (product.currentStock <= 0) {
      alert("Este producto no tiene stock disponible.");
      return;
    }
    setQuickSaleCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          alert(`Solo hay ${product.currentStock} unidades disponibles en inventario.`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setQuickSaleCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty > item.product.currentStock) {
              alert(`Solo hay ${item.product.currentStock} unidades disponibles.`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(item => item.quantity > 0);
    });
  };

  const handleProcessQuickSale = async () => {
    if (quickSaleCart.length === 0) return;
    setIsProcessingSale(true);

    try {
      const totalAmount = quickSaleCart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );

      const itemsSummary = quickSaleCart
        .map(i => `${i.product.name} (x${i.quantity})`)
        .join(', ');

      // 1. Record transaction in finance
      const txPayload: any = {
        amount: totalAmount,
        type: 'ingreso',
        payment_method: quickSaleMethod,
        category: 'Venta de Tienda',
        description: `Venta Mostrador: ${itemsSummary}`
      };
      if (tenantId) txPayload.tenant_id = tenantId;

      const { error: txErr } = await supabase.from('transactions').insert(txPayload);
      if (txErr) console.warn("Notice: Transaction logged with default schema:", txErr.message);

      // 2. Decrement stock for each item
      for (const item of quickSaleCart) {
        const nextStock = Math.max(0, item.product.currentStock - item.quantity);
        await supabase
          .from('inventory')
          .update({ current_stock: nextStock })
          .eq('id', item.product.id);
      }

      setQuickSaleSuccess(`¡Venta completada por $${totalAmount.toFixed(2)}! Se descontó el inventario.`);
      setQuickSaleCart([]);
      await fetchProducts();

      setTimeout(() => {
        setQuickSaleSuccess(null);
        setShowQuickSale(false);
      }, 2200);
    } catch (err: any) {
      console.error("Error processing quick sale:", err);
      alert(`Error al procesar la venta: ${err.message || 'Error inesperado'}`);
    } finally {
      setIsProcessingSale(false);
    }
  };

  // 10. Filtered Products & Calculations
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeFilter === 'store') return p.isForSale;
      if (activeFilter === 'supplies') return !p.isForSale;
      if (activeFilter === 'low_stock') return p.currentStock <= p.minAlert;

      return true;
    });
  }, [products, searchQuery, activeFilter]);

  const stats = useMemo(() => {
    const totalStoreItems = products.filter(p => p.isForSale).length;
    const lowStockCount = products.filter(p => p.currentStock <= p.minAlert).length;
    const inventoryValuation = products.reduce((acc, p) => acc + (p.price * p.currentStock), 0);
    return { totalStoreItems, lowStockCount, inventoryValuation };
  }, [products]);

  const getStockBadgeColor = (p: Product) => {
    if (p.currentStock <= 0) return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444' };
    if (p.currentStock <= p.minAlert) return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: '#f59e0b' };
    return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: '#10b981' };
  };

  if (isLoading && products.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '320px', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={36} color="var(--primary)" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando catálogo de tienda e inventario...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Banner & Fast Actions */}
      <div className="card" style={{
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(0,0,0,0.2))',
        border: '1px solid rgba(245,158,11,0.25)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShoppingBag size={26} color="var(--primary)" /> Tienda & Control de Inventario
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
            Configura productos con precio para cobrar en caja durante el servicio o vender directo en mostrador.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={openQuickSaleModal}
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 800,
              color: 'var(--primary)',
              borderColor: 'var(--primary)'
            }}
          >
            <Sparkles size={16} /> ⚡ Venta Rápida Mostrador
          </button>

          <button
            onClick={openCreateModal}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
            }}
          >
            <Plus size={18} /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Productos para Venta</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>{stats.totalStoreItems}</h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valor Inventario (Venta)</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>${stats.inventoryValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: stats.lowStockCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: stats.lowStockCount > 0 ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stock Bajo / Agotado</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: stats.lowStockCount > 0 ? '#ef4444' : 'var(--text)' }}>
              {stats.lowStockCount} {stats.lowStockCount > 0 ? '⚠️' : '✅'}
            </h3>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 280px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, categoría o SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem 0.65rem 2.4rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '0.85rem'
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todos', count: products.length },
            { id: 'store', label: '🛍️ Para Venta', count: products.filter(p => p.isForSale).length },
            { id: 'supplies', label: '📦 Insumos Internos', count: products.filter(p => !p.isForSale).length },
            { id: 'low_stock', label: '⚠️ Bajo Stock', count: stats.lowStockCount }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: activeFilter === f.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: activeFilter === f.id ? 'rgba(245,158,11,0.15)' : 'var(--surface)',
                color: activeFilter === f.id ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: activeFilter === f.id ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <span>{f.label}</span>
              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'rgba(0,0,0,0.2)' }}>
                {f.count}
              </span>
            </button>
          ))}

          <button
            onClick={fetchProducts}
            className="btn btn-outline"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
            title="Recargar inventario"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      {/* Products Grid / List */}
      {filteredProducts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', border: '2px dashed var(--border)' }}>
          <Box size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>No se encontraron productos</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            {searchQuery ? 'Prueba con otros términos de búsqueda o cambia el filtro.' : 'Empieza agregando tu primer producto para la venta en caja o insumo de tu negocio.'}
          </p>
          <button onClick={openCreateModal} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
            <Plus size={16} /> Crear Primer Producto
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
          {filteredProducts.map(p => {
            const badgeStyle = getStockBadgeColor(p);
            const margin = p.cost > 0 && p.price > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(0) : null;

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  border: p.currentStock <= p.minAlert ? `1.5px solid ${badgeStyle.border}` : '1px solid var(--border)',
                  background: 'var(--surface)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Header: Image + Name + Category */}
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '14px',
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Package size={28} color="var(--primary)" opacity={0.7} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', background: 'rgba(245,158,11,0.1)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                        {p.category}
                      </span>
                      {p.isForSale ? (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          En Caja
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          Insumo
                        </span>
                      )}
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 900, margin: '0.3rem 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </h4>
                    {p.sku && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        SKU: {p.sku}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pricing & Margins */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--background)',
                  border: '1px solid var(--border)'
                }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>PRECIO VENTA</span>
                    <strong style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)' }}>
                      ${p.price.toFixed(2)}
                    </strong>
                  </div>

                  {p.cost > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>COSTO / MARGEN</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
                        ${p.cost.toFixed(2)} {margin && <span style={{ color: '#10b981', fontSize: '0.7rem' }}>(+{margin}%)</span>}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stock Controls & Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '8px',
                    background: badgeStyle.bg,
                    border: `1px solid ${badgeStyle.border}`,
                    color: badgeStyle.text
                  }}>
                    <strong style={{ fontSize: '1rem', fontWeight: 900 }}>{p.currentStock}</strong>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{p.unit}</span>
                    {p.currentStock <= p.minAlert && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>⚠️ Bajo</span>
                    )}
                  </div>

                  {/* Stock + / - quick buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      onClick={() => updateStock(p.id, -1)}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.55rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Restar 1 unidad"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      onClick={() => updateStock(p.id, 1)}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.55rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Sumar 1 unidad"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '0.75rem',
                  marginTop: '0.2rem'
                }}>
                  {p.isForSale && p.currentStock > 0 ? (
                    <button
                      onClick={() => {
                        openQuickSaleModal();
                        addToQuickCart(p);
                      }}
                      className="btn btn-outline"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: 'var(--primary)',
                        borderColor: 'rgba(245,158,11,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Sparkles size={12} /> Cobrar ahora
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Alerta a: {p.minAlert} {p.unit}
                    </span>
                  )}

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={() => openEditModal(p)}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.55rem' }}
                      title="Editar Producto"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p)}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.55rem', color: '#ef4444' }}
                      title="Eliminar Producto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Informational Help Box */}
      <div className="card" style={{ padding: '1.25rem', background: 'rgba(245, 158, 11, 0.03)', border: '1px dashed var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Tag size={18} color="var(--primary)" />
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
            ¿Cómo funciona la venta de productos en MyTurn?
          </h4>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
          1. <strong>Al cobrar un corte o turno:</strong> En la ventana de pago podrás agregar cualquier producto de tu tienda marcado como *En Caja*. Se suma al total de la factura y se descuenta el stock automáticamente.<br/>
          2. <strong>Venta directa en mostrador:</strong> Si entra un cliente que solo desea comprar una cera o bebida sin cortarse, usa el botón <em>"⚡ Venta Rápida Mostrador"</em>.<br/>
          3. <strong>Libreta de fiados (Crédito):</strong> Si le fías el servicio a un cliente de confianza, los productos que lleve también quedarán registrados en su cuenta por cobrar.
        </p>
      </div>

      {/* Modal: Create or Edit Product */}
      {modalMode && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5000,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <form
            onSubmit={handleSaveProduct}
            className="card animate-scale-in"
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={22} color="var(--primary)" />
                  {modalMode === 'edit' ? 'Editar Producto' : 'Nuevo Producto para Tienda / Inventario'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                  Configura precios, disponibilidad para venta y límites de stock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="btn btn-outline"
                style={{ padding: '0.45rem', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Product Image Picker with compression */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                FOTO O IMAGEN DEL PRODUCTO
              </label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  background: 'var(--surface)',
                  border: '1.5px dashed var(--border)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {productForm.imageUrl ? (
                    <img src={productForm.imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={24} color="var(--text-muted)" />
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label
                      className={`btn ${isUploadingImage ? 'btn-outline' : 'btn-primary'}`}
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', cursor: isUploadingImage ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      {isUploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {isUploadingImage ? 'Comprimiendo...' : 'Subir Foto'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingImage}
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Auto WebP comprimido
                    </span>
                  </div>

                  <input
                    type="url"
                    placeholder="o pega URL de imagen..."
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    style={{
                      padding: '0.4rem 0.6rem',
                      background: 'transparent',
                      border: '1px dashed var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text)',
                      fontSize: '0.75rem',
                      width: '100%'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Name & SKU */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  NOMBRE DEL PRODUCTO *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cera Mate Fijación Fuerte"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  CÓDIGO / SKU
                </label>
                <input
                  type="text"
                  placeholder="Ej: CER-01"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Category & Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  CATEGORÍA
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.85rem' }}
                >
                  <option value="Cuidado Capilar">Cuidado Capilar (Ceras/Pomadas)</option>
                  <option value="Barba y Afeitado">Barba y Afeitado (Aceites/Bálsamos)</option>
                  <option value="Cuidado Facial">Cuidado Facial y Piel</option>
                  <option value="Bebidas y Snacks">Bebidas y Snacks</option>
                  <option value="Accesorios">Accesorios y Ropa</option>
                  <option value="Desechables">Desechables / Insumos de Trabajo</option>
                  <option value="Herramientas">Herramientas y Equipos</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  UNIDAD DE MEDIDA
                </label>
                <input
                  type="text"
                  placeholder="unidades, ml, latas, etc."
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Pricing: Sale Price & Cost */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem', background: 'rgba(245,158,11,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--primary)', display: 'block', marginBottom: '0.35rem' }}>
                  PRECIO DE VENTA ($ AL CLIENTE) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', fontSize: '1.1rem', fontWeight: 900 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  COSTO DE COMPRA ($ COSTO)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.cost}
                  onChange={(e) => setProductForm({ ...productForm, cost: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '1.1rem', fontWeight: 800 }}
                />
              </div>
            </div>

            {/* Stock Quantities */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  STOCK DISPONIBLE ACTUAL
                </label>
                <input
                  type="number"
                  min="0"
                  value={productForm.currentStock}
                  onChange={(e) => setProductForm({ ...productForm, currentStock: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 800 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  ALERTA STOCK MÍNIMO
                </label>
                <input
                  type="number"
                  min="0"
                  value={productForm.minAlert}
                  onChange={(e) => setProductForm({ ...productForm, minAlert: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 800 }}
                />
              </div>
            </div>

            {/* Available for sale checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--background)',
              border: '1px solid var(--border)',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={productForm.isForSale}
                onChange={(e) => setProductForm({ ...productForm, isForSale: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <div>
                <strong style={{ fontSize: '0.85rem', display: 'block' }}>Disponible para cobrar en caja (Tienda)</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Aparecerá en el selector de productos al facturar turnos y cobrar a clientes.
                </span>
              </div>
            </label>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="btn btn-outline"
                style={{ minWidth: '100px' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary"
                style={{ minWidth: '160px', fontWeight: 900 }}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : (modalMode === 'edit' ? 'Guardar Cambios' : 'Crear Producto')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Quick Counter Sale (POS Express) */}
      {showQuickSale && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5000,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div
            className="card animate-scale-in"
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={22} color="var(--primary)" /> Venta Rápida en Mostrador
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                  Factura productos directamente a clientes sin necesidad de registrar un turno.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickSale(false)}
                className="btn btn-outline"
                style={{ padding: '0.45rem', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            {quickSaleSuccess && (
              <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={20} />
                {quickSaleSuccess}
              </div>
            )}

            {/* Product Quick Picker */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                SELECCIONA UN PRODUCTO PARA AÑADIR AL TICKET
              </label>
              <select
                onChange={(e) => {
                  const p = products.find(x => x.id === e.target.value);
                  if (p) addToQuickCart(p);
                  e.target.value = '';
                }}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem' }}
              >
                <option value="">-- Elige un producto de la lista --</option>
                {products.filter(p => p.isForSale && p.currentStock > 0).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ${p.price.toFixed(2)} (Stock: {p.currentStock})
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                Resumen de la Venta
              </span>

              {quickSaleCart.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0', margin: 0 }}>
                  Aún no has agregado productos al ticket.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {quickSaleCart.map(item => (
                    <div
                      key={item.product.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0',
                        borderBottom: '1px dashed var(--border)'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '0.875rem' }}>{item.product.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                          ${item.product.price.toFixed(2)} c/u
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.product.id, -1)}
                            style={{ padding: '0.25rem 0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', cursor: 'pointer' }}
                          >
                            -
                          </button>
                          <strong style={{ fontSize: '0.9rem', minWidth: '20px', textAlign: 'center' }}>
                            {item.quantity}
                          </strong>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.product.id, 1)}
                            style={{ padding: '0.25rem 0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', cursor: 'pointer' }}
                          >
                            +
                          </button>
                        </div>

                        <strong style={{ fontSize: '0.95rem', minWidth: '60px', textAlign: 'right', color: 'var(--primary)' }}>
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  ))}

                  {/* Total calculation */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>Total a Cobrar:</span>
                    <strong style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>
                      ${quickSaleCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                MÉTODO DE PAGO
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {[
                  { id: 'efectivo', label: '💵 EFECTIVO' },
                  { id: 'tarjeta', label: '💳 TARJETA' },
                  { id: 'transferencia', label: '📲 TRANSFERENCIA' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setQuickSaleMethod(m.id as any)}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: quickSaleMethod === m.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: quickSaleMethod === m.id ? 'rgba(245,158,11,0.15)' : 'var(--background)',
                      color: quickSaleMethod === m.id ? 'var(--primary)' : 'var(--text)',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowQuickSale(false)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={quickSaleCart.length === 0 || isProcessingSale}
                onClick={handleProcessQuickSale}
                className="btn btn-primary"
                style={{ flex: 2, fontWeight: 900 }}
              >
                {isProcessingSale ? <Loader2 size={16} className="animate-spin" /> : 'CONFIRMAR Y COBRAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
