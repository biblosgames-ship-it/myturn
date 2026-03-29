import React, { useState } from 'react';
import { Package, Plus, Minus, AlertTriangle, RefreshCcw, History, Tag, Box } from 'lucide-react';

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
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'Rollos de Cuello', category: 'Desechables', currentStock: 85, maxStock: 100, unit: 'unidades', minAlert: 20 },
    { id: '2', name: 'Gel de Afeitar (500ml)', category: 'Químicos', currentStock: 42, maxStock: 100, unit: '%', minAlert: 15 },
    { id: '3', name: 'After Shave', category: 'Químicos', currentStock: 12, maxStock: 100, unit: '%', minAlert: 20 },
    { id: '4', name: 'Cuchillas (Caja 50)', category: 'Herramientas', currentStock: 35, maxStock: 50, unit: 'cajas', minAlert: 10 },
  ]);

  const [showAdd, setShowAdd] = useState(false);

  const updateStock = (id: string, delta: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const newStock = Math.max(0, Math.min(p.maxStock, p.currentStock + delta));
        return { ...p, currentStock: newStock };
      }
      return p;
    }));
  };

  const getStockColor = (p: Product) => {
    const pct = (p.currentStock / p.maxStock) * 100;
    if (pct <= p.minAlert) return 'var(--accent)';
    if (pct <= 40) return 'var(--primary)';
    return 'var(--success)';
  };

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

        {products.map(p => {
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
    </div>
  );
};
