import React, { useState, useEffect } from 'react';
import { Play, Check, X, TrendingUp, LayoutDashboard, Settings, Share2, Copy, QrCode, Plus, Calendar, Package, Wallet, Users, Clock, Scissors, ChevronRight, Search, CheckCircle2, Pause, AlertCircle, LogOut, Printer, HelpCircle, MoreVertical, CreditCard, ShieldAlert, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BarberManagement } from './BarberManagement';
import { InventoryManagement } from './InventoryManagement';
import { FinanceManagement, Transaction, StaffMember } from './FinanceManagement';
import { StaffManagement } from './StaffManagement';

interface Appointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  date: string; // YYYY-MM-DD
  status: 'waiting' | 'attending' | 'finished';
  arrived?: boolean;
  staffId?: string;
}

interface Subscription {
  plan: 'Free' | 'Professional' | 'Enterprise';
  expiryDate: string; // ISO yyyy-mm-dd
  status: 'active' | 'grace' | 'suspended';
}

const getTodayStr = () => new Date().toISOString().split('T')[0];

const initialAppointments: Appointment[] = [
  { id: '1', clientName: 'Juan Pérez', service: 'Recorte + Barba', time: '14:30', date: getTodayStr(), status: 'attending', arrived: true },
  { id: '2', clientName: 'Carlos Gómez', service: 'Sombreado', time: '15:15', date: getTodayStr(), status: 'waiting', arrived: false },
  { id: '3', clientName: 'Mateo Ruiz', service: 'Corte Clásico', time: '16:00', date: getTodayStr(), status: 'waiting', arrived: false },
  { id: '4', clientName: 'Luis Hernán', service: 'Barba King', time: '16:45', date: getTodayStr(), status: 'waiting', arrived: false },
  // Future appointments
  { id: '5', clientName: 'Roberto Díaz', service: 'Corte Moderno', time: '10:00', date: '2026-03-28', status: 'waiting', arrived: false },
  { id: '6', clientName: 'Andrés Sosa', service: 'Afeitado Naval', time: '11:30', date: '2026-03-29', status: 'waiting', arrived: false },
];

export const BarberDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'agenda' | 'finance' | 'inventory' | 'management' | 'staff'>('queue');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);

  // Supabase Real-time Sync for Appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date_time', { ascending: true });
        
      if (data && data.length > 0) {
        setAppointments(data.map(d => ({
          id: d.id,
          // Extract the service name from the appended string hack or use 'Servicio'
          clientName: d.client_name.split(' (')[0],
          service: d.client_name.includes('(') ? d.client_name.split('(')[1].replace(')','') : 'Servicio',
          time: new Date(d.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          date: new Date(d.date_time).toISOString().split('T')[0],
          status: d.status === 'arrived' ? 'waiting' : d.status as any,
          arrived: d.status === 'attending' || d.status === 'arrived',
          staffId: d.staff_id || undefined
        })));
      }
    };

    // Initial Fetch
    fetchAppointments();

    // Subscribe to DB changes
    const channel = supabase.channel('realtime:appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
         fetchAppointments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', service: 'Corte Clásico', staffId: '' });
  const [copied, setCopied] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTimer, setActiveTimer] = useState(25 * 60); // Seconds left for current client
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAptForComplete, setSelectedAptForComplete] = useState<Appointment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'deposit' | 'credit'>('cash');
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: '1', type: 'income', amount: 35, method: 'cash', category: 'Recorte + Barba', description: 'Cliente: Juan Pérez', date: getTodayStr() },
    { id: '2', type: 'income', amount: 25, method: 'card', category: 'Caja Fuerte', description: 'Cliente: María García', date: getTodayStr() },
  ]);

  const [subscription, setSubscription] = useState<Subscription>({
    plan: 'Free', // Set to Free for testing locks
    expiryDate: '2026-03-27', 
    status: 'active' 
  });

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [staff, setStaff] = useState<StaffMember[]>([
    { id: '1', name: 'Legacy Barber', role: 'Dueño / Master', commission: 100 }
  ]);

  const [daysRemaining, setDaysRemaining] = useState(0);

  const handleTabClick = (tabId: string) => {
    if (subscription.status === 'suspended') return;
    
    if (tabId === 'finance' && subscription.plan === 'Free') {
      setShowUpgradeModal(true);
      return;
    }
    
    if (tabId === 'staff' && subscription.plan !== 'Enterprise') {
      setShowUpgradeModal(true);
      return;
    }

    setActiveTab(tabId as any);
  };

  useEffect(() => {
    const today = new Date('2026-03-28'); // Using current system date from metadata
    const expiry = new Date(subscription.expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    setDaysRemaining(diffDays);

    let newStatus: 'active' | 'grace' | 'suspended' = 'active';
    if (diffDays <= -5) {
      newStatus = 'suspended';
    } else if (diffDays <= 0) {
      newStatus = 'grace';
    }
    
    if (newStatus !== subscription.status) {
      setSubscription(prev => ({ ...prev, status: newStatus }));
    }
  }, [subscription.expiryDate, subscription.status]);

  // Live timer effect for the attending client
  React.useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveTimer((prev: number) => (prev > 0 ? prev - 1 : 0));
    }, 1000); // Decrement every second
    return () => clearInterval(interval);
  }, [isPaused]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const shareUrl = "https://myturn.app?barber=legacy-barber";

// Helper to fetch live limits from SuperAdmin's overrides
const getPlanCapabilities = (planName: string) => {
  try {
    const saved = localStorage.getItem('myturn_saas_plans');
    if (saved) {
      const plans = JSON.parse(saved);
      const plan = plans.find((p: any) => p.name.includes(planName));
      if (plan?.capabilities) return plan.capabilities;
    }
  } catch (e) {}
  return { maxAppointments: planName === 'Free' ? 50 : (planName === 'Professional' ? 300 : 'Unlimited') };
};

  const addWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;

    // SaaS Plan Limits Validation (Dynamic Fetch)
    const caps = getPlanCapabilities(subscription.plan);
    const monthlyLimit = caps.maxAppointments === 'Unlimited' ? Infinity : Number(caps.maxAppointments);
    
    // Check against real length
    if (appointments.length >= monthlyLimit) {
      alert(`⚠️ Límite de Plan Alcanzado\n\nTu plan ${subscription.plan} permite un máximo de ${caps.maxAppointments} citas por mes. Has llegado al tope.`);
      setShowAddForm(false);
      setShowUpgradeModal(true);
      return;
    }

    const lastApt = appointments[appointments.length - 1];
    let newTime = "Ahora";
    let hourForDb = new Date().getHours();
    let minForDb = new Date().getMinutes();
    
    if (lastApt) {
      const [hours, minutes] = lastApt.time.split(':').map(Number);
      if (!isNaN(hours)) {
        const date = new Date();
        date.setHours(hours, minutes + 30);
        newTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        hourForDb = date.getHours();
        minForDb = date.getMinutes();
      }
    }

    const aptDate = new Date(selectedDate);
    aptDate.setHours(hourForDb, minForDb, 0, 0);

    const dbPayload = {
      client_name: `${newClient.name} (${newClient.service})`, // Compound string hack for missing service_id
      date_time: aptDate.toISOString(),
      status: 'waiting',
      staff_id: newClient.staffId || null
    };

    // Insert into Supabase
    const { data, error } = await supabase.from('appointments').insert(dbPayload).select().single();

    if (error) {
      console.error("Supabase Insert Error:", error);
      alert("Error al guardar la cita en la base de datos.");
    } else {
      // Optimistic UI, though Realtime will immediately refetch and overwrite this
      const newApt: Appointment = {
        id: data.id,
        clientName: newClient.name,
        service: newClient.service,
        time: newTime === "Ahora" ? `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}` : newTime,
        date: selectedDate,
        status: 'waiting',
        arrived: false,
        staffId: newClient.staffId || undefined
      };
      setAppointments([...appointments, newApt]);
    }

    setNewClient({ name: '', service: 'Corte Clásico', staffId: '' });
    setShowAddForm(false);
  };

  const moveUp = (idx: number) => {
    if (idx <= 1) return;
    const newApts = [...appointments];
    const temp = newApts[idx];
    newApts[idx] = newApts[idx - 1];
    newApts[idx - 1] = temp;
    
    setAppointments(newApts.map((apt, i) => ({
      ...apt,
      time: i === 0 ? apt.time : `${14 + Math.floor((30 + i * 45) / 60)}:${String((30 + i * 45) % 60).padStart(2, '0')}`
    })));
  };

  const removeApt = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (!error) {
      setAppointments(appointments.filter((a: Appointment) => a.id !== id));
    } else {
      console.error("Error removing:", error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const finalizeService = async () => {
    if (!selectedAptForComplete) return;
    
    const amount = selectedAptForComplete.service.includes('+') ? 35 : 25;
    
    // Insert Transaction
    const { data: tx, error: txError } = await supabase.from('transactions').insert({
      appointment_id: selectedAptForComplete.id,
      amount,
      type: 'ingreso',
      payment_method: paymentMethod,
      staff_id: selectedAptForComplete.staffId || null
    }).select().single();

    if (!txError) {
      // Mark Appointment as Finished
      await supabase.from('appointments').update({ status: 'finished' }).eq('id', selectedAptForComplete.id);
      
      setAppointments(appointments.filter((a: Appointment) => a.id !== selectedAptForComplete.id));
      setTransactions([{
        id: tx.id,
        type: 'income',
        amount,
        method: paymentMethod as any,
        category: selectedAptForComplete.service,
        description: `Cliente: ${selectedAptForComplete.clientName}`,
        date: getTodayStr(),
        staffId: selectedAptForComplete.staffId
      }, ...transactions]);
      
      setShowCompleteModal(false);
      setSelectedAptForComplete(null);
      setPaymentMethod('cash');
    } else {
      console.error("Finanza no guardada:", txError);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '2rem' }}>
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              {activeTab === 'queue' ? 'Cola de Hoy' : 
               activeTab === 'agenda' ? 'Agenda de Citas' :
               activeTab === 'management' ? 'Gestión de Local' : 
               activeTab === 'inventory' ? 'Inventario Inteligente' :
               activeTab === 'staff' ? 'Equipo de Trabajo' : 'Finanzas y Reportes'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {(activeTab === 'queue' || activeTab === 'agenda') && (
              <button 
                className={`btn ${isPaused ? 'btn-success' : 'btn-outline'}`}
                style={{ 
                  padding: '0.4rem 1rem', 
                  fontSize: '0.75rem', 
                  borderColor: isPaused ? 'var(--success)' : '#ef4444', 
                  color: isPaused ? 'black' : '#ef4444', 
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? '▶️ REANUDAR' : '⏸️ EN PAUSA'}
              </button>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--surface)', padding: '0.4rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflowX: 'auto', maxWidth: '100%' }}>
            <button 
              className={`btn ${activeTab === 'queue' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleTabClick('queue')}
              style={{ display: 'flex', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none', background: activeTab === 'queue' ? 'var(--primary)' : 'transparent', color: activeTab === 'queue' ? 'black' : 'var(--text)' }}
            >
              <LayoutDashboard size={16} /> Cola
            </button>
            <button 
              className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleTabClick('inventory')}
              style={{ display: 'flex', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none', background: activeTab === 'inventory' ? 'var(--primary)' : 'transparent', color: activeTab === 'inventory' ? 'black' : 'var(--text)' }}
            >
              <Package size={16} /> Inventario
            </button>
            <button 
              className={`btn ${activeTab === 'finance' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleTabClick('finance')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none', background: activeTab === 'finance' ? 'var(--primary)' : 'transparent', color: subscription.plan === 'Free' ? 'var(--text-muted)' : activeTab === 'finance' ? 'black' : 'var(--text)' }}
            >
              <Wallet size={16} /> Finanzas {subscription.plan === 'Free' && <Lock size={12} style={{marginLeft: '0.2rem'}}/>}
            </button>
            <button 
              className={`btn ${activeTab === 'management' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleTabClick('management')}
              style={{ display: 'flex', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none', background: activeTab === 'management' ? 'var(--primary)' : 'transparent', color: activeTab === 'management' ? 'black' : 'var(--text)' }}
            >
              <Settings size={16} /> Local
            </button>
          </div>
        </div>
      </div>

      <main style={{ flex: 1, padding: '2rem', height: 'calc(100vh - 80px)', overflowY: 'auto', position: 'relative' }}>
        
        {/* Subscription Grace Banner */}
        {subscription.status === 'grace' && (
          <div className="animate-fade-in" style={{ 
            background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)', 
            borderRadius: 'var(--radius-md)', 
            padding: '1rem 1.5rem', 
            marginBottom: '1.5rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            color: 'black',
            boxShadow: '0 4px 15px rgba(245,158,11,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldAlert size={20} />
              <div>
                <p style={{ fontWeight: 800, margin: 0, fontSize: '0.875rem' }}>SU PLAN HA VENCIDO</p>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600 }}>Cuentas con una prórroga de {5 + daysRemaining} días para regularizar el pago.</p>
              </div>
            </div>
            <button onClick={() => setShowPaymentModal(true)} className="btn" style={{ background: 'black', color: 'white', padding: '0.4rem 1rem', fontSize: '0.75rem', fontWeight: 700 }}>VER OPCIONES DE PAGO</button>
          </div>
        )}

        {/* Global Suspension Overlay */}
        {subscription.status === 'suspended' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              background: 'rgba(239, 68, 68, 0.2)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '1.5rem',
              border: '2px solid #ef4444'
            }}>
              <Lock size={40} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem' }}>CUENTA DESACTIVADA</h2>
            <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)', maxWidth: '450px', marginBottom: '2rem' }}>
              El acceso a tu plataforma ha sido suspendido por falta de pago. Para reactivar tu servicio, por favor completa tu pago mensual.
            </p>
            <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.125rem', fontWeight: 800 }}>PAGAR AHORA</button>
          </div>
        )}

        {(activeTab === 'queue' || activeTab === 'agenda') && (
          <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem', scrollbarWidth: 'none' }}>
            {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
              const date = new Date();
              date.setDate(date.getDate() + offset);
              const dateStr = date.toISOString().split('T')[0];
              const isToday = offset === 0;
              const isSelected = selectedDate === dateStr;
              
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  style={{
                    minWidth: '80px',
                    padding: '0.75rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--primary)' : 'var(--surface)',
                    color: isSelected ? 'black' : 'var(--text)',
                    border: isSelected ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.7, textTransform: 'uppercase' }}>
                    {isToday ? 'Hoy' : date.toLocaleDateString('es-ES', { weekday: 'short' })}
                  </span>
                  <span style={{ fontSize: '1.125rem', fontWeight: 800 }}>
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
            <div style={{ 
              minWidth: '60px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'var(--surface)', 
              borderRadius: 'var(--radius-md)', 
              border: '1px dashed var(--border)',
              cursor: 'pointer'
            }}>
              <Calendar size={20} />
            </div>
          </div>
        )}

        {(activeTab === 'queue' || activeTab === 'agenda') ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="card" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'var(--success)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="pulse-success" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)', margin: 0 }}>
                    {selectedDate === getTodayStr() ? 'En Vivo' : `📅 Citas para el ${new Date(selectedDate).toLocaleDateString('es-ES')}`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-outline" 
                  onClick={() => {
                    if (window.confirm('¿Estás SEGURO de cancelar TODAS las citas? Se enviará una disculpa y tendrán prioridad mañana.')) {
                      alert('Aviso enviado: "Lamentamos los inconvenientes. Su cita ha sido cancelada por imprevistos del profesional. Tendrá PRIORIDAD TOTAL para agendar mañana."');
                      setAppointments(appointments.filter((a: Appointment) => a.date !== selectedDate));
                    }
                  }}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
                >
                  Cancelar Todas
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowAddForm(!showAddForm)}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
                >
                  <Plus size={16} />{showAddForm ? 'Cancelar' : 'Agregar Cita'}
                </button>
              </div>
            </div>

            {showAddForm && (
              <form onSubmit={addWalkIn} className="card animate-fade-in" style={{ background: 'var(--surface-hover)', border: '1px dashed var(--primary)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>NOMBRE DEL CLIENTE</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Pedro Picapiedra"
                      value={newClient.name}
                      onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      autoFocus
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>SERVICIO</label>
                    <select 
                      value={newClient.service}
                      onChange={(e) => setNewClient({...newClient, service: e.target.value})}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    >
                      <option>Corte Clásico</option>
                      <option>Barba Completa</option>
                      <option>Corte + Barba</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>PROFESIONAL</label>
                    <select 
                      value={newClient.staffId}
                      onChange={(e) => setNewClient({...newClient, staffId: e.target.value})}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    >
                      <option value="">Cualquiera</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }}>Añadir</button>
                </div>
              </form>
            )}
            
            {isPaused && (
              <div className="animate-fade-in" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="pulse-danger" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                <p style={{ margin: 0, color: '#ef4444', fontWeight: 800, fontSize: '0.875rem' }}>
                  EL PROFESIONAL HIZO UNA PAUSA Y REINICIA EN BREVE.
                </p>
              </div>
            )}

            {appointments.filter((a: Appointment) => a.date === selectedDate).length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5, border: '2px dashed var(--border)' }}>
                <Calendar size={48} style={{ marginBottom: '1rem' }} />
                <p>No hay citas programadas para este día.</p>
              </div>
            ) : appointments.filter((a: Appointment) => a.date === selectedDate).map((apt: Appointment, idx: number) => (
              <div key={apt.id} className="card" style={{ 
                border: apt.status === 'attending' ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: apt.status === 'attending' ? 'rgba(245,158,11,0.03)' : 'var(--surface)',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: 'var(--radius-full)', 
                    background: apt.status === 'attending' ? 'var(--primary)' : 'var(--surface-hover)', 
                    color: apt.status === 'attending' ? 'black' : 'var(--text)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.875rem'
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{apt.clientName}</h4>
                      {apt.status === 'attending' && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: 'black', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>SIENDO ATENDIDO</span>
                      )}
                      {apt.staffId && staff.find(s => s.id === apt.staffId) && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(59,130,246,0.2)' }}>
                          👤 {staff.find(s => s.id === apt.staffId)?.name}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {apt.service} • <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{apt.time}</span>
                      {apt.status === 'attending' && (
                        <span style={{ marginLeft: '1rem', color: 'var(--success)', fontWeight: 800, fontSize: '0.75rem' }}>
                          ⏳ {formatTime(activeTimer)} restantes
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ 
                        padding: '0.4rem 0.8rem', 
                        fontSize: '0.7rem', 
                        fontWeight: 800,
                        borderColor: apt.arrived ? 'var(--success)' : 'var(--border)',
                        color: apt.arrived ? 'var(--success)' : 'var(--text-muted)',
                        background: apt.arrived ? 'rgba(16,185,129,0.1)' : 'transparent'
                      }}
                      onClick={async () => {
                        // Quick Optimistic UI
                        const newApts = appointments.map(a => a.id === apt.id ? {...a, arrived: !a.arrived} : a);
                        setAppointments(newApts);
                        // Push to DB
                        const newStatus = apt.arrived ? 'waiting' : 'arrived';
                        await supabase.from('appointments').update({ status: newStatus }).eq('id', apt.id);
                      }}
                    >
                      {apt.arrived ? '📍 LLEGÓ AL LOCAL' : 'MARCAR LLEGADA'}
                    </button>
                    
                    {idx > 1 && (
                      <button 
                        onClick={() => moveUp(idx)}
                        className="btn btn-outline" 
                        title="Subir Prioridad"
                        style={{ padding: '0.4rem', border: '1px solid var(--border)', opacity: 0.8 }}
                      >
                        <TrendingUp size={14} />
                      </button>
                    )}
                    
                    {apt.status === 'waiting' ? (
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', gap: '0.3rem', fontWeight: 700 }}
                        onClick={async () => {
                          const isAttending = apt.status === 'attending';
                          // Optimistic
                          const newApts = appointments.map((a: Appointment) => a.id === apt.id ? { ...a, status: (isAttending ? 'waiting' : 'attending') as any } : a.status === 'attending' ? { ...a, status: 'waiting' as any } : a);
                          setAppointments(newApts as Appointment[]);
                          
                          // Push to DB
                          if (!isAttending) {
                             await supabase.from('appointments').update({ status: 'waiting' }).eq('status', 'attending');
                             await supabase.from('appointments').update({ status: 'attending' }).eq('id', apt.id);
                          } else {
                             await supabase.from('appointments').update({ status: 'waiting' }).eq('id', apt.id);
                          }
                        }}
                      >
                        <Play size={12} fill="currentColor" /> Atender
                      </button>
                    ) : (
                      <button 
                        className="btn btn-success" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', gap: '0.3rem', fontWeight: 700 }}
                        onClick={() => {
                          setSelectedAptForComplete(apt);
                          setShowCompleteModal(true);
                        }}
                      >
                        <Check size={12} /> Listo
                      </button>
                    )}
                    
                    <button 
                      onClick={() => removeApt(apt.id)}
                      className="btn btn-outline" 
                      style={{ padding: '0.4rem', color: 'var(--accent)', borderColor: 'rgba(239,68,68,0.2)', opacity: 0.6 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'inventory' ? (
          <InventoryManagement />
        ) : activeTab === 'finance' ? (
          <FinanceManagement transactions={transactions} setTransactions={setTransactions} staff={staff} />
        ) : activeTab === 'staff' ? (
          <StaffManagement staff={staff} setStaff={setStaff} plan={subscription.plan} />
        ) : (
          <BarberManagement />
        )}
      </main>
      </section>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Sidebar Nav */}
        <nav style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: subscription.status === 'suspended' ? 0.3 : 1 }}>
          <button 
            onClick={() => handleTabClick('queue')}
            className={`btn ${activeTab === 'queue' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', padding: '0.8rem 1.25rem' }}
          >
            <Users size={20} /> En Vivo
          </button>
          <button 
            onClick={() => handleTabClick('agenda')}
            className={`btn ${activeTab === 'agenda' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', padding: '0.8rem 1.25rem' }}
          >
            <Calendar size={20} /> Agenda
          </button>
          <button 
            onClick={() => handleTabClick('inventory')}
            className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', padding: '0.8rem 1.25rem' }}
          >
            <TrendingUp size={20} /> Inventario
          </button>
          <button 
            onClick={() => handleTabClick('finance')}
            className={`btn ${activeTab === 'finance' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between', padding: '0.8rem 1.25rem', color: subscription.plan === 'Free' ? 'var(--text-muted)' : activeTab === 'finance' ? 'black' : 'var(--text)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CreditCard size={20} /> Finanzas</div>
            {subscription.plan === 'Free' && <Lock size={16} />}
          </button>
          <button 
            onClick={() => handleTabClick('management')}
            className={`btn ${activeTab === 'management' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', padding: '0.8rem 1.25rem' }}
          >
            <Settings size={20} /> Mi Marca
          </button>
          <button 
            onClick={() => handleTabClick('staff')}
            className={`btn ${activeTab === 'staff' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between', padding: '0.8rem 1.25rem', color: subscription.plan !== 'Enterprise' ? 'var(--text-muted)' : activeTab === 'staff' ? 'black' : 'var(--text)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Users size={20} /> Equipo</div>
            {subscription.plan !== 'Enterprise' && <Lock size={16} />}
          </button>
        </nav>

        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo-myturn.png" alt="Logo" style={{ width: '20px', height: '20px', objectFit: 'contain' }} /> Perfil SaaS
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontWeight: 800 }}>LB</div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Legacy Business</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #B-9982</div>
              </div>
            </div>
            
            <button className="btn btn-primary" onClick={() => setShowShareModal(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Share2 size={18} /> Compartir mi negocio
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="var(--primary)" /> Rendimiento
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Pasados / Hoy</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  <span style={{ color: 'var(--success)' }}>{appointments.filter((a: Appointment) => a.date === selectedDate && a.status === 'finished').length}</span>
                  <span style={{ opacity: 0.3, margin: '0 0.5rem' }}>/</span>
                  {appointments.filter((a: Appointment) => a.date === selectedDate).length}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Estimado Ganancia</p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>$145.00</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700 }}>Ganado: $45.00</p>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.25rem' }}>EFICIENCIA</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--primary)' }}>94%</p>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.25rem' }}>DIFERENCIA</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--success)' }}>+$12</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#000' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>Sugerencia IA</h3>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, opacity: 0.9 }}>
            "Estás terminando los 'Cortes Clásicos' 5 minutos antes del promedio. Considera ajustar tu duración estimada."
          </p>
        </div>
      </aside>

      {showShareModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>¡Atrae Clientes!</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Comparte este enlace para que tus clientes agenden directamente contigo.
            </p>
            
            <div style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', margin: '0 auto 1.5rem', width: 'fit-content' }}>
              <QrCode size={160} color="#000" />
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'var(--background)', 
              padding: '0.5rem', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--border)',
              marginBottom: '1.5rem'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {shareUrl}
              </span>
              <button onClick={handleCopy} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.25rem' }}>
                <Copy size={16} />
              </button>
            </div>

            <button className="btn btn-outline" onClick={() => setShowShareModal(false)} style={{ width: '100%' }}>Cerrar</button>
            
            {copied && (
              <p style={{ marginTop: '0.5rem', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>¡Enlace copiado!</p>
            )}
          </div>
        </div>
      )}

      {showCompleteModal && selectedAptForComplete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', textAlign: 'center' }}>Finalizar Servicio 🏁</h3>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Registra el pago para <strong>{selectedAptForComplete.clientName}</strong>
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem' }}>¿QUIÉN LO ATENDIÓ?</label>
              <select 
                value={selectedAptForComplete.staffId || ''}
                onChange={(e) => setSelectedAptForComplete({...selectedAptForComplete, staffId: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 700 }}
              >
                <option value="">Reasignar o Confirmar Profesional</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem' }}>FORMATO DE PAGO</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { id: 'cash', label: '💵 EFECTIVO' },
                  { id: 'card', label: '💳 TARJETA' },
                  { id: 'deposit', label: '📲 TRANSF.' },
                  { id: 'credit', label: '📝 CRÉDITO' }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    style={{
                      padding: '1rem 0.5rem',
                      borderRadius: 'var(--radius-md)',
                      border: paymentMethod === method.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: paymentMethod === method.id ? 'rgba(245,158,11,0.1)' : 'var(--background)',
                      color: paymentMethod === method.id ? 'var(--primary)' : 'var(--text)',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Servicio:</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{selectedAptForComplete.service}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800 }}>Total a Cobrar:</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>
                  ${selectedAptForComplete.service.includes('+') ? '35.00' : '25.00'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowCompleteModal(false)} style={{ flex: 1 }}>Cerrar</button>
              <button 
                className="btn btn-primary" 
                onClick={finalizeService}
                style={{ flex: 2, fontWeight: 900 }}
              >
                REGISTRAR PAGO
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Upgrade / Upsell Modal */}
      {showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '420px', padding: '2rem', textAlign: 'center', border: '1px solid var(--primary)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Lock size={32} />
            </div>
            
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>
              Función Exclusiva
            </h3>
            
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5', fontSize: '0.875rem' }}>
              Estás limitado por tu <strong style={{ color: 'var(--text)' }}>Plan {subscription.plan}</strong>. <br/>
              Asciende tu plan para desbloquear reportes vitales y escalar tu negocio al siguiente nivel.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--surface-hover)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={18} color="var(--primary)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Cuentas claras y finanzas avanzadas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={18} color="var(--primary)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Gestión de personal y comisiones</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={18} color="var(--primary)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Citas online ilimitadas</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setShowUpgradeModal(false)} 
                style={{ flex: 1, padding: '0.8rem' }}
              >
                Quizás luego
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  alert('Abriendo pasarela de cobro o Panel de Planes...');
                  setShowUpgradeModal(false);
                }}
                style={{ flex: 1, padding: '0.8rem', fontWeight: 800 }}
              >
                Actualizar Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Options Modal */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-scale-in" style={{ maxWidth: '500px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            <button 
              onClick={() => setShowPaymentModal(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CreditCard size={32} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Opciones de Pago Manual</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tu plan actual: <span style={{ fontWeight: 800, color: 'var(--text)' }}>Plan {subscription.plan} ($29.99 USD)</span></p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ padding: '1.25rem', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Transferencia Bancaria</h4>
                <p style={{ fontWeight: 700, margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>Banco Regional Universal</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Número de Cuenta:</span>
                  <span style={{ fontWeight: 700 }}>123-456789-00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Cédula/NIT:</span>
                  <span style={{ fontWeight: 700 }}>800.123.456-1</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid #3b82f6' }}>
                <AlertCircle color="#3b82f6" size={20} />
                <p style={{ fontSize: '0.75rem', color: '#1e40af', margin: 0 }}>
                  Una vez realizado el pago, envía tu comprobante a <span style={{ fontWeight: 800 }}>pagos@myturn.com</span> con tu nombre de negocio para la reactivación inmediata.
                </p>
              </div>

              <button onClick={() => setShowPaymentModal(false)} className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>Entendido, enviaré el comprobante</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
