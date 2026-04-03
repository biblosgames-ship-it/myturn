import React, { useState, useRef } from 'react';
import { Wallet, TrendingUp, TrendingDown, CreditCard, DollarSign, Landmark, FileText, Image as ImageIcon, Printer, Share2, Calendar, Plus, X, ArrowDownRight, ArrowUpRight, HelpCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';

export interface Transaction {
  id: string;
  type: 'ingreso' | 'egreso';
  amount: number;
  subtotal?: number;
  discountPercent?: number;
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
  filteredApts: any[];
  filterType: 'day' | 'week' | 'month' | 'year' | 'range';
  filterValue: string;
}

export const FinanceManagement: React.FC<FinanceProps> = ({ 
  transactions, 
  setTransactions, 
  staff, 
  businessName, 
  logoUrl,
  filteredApts,
  filterType,
  filterValue
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReport, setShowReport] = useState<'none' | 'pdf' | 'img' | 'cierre'>('none');
  const [newTx, setNewTx] = useState<Partial<Transaction>>({ type: 'ingreso', method: 'efectivo', amount: 0, category: 'Varios', description: '', staffId: '' });
  const reportRef = useRef<HTMLDivElement>(null);

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'ingreso') {
      acc.income += t.amount;
      acc.discounts += (t.subtotal || t.amount) - t.amount;
      const m = t.method as keyof typeof acc;
      if (m in acc) (acc as any)[m] += t.amount;
      else acc.otro += t.amount;
    } else {
      acc.expense += t.amount;
    }
    return acc;
  }, { income: 0, expense: 0, efectivo: 0, tarjeta: 0, transferencia: 0, credito: 0, otro: 0, discounts: 0 });

  const balance = totals.income - totals.expense;

  const generateClosureHTML = () => {
    const totals = transactions.reduce((acc, t) => {
      if (t.type === 'ingreso') {
        acc.income += t.amount;
        acc.discounts += (t.subtotal || t.amount) - t.amount;
        const m = t.method as keyof typeof acc;
        if (m in acc) (acc as any)[m] += t.amount;
        else acc.otro += t.amount;
      } else {
        acc.expense += t.amount;
      }
      return acc;
    }, { income: 0, expense: 0, efectivo: 0, tarjeta: 0, transferencia: 0, credito: 0, otro: 0, discounts: 0 });

    const balance = totals.income - totals.expense;

    return `
      <div style="padding: 40px; background: white; color: black; font-family: sans-serif; width: 100%; max-width: 400px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          ${logoUrl ? `<img src="${logoUrl}" style="height: 50px; margin-bottom: 10px;" />` : `<h2 style="margin:0">${businessName}</h2>`}
          <div style="font-weight: 900; border-top: 1px solid black; border-bottom: 1px solid black; margin: 10px 0; padding: 5px 0;">REPORTE DE CIERRE</div>
          <div style="font-size: 0.8rem;">${new Date().toLocaleString()}</div>
        </div>

        <div style="border-bottom: 1px dashed black; padding-bottom: 10px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between;"><span>Ingresos:</span> <strong>$${totals.income.toFixed(2)}</strong></div>
          <div style="display: flex; justify-content: space-between;"><span>Gastos:</span> <strong>-$${totals.expense.toFixed(2)}</strong></div>
          <div style="display: flex; justify-content: space-between; margin-top: 5px; border-top: 1px solid black; padding-top: 5px;">
            <span style="font-weight: 900;">TOTAL CAJA:</span> <strong style="font-size: 1.2rem;">$${balance.toFixed(2)}</strong>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-weight: 900; font-size: 0.8rem; text-transform: uppercase;">Métodos de Pago</div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem;"><span>Efectivo:</span> <span>$${totals.efectivo.toFixed(2)}</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem;"><span>Tarjeta:</span> <span>$${totals.tarjeta.toFixed(2)}</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem;"><span>Depósitos:</span> <span>$${totals.transferencia.toFixed(2)}</span></div>
        </div>

        <div style="text-align: center; border-top: 1px solid black; padding-top: 20px;">
          <div style="height: 40px; border-bottom: 1px solid black; width: 150px; margin: 0 auto 10px;"></div>
          <div style="font-weight: 800; font-size: 0.8rem;">FIRMA AUTORIZADA</div>
          <p style="font-size: 0.7rem; margin-top: 20px;">Generado por MyTurn SaaS</p>
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const content = reportRef.current ? reportRef.current.innerHTML : generateClosureHTML();

    const html = `
      <html>
        <head>
          <title>Reporte MyTurn</title>
          <style>
            body { background: white !important; padding: 0 !important; margin: 0 !important; display: flex; justify-content: center; }
            @media print { @page { margin: 0; } }
          </style>
        </head>
        <body>
          <div style="width: 100%; max-width: 800px;">
            ${content}
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const { labels, incomeValues } = (() => {
    let labels: string[] = [];
    let incomeValues: number[] = [];

    if (filterType === 'day' || filterType === 'week') {
      if (filterType === 'day') {
        labels = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
        labels.forEach(hour => {
          const h = parseInt(hour);
          const nextH = h + 2;
          const income = transactions.filter(t => {
            const tDate = new Date(t.date);
            const isTargetDay = tDate.toISOString().split('T')[0] === filterValue;
            return t.type === 'ingreso' && isTargetDay && tDate.getHours() >= h && tDate.getHours() < nextH;
          }).reduce((s, t) => s + t.amount, 0);
          incomeValues.push(income);
        });
      } else {
        labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const days = [1, 2, 3, 4, 5, 6, 0];
        days.forEach(d => {
          const income = transactions.filter(t => t.type === 'ingreso' && new Date(t.date).getDay() === d).reduce((s, t) => s + t.amount, 0);
          incomeValues.push(income);
        });
      }
    } else if (filterType === 'month') {
      labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
      [1, 8, 16, 24].forEach((startDay, i) => {
        const endDay = i === 3 ? 31 : startDay + 7;
        const income = transactions.filter(t => t.type === 'ingreso' && new Date(t.date).getDate() >= startDay && new Date(t.date).getDate() < endDay).reduce((s, t) => s + t.amount, 0);
        incomeValues.push(income);
      });
    } else if (filterType === 'year') {
      labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      labels.forEach((_, i) => {
        const income = transactions.filter(t => t.type === 'ingreso' && new Date(t.date).getMonth() === i).reduce((s, t) => s + t.amount, 0);
        incomeValues.push(income);
      });
    }
    return { labels, incomeValues };
  })();


  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Reporte_${businessName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString()}.pdf`);
    } catch (err) {
      console.error("PDF Error:", err);
      alert("Error al generar PDF. Intenta con Imprimir.");
    }
  };

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
          date: data.created_at, // Keep full ISO for charts
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
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Reportes</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button onClick={() => setShowReport('cierre')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}>
              <FileText size={24} color="#ef4444" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Reporte PDF</span>
            </button>
            <button 
              onClick={() => {
                const text = `📊 *REPORTE DE CIERRE - ${businessName}*%0A%0A` +
                  `Fecha: ${new Date().toLocaleDateString()}%0A` +
                  `-------------------%0A` +
                  `Ingresos: $${totals.income.toFixed(2)}%0A` +
                  `Gastos: $${totals.expense.toFixed(2)}%0A` +
                  `Descuentos: $${totals.discounts.toFixed(2)}%0A` +
                  `-------------------%0A` +
                  `*CAJA FINAL: $${balance.toFixed(2)}*%0A%0A` +
                  `Generado por MyTurn SaaS`;
                window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
              }} 
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <Share2 size={24} color="#25D366" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Compartir</span>
            </button>
            <button onClick={handlePrint} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s', gridColumn: 'span 2' }}>
              <Printer size={24} color="var(--success)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Imprimir</span>
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
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.category} • {(t.method || '').toUpperCase()} • {new Date(t.date).toLocaleDateString()}</div>
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
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', background: 'white', color: 'black', padding: '2rem', position: 'relative' }}>
            <button 
              className="no-print"
              onClick={() => setShowReport('none')} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#eee', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
            >
              <X size={20} />
            </button>
            <div className="print-only" ref={reportRef} style={{ padding: '40px', background: 'white', color: 'black' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt={businessName} style={{ height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }} />
                ) : (
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>{businessName}</div>
                )}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'black', margin: '0' }}>{businessName}</h3>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, borderTop: '1px solid black', borderBottom: '1px solid black', margin: '0.5rem 0', padding: '2px 0' }}>REPORTE DE CIERRE</div>
                <div style={{ fontSize: '0.7rem', color: 'black' }}>{new Date().toLocaleString()}</div>
              </div>

              <div style={{ borderBottom: '1px dashed black', padding: '0.5rem 0', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem' }}>Ingresos:</span>
                  <span style={{ fontWeight: 800 }}>${totals.income.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem' }}>Gastos:</span>
                  <span style={{ fontWeight: 800 }}>-${totals.expense.toFixed(2)}</span>
                </div>
                {totals.discounts > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem' }}>Descuentos:</span>
                    <span style={{ fontWeight: 800 }}>-${totals.discounts.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', borderTop: '1px solid black', paddingTop: '0.3rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>TOTAL CAJA:</span>
                  <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>${balance.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.3rem' }}>Métodos de Pago</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span>Efectivo:</span> <span>${totals.efectivo.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span>Tarjeta:</span> <span>${totals.tarjeta.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span>Transfer:</span> <span>${totals.transferencia.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid black', paddingTop: '0.5rem' }}>
                <div style={{ height: '30px', margin: '1rem auto' }} />
                <p style={{ fontSize: '0.7rem', fontWeight: 800 }}>FIRMA AUTORIZADA</p>
                <p style={{ fontSize: '0.6rem', marginTop: '1rem' }}>Gracias por su preferencia ✨</p>
                <p style={{ fontSize: '0.5rem', opacity: 0.7 }}>Ref: #RT-{Math.floor(1000 + Math.random() * 9000)}</p>
              </div>
            </div>

              <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    className="btn" 
                    style={{ 
                      flex: 1, 
                      backgroundColor: '#000000', 
                      color: '#ffffff', 
                      fontWeight: '900', 
                      padding: '1rem',
                      border: '3px solid #000000',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'block'
                    }} 
                    onClick={() => setShowReport('none')}
                  >
                    CERRAR
                  </button>
                  <button 
                    className="btn" 
                    style={{ 
                      flex: 1, 
                      backgroundColor: 'var(--primary)', 
                      color: '#000000', 
                      fontWeight: '900',
                      padding: '1rem',
                      border: '3px solid #000000',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }} 
                    onClick={handlePrint}
                  >
                    <Printer size={18} /> IMPRIMIR
                  </button>
                </div>
                
                <button 
                  className="btn" 
                  style={{ 
                    width: '100%', 
                    background: '#f3f4f6', 
                    color: '#000000', 
                    border: '1px solid #ccc', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem', 
                    fontWeight: '700' 
                  }}
                  onClick={handleDownloadPDF}
                >
                  <FileText size={18} /> Descargar PDF (Carpeta)
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
