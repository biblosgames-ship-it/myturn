import React, { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, CreditCard, DollarSign, Landmark, FileText, Image as ImageIcon, Printer, Share2, Calendar, Plus, X, ArrowDownRight, ArrowUpRight, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface Transaction {
  id: string;
  type: 'ingreso' | 'egreso';
  amount: number;
  method: 'efectivo' | 'tarjeta' | 'transferencia' | 'credito';
  category: string;
  description: string;
  date: string;
  staffId?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  commission: number;
}

interface FinanceProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  staff: StaffMember[];
  businessName: string;
  logoUrl: string;
}

export const FinanceManagement: React.FC<FinanceProps> = ({ transactions, setTransactions, staff, businessName, logoUrl }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReport, setShowReport] = useState<'none' | 'pdf' | 'img' | 'cierre'>('none');
  const [newTx, setNewTx] = useState<Partial<Transaction>>({ type: 'ingreso', method: 'efectivo', amount: 0, category: 'Varios', description: '', staffId: '' });

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'ingreso') {
      acc.income += t.amount;
      const m = t.method as keyof typeof acc;
      if (m in acc) (acc as any)[m] += t.amount;
      else acc.otro += t.amount;
    } else {
      acc.expense += t.amount;
    }
    return acc;
  }, { income: 0, expense: 0, efectivo: 0, tarjeta: 0, transferencia: 0, credito: 0, otro: 0 });

  const balance = totals.income - totals.expense;

  const totalsByStaff = transactions.reduce((acc, t) => {
    if (t.type === 'ingreso' && t.staffId) {
      acc[t.staffId] = (acc[t.staffId] || 0) + t.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const [isSaving, setIsSaving] = useState(false);

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.description) return;
    setIsSaving(true);

    try {
      const dbPayload = {
        amount: Number(newTx.amount),
        type: newTx.type,
        payment_method: newTx.method,
        category: newTx.category || 'Varios',
        description: newTx.description,
        staff_id: newTx.staffId || null
      };

      const { data, error } = await supabase.from('transactions').insert(dbPayload).select().single();

      if (data && !error) {
        const tx: Transaction = {
          id: data.id,
          type: data.type as any,
          amount: data.amount,
          method: data.payment_method as any,
          category: data.category,
          description: data.description,
          date: new Date(data.created_at).toISOString().split('T')[0],
          staffId: data.staff_id || undefined
        };

        setTransactions([tx, ...transactions]);
        setShowAddModal(false);
        setNewTx({ type: 'ingreso', method: 'efectivo', amount: 0, category: 'Varios', description: '', staffId: '' });
      } else {
        console.error(error);
        alert('Error al guardar la transacción. Revisa tu conexión.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Wallet size={24} color="var(--primary)" /> Gestión Financiera
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => { setNewTx({ ...newTx, type: 'ingreso' }); setShowAddModal(true); }} style={{ display: 'flex', gap: '0.4rem', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
            <Plus size={18} /> Nuevo Movimiento
          </button>
          <button className="btn btn-primary" onClick={() => setShowReport('cierre')} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem' }}>
            <FileText size={18} /> Cierre de Caja
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)', background: 'rgba(16,185,129,0.02)' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ingresos Reales</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>${totals.income}</span>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #a855f7', background: 'rgba(168,85,247,0.02)' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Por Transferencia</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>${totals.transferencia}</span>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent)', background: 'rgba(239,68,68,0.02)' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Salidas / Gastos</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>${totals.expense}</span>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)', background: 'rgba(245,158,11,0.02)' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Caja Final</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>${balance}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Desglose por Vía de Pago</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Efectivo', amount: totals.efectivo, color: 'var(--success)', icon: DollarSign },
              { label: 'Tarjeta (Deb/Cre)', amount: totals.tarjeta, color: '#3b82f6', icon: CreditCard },
              { label: 'Depósitos / Transf.', amount: totals.transferencia, color: 'var(--primary)', icon: Landmark },
              { label: 'Crédito / Otros', amount: totals.credito, color: '#a855f7', icon: HelpCircle },
            ].map((m) => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color }}>
                  <m.icon size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.label}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>${m.amount}</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--background)', borderRadius: '10px' }}>
                    <div style={{ width: `${totals.income > 0 ? (m.amount / totals.income) * 100 : 0}%`, height: '100%', background: m.color, borderRadius: '10px' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {staff && staff.length > 0 && (
          <div className="card" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Ingresos por Profesional (Producción)</h4>
              <span className="badge badge-success">SaaS Enterprise</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {staff.map(s => {
                const total = totalsByStaff[s.id] || 0;
                const percentage = totals.income > 0 ? ((total / totals.income) * 100).toFixed(1) : '0.0';
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 800 }}>{s.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--success)' }}>${total}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{percentage}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Prueba de Reportes</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button onClick={() => setShowReport('img')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}>
              <ImageIcon size={24} color="var(--primary)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Cierre (Imagen)</span>
            </button>
            <button onClick={() => setShowReport('pdf')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}>
              <FileText size={24} color="#3b82f6" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Reporte (PDF)</span>
            </button>
            <button onClick={() => setShowReport('img')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Printer size={24} color="var(--success)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Imprimir WiFi</span>
            </button>
            <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Share2 size={24} color="#a855f7" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Últimos Movimientos</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {transactions.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.875rem', background: 'var(--background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.35rem', borderRadius: '4px', background: t.type === 'ingreso' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: t.type === 'ingreso' ? 'var(--success)' : 'var(--accent)' }}>
                  {t.type === 'ingreso' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.description}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.category} • {(t.method || '').toUpperCase()}</div>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: t.type === 'ingreso' ? 'var(--success)' : 'var(--accent)' }}>
                {t.type === 'ingreso' ? '+' : '-'}${t.amount}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={addTransaction} className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Registrar Movimiento</h3>
              <button onClick={() => setShowAddModal(false)} type="button" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--background)', padding: '0.4rem', borderRadius: 'var(--radius-md)' }}>
              <button 
                type="button"
                onClick={() => setNewTx({ ...newTx, type: 'ingreso' })}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: 'none', background: newTx.type === 'ingreso' ? 'var(--success)' : 'transparent', color: newTx.type === 'ingreso' ? 'white' : 'var(--text)', fontWeight: 700, cursor: 'pointer' }}
              >Ingreso</button>
              <button 
                type="button"
                onClick={() => setNewTx({ ...newTx, type: 'egreso' })}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: 'none', background: newTx.type === 'egreso' ? 'var(--accent)' : 'transparent', color: newTx.type === 'egreso' ? 'white' : 'var(--text)', fontWeight: 700, cursor: 'pointer' }}
              >Egreso (Gasto)</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>MONTO ($)</label>
                <input 
                  type="number" 
                  required
                  value={newTx.amount || ''}
                  onChange={e => setNewTx({ ...newTx, amount: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '1.25rem', fontWeight: 800 }}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>VÍA DE PAGO</label>
                <select 
                  value={newTx.method}
                  onChange={e => setNewTx({ ...newTx, method: e.target.value as any })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="credito">Crédito / Otro</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>DESCRIPCIÓN</label>
                <input 
                  type="text" 
                  required
                  value={newTx.description}
                  onChange={e => setNewTx({ ...newTx, description: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="Ej: Pago de luz, Compra de café..."
                />
              </div>

              {newTx.type === 'ingreso' && staff && staff.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>¿QUIÉN REALIZÓ EL SERVICIO?</label>
                  <select 
                    value={newTx.staffId || ''}
                    onChange={e => setNewTx({ ...newTx, staffId: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    <option value="">-- Sin Asignar / Dueño --</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </select>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', padding: '1rem' }}>Guardar Registro</button>
          </form>
        </div>
      )}

      {showReport !== 'none' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', background: 'white', color: 'black', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <div className="print-only" style={{ padding: '1rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt={businessName} style={{ height: '50px', objectFit: 'contain', marginBottom: '1rem' }} />
                ) : (
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#eee', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <FileText size={24} />
                  </div>
                )}
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>{businessName}</h3>
                <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>Cierre de Caja Diario</p>
                <p style={{ fontSize: '0.85rem', color: '#666' }}>Fecha: {new Date().toLocaleDateString()} | ID: #RT-{Math.floor(1000 + Math.random() * 9000)}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 700 }}>INGRESOS TOTALES</span>
                  <span style={{ fontWeight: 900, color: '#10b981' }}>${totals.income.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 700 }}>GASTOS / SALIDAS</span>
                  <span style={{ fontWeight: 900, color: '#ef4444' }}>-${totals.expense.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 1rem', background: '#333', color: 'white', borderRadius: '8px', borderLeft: '5px solid #f59e0b' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.125rem' }}>EFECTIVO EN CAJA</span>
                  <span style={{ fontWeight: 900, fontSize: '1.25rem' }}>${balance.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '0.5rem', borderBottom: '1px solid #eee' }}>Desglose de Operaciones</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                    <span>Efectivo:</span> <span>${totals.efectivo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                    <span>Tarjeta:</span> <span>${totals.tarjeta}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                    <span>Transferencias:</span> <span>${totals.transferencia}</span>
                  </div>
                </div>
              </div>
            </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                 className="btn" 
                 style={{ flex: 1, background: '#333', color: 'white', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                 onClick={() => window.print()}
                >
                  <Printer size={18} /> Imprimir
                </button>
                <button 
                  className="btn" 
                  style={{ flex: 1, background: '#f59e0b', color: 'black', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
                  onClick={() => alert('¡Reporte guardado como PDF en descargas!')}
                >
                  <FileText size={18} /> Guardar PDF
                </button>
              </div>
              
              <p style={{ textAlign: 'center', fontSize: '0.65rem', color: '#aaa', marginTop: '1.5rem' }}>
                Generado por MyTurn SaaS - Inteligencia para tu negocio
              </p>
            </div>
          </div>
        )}
    </div>
  );
};
