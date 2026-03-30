import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Key, BarChart3, Settings, Plus, Copy, CheckCircle, 
  Shield, Building2, CreditCard, LayoutDashboard, Search, 
  Filter, MoreVertical, ExternalLink, AlertCircle, TrendingUp, 
  Briefcase, Heart, Scissors, Stethoscope, ShieldAlert, Clock,
  CheckCircle2, Loader2
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  owner: string;
  industry: 'Barbería' | 'Salón' | 'Salud' | 'Taller' | 'Otro';
  status: 'active' | 'pending' | 'suspended';
  plan: 'Free' | 'Professional' | 'Enterprise';
  appointmentsToday: number;
  revenue: number;
  logo: string;
  expiryDate: string;
}

export interface SaasPlan {
  id: string; // Add an ID to help with uniquely identifying the plan
  name: string;
  price: string;
  priceAnnual: string;
  features: string[];
  capabilities: {
    advancedFinance: boolean;
    multipleStaff: boolean;
    whiteLabel: boolean;
    maxAppointments: number | 'Unlimited';
    maxStaff: number | 'Unlimited';
  };
}

const GLOBAL_STATS = {
  totalRevenue: 0,
  activeBusinesses: 0,
  totalUsers: 0,
  growthRate: 0
};


// No initial mock data anymore
const initialTenants: Tenant[] = [];

const initialSaasPlans: SaasPlan[] = [
  { id: 'free', name: 'Plan Free', price: '$0', priceAnnual: '$0', features: ['Hasta 50 turnos/mes', 'Soporte básico', '1 profesional', 'Estéticas básicas'], capabilities: { advancedFinance: false, multipleStaff: false, whiteLabel: false, maxAppointments: 50, maxStaff: 1 } },
  { id: 'pro', name: 'Plan Professional', price: '$29.99', priceAnnual: '$290.00', features: ['Turnos ilimitados', 'Soporte 24/7', 'Hasta 5 profesionales', 'Inventario y Finanzas'], capabilities: { advancedFinance: true, multipleStaff: true, whiteLabel: false, maxAppointments: 300, maxStaff: 5 } },
  { id: 'enterprise', name: 'Plan Enterprise', price: '$99.00', priceAnnual: '$990.00', features: ['Multi-sucursal', 'API de integración', 'Marca blanca', 'Analítica avanzada'], capabilities: { advancedFinance: true, multipleStaff: true, whiteLabel: true, maxAppointments: 'Unlimited', maxStaff: 'Unlimited' } },
];

export const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'businesses' | 'plans' | 'settings'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastInviteCode, setLastInviteCode] = useState<string | null>(null);


  // Fetch real tenants from Supabase
  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data: tData, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
      
      if (error) throw error;

      if (tData) {
        setTenants(tData.map(t => ({
          id: t.id || Math.random().toString(),
          name: t.name || 'Sin Nombre',
          owner: t.owner || 'SaaS Business',
          industry: (t.industry as any) || 'Otro',
          status: (t.plan_id === 'Suspended' ? 'suspended' : 'active'),
          plan: (t.plan_id as any) || 'Free',
          appointmentsToday: 0,
          revenue: 0,
          logo: t.logo || 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=100&h=100&fit=crop',
          expiryDate: t.expiry_date || new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [selectedTenantForPayment, setSelectedTenantForPayment] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  
  // New state for SaaS Plans with LocalStorage Persistence
  const [saasPlans, setSaasPlans] = useState<SaasPlan[]>(() => {
    const saved = localStorage.getItem('myturn_saas_plans');
    return saved ? JSON.parse(saved) : initialSaasPlans;
  });
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);
  const [manualPaymentData, setManualPaymentData] = useState({
    amount: 29.99,
    method: 'Transferencia',
    expiryDate: '',
    plan: 'Professional' as 'Free' | 'Professional' | 'Enterprise',
    status: 'active' as 'active' | 'pending' | 'suspended',
  });
  // New state for password update in Advanced Settings
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleOpenPaymentModal = (tenant: Tenant) => {
    setSelectedTenantForPayment(tenant);
    const currentExpiry = new Date(tenant.expiryDate);
    const nextExpiry = new Date(currentExpiry > new Date() ? currentExpiry : new Date());
    nextExpiry.setDate(nextExpiry.getDate() + 30);
    setManualPaymentData({
      amount: tenant.plan === 'Professional' ? 29.99 : (tenant.plan === 'Enterprise' ? 99.00 : 0),
      method: 'Transferencia',
      expiryDate: nextExpiry.toISOString().split('T')[0],
      plan: tenant.plan,
      status: tenant.status
    });
  };

  const handleSaveManualPayment = async () => {
    if (!selectedTenantForPayment) return;
    
    try {
      const { error } = await supabase.from('tenants').update({
        expiry_date: manualPaymentData.expiryDate,
        plan_id: manualPaymentData.plan,
        status: (manualPaymentData.status === 'suspended' ? 'suspended' : 'active')
      }).eq('id', selectedTenantForPayment.id);

      if (error) throw error;

      await fetchTenants(); // Re-fetch to sync
      setSelectedTenantForPayment(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      console.error('Payment save error:', err);
      alert('Error al guardar pago: ' + err.message);
    }
  };


  const handleDeleteTenant = async () => {
    if (!deletingTenant) return;
    
    try {
      const { error } = await supabase.from('tenants').delete().eq('id', deletingTenant.id);
      if (error) throw error;

      await fetchTenants();
      setDeletingTenant(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Error al borrar: ' + err.message);
    }
  };

  const handleUpdateTenant = async (updatedTenant: Tenant) => {
    try {
      const { error } = await supabase.from('tenants').update({
        name: updatedTenant.name,
        owner: updatedTenant.owner,
        industry: updatedTenant.industry,
        logo: updatedTenant.logo
      }).eq('id', updatedTenant.id);

      if (error) throw error;

      await fetchTenants();
      setEditingTenant(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      console.error('Update error:', err);
      alert('Error al actualizar: ' + err.message);
    }
  };

  const handleUpdatePlan = (updatedPlan: SaasPlan) => {

    const newPlans = saasPlans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
    setSaasPlans(newPlans);
    localStorage.setItem('myturn_saas_plans', JSON.stringify(newPlans));
    setEditingPlan(null);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };


  return (
    <div className="animate-fade-in" style={{ 
      display: 'grid', 
      gridTemplateColumns: '260px 1fr', 
      minHeight: '100vh', 
      background: 'var(--background)',
      margin: '-2rem' // Compensate for parent padding
    }}>
      {/* Sidebar Navigation */}
      <aside style={{ 
        background: 'var(--surface)', 
        borderRight: '1px solid var(--border)', 
        padding: '2rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            background: 'var(--primary)', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'black'
          }}>
            <Shield size={24} />
          </div>
          <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>SUPERADMIN</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { id: 'overview', label: 'Resumen Global', icon: LayoutDashboard },
            { id: 'businesses', label: 'Gestión Negocios', icon: Building2 },
            { id: 'plans', label: 'Planes SaaS', icon: CreditCard },
            { id: 'settings', label: 'Configuración', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: activeTab === item.id ? 'rgba(245,158,11,0.1)' : 'transparent',
                color: activeTab === item.id ? 'var(--primary)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: activeTab === item.id ? 700 : 500,
                transition: 'all 0.2s'
              }}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>SESIÓN SEGURA</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin Principal</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ padding: '2rem 3rem', height: '100vh', overflowY: 'auto', position: 'relative' }}>
        {loading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(9,9,11,0.8)', 
            zIndex: 50, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
          </div>
        )}
        
        {activeTab === 'overview' && (
          <div className="animate-fade-in">
            <header style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Impacto Global SaaS</h1>
              <p style={{ color: 'var(--text-muted)' }}>Bienvenido, aquí está el rendimiento de MyTurn hoy.</p>
            </header>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                  {[
                    { label: 'Ingresos Totales', val: `$${GLOBAL_STATS.totalRevenue.toLocaleString()}`, trend: '+12.5%', icon: CreditCard, color: 'var(--primary)' },
                    { label: 'Negocios Activos', val: GLOBAL_STATS.activeBusinesses, trend: '+4 esta semana', icon: Building2, color: '#3b82f6' },
                    { label: 'Usuarios Finales', val: GLOBAL_STATS.totalUsers.toLocaleString(), trend: '+150 hoy', icon: Users, color: '#10b981' },
                    { label: 'Cuentas en Prórroga', val: '12', trend: 'Revisión', icon: ShieldAlert, color: '#f43f5e' },
                  ].map((stat, i) => (
                <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ padding: '0.5rem', background: `rgba(255,255,255,0.05)`, borderRadius: '10px', color: stat.color }}>
                      <stat.icon size={24} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>{stat.trend}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, margin: 0 }}>{stat.label}</p>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>{stat.val}</h3>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1.5rem' }}>Actividad de Crecimiento (Mock)</h3>
                <div style={{ height: '240px', background: 'var(--background)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '1rem' }}>
                  {[40, 60, 45, 80, 55, 90, 75].map((h, i) => (
                    <div key={i} style={{ width: '40px', height: `${h}%`, background: 'var(--primary)', borderRadius: '6px 6px 0 0', opacity: 0.3 + (i * 0.1) }} />
                  ))}
                </div>
              </div>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem' }}>Alertas del Sistema</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, margin: 0 }}>3 Negocios Pendientes</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Requieren revisión manual.</p>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, margin: 0 }}>Actualización de Términos</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Programada para este domingo.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'businesses' && (
          <div className="animate-fade-in">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>Gestión de Negocios</h1>
                <p style={{ color: 'var(--text-muted)' }}>Supervisa y modera las cuentas profesionales.</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar negocio..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: '1px solid var(--border)', width: '300px' }}
                  />
                </div>
                <button 
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={async () => {
                    try {
                      setInviteError(null);
                      setLastInviteCode(null);
                      const code = `MYTURN-${Math.random().toString(36).substring(7).toUpperCase()}-2026`;
                      const slug = `invite-${code.toLowerCase()}`;
                      
                      const { data, error } = await supabase.from('tenants').insert({
                        name: `Invitación: ${code}`,
                        slug: slug,
                        industry: 'SaaS',
                        plan_id: 'Suspended',
                        owner: 'Pendiente',
                        logo: 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=100&h=100&fit=crop'
                      }).select().single();
                      
                      if (error) {
                        setInviteError(error.message);
                        console.error('Database Error:', error);
                        return;
                      }

                      if (data) {
                        setLastInviteCode(code);
                        try {
                           await navigator.clipboard.writeText(code);
                        } catch (clipErr) {
                           console.warn('Clipboard failed');
                        }
                        setShowSuccessToast(true);
                        setTimeout(() => setShowSuccessToast(false), 3000);
                        fetchTenants();
                      }
                    } catch (err: any) {
                      setInviteError(err.message || 'Error desconocido');
                      console.error('Runtime error:', err);
                    }
                  }}
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Invitación Directa
                </button>


              </div>
            </header>

            <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'transparent' }}>
              {inviteError && (
                <div className="animate-fade-in" style={{ margin: '1rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldAlert size={18} /> Error de Sistema: {inviteError}
                </div>
              )}
              {lastInviteCode && (
                <div className="animate-fade-in" style={{ margin: '1rem', padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--success)', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={18} /> ¡Invitación Generada!: <code style={{ background: 'var(--surface)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', marginLeft: '0.5rem' }}>{lastInviteCode}</code>
                </div>
              )}


              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>NEGOCIO</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>INDUSTRIA</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>PLAN / VIGENCIA</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ESTADO</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>RECAUDO</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.filter(t => (t.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(t => {
                    const isInvite = t.name && t.name.startsWith('Invitación:');
                    const inviteCode = isInvite ? t.name.replace('Invitación:', '').trim() : '';

                    return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {isInvite ? (
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <Key size={20} />
                            </div>
                          ) : (
                            <img src={t.logo || 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=100&h=100&fit=crop'} style={{ width: '40px', height: '40px', borderRadius: '10px' }} alt="" />
                          )}
                          <div>
                            <p style={{ fontWeight: 800, fontSize: '0.875rem', margin: 0 }}>{isInvite ? 'Código Generado' : (t.name || 'Sin Nombre')}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text)', fontWeight: 600, margin: 0 }}>{isInvite ? inviteCode : (t.owner || 'SaaS Business')}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{isInvite ? 'Esperando Registro' : t.industry}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {isInvite ? (
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Pendiente de uso</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.plan === 'Enterprise' ? 'var(--primary)' : 'var(--text-muted)' }} />
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{t.plan}</span>
                            </div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={10} /> Exp: {t.expiryDate}
                            </p>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {isInvite ? (
                          <span className="badge badge-warning">ESPERANDO</span>
                        ) : (() => {
                          if (t.status === 'suspended') return <span className="badge badge-danger">SUSPENDIDO</span>;
                          const today = new Date('2026-03-28');
                          const expiry = new Date(t.expiryDate);
                          const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          
                          if (diff <= -5) return <span className="badge badge-danger">SUSPENDIDO</span>;
                          if (diff <= 0) return <span className="badge badge-warning">PRÓRROGA</span>;
                          return <span className="badge badge-success">ACTIVO</span>;
                        })()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>${isInvite ? '0' : t.revenue.toLocaleString()}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {isInvite ? (
                            <button className="btn btn-outline" style={{ padding: '0.4rem', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }} onClick={() => { navigator.clipboard.writeText(inviteCode); alert('Copiado'); }} title="Copiar Código">
                              <Copy size={16} />
                            </button>
                          ) : (
                            <button 
                              className="btn btn-outline" 
                              onClick={() => handleOpenPaymentModal(t)}
                              style={{ 
                                padding: '0.4rem', 
                                border: t.id === '1' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                background: t.id === '1' ? 'rgba(245,158,11,0.1)' : 'transparent'
                              }} 
                              title="Registrar Pago Manual"
                            >
                              <CreditCard size={14} color={t.id === '1' ? 'var(--primary)' : 'currentColor'} />
                            </button>
                          )}
                          {!isInvite && (
                            <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => setEditingTenant(t)} title="Configuración Avanzada">
                              <Settings size={14} />
                            </button>
                          )}
                          <button className="btn btn-outline" style={{ padding: '0.4rem', color: '#ef4444' }} onClick={() => setDeletingTenant(t)} title="Eliminar / Auditoría">
                            <AlertCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="animate-fade-in">
            <header style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Planes y Suscripciones SaaS</h1>
              <p style={{ color: 'var(--text-muted)' }}>Configura los niveles de servicio y precios para profesionales.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
              {saasPlans.map((plan, i) => (
                <div key={i} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: plan.name.includes('Professional') ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                  {plan.name.includes('Professional') && (
                    <span style={{ background: 'var(--primary)', color: 'black', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 900, alignSelf: 'flex-start' }}>MÁS POPULAR</span>
                  )}
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>{plan.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 900 }}>{plan.price}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>/ mensual</span>
                    </div>
                    {plan.priceAnnual !== '$0' && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 800, marginTop: '-0.2rem' }}>
                        o {plan.priceAnnual} / año
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {plan.features.map((f, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <CheckCircle size={14} color="var(--success)" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setEditingPlan(plan)}
                    className={`btn ${plan.name.includes('Professional') ? 'btn-primary' : 'btn-outline'}`} 
                    style={{ width: '100%', marginTop: 'auto' }}
                  >
                    Editar Beneficios
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-fade-in">
            <header style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>Configuración Global del Sistema</h1>
              <p style={{ color: 'var(--text-muted)' }}>Ajustes maestros para toda la infraestructura de MyTurn.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Mantenimiento y Alertas</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700, margin: 0 }}>Modo Mantenimiento</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Bloquea el acceso temporalmente a todos los negocios.</p>
                  </div>
                  <input type="checkbox" style={{ width: '20px', height: '20px' }} />
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>BANNER PROMOCIONAL GLOBAL</label>
                  <textarea 
                    placeholder="Escribe el mensaje que verán todos los profesionales..."
                    style={{ width: '100%', minHeight: '100px', padding: '1rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)' }}
                  />
                  <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Lanzar Notificación Global</button>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Seguridad y API</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>CLAVE SECRETA DE PLATAFORMA</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input 
                        type="password" 
                        value="••••••••••••••••" 
                        readOnly
                        style={{ flex: 1, padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }} 
                      />
                      <button className="btn btn-outline"><Copy size={18} /></button>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>CAMBIAR CONTRASEÑA DE ADMINISTRADOR</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input 
                        type="password" 
                        placeholder="Nueva Contraseña"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)' }} 
                      />
                      <input 
                        type="password" 
                        placeholder="Confirmar Nueva Contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)' }} 
                      />
                      <button 
                        className="btn btn-primary" 
                        style={{ width: '100%' }}
                        onClick={async () => {
                          if (!newPassword || newPassword !== confirmPassword) {
                            alert('Las contraseñas no coinciden o están vacías.');
                            return;
                          }
                          const { error } = await supabase.auth.updateUser({ password: newPassword });
                          if (error) {
                            alert('Error al actualizar: ' + error.message);
                          } else {
                            alert('¡Contraseña actualizada con éxito!');
                            setNewPassword('');
                            setConfirmPassword('');
                          }
                        }}
                      >
                        Actualizar Credenciales
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: '8px', border: '1px solid #3b82f6' }}>
                    <p style={{ fontSize: '0.8125rem', color: '#3b82f6', fontWeight: 700, margin: 0 }}>Modo Desarrollador Activo</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Logs de errores y auditoría activados.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Manual Payment Registration Modal */}
      {selectedTenantForPayment && (
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
          zIndex: 4000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <CreditCard size={32} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Gestión de Cuenta SaaS</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Configuración para: <span style={{ fontWeight: 800, color: 'var(--text)' }}>{selectedTenantForPayment.name}</span></p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>PLAN ACTUAL</label>
                  <select 
                    value={manualPaymentData.plan}
                    onChange={(e) => {
                      const newPlan = e.target.value as any;
                      const newAmount = newPlan === 'Professional' ? 29.99 : (newPlan === 'Enterprise' ? 99.00 : 0);
                      setManualPaymentData({...manualPaymentData, plan: newPlan, amount: newAmount});
                    }}
                    style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontWeight: 700 }}
                  >
                    <option value="Free">Plan Free</option>
                    <option value="Professional">Plan Professional</option>
                    <option value="Enterprise">Plan Enterprise</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ESTADO DE CUENTA</label>
                  <select 
                    value={manualPaymentData.status}
                    onChange={(e) => setManualPaymentData({...manualPaymentData, status: e.target.value as any})}
                    style={{ 
                      padding: '0.75rem', 
                      background: manualPaymentData.status === 'suspended' ? 'rgba(239,68,68,0.1)' : 'var(--background)', 
                      border: manualPaymentData.status === 'suspended' ? '1px solid #ef4444' : '1px solid var(--border)', 
                      borderRadius: 'var(--radius-sm)', 
                      color: manualPaymentData.status === 'suspended' ? '#ef4444' : 'var(--text)',
                      fontWeight: 700
                    }}
                  >
                    <option value="active">ACTIVA</option>
                    <option value="suspended">SUSPENDIDA / CANCELADA</option>
                  </select>
                </div>
              </div>

              <div style={{ padding: '1.25rem', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', margin: 0 }}>REGISTRO DE PAGO (OPCIONAL)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>MONTO</label>
                    <input 
                      type="number" 
                      value={manualPaymentData.amount}
                      onChange={(e) => setManualPaymentData({...manualPaymentData, amount: parseFloat(e.target.value)})}
                      style={{ padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>MÉTODO</label>
                    <select 
                      value={manualPaymentData.method}
                      onChange={(e) => setManualPaymentData({...manualPaymentData, method: e.target.value})}
                      style={{ padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', fontSize: '0.875rem' }}
                    >
                      <option value="Transferencia">Transferencia</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Depósito">Depósito</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>VENCIMIENTO DEL SERVICIO</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    value={manualPaymentData.expiryDate}
                    onChange={(e) => setManualPaymentData({...manualPaymentData, expiryDate: e.target.value})}
                    style={{ width: '100%', padding: '0.875rem', background: 'var(--background)', border: manualPaymentData.status === 'suspended' ? '1px solid var(--border)' : '2.5px solid var(--primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontWeight: 800, fontSize: '1rem', opacity: manualPaymentData.status === 'suspended' ? 0.5 : 1 }}
                    disabled={manualPaymentData.status === 'suspended'}
                  />
                  {!manualPaymentData.status.includes('suspended') && <ShieldAlert size={18} color="var(--primary)" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {manualPaymentData.status === 'suspended' 
                    ? 'La fecha de vencimiento se ignora si la cuenta está suspendida.'
                    : 'Esta fecha activa el bloqueo automático tras el periodo de gracia.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={() => setSelectedTenantForPayment(null)} className="btn btn-outline" style={{ flex: 1, padding: '1rem' }}>Cancelar</button>
              <button onClick={handleSaveManualPayment} className="btn btn-primary" style={{ flex: 2, padding: '1rem' }}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings Modal (Gear) */}
      {editingTenant && (
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
          zIndex: 4000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Configuración de Negocio (Maestra)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>NOMBRE DEL ESTABLECIMIENTO</label>
                  <input 
                    type="text" 
                    value={editingTenant.name}
                    onChange={(e) => setEditingTenant({...editingTenant, name: e.target.value})}
                    style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>PROPIETARIO RESPONSABLE</label>
                  <input 
                    type="text" 
                    value={editingTenant.owner}
                    onChange={(e) => setEditingTenant({...editingTenant, owner: e.target.value})}
                    style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>URL DEL LOGO (DEMO IMAGE)</label>
                  <input 
                    type="text" 
                    value={editingTenant.logo}
                    onChange={(e) => setEditingTenant({...editingTenant, logo: e.target.value})}
                    style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.75rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>SECTOR INDUSTRIAL</label>
                  <select 
                    value={editingTenant.industry}
                    onChange={(e) => setEditingTenant({...editingTenant, industry: e.target.value as any})}
                    style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  >
                    <option value="Barbería">Barbería</option>
                    <option value="Salón">Salón de Belleza</option>
                    <option value="Salud">Consultorio Médico</option>
                    <option value="Taller">Taller Mecánico</option>
                    <option value="Otro">Otro Negocio</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>NUEVA CONTRASEÑA</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>CONFIRMAR CONTRASEÑA</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={() => {
                setEditingTenant(null);
                setNewPassword('');
                setConfirmPassword('');
              }} className="btn btn-outline" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={() => {
                if (newPassword && newPassword !== confirmPassword) {
                  alert('Las contraseñas no coinciden');
                  return;
                }
                // Here you would normally send the new password to backend
                handleUpdateTenant({
                  ...editingTenant,
                  // password field could be added if needed
                });
                setNewPassword('');
                setConfirmPassword('');
              }} className="btn btn-primary" style={{ flex: 1 }}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Critical Actions Modal (AlertCircle) */}
      {deletingTenant && (
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
          zIndex: 4000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Eliminar Negocio Permanente</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Estás a punto de **BORRAR DEFINITIVAMENTE** a <span style={{ fontWeight: 800, color: 'var(--text)' }}>{deletingTenant.name}</span>.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  onClick={() => handleDeleteTenant()}

                  className="btn" 
                  style={{ width: '100%', padding: '1rem', background: '#ef4444', color: 'white', border: 'none', fontWeight: 800 }}
                >
                  BORRAR DEFINITIVAMENTE
                </button>
                <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
                    ADVERTENCIA: Esta acción es irreversible. Se eliminarán todos los servicios, profesionales y citas asociados.
                </div>
            </div>

            <button onClick={() => setDeletingTenant(null)} className="btn btn-outline" style={{ width: '100%' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'var(--success)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 10px 25px rgba(16,185,129,0.3)',
          animation: 'fade-in-up 0.3s ease-out',
          zIndex: 5000
        }}>
          <CheckCircle2 size={20} />
          <span style={{ fontWeight: 700 }}>Acción realizada con éxito</span>
        </div>
      )}

      {/* Edit SaaS Plan Modal */}
      {editingPlan && (
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
          zIndex: 4000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Editar {editingPlan.name}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>NOMBRE DEL PLAN</label>
                <input 
                  type="text" 
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                  style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>PRECIO MENSUAL</label>
                  <input 
                    type="text" 
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({...editingPlan, price: e.target.value})}
                    style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>PRECIO ANUAL</label>
                  <input 
                    type="text" 
                    value={editingPlan.priceAnnual}
                    onChange={(e) => setEditingPlan({...editingPlan, priceAnnual: e.target.value})}
                    style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  CARACTERÍSTICAS / BENEFICIOS
                  <button 
                    onClick={() => setEditingPlan({...editingPlan, features: [...editingPlan.features, 'Nueva Característica']})}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                  >
                    <Plus size={12} /> Añadir
                  </button>
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {editingPlan.features.map((feature, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...editingPlan.features];
                          newFeatures[idx] = e.target.value;
                          setEditingPlan({...editingPlan, features: newFeatures});
                        }}
                        style={{ flex: 1, padding: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.875rem' }}
                      />
                      <button 
                        onClick={() => {
                          const newFeatures = editingPlan.features.filter((_, i) => i !== idx);
                          setEditingPlan({...editingPlan, features: newFeatures});
                        }}
                        style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', borderRadius: 'var(--radius-sm)', padding: '0 0.5rem', cursor: 'pointer' }}
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>PERMISOS Y CAPACIDADES (NÚCLEO)</label>
                
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Cuentas Claras y Finanzas Avanzadas</span>
                  <input type="checkbox" checked={editingPlan.capabilities.advancedFinance} onChange={(e) => setEditingPlan({...editingPlan, capabilities: {...editingPlan.capabilities, advancedFinance: e.target.checked}})} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Múltiples Profesionales (Personal / Equipo)</span>
                  <input type="checkbox" checked={editingPlan.capabilities.multipleStaff} onChange={(e) => setEditingPlan({...editingPlan, capabilities: {...editingPlan.capabilities, multipleStaff: e.target.checked}})} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                </label>

                 <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Marca, Logo y Directorio</span>
                  <input type="checkbox" checked={editingPlan.capabilities.whiteLabel} onChange={(e) => setEditingPlan({...editingPlan, capabilities: {...editingPlan.capabilities, whiteLabel: e.target.checked}})} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>LÍMITE DE CITAS / MES</label>
                  <input 
                    type="text" 
                    value={editingPlan.capabilities.maxAppointments}
                    onChange={(e) => {
                      const val = e.target.value === 'Unlimited' ? 'Unlimited' : (isNaN(Number(e.target.value)) ? editingPlan.capabilities.maxAppointments : Number(e.target.value));
                      setEditingPlan({...editingPlan, capabilities: {...editingPlan.capabilities, maxAppointments: val}});
                    }}
                    style={{ padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>LÍMITE DE PROFESIONALES</label>
                  <input 
                    type="text" 
                    value={editingPlan.capabilities.maxStaff}
                    onChange={(e) => {
                      const val = e.target.value === 'Unlimited' ? 'Unlimited' : (isNaN(Number(e.target.value)) ? editingPlan.capabilities.maxStaff : Number(e.target.value));
                      setEditingPlan({...editingPlan, capabilities: {...editingPlan.capabilities, maxStaff: val}});
                    }}
                    style={{ padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={() => setEditingPlan(null)} 
                className="btn btn-outline" 
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleUpdatePlan(editingPlan)} 
                className="btn btn-primary" 
                style={{ flex: 1 }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
