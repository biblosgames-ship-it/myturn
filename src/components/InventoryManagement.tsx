import React, { useState, useEffect } from 'react';
import { Package, Plus, Minus, AlertTriangle, RefreshCcw, History, Tag, Box, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  maxStock: number;
  unit: string;
  minAlert: number;
}

export const InventoryManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ 
    name: '', 
    category: 'Desechables', 
    currentStock: 0, 
    maxStock: 100, 
    unit: 'unidades', 
    minAlert: 10 
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('name', { ascending: true });

    if (data) {
      setProducts(data.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        currentStock: Number(p.current_stock),
        maxStock: Number(p.max_stock),
        unit: p.unit,
        minAlert: Number(p.min_alert)
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const updateStock = async (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const newStock = Math.max(0, Math.min(product.maxStock, product.currentStock + delta));
    
    // Optimistic Update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, currentStock: newStock } : p));

    // DB Update
    const { error } = await supabase
      .from('inventory')
      .update({ current_stock: newStock })
      .eq('id', id);

    if (error) {
      console.error("Error updating stock:", error);
      fetchProducts(); // Rollback
    }
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name) return;

    const { data, error } = await supabase
      .from('inventory')
      .insert({
        name: newProduct.name,
        category: newProduct.category,
        current_stock: newProduct.currentStock,
        max_stock: newProduct.maxStock,
        unit: newProduct.unit,
        min_alert: newProduct.minAlert
      })
      .select()
      .single();

    if (data && !error) {
      setProducts(prev => [...prev, {
        id: data.id,
        name: data.name,
        category: data.category,
        currentStock: Number(data.current_stock),
        maxStock: Number(data.max_stock),
        unit: data.unit,
        minAlert: Number(data.min_alert)
      }].sort((a,b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
      setNewProduct({ name: '', category: 'Desechables', currentStock: 0, maxStock: 100, unit: 'unidades', minAlert: 10 });
    } else {
      alert("Error al guardar producto");
    }
  };

  const getStockColor = (p: Product) => {
    const pct = (p.currentStock / p.maxStock) * 100;
    if (pct <= p.minAlert) return 'var(--accent)';
    if (pct <= 40) return 'var(--primary)';
    return 'var(--success)';
  };

  if (isLoading && products.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={24} color="var(--primary)" /> Inventario de Suministros
        </h3>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ padding: '0.6rem 1rem', fontSize: '0.875rem' }}>
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.5fr 1fr 1.5fr 1fr', 
          padding: '0.75rem 1.25rem', 
          color: 'var(--text-muted)', 
          fontSize: '0.75rem', 
          fontWeight: 800, 
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div>Producto</div>
          <div style={{ textAlign: 'center' }}>Stock Actual</div>
          <div>Nivel / Porcentaje</div>
          <div style={{ textAlign: 'right' }}>Acciones</div>
        </div>

        {products.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5, border: '2px dashed var(--border)' }}>
            <Box size={48} style={{ marginBottom: '1rem' }} />
            <p>No tienes productos registrados aún.</p>
          </div>
        ) : products.map(p => {
          const pct = Math.round((p.currentStock / p.maxStock) * 100);
          const lowStock = (p.currentStock / p.maxStock) * 100 <= p.minAlert;

          return (
            <div key={p.id} className="card" style={{ 
              padding: '0.75rem 1.25rem', 
              border: lowStock ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: lowStock ? 'rgba(239, 68, 68, 0.02)' : 'var(--surface)',
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1.5fr 1fr',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{p.category}</span>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{p.name}</h4>
              </div>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: getStockColor(p) }}>{p.currentStock}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '4px' }}>{p.unit}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1, height: '6px', background: 'var(--background)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: getStockColor(p), borderRadius: '10px', transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: '35px' }}>{pct}%</span>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => updateStock(p.id, -1)}
                  style={{ padding: '0.4rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--background)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Minus size={14} />
                </button>
                <button 
                  onClick={() => updateStock(p.id, 1)}
                  style={{ padding: '0.4rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--background)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={14} />
                </button>
                <button 
                  onClick={fetchProducts}
                  style={{ padding: '0.4rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--background)', color: 'var(--primary)', cursor: 'pointer' }}
                >
                  <RefreshCcw size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: '1.25rem', background: 'rgba(245, 158, 11, 0.03)', border: '1px dashed var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Tag size={18} color="var(--primary)" />
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase' }}>Consumo Automático</h4>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Los productos marcados como <strong>Desechables</strong> se descontarán automáticamente (1 unidad) al completar cualquier servicio. Los <strong>Químicos</strong> se descuentan un 2% por servicio de barba/cabello.
        </p>
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={addProduct} className="card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Nuevo Producto</h3>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>NOMBRE DEL PRODUCTO</label>
                <input 
                  type="text" 
                  required
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="Ej: Alcohol Isopropílico"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>CATEGORÍA</label>
                  <select 
                    value={newProduct.category}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    <option value="Desechables">Desechables</option>
                    <option value="Químicos">Químicos</option>
                    <option value="Herramientas">Herramientas</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>UNIDAD</label>
                  <input 
                    type="text" 
                    value={newProduct.unit}
                    onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    placeholder="Ej: unidades, %, litros"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>STOCK ACTUAL</label>
                  <input 
                    type="number" 
                    value={newProduct.currentStock}
                    onChange={e => setNewProduct({ ...newProduct, currentStock: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>CAPACIDAD MÁX.</label>
                  <input 
                    type="number" 
                    value={newProduct.maxStock}
                    onChange={e => setNewProduct({ ...newProduct, maxStock: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>ALERTA MIN.</label>
                  <input 
                    type="number" 
                    value={newProduct.minAlert}
                    onChange={e => setNewProduct({ ...newProduct, minAlert: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', padding: '1rem' }}>Añadir al Inventario</button>
          </form>
        </div>
      )}
    </div>
  );
};

