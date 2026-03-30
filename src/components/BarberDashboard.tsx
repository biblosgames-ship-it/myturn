import React, { useState, useEffect } from 'react';
import { Play, Check, X, TrendingUp, LayoutDashboard, Settings, Share2, Copy, QrCode, Plus, Calendar, Package, Wallet, Users, Clock, Scissors, ChevronRight, Search, CheckCircle2, Pause, AlertCircle, LogOut, Printer, HelpCircle, MoreVertical, CreditCard, ShieldAlert, Lock, User } from 'lucide-react';
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

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// All appointments are now strictly database-driven.

export const BarberDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'agenda' | 'finance' | 'inventory' | 'management' | 'staff' | 'profile' | 'customers'>('queue');
  const [userEmail, setUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [businessName, setBusinessName] = useState('Cargando...');
  const [logoUrl, setLogoUrl] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [savedCustomers, setSavedCustomers] = useState<any[]>([]);


  // Supabase Real-time Sync for Appointments
  useEffect(() => {
    if (!tenantId) return;

    const fetchAppointments = async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, services(name)')
        .eq('tenant_id', tenantId)
        .order('date_time', { ascending: true });
        
      if (data) {
        setAppointments(data.map(d => {
          const dateObj = new Date(d.date_time);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const localDateStr = `${year}-${month}-${day}`;
          
          return {
            id: d.id,
            clientName: d.client_name,
            service: d.services?.name || 'Servicio',
            time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            date: localDateStr,
            status: d.status === 'arrived' ? 'waiting' : d.status as any,
            arrived: d.status === 'attending' || d.status === 'arrived',
            staffId: d.staff_id || undefined
          };
        }));
      } else {
        setAppointments([]);
      }
    };

    fetchAppointments();

    const fetchSavedCustomers = async () => {
      const { data } = await supabase.from('saved_tenants').select('*').eq('tenant_id', tenantId);
      if (data) setSavedCustomers(data);
    };
    fetchSavedCustomers();

    const channel = supabase.channel('realtime:appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `tenant_id=eq.${tenantId}` }, () => {
         fetchAppointments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load Staff and Services
  useEffect(() => {
    const loadMetadata = async () => {
      // 1. Fetch Staff
      const { data: staffData } = await supabase.from('staff_members').select('*');
      if (staffData) {
        setStaff(staffData.map(s => ({
          id: s.id,
          name: s.name,
          role: s.role || 'Barbero',
          commission: s.commission_rate || 50
        })));
      }

      // 2. Fetch Services
      const { data: servicesData } = await supabase.from('services').select('*');
      if (servicesData) {
        setDbServices(servicesData);
      }

      // 3. Fetch Tenant/Business Info (SaaS Branding)
      // First, get the current user's tenant_id to ensure privacy
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        try {
          const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
          let currentTenantId = userData?.tenant_id;

          // self-healing: if user has no tenant_id, link them to the first one found
          if (!currentTenantId) {
            const { data: allTenants } = await supabase.from('tenants').select('id').limit(1);
            if (allTenants && allTenants.length > 0) {
              currentTenantId = allTenants[0].id;
              await supabase.from('users').upsert({
                id: user.id,
                tenant_id: currentTenantId,
                role: 'owner',
                full_name: 'Propietario'
              });
            }
          }

          if (currentTenantId) {
            setTenantId(currentTenantId);
            const { data: tenant } = await supabase.from('tenants').select('*').eq('id', currentTenantId).single();
            if (tenant) {
              setBusinessName(tenant.name);
              setLogoUrl(tenant.logo || '');
              if (tenant.color) {
                document.documentElement.style.setProperty('--primary', tenant.color);
              }
              setShareUrl(`${window.location.origin}/${tenant.slug || tenant.id}`);
              setSubscription({
                plan: (tenant.plan_id as any) || 'Free',
                expiryDate: tenant.expiry_date || '2026-12-31',
                status: (tenant.status as any) || 'active'
              });
            }
          }
        } catch (error) {
          console.error("Critical identity error:", error);
        }
      }
      setIsLoading(false);
    };

    loadMetadata();

    // 4. Realtime Sync for Branding & Status (Tenant specific)
    const tenantChannel = supabase.channel('tenant-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tenants' }, (payload) => {
        const updated = payload.new as any;
        setBusinessName(updated.name);
        setLogoUrl(updated.logo || '');
        if (updated.color) {
          document.documentElement.style.setProperty('--primary', updated.color);
        }
        if (updated.plan_id || updated.status) {
          setSubscription(prev => prev ? ({
            ...prev,
            plan: updated.plan_id || prev.plan,
            status: updated.status || prev.status,
            expiryDate: updated.expiry_date || prev.expiryDate
          }) : null);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_members' }, () => {
        loadMetadata(); // Refresh staff
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_tenants', filter: `tenant_id=eq.${tenantId}` }, () => {
        const fetchC = async () => {
          const { data } = await supabase.from('saved_tenants').select('*').eq('tenant_id', tenantId);
          if (data) setSavedCustomers(data);
        };
        fetchC();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        loadMetadata(); // Refresh services
      })
      .subscribe();

    return () => { supabase.removeChannel(tenantChannel); };
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
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'otro'>('efectivo');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load Transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      if (data) {
        setTransactions(data.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          method: t.payment_method,
          category: t.category,
          description: t.description,
          date: new Date(t.created_at).toISOString().split('T')[0],
          staffId: t.staff_id
        })));
      }
    };
    fetchTransactions();
  }, []);

  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);



  const [daysRemaining, setDaysRemaining] = useState(0);

  const handleTabClick = (tabId: string) => {
    if (subscription?.status === 'suspended') return;
    
    if (tabId === 'finance' && subscription?.plan === 'Free') {
      setShowUpgradeModal(true);
      return;
    }
    
    if (tabId === 'staff' && subscription?.plan !== 'Enterprise') {
      setShowUpgradeModal(true);
      return;
    }

    setActiveTab(tabId as any);
  };

  useEffect(() => {
    if (!subscription) return;
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
      setSubscription(prev => prev ? ({ ...prev, status: newStatus }) : null);
    }
  }, [subscription?.expiryDate, subscription?.status]);

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
    const caps = getPlanCapabilities(subscription?.plan || 'Free');
    const monthlyLimit = caps.maxAppointments === 'Unlimited' ? Infinity : Number(caps.maxAppointments);
    
    // Check against real length
    if (appointments.length >= monthlyLimit) {
      alert(`⚠️ Límite de Plan Alcanzado\n\nTu plan ${subscription?.plan || 'Free'} permite un máximo de ${caps.maxAppointments} citas por mes. Has llegado al tope.`);
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

    const selectedService = dbServices.find(s => s.name === newClient.service);
    const serviceName = selectedService ? selectedService.name : newClient.service;

    const serviceObj = dbServices.find(s => s.name === newClient.service);
    if (!serviceObj) return;

    const dbPayload = {
      client_name: newClient.name, // Just name, service is now relational
      service_id: serviceObj.id,
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
    
    // 1. Dynamic Pricing from DB Services
    const serviceObj = dbServices.find(s => s.name === selectedAptForComplete.service);
    const amount = serviceObj ? Number(serviceObj.price) : (selectedAptForComplete.service.includes('+') ? 35 : 25);
    
    // 2. Insert Transaction
    const { data: tx, error: txError } = await supabase.from('transactions').insert({
      appointment_id: selectedAptForComplete.id,
      amount,
      type: 'ingreso',
      payment_method: paymentMethod,
      staff_id: selectedAptForComplete.staffId || null,
      category: selectedAptForComplete.service,
      description: `Cliente: ${selectedAptForComplete.clientName}`
    }).select().single();

    if (!txError) {
      // 3. Automatic Inventory Deduction
      try {
        const { data: invItems } = await supabase.from('inventory').select('*');
        if (invItems) {
          for (const item of invItems) {
            let deduction = 0;
            if (item.category === 'Desechables') deduction = 1;
            if (item.category === 'Químicos' && (selectedAptForComplete.service.toLowerCase().includes('barba') || selectedAptForComplete.service.toLowerCase().includes('cabello'))) {
              deduction = Number(item.max_stock) * 0.02;
            }
            
            if (deduction > 0) {
              await supabase.from('inventory')
                .update({ current_stock: Math.max(0, Number(item.current_stock) - deduction) })
                .eq('id', item.id);
            }
          }
        }
      } catch (invErr) {
        console.warn("Inventory deduction failed, but proceeding:", invErr);
      }

      // 4. Mark Appointment as Finished

      // Mark Appointment as Finished
      await supabase.from('appointments').update({ status: 'finished' }).eq('id', selectedAptForComplete.id);
      
      setAppointments(appointments.filter((a: Appointment) => a.id !== selectedAptForComplete.id));
      setTransactions([{
        id: tx.id,
        type: 'ingreso',
        amount,
        method: paymentMethod as any,
        category: selectedAptForComplete.service,
        description: `Cliente: ${selectedAptForComplete.clientName}`,
        date: getTodayStr(),
        staffId: selectedAptForComplete.staffId
      }, ...transactions]);
      
      setShowCompleteModal(false);
      setSelectedAptForComplete(null);
      setPaymentMethod('efectivo');
    } else {
      console.error("Finanza no guardada:", txError);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '2rem', position: 'relative' }}>
      {!tenantId && !isLoading && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.95)', 
          zIndex: 10000, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <ShieldAlert size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', marginBottom: '1rem' }}>SISTEMA DESVINCULADO</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '500px', marginBottom: '2rem' }}>
            Tu usuario no está conectado a ningún negocio. Pulsa el botón de abajo para conectarte al negocio principal y restaurar la sincronización.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ padding: '1.25rem 3rem', fontSize: '1.125rem', fontWeight: 800 }}
            onClick={async () => {
              const { data } = await supabase.from('tenants').select('id').limit(1).single();
              if (data) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await supabase.from('users').upsert({ id: user.id, tenant_id: data.id, role: 'owner', full_name: 'Propietario' });
                  window.location.reload();
                }
              }
            }}
          >
            VINCULAR MI CUENTA AHORA
          </button>
        </div>
      )}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              {activeTab === 'queue' ? 'Cola de Hoy' : 
               activeTab === 'agenda' ? 'Agenda de Citas' :
               activeTab === 'management' ? 'Gestión de Local' : 
               activeTab === 'inventory' ? 'Inventario Inteligente' :
               activeTab === 'staff' ? 'Equipo de Trabajo' : 
               activeTab === 'customers' ? 'Registro Diario' : 'Finanzas y Reportes'}
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
              className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => handleTabClick('customers')}
            >
              <Users size={18} />
              <span>Registro</span>
            </button>
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
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none', background: activeTab === 'finance' ? 'var(--primary)' : 'transparent', color: subscription?.plan === 'Free' ? 'var(--text-muted)' : activeTab === 'finance' ? 'black' : 'var(--text)' }}
            >
              <Wallet size={16} /> Finanzas {subscription?.plan === 'Free' && <Lock size={12} style={{marginLeft: '0.2rem'}}/>}
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
        {subscription?.status === 'grace' && (
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
        {subscription?.status === 'suspended' && (
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
                    {selectedDate === getTodayStr() ? 'En Vivo' : `📅 Citas para el ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={async () => {
                    if (confirm('¿Deseas limpiar todos los turnos pendientes de hoy?')) {
                      const { error } = await supabase.from('appointments').delete()
                        .eq('tenant_id', tenantId)
                        .in('status', ['waiting', 'attending', 'arrived']);
                      if (!error) {
                        setAppointments(prev => prev.filter(a => a.status === 'finished'));
                        alert('Cola limpiada correctamente.');
                      }
                    }
                  }}
                  className="btn btn-outline" 
                  style={{ fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', fontWeight: 700 }}
                >
                  Limpiar Cola
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
                      {dbServices.length > 0 ? (
                        dbServices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                      ) : (
                        <>
                          <option>Corte Clásico</option>
                          <option>Barba Completa</option>
                          <option>Corte + Barba</option>
                        </>
                      )}
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
                <p style={{ margin: 0, color: '#ef4444', fontWeight: 800, fontSize: '0.875rem' }}>PROFESIONAL EN PAUSA</p>
              </div>
            )}

            {appointments.filter((a: Appointment) => {
                if (selectedDate === getTodayStr()) return a.status !== 'finished';
                return a.date === selectedDate;
            }).length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5, border: '2px dashed var(--border)' }}>
                <Calendar size={48} style={{ marginBottom: '1rem' }} />
                <p>No hay turnos {selectedDate === getTodayStr() ? 'activos' : 'para este día'}.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {appointments.filter((a: Appointment) => {
                    if (selectedDate === getTodayStr()) return a.status !== 'finished';
                    return a.date === selectedDate;
                }).map((apt: Appointment, idx: number) => (
                  <div key={apt.id} className="card" style={{ 
                    border: apt.status === 'attending' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: apt.status === 'attending' ? 'rgba(245,158,11,0.03)' : 'var(--surface)',
                    position: 'relative',
                    opacity: (selectedDate === getTodayStr() && apt.date !== getTodayStr()) ? 0.7 : 1
                  }}>
                    {apt.date !== selectedDate && (
                      <div style={{ position: 'absolute', top: '-10px', right: '20px', background: 'var(--accent)', color: 'white', fontSize: '0.65rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 900, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 10 }}>
                        📌 PROGRAMADA: {(() => {
                          const [y, m, d] = apt.date.split('-').map(Number);
                          return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                        })()}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: apt.status === 'attending' ? 'var(--primary)' : 'var(--surface-hover)', color: apt.status === 'attending' ? 'black' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{apt.clientName}</h4>
                          {apt.status === 'attending' && <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: 'black', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>SIENDO ATENDIDO</span>}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {apt.service} • <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{apt.time}</span>
                          {apt.status === 'attending' && apt.date === getTodayStr() && (
                            <span style={{ marginLeft: '1rem', color: 'var(--success)', fontWeight: 800 }}>⏳ {formatTime(activeTimer)}</span>
                          )}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ fontSize: '0.7rem' }} onClick={async () => {
                          const newStatus = apt.arrived ? 'waiting' : 'arrived';
                          await supabase.from('appointments').update({ status: newStatus }).eq('id', apt.id);
                        }}>{apt.arrived ? '📍 LLEGÓ' : 'LLEGADA'}</button>
                        {apt.status === 'waiting' ? (
                          <button className="btn btn-primary" style={{ fontSize: '0.7rem' }} onClick={async () => {
                            await supabase.from('appointments').update({ status: 'waiting' }).eq('status', 'attending').eq('tenant_id', tenantId);
                            await supabase.from('appointments').update({ status: 'attending' }).eq('id', apt.id);
                          }}>Atender</button>
                        ) : (
                          <button className="btn btn-success" style={{ fontSize: '0.7rem' }} onClick={() => { setSelectedAptForComplete(apt); setShowCompleteModal(true); }}>Listo</button>
                        )}
                        <button className="btn btn-outline" onClick={() => removeApt(apt.id)} style={{ color: 'var(--accent)' }}><X size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'inventory' ? (
          <InventoryManagement />
        ) : activeTab === 'finance' ? (
          <FinanceManagement transactions={transactions} setTransactions={setTransactions} staff={staff} />
        ) : activeTab === 'staff' ? (
          <StaffManagement staff={staff} setStaff={setStaff} plan={subscription?.plan || 'Free'} />
        ) : activeTab === 'customers' ? (
          <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.5px' }}>Registro Diario</h2>
                <p style={{ color: 'var(--text-muted)' }}>Citas finalizadas para el día seleccionado.</p>
              </div>
              <div className="card" style={{ padding: '0.75rem 1.5rem', background: 'var(--success)', color: 'white', fontWeight: 800, borderRadius: 'var(--radius-lg)' }}>
                {appointments.filter(a => a.date === selectedDate && a.status === 'finished').length} Atendidos
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Servicio x Barbero</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hora</th>
                    <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.filter(a => a.date === selectedDate && a.status === 'finished').map((apt) => (
                    <tr key={apt.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 600 }}>{apt.clientName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {apt.service} {apt.staffId && `• ${staff.find(s => s.id === apt.staffId)?.name}`}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {apt.time}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <span style={{ color: 'var(--success)', fontWeight: 800, fontSize: '0.7rem' }}>FINALIZADO</span>
                      </td>
                    </tr>
                  ))}
                  {appointments.filter(a => a.date === selectedDate && a.status === 'finished').length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No hay clientes registrados como finalizados en esta fecha.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'profile' ? (
          <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
             <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', background: 'var(--surface-hover)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', position: 'relative', overflow: 'hidden', border: '2px solid var(--border)' }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={40} color="var(--primary)" />
                  )}
                </div>
                <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>Mi Cuenta</h1>
                <p style={{ color: 'var(--text-muted)' }}>Gestiona tu perfil y seguridad.</p>
             </header>

             <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <section>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>CORREO ELECTRÓNICO</label>
                  <input type="text" value={userEmail} readOnly style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                </section>

                <section style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Identidad del Negocio</h3>
                    <button onClick={() => setActiveTab('management')} style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Editar Marca</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Nombre Comercial</span>
                      <p style={{ fontWeight: 600, margin: '0.2rem 0 0.8rem 0' }}>{businessName || 'Sin definir'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Color Primario</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>{document.documentElement.style.getPropertyValue('--primary') || '#f59e0b'}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem' }}>Cambiar Contraseña</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input type="password" placeholder="Nueva Contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)' }} />
                    <input type="password" placeholder="Confirmar Nueva Contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)' }} />
                    <button className="btn btn-primary" style={{ padding: '1rem' }} onClick={async () => {
                      if (newPassword !== confirmPassword) { alert('Las contraseñas no coinciden'); return; }
                      const { error } = await supabase.auth.updateUser({ password: newPassword });
                      if (error) alert('Error: ' + error.message);
                      else { alert('Contraseña actualizada'); setNewPassword(''); setConfirmPassword(''); }
                    }}>Actualizar Credenciales</button>
                  </div>
                </div>
             </div>
          </div>
        ) : (
          <BarberManagement />
        )}
      </main>
      </section>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Sidebar Nav */}
        <nav style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: subscription?.status === 'suspended' ? 0.3 : 1 }}>
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
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between', padding: '0.8rem 1.25rem', color: subscription?.plan === 'Free' ? 'var(--text-muted)' : activeTab === 'finance' ? 'black' : 'var(--text)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CreditCard size={20} /> Finanzas</div>
            {subscription?.plan === 'Free' && <Lock size={16} />}
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
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between', padding: '0.8rem 1.25rem', color: subscription?.plan !== 'Enterprise' ? 'var(--text-muted)' : activeTab === 'staff' ? 'black' : 'var(--text)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Users size={20} /> Equipo</div>
            {subscription?.plan !== 'Enterprise' && <Lock size={16} />}
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', padding: '0.8rem 1.25rem' }}
          >
            <User size={20} /> Mi Perfil
          </button>
        </nav>

        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo-myturn.png" alt="Logo" style={{ width: '20px', height: '20px', objectFit: 'contain' }} /> Mi Suscripción
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontWeight: 800 }}>
                  {businessName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{businessName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Plan {subscription?.plan || 'Free'}</div>
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
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Ganancia Hoy</p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                    ${transactions
                      .filter(t => t.date === selectedDate && t.type === 'ingreso')
                      .reduce((acc, t) => acc + t.amount, 0)
                      .toFixed(2)}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700 }}>Neto: ${(transactions
                      .filter(t => t.date === selectedDate && t.type === 'ingreso')
                      .reduce((acc, t) => acc + t.amount, 0) - transactions
                      .filter(t => t.date === selectedDate && t.type === 'egreso')
                      .reduce((acc, t) => acc + t.amount, 0)).toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.25rem' }}>EFICIENCIA</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--primary)' }}>Realtime</p>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.25rem' }}>ESTADO</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--success)' }}>Activo</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#000' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>Asistente MyTurn</h3>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, opacity: 0.9 }}>
            "Bienvenido al panel de control. Tus estadísticas de rendimiento y sugerencias inteligentes aparecerán aquí a medida que registres más citas."
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
              Estás limitado por tu <strong style={{ color: 'var(--text)' }}>Plan {subscription?.plan || 'Free'}</strong>. <br/>
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
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tu plan actual: <span style={{ fontWeight: 800, color: 'var(--text)' }}>Plan {subscription?.plan || 'Free'} ($29.99 USD)</span></p>
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
      <div style={{ position: 'fixed', bottom: '1rem', left: '1rem', opacity: 0.2, fontSize: '0.6rem', fontFamily: 'monospace', pointerEvents: 'none', zIndex: 9999 }}>
        ADMIN_TENANT_ID: {tenantId || 'LOADING...'}
      </div>
    </div>
  );
};
