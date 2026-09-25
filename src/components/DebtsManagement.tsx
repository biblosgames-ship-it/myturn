import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Send, 
  Search, 
  Plus, 
  X, 
  Trash2, 
  Check, 
  CreditCard, 
  Landmark, 
  User, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Transaction } from './FinanceManagement';

export interface CustomerDebt {
  id: string;
  tenant_id: string;
  appointment_id?: string;
  client_name: string;
  client_phone?: string;
  service_name?: string;
  staff_id?: string;
  amount: number;
  paid_amount: number;
  status: 'pending' | 'partial' | 'paid';
  notes?: string;
  created_at: string;
  due_date?: string;
  settled_at?: string;
  settled_method?: string;
}

interface DebtsManagementProps {
  tenantId: string;
  businessName: string;
  onDebtSettled?: (newTx: Transaction) => void;
}

export const DebtsManagement: React.FC<DebtsManagementProps> = ({
  tenantId,
  businessName,
  onDebtSettled
}) => {
  const [debts, setDebts] = useState<CustomerDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'paid' | 'all'>('pending');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDebtForSettle, setSelectedDebtForSettle] = useState<CustomerDebt | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Debt Form
  const [newDebt, setNewDebt] = useState({
    client_name: '',
    client_phone: '',
    service_name: 'Corte de Cabello',
    amount: '',
    notes: '',
    due_date: ''
  });

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_debts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Could not fetch customer_debts from DB:", error.message);
      } else if (data) {
        setDebts(data);
      }
    } catch (err) {
      console.error("Error fetching debts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchDebts();
    }
  }, [tenantId]);

  // Calculations
  const pendingDebts = debts.filter(d => d.status !== 'paid');
  const totalPendingAmount = pendingDebts.reduce((sum, d) => sum + (Number(d.amount) - Number(d.paid_amount || 0)), 0);
  const paidDebts = debts.filter(d => d.status === 'paid');
  const totalPaidAmount = debts.reduce((sum, d) => sum + Number(d.paid_amount || 0), 0);

  // Filtered list
  const filteredDebts = debts.filter(d => {
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'pending' 
        ? d.status !== 'paid' 
        : d.status === 'paid';
    
    const matchesSearch = 
      d.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.client_phone && d.client_phone.includes(searchTerm)) ||
      (d.service_name && d.service_name.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  // Action: Add Debt Manually
  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebt.client_name.trim() || !newDebt.amount) return;

    try {
      setIsSubmitting(true);
      const amountVal = parseFloat(newDebt.amount);
      const payload = {
        tenant_id: tenantId,
        client_name: newDebt.client_name.trim(),
        client_phone: newDebt.client_phone.trim() || null,
        service_name: newDebt.service_name.trim() || 'Servicio',
        amount: amountVal,
        paid_amount: 0,
        status: 'pending',
        notes: newDebt.notes.trim() || null,
        due_date: newDebt.due_date || null
      };

      const { data, error } = await supabase
        .from('customer_debts')
        .insert(payload)
        .select()
        .single();

      if (error) {
        alert("Error al registrar el crédito: " + error.message);
        return;
      }

      if (data) {
        setDebts([data, ...debts]);
      }
      setShowAddModal(false);
      setNewDebt({
        client_name: '',
        client_phone: '',
        service_name: 'Corte de Cabello',
        amount: '',
        notes: '',
        due_date: ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Settle Debt (Cobrar)
  const handleOpenSettle = (debt: CustomerDebt) => {
    setSelectedDebtForSettle(debt);
    const remaining = Number(debt.amount) - Number(debt.paid_amount || 0);
    setSettleAmount(remaining > 0 ? remaining : Number(debt.amount));
    setSettleMethod('efectivo');
  };

  const handleConfirmSettle = async () => {
    if (!selectedDebtForSettle || settleAmount <= 0) return;

    try {
      setIsSubmitting(true);
      const prevPaid = Number(selectedDebtForSettle.paid_amount || 0);
      const totalAmount = Number(selectedDebtForSettle.amount);
      const newPaid = prevPaid + settleAmount;
      const isFullyPaid = newPaid >= totalAmount;
      const newStatus = isFullyPaid ? 'paid' : 'partial';

      // 1. Update customer_debts in Supabase
      const { error: debtErr } = await supabase
        .from('customer_debts')
        .update({
          paid_amount: newPaid,
          status: newStatus,
          settled_at: new Date().toISOString(),
          settled_method: settleMethod
        })
        .eq('id', selectedDebtForSettle.id);

      if (debtErr) {
        console.warn("Could not update debt:", debtErr.message);
      }

      // 2. Insert Transaction into 'transactions' table to enter daily cash flow
      const descText = `Cobro de fiado: ${selectedDebtForSettle.client_name} - ${selectedDebtForSettle.service_name || 'Servicio'}`;
      let createdTx: Transaction = {
        id: 'tx-debt-' + Date.now(),
        type: 'ingreso',
        amount: settleAmount,
        method: settleMethod,
        category: 'Cobro de Deuda / Fiado',
        description: descText,
        date: new Date().toISOString().split('T')[0]
      };

      try {
        const { data: txData } = await supabase.from('transactions').insert({
          tenant_id: tenantId,
          amount: settleAmount,
          type: 'ingreso',
          payment_method: settleMethod,
          category: 'Cobro de Deuda / Fiado',
          description: descText
        }).select().single();

        if (txData) {
          createdTx = {
            id: txData.id,
            type: txData.type,
            amount: txData.amount,
            method: txData.payment_method,
            category: txData.category,
            description: txData.description || descText,
            date: new Date(txData.created_at).toISOString().split('T')[0]
          };
        }
      } catch (txErr) {
        console.warn("Transaction record error:", txErr);
      }

      // 3. Notify parent to refresh finance transactions
      if (onDebtSettled) {
        onDebtSettled(createdTx);
      }

      // 4. Update local state
      setDebts(debts.map(d => {
        if (d.id === selectedDebtForSettle.id) {
          return {
            ...d,
            paid_amount: newPaid,
            status: newStatus,
            settled_at: new Date().toISOString(),
            settled_method: settleMethod
          };
        }
        return d;
      }));

      setSelectedDebtForSettle(null);
    } catch (err) {
      console.error(err);
      alert("Error al saldar la deuda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Delete Debt
  const handleDeleteDebt = async (debtId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este registro de cuenta por cobrar?")) return;
    try {
      await supabase.from('customer_debts').delete().eq('id', debtId);
      setDebts(debts.filter(d => d.id !== debtId));
    } catch (err) {
      console.error(err);
    }
  };

  // Action: 1-Click WhatsApp Collection Reminder
  const handleSendWhatsAppReminder = (debt: CustomerDebt) => {
    let phone = debt.client_phone ? debt.client_phone.replace(/[^\d+]/g, '') : '';
    if (!phone) {
      const manualPhone = prompt(
        `Ingresa el número de WhatsApp para recordarle a ${debt.client_name} (ej: +1809... o +52...):`,
        ''
      );
      if (!manualPhone) return;
      phone = manualPhone.replace(/[^\d+]/g, '');
      // Update phone in DB
      supabase.from('customer_debts').update({ client_phone: phone }).eq('id', debt.id);
      setDebts(debts.map(d => d.id === debt.id ? { ...d, client_phone: phone } : d));
    }

    const remaining = Number(debt.amount) - Number(debt.paid_amount || 0);
    const dateStr = new Date(debt.created_at).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long'
    });

    const msg = `¡Hola ${debt.client_name}! 👋 Te saludamos cordialmente de *${businessName || 'la barbería'}*.\n\nTe escribimos para recordarte con mucho cariño tu balance pendiente de *$${remaining.toFixed(2)}* correspondiente al servicio de *${debt.service_name || 'corte'}* del pasado ${dateStr}.\n\nPuedes pasar a saldarlo en el local o si prefieres realizar transferencia bancaria, avísanos para enviarte los datos.\n\n¡Muchas gracias por tu preferencia y que tengas un excelente día! 💈`;

    const cleanPhone = phone.replace('+', '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <DollarSign size={24} color="#f59e0b" /> Cuentas por Cobrar (Libreta de Fiados)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.2rem 0 0' }}>
            Control de cortes fiados, saldado directo a caja y recordatorios cordiales por WhatsApp.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}
        >
          <Plus size={18} /> Anotar Nuevo Fiado
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.03)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Pendiente por Cobrar
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f59e0b' }}>
              ${totalPendingAmount.toFixed(2)}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {pendingDebts.length} {pendingDebts.length === 1 ? 'cuenta activa' : 'cuentas activas'}
          </span>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)', background: 'rgba(16,185,129,0.03)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Cobrado / Recuperado
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--success)' }}>
              ${totalPaidAmount.toFixed(2)}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {paidDebts.length} {paidDebts.length === 1 ? 'cuenta saldada' : 'cuentas saldadas'}
          </span>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6', background: 'rgba(59,130,246,0.03)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Clientes con Saldo
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#3b82f6' }}>
              {new Set(pendingDebts.map(d => d.client_name.toLowerCase())).size}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Clientes únicos con balance
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)' }}>
        {/* Status Filter */}
        <div style={{ display: 'flex', background: 'var(--background)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          {(['pending', 'paid', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: statusFilter === f ? 'var(--primary)' : 'transparent',
                color: statusFilter === f ? 'black' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '0.75rem',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {f === 'pending' ? 'Pendientes' : f === 'paid' ? 'Saldadas' : 'Todas'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por cliente, teléfono o servicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
            style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '1rem', height: '38px', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* Debts Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>CLIENTE / CONTACTO</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>SERVICIO & FECHA</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'right' }}>MONTO ORIGINAL</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'right' }}>PENDIENTE</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'center' }}>ESTADO</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebts.map((debt) => {
                const remaining = Number(debt.amount) - Number(debt.paid_amount || 0);
                const isPaid = debt.status === 'paid' || remaining <= 0;

                return (
                  <tr key={debt.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Cliente */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{debt.client_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        {debt.client_phone ? debt.client_phone : <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Sin teléfono registrado</span>}
                      </div>
                      {debt.notes && (
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.2rem', fontStyle: 'italic' }}>
                          Nota: {debt.notes}
                        </div>
                      )}
                    </td>

                    {/* Servicio y Fecha */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{debt.service_name || 'Corte'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <Clock size={12} /> {new Date(debt.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Monto Original */}
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem' }}>
                      ${Number(debt.amount).toFixed(2)}
                    </td>

                    {/* Pendiente */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <span style={{ 
                        fontWeight: 900, 
                        fontSize: '1.1rem', 
                        color: isPaid ? 'var(--success)' : '#ef4444' 
                      }}>
                        ${remaining > 0 ? remaining.toFixed(2) : '0.00'}
                      </span>
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {isPaid ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={12} /> Saldado
                        </span>
                      ) : debt.status === 'partial' ? (
                        <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid #3b82f6', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          Abonado
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <AlertCircle size={12} /> Pendiente
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {!isPaid && (
                          <>
                            <button
                              onClick={() => handleOpenSettle(debt)}
                              className="btn btn-primary"
                              title="Saldar o abonar a la cuenta"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 900, background: 'var(--success)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Check size={14} /> Saldar
                            </button>

                            <button
                              onClick={() => handleSendWhatsAppReminder(debt)}
                              className="btn btn-outline"
                              title="Enviar recordatorio por WhatsApp con 1 clic"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 800, color: '#25D366', borderColor: '#25D366', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Send size={14} /> Cobrar
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleDeleteDebt(debt.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.4rem' }}
                          title="Eliminar registro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDebts.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={40} style={{ opacity: 0.3, margin: '0 auto 0.5rem', color: 'var(--success)' }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>No hay cuentas {statusFilter === 'pending' ? 'pendientes de cobro' : 'en este listado'}.</p>
                    <span style={{ fontSize: '0.8rem' }}>Todo el flujo de caja está al día.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Saldar Deuda */}
      {selectedDebtForSettle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 color="var(--success)" size={24} /> Saldar Cuenta por Cobrar
              </h3>
              <button 
                onClick={() => setSelectedDebtForSettle(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cliente Deudor:</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text)' }}>{selectedDebtForSettle.client_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.2rem' }}>
                {selectedDebtForSettle.service_name} • Saldo restante: ${(Number(selectedDebtForSettle.amount) - Number(selectedDebtForSettle.paid_amount || 0)).toFixed(2)}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                MONTO A INGRESAR A CAJA ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={Number(selectedDebtForSettle.amount) - Number(selectedDebtForSettle.paid_amount || 0)}
                value={settleAmount}
                onChange={(e) => setSettleAmount(parseFloat(e.target.value) || 0)}
                className="input"
                style={{ width: '100%', fontSize: '1.4rem', fontWeight: 900, textAlign: 'center', color: 'var(--success)' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                MÉTODO EN QUE EL CLIENTE PAGA AHORA
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {[
                  { id: 'efectivo', label: '💵 Efectivo', icon: DollarSign },
                  { id: 'tarjeta', label: '💳 Tarjeta', icon: CreditCard },
                  { id: 'transferencia', label: '📲 Transf.', icon: Landmark },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettleMethod(m.id as any)}
                    style={{
                      padding: '0.8rem 0.4rem',
                      borderRadius: 'var(--radius-md)',
                      border: settleMethod === m.id ? '2px solid var(--success)' : '1px solid var(--border)',
                      background: settleMethod === m.id ? 'rgba(16,185,129,0.1)' : 'var(--background)',
                      color: settleMethod === m.id ? 'var(--success)' : 'var(--text)',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedDebtForSettle(null)}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSettle}
                disabled={isSubmitting || settleAmount <= 0}
                style={{ flex: 2, background: 'var(--success)', border: 'none', fontWeight: 900 }}
              >
                {isSubmitting ? 'Registrando...' : 'CONFIRMAR Y METER A CAJA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Anotar Fiado Manual */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus color="var(--primary)" size={24} /> Anotar Nuevo Fiado / Crédito
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDebt} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  NOMBRE DEL CLIENTE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Santana"
                  value={newDebt.client_name}
                  onChange={(e) => setNewDebt({ ...newDebt, client_name: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  TELÉFONO / WHATSAPP (PARA COBRO)
                </label>
                <input
                  type="tel"
                  placeholder="Ej: +1 809 555 1234"
                  value={newDebt.client_phone}
                  onChange={(e) => setNewDebt({ ...newDebt, client_phone: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                    SERVICIO
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Corte + Barba"
                    value={newDebt.service_name}
                    onChange={(e) => setNewDebt({ ...newDebt, service_name: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                    MONTO ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="25.00"
                    value={newDebt.amount}
                    onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })}
                    className="input"
                    style={{ width: '100%', fontWeight: 800 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  NOTA DE COBRO / COMPROMISO
                </label>
                <input
                  type="text"
                  placeholder="Ej: Paga la quincena o el viernes"
                  value={newDebt.notes}
                  onChange={(e) => setNewDebt({ ...newDebt, notes: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 2, fontWeight: 900 }}>
                  {isSubmitting ? 'Guardando...' : 'GUARDAR FIADO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
