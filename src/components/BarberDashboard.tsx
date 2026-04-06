import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarberManagement } from './BarberManagement';
import { InventoryManagement } from './InventoryManagement';
import { FinanceManagement, Transaction, StaffMember } from './FinanceManagement';
import { StaffManagement } from './StaffManagement';
import { MessagingCenter } from './MessagingCenter';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AnalyticChart } from './ui/AnalyticChart';
import { MessageCircle, Play, Check, X, TrendingUp, LayoutDashboard, Settings, Share2, Copy, QrCode, Plus, Calendar, Package, Wallet, Users, Clock, Scissors, ChevronRight, Search, CheckCircle2, Pause, AlertCircle, LogOut, Printer, HelpCircle, MoreVertical, CreditCard, ShieldAlert, Lock, User, BarChart2, FileText, Download, Edit, Trash2, LifeBuoy, Send, Building } from 'lucide-react';


interface Appointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  date: string; // YYYY-MM-DD
  status: 'pending' | 'waiting' | 'attending' | 'finished' | 'cancelled';
  arrived?: boolean;
  staffId?: string;
  sessionId?: string;
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

const AgendaCalendarView: React.FC<{ appointments: Appointment[] }> = ({ appointments }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(getTodayStr());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1; // Adaptar a Lunes = 0

  const handlePrev = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNext = () => setCurrentMonth(new Date(year, month + 1, 1));

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const getAppointmentsForDay = (d: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return appointments.filter(a => a.date === dStr && a.status !== 'cancelled' && a.status !== 'finished');
  };

  const selectedAppointments = selectedDay ? appointments.filter(a => a.date === selectedDay && a.status !== 'cancelled' && a.status !== 'finished').sort((a,b) => a.time.localeCompare(b.time)) : [];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', background: 'rgba(16,185,129,0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)' }}>
        <Calendar size={24} color="var(--success)" />
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>Agenda a Largo Plazo</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text)' }}>Visualiza e inspecciona todas las citas programadas a futuro.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button onClick={handlePrev} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>Ant</button>
          <h3 style={{ margin: 0, textTransform: 'capitalize', fontWeight: 900, fontSize: '1.25rem' }}>{monthName}</h3>
          <button onClick={handleNext} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>Sig</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '0.5rem' }}>
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
            <div key={d} style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{d}</div>
          ))}
          {blanks.map(b => <div key={`b-${b}`} />)}
          {days.map(d => {
            const apts = getAppointmentsForDay(d);
            const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = selectedDay === dStr;
            return (
              <div 
                key={d} 
                onClick={() => setSelectedDay(dStr)}
                style={{
                  padding: '0.75rem 0.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--primary)' : apts.length > 0 ? 'rgba(245,158,11,0.1)' : 'var(--background)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                  color: isSelected ? 'black' : 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 900 : 600,
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: '1.125rem' }}>{d}</div>
                {apts.length > 0 && (
                  <div style={{ 
                    fontSize: '0.55rem', 
                    marginTop: '0.2rem', 
                    color: isSelected ? 'black' : 'var(--primary)', 
                    fontWeight: 900,
                    textTransform: 'uppercase'
                  }}>
                    {apts.length} citas
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="card" style={{ padding: '1.5rem', background: 'var(--surface)' }}>
          <h4 style={{ marginBottom: '1.5rem', fontWeight: 900, borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            Listado del {new Date(`${selectedDay}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
          </h4>
          {selectedAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              <Calendar size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No hay citas agendadas para este día.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedAppointments.map((apt, idx) => (
                <div key={apt.id} style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontWeight: 900, color: 'var(--text-muted)', fontSize: '1.25rem', opacity: 0.5 }}>{idx + 1}</div>
                    <div>
                      <h5 style={{ margin: 0, fontWeight: 900, fontSize: '1rem' }}>{apt.clientName}</h5>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{apt.service}</p>
                    </div>
                  </div>
                  <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.125rem', background: 'rgba(245,158,11,0.1)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)' }}>
                    {apt.time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const BarberDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'agenda' | 'finance' | 'inventory' | 'management' | 'staff' | 'profile' | 'customers' | 'messages'>('queue');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [regFilterType, setRegFilterType] = useState<'day' | 'week' | 'month' | 'year' | 'range'>('day');
  const [regFilterValue, setRegFilterValue] = useState(getTodayStr());
  const [regStartDate, setRegStartDate] = useState(getTodayStr());
  const [regEndDate, setRegEndDate] = useState(getTodayStr());

  // Security & Record Management
  const [showPinModal, setShowPinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [targetAptAction, setTargetAptAction] = useState<{ type: 'edit' | 'delete', apt: Appointment } | null>(null);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [verifiedPin, setVerifiedPin] = useState('');
  const [extraServices, setExtraServices] = useState<any[]>([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastProcessedTx, setLastProcessedTx] = useState<any>(null);
  const [discountPercent, setDiscountPercent] = useState(0);

  useEffect(() => {
    if (tenantId) {
      setVerifiedPin(localStorage.getItem(`myturn_pin_${tenantId}`) || '');
    }
  }, [tenantId]);

  const [userEmail, setUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [businessName, setBusinessName] = useState('Cargando...');
  const [logoUrl, setLogoUrl] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [savedCustomers, setSavedCustomers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [closingTime, setClosingTime] = useState('20:00');
  const [weeksSchedule, setWeeksSchedule] = useState<{day: string, isOpen: boolean, hours: string}[]>([]);
  const [lastAutoCloseDate, setLastAutoCloseDate] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const activityReportRef = React.useRef<HTMLDivElement>(null);
  const [upgradeCode, setUpgradeCode] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Mini-chat gadget state
  const [miniChatConvos, setMiniChatConvos] = useState<any[]>([]);
  const [miniChatSelected, setMiniChatSelected] = useState<string | null>(null);
  const [miniChatThread, setMiniChatThread] = useState<any[]>([]);
  const [miniChatReply, setMiniChatReply] = useState('');
  const [miniChatSending, setMiniChatSending] = useState(false);
  const miniChatBottomRef = React.useRef<HTMLDivElement>(null);

  const handleUpgradeWithCode = async () => {
    if (!upgradeCode) { alert('Ingresa un código.'); return; }
    setIsUpgrading(true);
    try {
      let planToApply: 'Professional' | 'Enterprise' = 'Professional';
      
      // Master Code Check
      if (upgradeCode.toUpperCase() === 'MYTURN-99X-2026') {
        planToApply = 'Professional';
      } else {
        // Check for invitation tenant codes
        const { data: invData, error: invError } = await supabase
          .from('tenants')
          .select('id, name')
          .eq('name', `Invitación: ${upgradeCode.toUpperCase()}`)
          .single();
        
        if (invError || !invData) {
          throw new Error('Código inválido o ya utilizado.');
        }
        
        planToApply = 'Professional';
        await supabase.from('tenants').delete().eq('id', invData.id);
      }

      const nextExpiry = new Date();
      nextExpiry.setDate(nextExpiry.getDate() + 30);

      const { error: updError } = await supabase
        .from('tenants')
        .update({
          plan_id: planToApply,
          expiry_date: nextExpiry.toISOString().split('T')[0],
          status: 'active'
        })
        .eq('id', tenantId);

      if (updError) throw updError;

      alert(`¡Felicidades! Tu plan ha sido actualizado a ${planToApply}.`);
      setShowUpgradeModal(false);
      window.location.reload();
    } catch (err: any) {
      alert('Error al validar código: ' + err.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const manualToggleTimeRef = React.useRef<number>(0);

  // Drag-to-scroll logic for navigation menu
  const navMenuRef = React.useRef<HTMLDivElement>(null);
  const [isDraggingNav, setIsDraggingNav] = useState(false);
  const [navStartX, setNavStartX] = useState(0);
  const [navScrollLeft, setNavScrollLeft] = useState(0);

  // Drag-to-resize gadget panel
  const [gadgetPanelWidth, setGadgetPanelWidth] = useState(260);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const dragStartXRef = React.useRef(0);
  const dragStartWidthRef = React.useRef(260);

  React.useEffect(() => {
    if (!isDraggingPanel) return;
    const onMove = (e: MouseEvent) => {
      const diff = e.clientX - dragStartXRef.current;
      const newWidth = Math.max(160, Math.min(420, dragStartWidthRef.current + diff));
      setGadgetPanelWidth(newWidth);
    };
    const onUp = () => setIsDraggingPanel(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingPanel]);

  const isMobile = windowWidth < 1024;



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
            staffId: d.staff_id || undefined,
            sessionId: d.session_id || undefined
          };
        }));
      } else {
        setAppointments([]);
      }
    };

    fetchAppointments();

    const channel = supabase.channel('realtime:appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `tenant_id=eq.${tenantId}` }, () => {
         fetchAppointments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  // 1. Resolve Tenant Identity (Only once on mount)
  useEffect(() => {
    const resolveIdentity = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        try {
          const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
          let currentTenantId = userData?.tenant_id;

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
          } else {
            setIsLoading(false); // No tenant found even after healing
          }
        } catch (error) {
          console.error("Critical identity resolver error:", error);
          setIsLoading(false); 
        }
      } else {
        setIsLoading(false); 
      }
    };
    resolveIdentity();
  }, []);

  // 2. Real-time unread messages count
  useEffect(() => {
    if (!tenantId) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_from_client', true)
        .eq('is_read', false);
      setUnreadMessages(count || 0);
    };
    fetchUnread();

    const msgChan = supabase.channel('dashboard-unread-messages')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages', 
        filter: `tenant_id=eq.${tenantId}` 
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(msgChan); };
  }, [tenantId]);

  // Mini-chat: load conversations list (uses session_id like MessagingCenter)
  useEffect(() => {
    if (!tenantId) return;
    const loadConvos = async () => {
      const { data } = await supabase
        .from('messages')
        .select('session_id, customer_name, content, created_at, is_from_client, is_read')
        .eq('tenant_id', tenantId)
        .eq('is_broadcast', false)
        .order('created_at', { ascending: false });
      if (!data) return;
      // Group by session_id: keep only latest message per session
      const map: Record<string, any> = {};
      data.forEach((m: any) => {
        if (!m.session_id) return;
        if (!map[m.session_id]) map[m.session_id] = { ...m, unread: 0 };
        if (m.is_from_client && !m.is_read) map[m.session_id].unread++;
      });
      setMiniChatConvos(Object.values(map).slice(0, 8));
    };
    loadConvos();
    const chan = supabase.channel('mini-chat-convos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `tenant_id=eq.${tenantId}` }, loadConvos)
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [tenantId]);

  // Mini-chat: load thread for selected session
  useEffect(() => {
    if (!tenantId || !miniChatSelected) return;
    const loadThread = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('session_id', miniChatSelected)
        .order('created_at', { ascending: true });
      setMiniChatThread(data || []);
      // Mark as read
      await supabase.from('messages').update({ is_read: true })
        .eq('tenant_id', tenantId).eq('session_id', miniChatSelected).eq('is_from_client', true).eq('is_read', false);
      setTimeout(() => miniChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    };
    loadThread();
    const chan = supabase.channel(`mini-chat-thread-${miniChatSelected}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `tenant_id=eq.${tenantId}` }, loadThread)
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [tenantId, miniChatSelected]);


  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 3. Load Metadata & Setup Listeners (Once tenantId is known)
  useEffect(() => {
    if (!tenantId) return;

    const loadMetadata = async () => {
      try {
        // 1. Fetch Staff (Always filter by current tenantId!)
        const { data: staffData } = await supabase
          .from('staff_members')
          .select('*')
          .eq('tenant_id', tenantId);
          
        if (staffData) {
          setStaff(staffData.map(s => ({
            id: s.id,
            name: s.name,
            role: s.role || 'Barbero',
            commission: s.commission_rate || 50,
            imageUrl: s.image_url
          })));
        }

        // 2. Fetch Services (Always filter by current tenantId!)
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('tenant_id', tenantId);

        if (servicesData) {
          setDbServices(servicesData);
          // Pre-select first service if none selected
          if (servicesData.length > 0 && !newClient.service) {
            setNewClient(prev => ({ ...prev, service: servicesData[0].name }));
          }
        }

        // 3. Fetch Tenant Info
        const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
        if (tenant) {
          setIsOpen(tenant.is_open ?? true);
          setClosingTime(tenant.closing_time || '20:00');
          if (tenant.schedule) setWeeksSchedule(tenant.schedule);
          setLastAutoCloseDate(tenant.last_auto_close_date || null);
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
      } catch (error) {
        console.error("Critical metadata loader error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetadata();

    const fetchSavedCustomers = async () => {
      const { data } = await supabase.from('saved_tenants').select('*').eq('tenant_id', tenantId);
      if (data) setSavedCustomers(data);
    };
    fetchSavedCustomers();

    // Setup Realtime Sync
    const tenantChannel = supabase.channel('tenant-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_members', filter: `tenant_id=eq.${tenantId}` }, () => {
        loadMetadata();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_tenants', filter: `tenant_id=eq.${tenantId}` }, () => {
        fetchSavedCustomers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services', filter: `tenant_id=eq.${tenantId}` }, () => {
        loadMetadata();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants', filter: `id=eq.${tenantId}` }, (payload) => {
          if (payload.new) {
            const updated = payload.new as any;
            if (updated.is_open !== undefined) setIsOpen(updated.is_open);
            if (updated.closing_time) setClosingTime(updated.closing_time);
            if (updated.schedule) setWeeksSchedule(updated.schedule);
            if (updated.last_auto_close_date !== undefined) setLastAutoCloseDate(updated.last_auto_close_date);
            if (updated.name) setBusinessName(updated.name);
            if (updated.logo !== undefined) setLogoUrl(updated.logo || '');
            if (updated.color) document.documentElement.style.setProperty('--primary', updated.color);
            if (updated.plan_id || updated.status || updated.expiry_date) {
              setSubscription(prev => prev ? ({
                ...prev,
                plan: updated.plan_id || prev.plan,
                status: updated.status || prev.status,
                expiryDate: updated.expiry_date || prev.expiryDate
              }) : null);
            }
          }
      })
      .subscribe();

    return () => { supabase.removeChannel(tenantChannel); };
  }, [tenantId]);

  // 1-Year Data Retention Cleanup
  useEffect(() => {
    if (!tenantId) return;
    const cleanupOldData = async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const isoThreshold = oneYearAgo.toISOString();
      
      try {
        const { error } = await supabase
          .from('appointments')
          .delete()
          .eq('tenant_id', tenantId)
          .lt('date_time', isoThreshold);
        
        if (error) console.log("[Cleanup] Failed or restricted:", error.message);
      } catch (e) {}
    };
    cleanupOldData();
  }, [tenantId]);

  // AUTO-CLOSE Logic: Check every minute if current time >= closingTime (Day-specific)
  useEffect(() => {
    // Only run when metadata is fully loaded and business is currently open
    // BUT SKIP if a manual open happened in the last 10 minutes (Session guard)
    if (!tenantId || isOpen !== true || !weeksSchedule.length) return;
    
    if (Date.now() - manualToggleTimeRef.current < 600000) { // 10 minute grace
       console.log("[AutoClose] Session-level manual override is active. Skipping check.");
       return;
    }

    const checkAutoClose = async () => {
      const now = new Date();
      // YYYY-MM-DD local
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      // 1. Skip if already auto-closed today (Manual override support)
      const localLastClose = localStorage.getItem(`myturn_last_autoclose_${tenantId}`);
      
      if (lastAutoCloseDate === todayStr || localLastClose === todayStr) {
        // console.log(`[AutoClose] Already auto-closed today. Manual overrides are now respected.`);
        return;
      }

      // 2. Normalizar día de la semana (Español, sin acentos)
      const normalize = (s: string) => (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const todayInSpanish = dayNames[now.getDay()];
      const todayNormalized = normalize(todayInSpanish);
      
      // 3. Find today's schedule with normalization (and fallback to English matching if needed)
      const dayNamesEng = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayNormalizedEng = dayNamesEng[now.getDay()];

      const todaySched = weeksSchedule.find(s => {
        const schedDay = normalize(s.day);
        return schedDay === todayNormalized || schedDay === todayNormalizedEng;
      });
      
      // 4. Identify target closing time
      let targetClosingTime = null;
      
      if (todaySched && todaySched.isOpen && todaySched.hours) {
        const timeRegex = /(\d{2}:\d{2})\s*$/;
        const match = todaySched.hours.match(timeRegex);
        if (match) targetClosingTime = match[1];
      }

      const currentStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      console.log(`[AutoClose] Checking: Day=${todayNormalized}, ScheduleTime=${targetClosingTime}, LocalTime=${currentStr}`);

      if (!targetClosingTime) return;
      
      // We close if it's STRICTLY PAST the closing time (e.g. if close is 22:27, we close at 22:28)
      // to give a 1-minute buffer for users setting the time "now".
      if (currentStr > targetClosingTime) {
        console.warn(`[AutoClose] CLOSING BUSINESS: ${currentStr} > ${targetClosingTime}`);
        
        setIsOpen(false);
        setLastAutoCloseDate(todayStr);
        localStorage.setItem(`myturn_last_autoclose_${tenantId}`, todayStr);
        
        try {
          await supabase.from('tenants').update({ 
            is_open: false, 
            last_auto_close_date: todayStr 
          }).eq('id', tenantId);
        } catch (e) {
          console.error("[AutoClose] DB update failed, falling back to local state only.", e);
          // Fallback: still try to update is_open at least
          await supabase.from('tenants').update({ is_open: false }).eq('id', tenantId);
        }
      }
    };

    // Buffer to avoid race conditions with loading
    const timeout = setTimeout(() => {
      const interval = setInterval(checkAutoClose, 60000);
      checkAutoClose();
      return () => clearInterval(interval);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [tenantId, isOpen, closingTime, weeksSchedule, lastAutoCloseDate]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', service: '', staffId: '', time: '' });
  const [copied, setCopied] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseElapsed, setPauseElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPaused) {
      const startTimeStr = localStorage.getItem('tenant_pause_start');
      let startTime = startTimeStr ? parseInt(startTimeStr) : Date.now();
      if (!startTimeStr) {
        localStorage.setItem('tenant_pause_start', startTime.toString());
      }
      interval = setInterval(() => {
        setPauseElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setPauseElapsed(0);
      localStorage.removeItem('tenant_pause_start');
    }
    return () => clearInterval(interval);
  }, [isPaused]);
  const [activeTimer, setActiveTimer] = useState(25 * 60); // Seconds left for current client
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAptForComplete, setSelectedAptForComplete] = useState<Appointment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'credito'>('efectivo');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load Transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (data) {
        setTransactions(data.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          method: t.payment_method,
          category: t.category,
          description: t.description,
          subtotal: t.subtotal || t.amount,
          discountPercent: t.discount_percent || 0,
          date: new Date(t.created_at).toISOString().split('T')[0],
          staffId: t.staff_id
        })));
      }
    };
    fetchTransactions();
  }, [tenantId]);

  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportTicket, setSupportTicket] = useState({ category: 'Avería', message: '' });
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const handleSendTicket = async () => {
    if (!supportTicket.message.trim()) { alert('Por favor, describe el problema.'); return; }
    setIsSubmittingTicket(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        tenant_id: tenantId,
        account_type: subscription?.plan,
        category: supportTicket.category,
        message: supportTicket.message,
        status: 'open'
      });
      if (error) throw error;
      alert('¡Ticket enviado! Nuestro equipo lo revisará pronto.');
      setShowSupportModal(false);
      setSupportTicket({ category: 'Avería', message: '' });
    } catch (err: any) {
      alert('Error al enviar ticket: ' + err.message);
    } finally {
      setIsSubmittingTicket(false);
    }
  };



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
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
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
    if (!newClient.name) {
      alert("Por favor, ingresa el nombre del cliente.");
      return;
    }
    if (!newClient.time) {
      // If time is missing, default to NOUN (current time) for Walk-ins
      const now = new Date();
      const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      newClient.time = defaultTime;
    }

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

    const [hStr, mStr] = newClient.time.split(':');
    let hourForDb = Number(hStr);
    let minForDb = Number(mStr);
    let newTime = newClient.time;

    const [year, month, day] = selectedDate.split('-').map(Number);
    const aptDate = new Date(year, month - 1, day);
    aptDate.setHours(hourForDb, minForDb, 0, 0);

    const selectedService = dbServices.find(s => s.name === newClient.service);
    const serviceName = selectedService ? selectedService.name : newClient.service;

    const serviceObj = dbServices.find(s => s.name === newClient.service);
    if (!serviceObj) return;

    const dbPayload = {
      tenant_id: tenantId,
      client_name: newClient.name,
      service_id: serviceObj.id,
      date_time: aptDate.toISOString(),
      status: 'waiting',
      staff_id: newClient.staffId || null,
      source: 'walkin'
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

    const firstService = dbServices[0]?.name || 'Servicio';
    setNewClient({ name: '', service: firstService, staffId: '', time: '' });
    setShowAddForm(false);
  };

  const moveUp = async (idx: number) => {
    // Find the waiting appointments for the selected date sorted as displayed
    const waitingToday = appointments.filter(a => a.date === selectedDate && a.status !== 'finished' && a.status !== 'cancelled');
    if (idx <= 0) return; // already at top
    const current = waitingToday[idx];
    const prev = waitingToday[idx - 1];
    if (!current || !prev || prev.status === 'attending') return; // can't swap past the person being attended

    // Fetch the raw state of waiting clients from the database to cascade times
    const { data: allWaiting } = await supabase
      .from('appointments')
      .select('id, date_time, service_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'waiting')
      .in('id', waitingToday.map(a => a.id))
      .order('date_time', { ascending: true });
    
    if (!allWaiting || allWaiting.length === 0) return;

    const reordered = [...allWaiting];
    const currIdx = reordered.findIndex(a => a.id === current.id);
    const prevIdx = reordered.findIndex(a => a.id === prev.id);
    if (currIdx === -1 || prevIdx === -1) return;

    // The new base time will be the original time of the slot we are moving INTO (prevIdx).
    let baseTime = new Date(allWaiting[prevIdx].date_time);

    // Swap positions
    const temp = reordered[currIdx];
    reordered[currIdx] = reordered[prevIdx];
    reordered[prevIdx] = temp;

    // Apply cascade recalculation for the affected items and ALL ITEMS that follow it
    const updates = [];
    for (let i = prevIdx; i < reordered.length; i++) {
        const apt = reordered[i];
        
        // Add minimal offsets (milliseconds) to ensure precise DB sorting 
        const newTime = new Date(baseTime.getTime() + i); 
        updates.push(supabase.from('appointments').update({ date_time: newTime.toISOString() }).eq('id', apt.id));
        
        // Add this item's service time so the next person in loop starts at correct offset
        const service = dbServices.find(s => s.id === apt.service_id);
        const durationMins = service ? (service.duration_minutes || 30) : 30;
        baseTime = new Date(baseTime.getTime() + durationMins * 60000);
    }

    await Promise.all(updates);
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

  const getFilteredApts = () => {
    if (!tenantId) return [];
    return appointments.filter(a => {
      if (a.status !== 'finished') return false;
      if (regFilterType === 'day') return a.date === regFilterValue;
      if (regFilterType === 'week') {
        const d = new Date(regFilterValue + 'T00:00:00');
        const day = d.getDay(); 
        const diffToMon = (day === 0 ? -6 : 1) - day;
        const mon = new Date(d); mon.setDate(d.getDate() + diffToMon);
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        const monStr = mon.toISOString().split('T')[0];
        const sunStr = sun.toISOString().split('T')[0];
        return a.date >= monStr && a.date <= sunStr;
      }
      if (regFilterType === 'month') return a.date.startsWith(regFilterValue);
      if (regFilterType === 'year') return a.date.startsWith(regFilterValue.substring(0, 4));
      if (regFilterType === 'range') return a.date >= regStartDate && a.date <= regEndDate;
      return false;
    });
  };

  const getFilteredTxs = (type: 'ingreso' | 'egreso') => {
    if (!tenantId) return [];
    return transactions.filter(t => {
      if (t.type !== type) return false;
      if (regFilterType === 'day') return t.date === regFilterValue;
      if (regFilterType === 'week') {
        const d = new Date(regFilterValue + 'T00:00:00');
        const day = d.getDay(); 
        const diffToMon = (day === 0 ? -6 : 1) - day;
        const mon = new Date(d); mon.setDate(d.getDate() + diffToMon);
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        const monStr = mon.toISOString().split('T')[0];
        const sunStr = sun.toISOString().split('T')[0];
        return t.date >= monStr && t.date <= sunStr;
      }
      if (regFilterType === 'month') return t.date.startsWith(regFilterValue);
      if (regFilterType === 'year') return t.date.startsWith(regFilterValue.substring(0, 4));
      if (regFilterType === 'range') return t.date >= regStartDate && t.date <= regEndDate;
      return false;
    });
  };

  const downloadReport = () => {
    const filtered = getFilteredApts();
    if (filtered.length === 0) {
      alert("No hay datos para exportar en este periodo.");
      return;
    }

    const headers = ["Fecha", "Cliente", "Servicio", "Profesional", "Hora"];
    const rows = filtered.map(a => [
      a.date,
      a.clientName,
      a.service,
      staff.find(s => s.id === a.staffId)?.name || 'N/A',
      a.time
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const fileNameSuffix = regFilterType === 'range' ? `${regStartDate}_a_${regEndDate}` : regFilterValue;
    link.setAttribute("download", `reporte_myturn_${fileNameSuffix}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    const filtered = getFilteredApts();
    if (filtered.length === 0) {
      alert("No hay datos para imprimir.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Reporte MyTurn</title>
          <style>
            @media print { @page { margin: 0; } }
            body { 
              font-family: 'Inter', -apple-system, sans-serif; 
              margin: 0; 
              padding: 5mm; 
              color: black; 
              background: white; 
            }
            .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 15px; }
            h1 { font-size: 1.2rem; font-weight: 900; margin: 0; text-transform: uppercase; }
            .report-title { font-size: 0.9rem; font-weight: 800; margin: 5px 0; border: 1px solid black; display: inline-block; padding: 2px 10px; }
            .meta { font-size: 0.7rem; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { text-align: left; background: #eee; padding: 8px; border: 1px solid black; font-size: 10px; text-transform: uppercase; }
            td { padding: 8px; border: 1px solid black; font-size: 11px; }
            .total-row { font-weight: 900; background: #f0f0f0; }
            .footer { margin-top: 30px; font-size: 9px; text-align: center; border-top: 1px solid black; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${businessName}</h1>
            <div class="report-title">REPORTE DE ACTIVIDAD</div>
            <div class="meta">Periodo: <strong>${
              regFilterType === 'day' ? regFilterValue : 
              regFilterType === 'month' ? regFilterValue : 
              regFilterType === 'year' ? 'Año ' + regFilterValue : 
              regFilterType === 'range' ? 'De ' + regStartDate + ' a ' + regEndDate :
              'Periodo Seleccionado'
            }</strong></div>
            <div class="meta">Generado: ${new Date().toLocaleString()}</div>
            <div class="meta" style="color: #ef4444; font-weight: bold;">Cancelaciones en el periodo: ${appointments.filter(a => a.status === 'cancelled' && (
              regFilterType === 'day' ? a.date === regFilterValue :
              regFilterType === 'month' ? a.date.startsWith(regFilterValue) :
              regFilterType === 'year' ? a.date.startsWith(regFilterValue.substring(0, 4)) :
              regFilterType === 'range' ? (a.date >= regStartDate && a.date <= regEndDate) : true
            )).length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Empleado</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(a => `
                <tr>
                  <td>${a.date}</td>
                  <td>${a.clientName}</td>
                  <td>${a.service}</td>
                  <td>${staff.find(st => st.id === a.staffId)?.name || 'N/A'}</td>
                  <td>$${Number(dbServices.find(s => s.name === a.service)?.price || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4" style="text-align: right">TOTAL ACUMULADO:</td>
                <td>$${filtered.reduce((sum, a) => sum + Number(dbServices.find(s => s.name === a.service)?.price || 0), 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <p>Generado por MyTurn SaaS - Inteligencia para tu negocio</p>
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

  const downloadActivityPDF = async () => {
    if (!activityReportRef.current) return;
    try {
      const element = activityReportRef.current;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Reporte_Actividad_${getTodayStr()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el PDF");
    }
  };

  const downloadAgendaReport = () => {
    if (!tenantId) return;
    const filtered = appointments.filter(a => {
      // Exclude cancelled and finished (since finished is history/activity)
      // They want "agenda registrada" for the month/period
      if (a.status === 'cancelled' || a.status === 'finished') return false;
      if (regFilterType === 'day') return a.date === regFilterValue;
      if (regFilterType === 'week') {
        const d = new Date(regFilterValue + 'T00:00:00');
        const day = d.getDay(); 
        const diffToMon = (day === 0 ? -6 : 1) - day;
        const mon = new Date(d); mon.setDate(d.getDate() + diffToMon);
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        const monStr = mon.toISOString().split('T')[0];
        const sunStr = sun.toISOString().split('T')[0];
        return a.date >= monStr && a.date <= sunStr;
      }
      if (regFilterType === 'month') return a.date.startsWith(regFilterValue);
      if (regFilterType === 'year') return a.date.startsWith(regFilterValue.substring(0, 4));
      if (regFilterType === 'range') return a.date >= regStartDate && a.date <= regEndDate;
      return false;
    });

    if (filtered.length === 0) {
      alert("No hay citas programadas para exportar en el periodo seleccionado.");
      return;
    }

    const headers = ["Fecha", "Hora", "Cliente", "Servicio", "Profesional Asignado", "Estado"];
    const rows = filtered.map(a => [
      a.date,
      a.time,
      `"${a.clientName}"`,
      `"${a.service}"`,
      staff.find(s => s.id === a.staffId)?.name || 'Cualquiera',
      a.status === 'waiting' ? (a.arrived ? 'En Local' : 'Pendiente') : a.status === 'attending' ? 'Atendiendo' : a.status === 'finished' ? 'Finalizado' : 'Cancelado'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const fileNameSuffix = regFilterType === 'range' ? `${regStartDate}_a_${regEndDate}` : regFilterValue;
    link.setAttribute("download", `agenda_programada_${fileNameSuffix}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const addExtraService = (service: any) => {
    setExtraServices([...extraServices, service]);
  };

  const removeExtraService = (index: number) => {
    setExtraServices(extraServices.filter((_, i) => i !== index));
  };

  const finalizeService = async () => {
    if (!selectedAptForComplete) return;
    
    try {
      // 1. Dynamic Pricing from All Services
      const mainServiceObj = dbServices.find(s => s.name === selectedAptForComplete.service);
      let totalAmount = mainServiceObj ? Number(mainServiceObj.price) : 25;
      
      // Add extra services
      extraServices.forEach(s => {
        totalAmount += Number(s.price);
      });

      const discountAmount = totalAmount * (discountPercent / 100);
      const finalAmount = totalAmount - discountAmount;

      const allServiceNames = [selectedAptForComplete.service, ...extraServices.map(s => s.name)].join(', ');
      
      // 2. Insert Transaction
      const { data: tx, error: txError } = await supabase.from('transactions').insert({
        tenant_id: tenantId,
        appointment_id: selectedAptForComplete.id,
        amount: finalAmount,
        subtotal: totalAmount,
        discount_percent: discountPercent,
        type: 'ingreso',
        payment_method: paymentMethod,
        staff_id: selectedAptForComplete.staffId || null,
        category: allServiceNames,
        description: `Cliente: ${selectedAptForComplete.clientName}${discountPercent > 0 ? ` (Dcto ${discountPercent}%)` : ''}`
      }).select().single();

      if (txError) throw txError;

      // 3. Automatic Inventory Deduction
      try {
        // Update inventory if applicable
        const { data: invItems } = await supabase
          .from('inventory')
          .select('*')
          .eq('tenant_id', tenantId);
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
                .eq('tenant_id', tenantId)
                .eq('id', item.id);
            }
          }
        }
      } catch (invErr) {
        console.warn("Inventory deduction failed, but proceeding:", invErr);
      }

      // 4. Mark Appointment as Finished
      await supabase.from('appointments').update({ status: 'finished' }).eq('id', selectedAptForComplete.id);
      
      if (appointments) {
        setAppointments(appointments.filter((a: Appointment) => a.id !== selectedAptForComplete.id));
      }
      
      const newTxForState = {
        id: tx.id,
        type: 'ingreso' as const,
        amount: finalAmount,
        subtotal: totalAmount,
        discountPercent: discountPercent,
        method: paymentMethod as any,
        category: allServiceNames,
        description: `Cliente: ${selectedAptForComplete.clientName}`,
        date: getTodayStr(),
        staffId: selectedAptForComplete.staffId
      };
      
      setTransactions([newTxForState, ...transactions]);
      
      // 6. Open Receipt Modal
      setLastProcessedTx({
        ...newTxForState,
        clientName: selectedAptForComplete.clientName,
        mainService: selectedAptForComplete.service,
        mainPrice: mainServiceObj ? Number(mainServiceObj.price) : 25,
        extras: extraServices,
        sessionId: selectedAptForComplete.sessionId,
        discountPercent,
        subtotal: totalAmount
      });
      
      setShowReceiptModal(true);
      setShowCompleteModal(false);
      setExtraServices([]);
      setSelectedAptForComplete(null);
      setPaymentMethod('efectivo');
      setDiscountPercent(0);
    } catch (err: any) {
      console.error("Finalize error:", err);
      alert("Error al finalizar el cobro: " + (err.message || "Error desconocido"));
    }
  };

  const sendReceiptToChat = async () => {
    if (!lastProcessedTx || !lastProcessedTx.sessionId || !tenantId) {
      alert("No se pudo identificar el chat del cliente para enviar el recibo.");
      return;
    }

    try {
      const extrasText = lastProcessedTx.extras?.map((ex: any) => `- ${ex.name}: $${ex.price}`).join('\n') || '';
      const receiptContent = `📄 *RECIBO DIGITAL*\n\n` +
        `Cliente: ${lastProcessedTx.clientName}\n` +
        `Servicio: ${lastProcessedTx.mainService} ($${lastProcessedTx.mainPrice})\n` +
        (extrasText ? `Extras:\n${extrasText}\n` : '') +
        `-------------------\n` +
        `TOTAL: $${lastProcessedTx.amount.toFixed(2)}\n\n` +
        `¡Gracias por tu preferencia!`;

      const { error } = await supabase.from('messages').insert({
        tenant_id: tenantId,
        session_id: lastProcessedTx.sessionId,
        content: receiptContent,
        is_from_client: false,
        customer_name: lastProcessedTx.clientName
      });

      if (error) throw error;
      alert("✅ Recibo enviado al chat del cliente.");
    } catch (err: any) {
      console.error("Send chat error:", err);
      alert("Error al enviar al chat: " + (err.message || "Error desconocido"));
    }
  };

   return (
    <div className={`animate-fade-in ${isMobile ? 'stack-on-mobile' : ''}`} style={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row', 
      gap: isMobile ? '1rem' : '2rem', 
      position: 'relative',
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden',
      paddingLeft: isMobile ? '0' : '0.5rem'
    }}>
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
        <section style={{ 
          width: isMobile ? '100%' : `${gadgetPanelWidth}px`,
          minWidth: isMobile ? undefined : '160px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {/* Desktop Left-Side Gadgets - Stacked Vertically */}
            {!isMobile && (activeTab === 'queue' || activeTab === 'agenda') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                <div className="card" style={{ flex: 1, margin: 0 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={18} color="var(--primary)" /> Rendimiento
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                    <div>
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>Pasados / Hoy</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                        <span style={{ color: 'var(--success)' }}>{appointments.filter((a: Appointment) => a.date === selectedDate && a.status === 'finished').length}</span>
                        <span style={{ opacity: 0.3, margin: '0 0.4rem' }}>/</span>
                        {appointments.filter((a: Appointment) => a.date === selectedDate).length}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>Ganancia Hoy</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                        ${transactions.filter(t => t.date === selectedDate && t.type === 'ingreso').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                       <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.15rem' }}>ESTADO</p>
                          <p style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--success)' }}>Activo</p>
                       </div>
                    </div>
                  </div>
                </div>

                {(() => {
                  const finishedToday = appointments.filter((a: Appointment) => a.date === selectedDate && a.status === 'finished').length;
                  const totalToday = appointments.filter((a: Appointment) => a.date === selectedDate).length;
                  const cancelledToday = appointments.filter((a: Appointment) => a.date === selectedDate && a.status === 'cancelled').length;
                  const incomeToday = transactions.filter(t => t.date === selectedDate && t.type === 'ingreso').reduce((acc, t) => acc + t.amount, 0);
                  const getMessage = () => {
                    if (totalToday === 0) return "¡Día nuevo! Asegúrate de que tus clientes tengan tu enlace.";
                    if (cancelledToday > 2) return `Atención: Hoy has tenido ${cancelledToday} cancelaciones.`;
                    if (incomeToday > 200) return "¡Vaya ritmo llevas! Tus ingresos de hoy están por encima del promedio.";
                    if (finishedToday === totalToday && totalToday > 0) return "¡Agenda completada! Has atendido a todos tus clientes.";
                    return "Consejo: Revisa tu 'Reporte de Actividad' para ver tus horas productivas.";
                  };
                  return (
                    <div className="card" style={{ flex: 1, margin: 0, background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#000', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1rem' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>✨ Asistente MyTurn</h3>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.9, margin: 0 }}>"{getMessage()}"</p>
                    </div>
                  );
                })()}

                {/* Mini-Chat Gadget */}
                <div className="card" style={{ margin: 0, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MessageCircle size={15} color="var(--primary)" />
                      Chat Rápido
                      {unreadMessages > 0 && (
                        <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.45rem', lineHeight: 1.4 }}>{unreadMessages}</span>
                      )}
                    </h3>
                    {miniChatSelected && (
                      <button onClick={() => { setMiniChatSelected(null); setMiniChatThread([]); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>← Volver</button>
                    )}
                  </div>

                  {!miniChatSelected ? (
                    /* Conversations list */
                    <div style={{ overflowY: 'auto', maxHeight: '220px' }}>
                      {miniChatConvos.length === 0 ? (
                        <p style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>Sin mensajes aún</p>
                      ) : miniChatConvos.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => setMiniChatSelected(c.session_id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.6rem 1rem', cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            background: c.unread > 0 ? 'rgba(var(--primary-rgb, 245,158,11),0.07)' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                        >
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                            {(c.customer_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: c.unread > 0 ? 800 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.customer_name || 'Cliente'}</p>
                            <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.is_from_client ? '' : 'Tú: '}{c.content}
                            </p>
                          </div>
                          {c.unread > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', fontSize: '0.6rem', fontWeight: 800, padding: '0.1rem 0.4rem' }}>{c.unread}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Thread view */
                    <div style={{ display: 'flex', flexDirection: 'column', height: '260px' }}>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {miniChatThread.map((msg, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: msg.is_from_client ? 'flex-start' : 'flex-end' }}>
                            <div style={{
                              maxWidth: '80%', padding: '0.4rem 0.7rem',
                              borderRadius: msg.is_from_client ? '0 12px 12px 12px' : '12px 0 12px 12px',
                              background: msg.is_from_client ? 'var(--surface-hover)' : 'var(--primary)',
                              color: msg.is_from_client ? 'var(--text)' : '#000',
                              fontSize: '0.72rem', lineHeight: 1.4
                            }}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        <div ref={miniChatBottomRef} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                        <input
                          value={miniChatReply}
                          onChange={e => setMiniChatReply(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && !e.shiftKey && miniChatReply.trim() && !miniChatSending) {
                              e.preventDefault();
                              setMiniChatSending(true);
                              await supabase.from('messages').insert({ tenant_id: tenantId, session_id: miniChatSelected, content: miniChatReply.trim(), is_from_client: false, is_read: true });
                              setMiniChatReply('');
                              setMiniChatSending(false);
                            }
                          }}
                          placeholder="Escribe y presiona Enter…"
                          style={{ flex: 1, background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.6rem', fontSize: '0.72rem', color: 'var(--text)', outline: 'none' }}
                        />
                        <button
                          disabled={miniChatSending || !miniChatReply.trim()}
                          onClick={async () => {
                            if (!miniChatReply.trim() || miniChatSending) return;
                            setMiniChatSending(true);
                            await supabase.from('messages').insert({ tenant_id: tenantId, session_id: miniChatSelected, content: miniChatReply.trim(), is_from_client: false, is_read: true });
                            setMiniChatReply('');
                            setMiniChatSending(false);
                          }}
                          style={{ background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.6rem', cursor: 'pointer', color: '#000', opacity: miniChatSending ? 0.6 : 1 }}
                        >
                          <Send size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
        </section>

        {/* Drag Handle — desktop only */}
        {!isMobile && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              dragStartXRef.current = e.clientX;
              dragStartWidthRef.current = gadgetPanelWidth;
              setIsDraggingPanel(true);
            }}
            style={{
              width: '8px',
              flexShrink: 0,
              cursor: 'col-resize',
              background: isDraggingPanel ? 'var(--primary)' : 'transparent',
              borderRadius: '4px',
              transition: 'background 0.2s',
              alignSelf: 'stretch',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Arrastra para redimensionar"
          >
            <div style={{
              width: '2px',
              height: '40px',
              background: 'var(--border)',
              borderRadius: '2px'
            }} />
          </div>
        )}

      <main style={{ flex: 1, padding: isMobile ? '0.5rem 0' : '0 2rem 2rem 0', height: 'calc(100vh - 80px)', overflowY: 'auto', position: 'relative', minWidth: 0 }}>
        
        {/* Open/Close + Pause buttons — above nav tabs, left-aligned */}
        {(activeTab === 'queue' || activeTab === 'agenda') && (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem', padding: isMobile ? '0 1rem' : '0' }}>
            <button 
              className={`btn ${isOpen ? 'btn-primary' : 'btn-outline'}`}
              onClick={async () => {
                const newState = !isOpen;
                setIsOpen(newState);
                if (newState) { manualToggleTimeRef.current = Date.now(); }
                await supabase.from('tenants').update({ is_open: newState }).eq('id', tenantId);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-md)',
                border: `1px solid ${isOpen ? 'var(--success)' : '#ef4444'}`,
                background: isOpen ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                color: isOpen ? 'var(--success)' : '#ef4444',
                fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOpen ? 'var(--success)' : '#ef4444', ...(isOpen ? { animation: 'pulse 2s infinite' } : {}) }} />
              {isOpen ? 'ABIERTO' : 'CERRADO'}
            </button>
            <button 
              style={{ 
                padding: '0.4rem 1.2rem', fontSize: '0.8rem',
                background: isPaused ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                border: '1px solid var(--primary)', color: isPaused ? 'var(--primary)' : 'var(--text)',
                fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem',
                borderRadius: 'var(--radius-md)', cursor: 'pointer'
              }}
              onClick={async () => {
                const newPaused = !isPaused;
                setIsPaused(newPaused);
                if (tenantId) await supabase.from('tenants').update({ is_paused: newPaused }).eq('id', tenantId);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isPaused ? 'var(--primary)' : 'transparent', border: isPaused ? 'none' : '1px solid var(--text-muted)' }} />
                PAUSAR {isPaused ? 'ON' : 'OFF'}
              </div>
              {isPaused && (
                <span style={{ color: 'var(--primary)', fontFamily: 'monospace', fontSize: '0.85rem', marginLeft: '0.3rem', background: 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                  {String(Math.floor(pauseElapsed / 60)).padStart(2, '0')}:{String(pauseElapsed % 60).padStart(2, '0')}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Navigation Menu (Frameless Scrollable) */}
        <div 
          ref={navMenuRef}
          onMouseDown={(e) => {
            setIsDraggingNav(true);
            setNavStartX(e.pageX - (navMenuRef.current?.offsetLeft || 0));
            setNavScrollLeft(navMenuRef.current?.scrollLeft || 0);
          }}
          onMouseLeave={() => setIsDraggingNav(false)}
          onMouseUp={() => setIsDraggingNav(false)}
          onMouseMove={(e) => {
            if (!isDraggingNav) return;
            e.preventDefault();
            const x = e.pageX - (navMenuRef.current?.offsetLeft || 0);
            const walk = (x - navStartX) * 1.5; // Scroll-fast multiplier
            if (navMenuRef.current) {
              navMenuRef.current.scrollLeft = navScrollLeft - walk;
            }
          }}
          style={{ 
            display: 'flex', 
            gap: '0.6rem', 
            overflowX: 'auto', 
            paddingBottom: '0.5rem', 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            width: '100%',
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            padding: isMobile ? '0.25rem 1rem 1rem' : '0 0 1rem 0',
            marginBottom: '0.5rem',
            cursor: isDraggingNav ? 'grabbing' : 'grab'
          }}
        >
          <button 
            className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => handleTabClick('queue')}
            style={{ 
              padding: '0.6rem 1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              border: activeTab === 'queue' ? 'none' : '1px solid var(--border)', 
              background: activeTab === 'queue' ? 'var(--primary)' : 'var(--surface)', 
              color: activeTab === 'queue' ? 'black' : 'var(--text)', 
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              flexShrink: 0,
              fontWeight: 800,
              transition: 'all 0.2s'
            }}
          >
            <LayoutDashboard size={18} />
            <span>Cola</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'agenda' ? 'active' : ''}`}
            onClick={() => handleTabClick('agenda')}
            style={{ 
              padding: '0.6rem 1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              border: activeTab === 'agenda' ? 'none' : '1px solid var(--border)', 
              background: activeTab === 'agenda' ? 'var(--primary)' : 'var(--surface)', 
              color: activeTab === 'agenda' ? 'black' : 'var(--text)', 
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              flexShrink: 0,
              fontWeight: 800,
              transition: 'all 0.2s'
            }}
          >
            <Calendar size={18} />
            <span>Agenda</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => handleTabClick('inventory')}
            style={{ 
              padding: '0.6rem 1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              border: activeTab === 'inventory' ? 'none' : '1px solid var(--border)', 
              background: activeTab === 'inventory' ? 'var(--primary)' : 'var(--surface)', 
              color: activeTab === 'inventory' ? 'black' : 'var(--text)', 
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              flexShrink: 0,
              fontWeight: 800,
              transition: 'all 0.2s'
            }}
          >
            <Package size={18} />
            <span>Inventario</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'finance' ? 'active' : ''}`}
            onClick={() => handleTabClick('finance')}
            style={{ 
              padding: '0.6rem 1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              border: activeTab === 'finance' ? 'none' : '1px solid var(--border)', 
              background: activeTab === 'finance' ? 'var(--primary)' : 'var(--surface)', 
              color: activeTab === 'finance' ? 'black' : 'var(--text)', 
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              flexShrink: 0,
              fontWeight: 800,
              transition: 'all 0.2s'
            }}
          >
            <Wallet size={18} />
            <span>Finanzas</span>
            {subscription?.plan === 'Free' && <Lock size={12} style={{marginLeft: '4px'}} />}
          </button>
          <button 
            className={`nav-item ${activeTab === 'management' ? 'active' : ''}`}
            onClick={() => handleTabClick('management')}
            style={{ 
              padding: '0.6rem 1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              border: activeTab === 'management' ? 'none' : '1px solid var(--border)', 
              background: activeTab === 'management' ? 'var(--primary)' : 'var(--surface)', 
              color: activeTab === 'management' ? 'black' : 'var(--text)', 
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              flexShrink: 0,
              fontWeight: 800,
              transition: 'all 0.2s'
            }}
          >
            <Settings size={18} />
            <span>Local</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => handleTabClick('customers')}
            style={{ 
              padding: '0.6rem 1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              border: activeTab === 'customers' ? 'none' : '1px solid var(--border)', 
              background: activeTab === 'customers' ? 'var(--primary)' : 'var(--surface)', 
              color: activeTab === 'customers' ? 'black' : 'var(--text)', 
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              flexShrink: 0,
              fontWeight: 800,
              transition: 'all 0.2s'
            }}
          >
            <BarChart2 size={18} />
            <span>Reporte</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => handleTabClick('messages')}
            style={{ 
              padding: '0.6rem 1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              border: activeTab === 'messages' ? 'none' : '1px solid var(--border)', 
              background: activeTab === 'messages' ? 'var(--primary)' : 'var(--surface)', 
              color: activeTab === 'messages' ? 'black' : 'var(--text)', 
              cursor: 'pointer',
              position: 'relative',
              borderRadius: 'var(--radius-md)',
              flexShrink: 0,
              fontWeight: 800,
              transition: 'all 0.2s'
            }}
          >
            <MessageCircle size={18} />
            <span>Mensajería</span>
            {unreadMessages > 0 && (
              <span style={{ background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 900, padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-full)', marginLeft: '4px' }}>
                {unreadMessages}
              </span>
            )}
          </button>
        </div>
        
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

        {activeTab === 'queue' && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
            display: 'flex', 
            gap: '0.6rem', 
            overflowX: 'auto', 
            paddingBottom: '0.5rem', 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            width: '100%',
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
              const date = new Date();
              date.setDate(date.getDate() + offset);
              const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const dStr = String(date.getDate()).padStart(2, '0');
              const dateStr = `${y}-${m}-${dStr}`;
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
          <div style={{ padding: '0 0.5rem', marginTop: '0.4rem', marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {selectedDate === getTodayStr() ? '📅 HOY' : `📅 ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
            </p>
          </div>
        </div>
      )}

        {activeTab === 'queue' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    const now = new Date();
                    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    setNewClient(prev => ({ 
                      ...prev, 
                      time: hhmm,
                      service: prev.service || (dbServices.length > 0 ? dbServices[0].name : '')
                    }));
                    setShowAddForm(!showAddForm);
                  }}
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
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>HORA</label>
                    <input 
                      type="time" 
                      value={newClient.time}
                      onChange={(e) => setNewClient({...newClient, time: e.target.value})}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
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
            
            {(() => {
              const pendingAppointments = appointments.filter(a => a.date === selectedDate && a.status === 'pending');
              const missedAppointments = appointments.filter(a => a.date < getTodayStr() && a.status === 'waiting');
              
              return (
                <>
                  {pendingAppointments.length > 0 && (
                    <div className="card animate-fade-in" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid var(--success)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', fontWeight: 800, fontSize: '0.9rem' }}>
                        <Clock size={20} />
                        <span>Tienes {pendingAppointments.length} cita(s) pendiente(s) por confirmar</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {pendingAppointments.map(pend => (
                          <div key={pend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <div>
                              <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{pend.clientName}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{pend.date} {pend.time} - {pend.service}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                className="btn" 
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: '#ef4444', border: '1px solid #ef4444', background: 'transparent' }}
                                onClick={async () => {
                                   await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', pend.id);
                                }}
                              >
                                <X size={14} /> Rechazar
                              </button>
                              <button 
                                className="btn btn-success" 
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                onClick={async () => {
                                   await supabase.from('appointments').update({ status: 'waiting' }).eq('id', pend.id);
                                }}
                              >
                                <Check size={14} /> Aprobar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {missedAppointments.length > 0 && selectedDate === getTodayStr() && (
                    <div className="card animate-fade-in" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid var(--primary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', fontWeight: 800, fontSize: '0.9rem' }}>
                      <AlertCircle size={20} />
                      <span>Tienes {missedAppointments.length} cita(s) perdida(s) de días anteriores</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {missedAppointments.map(miss => (
                        <div key={miss.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                          <div>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{miss.clientName}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{miss.date} - {miss.service}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                              onClick={() => setActiveTab('messages')}
                            >
                              <MessageCircle size={14} /> Mensaje
                            </button>
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: 'black' }}
                              onClick={async () => {
                                 // Re-schedule for today with priority
                                 const today = getTodayStr();
                                 const [year, month, day] = today.split('-').map(Number);
                                 const aptDate = new Date(year, month - 1, day);
                                 // Set to just a few minutes before now to give it top priority so it sorts top in 'date_time' order
                                 aptDate.setHours(new Date().getHours(), new Date().getMinutes() - 10, 0, 0);
                                 await supabase.from('appointments').update({ date_time: aptDate.toISOString() }).eq('id', miss.id);
                                 alert("Cita reagendada para hoy con prioridad.");
                              }}
                            >
                              Dar Prioridad Hoy
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                </>
              );
            })()}
            
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
                }).map((apt: Appointment, idx: number) => {
                  const isToday = selectedDate === getTodayStr();
                  const isCancelled = apt.status === 'cancelled';
                  
                  // For numbering, only count active ones (#1, #2...)
                  // We find the index among NON-cancelled and NON-finished appointments for today
                  const activeItems = appointments.filter(a => 
                    a.date === selectedDate && 
                    a.status !== 'finished' && 
                    a.status !== 'cancelled'
                  );
                  const activeIdx = activeItems.findIndex(a => a.id === apt.id);

                  return (
                    <div key={apt.id} className="card" style={{ 
                      border: isCancelled ? '2px solid #ef4444' : apt.status === 'attending' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: isCancelled ? 'rgba(239,68,68,0.05)' : apt.status === 'attending' ? 'rgba(245,158,11,0.03)' : 'var(--surface)',
                      position: 'relative',
                      padding: isMobile ? '0.65rem' : '1rem',
                      opacity: (isToday && apt.date !== getTodayStr()) ? 0.7 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: isMobile ? '0.5rem' : '0.75rem'
                    }}>
                    {apt.date !== selectedDate && (
                      <div style={{ position: 'absolute', top: '-8px', right: '15px', background: 'var(--accent)', color: 'white', fontSize: '0.6rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 900, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 10 }}>
                        📌 PROGRAMADA: {(() => {
                          const [y, m, d] = apt.date.split('-').map(Number);
                          return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                        })()}
                      </div>
                    )}
                    
                    {/* First Row: Number + Client Info */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ 
                        width: isMobile ? '32px' : '40px', 
                        height: isMobile ? '32px' : '40px', 
                        borderRadius: '50%', 
                        background: apt.status === 'attending' ? 'var(--primary)' : 'var(--surface-hover)', 
                        color: apt.status === 'attending' ? 'black' : 'var(--text)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontWeight: 800, 
                        flexShrink: 0,
                        fontSize: isMobile ? '0.85rem' : '1rem'
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 800, color: isCancelled ? '#ef4444' : 'inherit', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {apt.clientName}
                          </h4>
                          {isCancelled && <span style={{ fontSize: '0.55rem', background: '#ef4444', color: 'white', padding: '0.05rem 0.3rem', borderRadius: '4px', fontWeight: 900 }}>CANCELADO</span>}
                          {apt.status === 'attending' && <span style={{ fontSize: '0.55rem', background: 'var(--primary)', color: 'black', padding: '0.05rem 0.3rem', borderRadius: '4px', fontWeight: 900 }}>ATENDIENDO</span>}
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                          {apt.service} • <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{apt.time}</span>
                          {apt.status === 'attending' && apt.date === getTodayStr() && (
                            <span style={{ marginLeft: '0.5rem', color: 'var(--success)', fontWeight: 900 }}>{formatTime(activeTimer)}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Second Row: Compact Action Buttons */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.4rem',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      width: '100%',
                      paddingTop: isMobile ? '0.2rem' : '0'
                    }}>
                      {isCancelled ? (
                         <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', borderColor: '#ef4444', color: '#ef4444', height: '32px', flex: 1 }} onClick={() => removeApt(apt.id)}>
                           <Trash2 size={12} /> Quitar Alerta
                         </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.3rem', flex: 1 }}>
                          <button 
                            className={`btn ${apt.arrived ? 'btn-success' : 'btn-outline'}`} 
                            style={{ 
                              fontSize: '0.65rem', 
                              height: '32px', 
                              padding: '0 0.6rem',
                              flex: 1,
                              background: apt.arrived ? 'rgba(34,197,94,0.1)' : 'transparent',
                              borderColor: apt.arrived ? '#22c55e' : 'var(--border)',
                              color: apt.arrived ? '#22c55e' : 'var(--text)'
                            }} 
                            onClick={async () => {
                              const newStatus = apt.arrived ? 'waiting' : 'arrived';
                              await supabase.from('appointments').update({ status: newStatus }).eq('id', apt.id);
                            }}
                          >
                            {apt.arrived ? 'LLEGÓ' : 'LLEGADA'}
                          </button>
                          
                          {apt.status === 'waiting' ? (
                            <button className="btn btn-primary" style={{ fontSize: '0.65rem', height: '32px', padding: '0 1rem', flex: 1, fontWeight: 900 }} onClick={async () => {
                              await supabase.from('appointments').update({ status: 'waiting' }).eq('status', 'attending').eq('tenant_id', tenantId);
                              await supabase.from('appointments').update({ status: 'attending', started_at: new Date().toISOString() }).eq('id', apt.id);
                            }}>
                              <Play size={12} fill="currentColor" style={{ marginRight: '4px' }} /> ATENDER
                            </button>
                          ) : (
                            <button className="btn btn-success" style={{ fontSize: '0.65rem', height: '32px', padding: '0 1rem', flex: 1, fontWeight: 900 }} onClick={() => { setSelectedAptForComplete(apt); setShowCompleteModal(true); }}>
                              <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> LISTO
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Secondary Mini Actions */}
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {apt.status === 'waiting' && (() => {
                            const waitingToday = appointments.filter((a: Appointment) => a.date === selectedDate && a.status !== 'finished' && a.status !== 'cancelled');
                            const myIdx = waitingToday.findIndex((a: Appointment) => a.id === apt.id);
                            return myIdx > 0 && waitingToday[myIdx - 1]?.status !== 'attending' ? (
                              <button
                                title="Adelantar"
                                className="btn btn-outline"
                                onClick={() => moveUp(myIdx)}
                                style={{ color: 'var(--primary)', borderColor: 'var(--primary)', padding: '0', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                ↑
                              </button>
                            ) : null;
                          })()}
                        <button 
                          className="btn btn-outline" 
                          onClick={() => removeApt(apt.id)} 
                          style={{ color: 'var(--accent)', borderColor: 'var(--accent)', padding: '0', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
        )}
          </div>
        ) : activeTab === 'agenda' ? (
          <AgendaCalendarView appointments={appointments} />
        ) : activeTab === 'inventory' ? (
          <InventoryManagement />
        ) : activeTab === 'finance' ? (
          <div className="animate-fade-in">
             <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', background: 'var(--background)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  {(['day', 'week', 'month', 'year', 'range'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setRegFilterType(type);
                        if (type === 'day' || type === 'week') setRegFilterValue(getTodayStr());
                        else if (type === 'month') setRegFilterValue(getTodayStr().substring(0, 7));
                        else if (type === 'year') setRegFilterValue(getTodayStr().substring(0, 4));
                      }}
                      style={{
                        padding: '0.4rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: regFilterType === type ? 'var(--primary)' : 'transparent',
                        color: regFilterType === type ? 'black' : 'var(--text-muted)',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        textTransform: 'uppercase'
                      }}
                    >
                      {type === 'day' ? 'Día' : type === 'week' ? 'Semana' : type === 'month' ? 'Mes' : type === 'year' ? 'Año' : 'Rango'}
                    </button>
                  ))}
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  {(regFilterType === 'day' || regFilterType === 'week') && (
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="date" 
                        value={regFilterValue}
                        onChange={(e) => setRegFilterValue(e.target.value)}
                        className="input"
                        style={{ padding: '0.5rem', width: '100%' }}
                      />
                      {regFilterType === 'week' && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, marginTop: '0.2rem', textTransform: 'uppercase' }}>
                          📅 Semana Completa
                        </div>
                      )}
                    </div>
                  )}
                  {regFilterType === 'month' && (
                    <input 
                      type="month" 
                      value={regFilterValue}
                      onChange={(e) => setRegFilterValue(e.target.value)}
                      className="input"
                      style={{ padding: '0.5rem', width: '100%' }}
                    />
                  )}
                  {regFilterType === 'year' && (
                    <input 
                      type="number" 
                      min="2024" 
                      max="2100"
                      value={regFilterValue}
                      onChange={(e) => setRegFilterValue(e.target.value)}
                      className="input"
                      style={{ padding: '0.5rem', width: '100%' }}
                    />
                  )}
                  {regFilterType === 'range' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>DESDE</label>
                        <input 
                          type="date" 
                          value={regStartDate}
                          onChange={(e) => setRegStartDate(e.target.value)}
                          className="input"
                          style={{ padding: '0.4rem', width: '100%', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>HASTA</label>
                        <input 
                          type="date" 
                          value={regEndDate}
                          onChange={(e) => setRegEndDate(e.target.value)}
                          className="input"
                          style={{ padding: '0.4rem', width: '100%', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            <FinanceManagement 
              transactions={[...getFilteredTxs('ingreso'), ...getFilteredTxs('egreso')]} 
              setTransactions={setTransactions} 
              staff={staff} 
              businessName={businessName}
              logoUrl={logoUrl}
              filteredApts={getFilteredApts()}
              filterType={regFilterType}
              filterValue={regFilterValue}
            />
          </div>
        ) : activeTab === 'staff' ? (
          <StaffManagement staff={staff} setStaff={setStaff} plan={subscription?.plan || 'Free'} tenantId={tenantId || ''} />
        ) : activeTab === 'customers' ? (
          <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>Reporte de Actividad</h2>
                <p style={{ color: 'var(--text-muted)' }}>Análisis de clientes y finanzas por periodo.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button 
                  onClick={() => downloadReport()}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}
                >
                  <FileText size={18} /> CSV
                </button>
                <button 
                  onClick={downloadPDF}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.875rem', background: 'var(--success)', border: 'none' }}
                >
                  <Printer size={18} /> Imprimir
                </button>
                <button 
                  onClick={downloadActivityPDF}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}
                >
                  <FileText size={18} /> Reporte PDF
                </button>
                <div style={{ width: '1px', background: 'var(--border)', margin: '0 0.25rem' }}></div>
                <button 
                  onClick={downloadAgendaReport}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.875rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  <Calendar size={18} /> Agenda CSV
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', background: 'var(--background)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                {(['day', 'week', 'month', 'year', 'range'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setRegFilterType(type);
                      if (type === 'day' || type === 'week') setRegFilterValue(getTodayStr());
                      else if (type === 'month') setRegFilterValue(getTodayStr().substring(0, 7));
                      else if (type === 'year') setRegFilterValue(getTodayStr().substring(0, 4));
                    }}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: regFilterType === type ? 'var(--primary)' : 'transparent',
                      color: regFilterType === type ? 'black' : 'var(--text-muted)',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                  >
                    {type === 'day' ? 'Día' : type === 'week' ? 'Semana' : type === 'month' ? 'Mes' : type === 'year' ? 'Año' : 'Rango'}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                {(regFilterType === 'day' || regFilterType === 'week') && (
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="date" 
                      value={regFilterValue}
                      onChange={(e) => setRegFilterValue(e.target.value)}
                      className="input"
                      style={{ padding: '0.5rem', width: '100%' }}
                    />
                    {regFilterType === 'week' && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, marginTop: '0.2rem', textTransform: 'uppercase' }}>
                        📅 Semana Completa
                      </div>
                    )}
                  </div>
                )}
                {regFilterType === 'month' && (
                  <input 
                    type="month" 
                    value={regFilterValue}
                    onChange={(e) => setRegFilterValue(e.target.value)}
                    className="input"
                    style={{ padding: '0.5rem', width: '100%' }}
                  />
                )}
                {regFilterType === 'year' && (
                  <input 
                    type="number" 
                    min="2024" 
                    max="2100"
                    value={regFilterValue}
                    onChange={(e) => setRegFilterValue(e.target.value)}
                    className="input"
                    style={{ padding: '0.5rem', width: '100%' }}
                  />
                )}
                {regFilterType === 'range' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>DESDE</label>
                      <input 
                        type="date" 
                        value={regStartDate}
                        onChange={(e) => setRegStartDate(e.target.value)}
                        className="input"
                        style={{ padding: '0.4rem', width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>HASTA</label>
                      <input 
                        type="date" 
                        value={regEndDate}
                        onChange={(e) => setRegEndDate(e.target.value)}
                        className="input"
                        style={{ padding: '0.4rem', width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Central Analítica: Personas, Ingresos y Gastos */}
            {(() => {
              const filteredApts = getFilteredApts();
              const filteredIncome = getFilteredTxs('ingreso');
              const filteredExpense = getFilteredTxs('egreso');
              
              let labels: string[] = [];
              let peopleValues: number[] = [];
              let incomeValues: number[] = [];
              let expenseValues: number[] = [];

              if (regFilterType === 'day' || regFilterType === 'week') {
                if (regFilterType === 'day') {
                  labels = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
                  labels.forEach(hour => {
                    const h = parseInt(hour);
                    const nextH = h + 2;
                    
                    // People (Appointments)
                    peopleValues.push(filteredApts.filter(a => {
                      if (!a.time) return false;
                      const aHour = parseInt(a.time.split(':')[0]);
                      return aHour >= h && aHour < nextH;
                    }).length);

                    // Income (Transactions)
                    incomeValues.push(filteredIncome.filter(t => {
                      const tDate = new Date(t.date);
                      return tDate.getHours() >= h && tDate.getHours() < nextH;
                    }).reduce((sum, t) => sum + t.amount, 0));

                    // Expenses (Transactions)
                    expenseValues.push(filteredExpense.filter(t => {
                      const tDate = new Date(t.date);
                      return tDate.getHours() >= h && tDate.getHours() < nextH;
                    }).reduce((sum, t) => sum + t.amount, 0));
                  });
                } else {
                  labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                  const days = [1, 2, 3, 4, 5, 6, 0];
                  days.forEach(d => {
                    peopleValues.push(filteredApts.filter(a => new Date(a.date).getDay() === d).length);
                    incomeValues.push(filteredIncome.filter(t => new Date(t.date).getDay() === d).reduce((sum, t) => sum + t.amount, 0));
                    expenseValues.push(filteredExpense.filter(t => new Date(t.date).getDay() === d).reduce((sum, t) => sum + t.amount, 0));
                  });
                }
              } else if (regFilterType === 'month') {
                labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
                [1, 8, 16, 24].forEach((startDay, i) => {
                  const endDay = i === 3 ? 31 : startDay + 7;
                  peopleValues.push(filteredApts.filter(a => {
                    const d = new Date(a.date).getDate();
                    return d >= startDay && d < endDay;
                  }).length);
                  incomeValues.push(filteredIncome.filter(t => {
                    const d = new Date(t.date).getDate();
                    return d >= startDay && d < endDay;
                  }).reduce((sum, t) => sum + t.amount, 0));
                  expenseValues.push(filteredExpense.filter(t => {
                    const d = new Date(t.date).getDate();
                    return d >= startDay && d < endDay;
                  }).reduce((sum, t) => sum + t.amount, 0));
                });
              } else if (regFilterType === 'year') {
                labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                labels.forEach((_, i) => {
                  peopleValues.push(filteredApts.filter(a => new Date(a.date).getMonth() === i).length);
                  incomeValues.push(filteredIncome.filter(t => new Date(t.date).getMonth() === i).reduce((sum, t) => sum + t.amount, 0));
                  expenseValues.push(filteredExpense.filter(t => new Date(t.date).getMonth() === i).reduce((sum, t) => sum + t.amount, 0));
                });
              } else {
                labels = ['Inicio', 'Fin'];
                peopleValues = [0, filteredApts.length];
                incomeValues = [0, filteredIncome.reduce((sum, t) => sum + t.amount, 0)];
                expenseValues = [0, filteredExpense.reduce((sum, t) => sum + t.amount, 0)];
              }

              return (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                  <AnalyticChart title="Flujo de Personas" data={peopleValues.length > 0 ? peopleValues : [0]} color="var(--primary)" labels={labels} />
                  <AnalyticChart title="Ingresos del Periodo" data={incomeValues.length > 0 ? incomeValues : [0]} color="var(--success)" labels={labels} prefix="$" />
                  <AnalyticChart title="Gastos del Periodo" data={expenseValues.length > 0 ? expenseValues : [0]} color="#ef4444" labels={labels} prefix="$" />
                </div>
              );
            })()}

            {/* Quick Stats Period */}
            <div ref={activityReportRef} style={{ background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
              {/* PDF Only Header */}
              <div className="print-only" style={{ display: 'none', textAlign: 'center', marginBottom: '2rem', padding: '1rem', borderBottom: '2px solid black' }}>
                {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '60px', marginBottom: '1rem' }} />}
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'black', margin: 0 }}>{businessName}</h1>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'black', textTransform: 'uppercase' }}>Reporte de Actividad</h2>
                <p style={{ fontSize: '0.8rem', color: 'black' }}>{new Date().toLocaleString()}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Clientes Atendidos</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--primary)' }}>{getFilteredApts().length}</p>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ingresos Periodo</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--success)' }}>
                  ${getFilteredTxs('ingreso').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
                </p>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Gastos Periodo</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: '#ef4444' }}>
                  ${getFilteredTxs('egreso').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fecha</th>
                      <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente</th>
                      <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Servicio x Barbero</th>
                      <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monto</th>
                      <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredApts().map((apt) => {
                      const serviceData = dbServices.find(s => s.name === apt.service);
                      return (
                        <tr key={apt.id} style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{apt.date}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ fontWeight: 600 }}>{apt.clientName}</span>
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            {apt.service} {apt.staffId && `• ${staff.find(s => s.id === apt.staffId)?.name}`}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <span style={{ fontWeight: 800, color: 'var(--success)' }}>
                              ${serviceData ? Number(serviceData.price).toFixed(2) : '0.00'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => {
                                  setTargetAptAction({ type: 'edit', apt });
                                  setShowPinModal(true);
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.4rem' }}
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  setTargetAptAction({ type: 'delete', apt });
                                  setShowPinModal(true);
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.4rem' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {getFilteredApts().length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                          <BarChart2 size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                          <p>No hay registros finalizados para este periodo.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        ) : activeTab === 'profile' ? (
          <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
             <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1rem' }}>
                  <div style={{ width: '80px', height: '80px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: '2px solid var(--border)' }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Building size={32} color="var(--primary)" />
                    )}
                  </div>
                  {staff[0]?.imageUrl && (
                    <div style={{ width: '80px', height: '80px', background: 'var(--surface-hover)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: '2px solid var(--primary)' }}>
                      <img src={staff[0].imageUrl} alt="Pro" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
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
        ) : activeTab === 'messages' ? (
          <MessagingCenter tenantId={tenantId || ''} />
        ) : (
          <BarberManagement tenantId={tenantId || ''} />
        )}
      </main>

      <aside className={isMobile ? 'full-width-on-mobile' : ''} style={{ 
        width: isMobile ? '100%' : '320px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem',
        marginTop: isMobile ? '2rem' : 0
      }}>
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
            onClick={() => handleTabClick('messages')}
            className={`btn ${activeTab === 'messages' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between', padding: '0.8rem 1.25rem', position: 'relative' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><MessageCircle size={20} /> Mensajería</div>
            {unreadMessages > 0 && (
              <span style={{ background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 900, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', minWidth: '1.2rem', textAlign: 'center' }}>
                {unreadMessages}
              </span>
            )}
          </button>
          <button 
            onClick={() => handleTabClick('customers')}
            className={`btn ${activeTab === 'customers' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', padding: '0.8rem 1.25rem' }}
          >
            <BarChart2 size={20} /> Reporte
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


        {isMobile ? (
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
        ) : null}

        {isMobile ? (() => {
          const finishedToday = appointments.filter((a: Appointment) => a.date === selectedDate && a.status === 'finished').length;
          const totalToday = appointments.filter((a: Appointment) => a.date === selectedDate).length;
          const cancelledToday = appointments.filter((a: Appointment) => a.date === selectedDate && a.status === 'cancelled').length;
          const incomeToday = transactions.filter(t => t.date === selectedDate && t.type === 'ingreso').reduce((acc, t) => acc + t.amount, 0);

          const getMessage = () => {
            if (totalToday === 0) return "¡Día nuevo! Asegúrate de que tus clientes tengan tu enlace para empezar a recibir citas.";
            if (cancelledToday > 2) return `Atención: Hoy has tenido ${cancelledToday} cancelaciones. Revisa si hay un patrón o considera solicitar depósitos previos.`;
            if (incomeToday > 200) return "¡Vaya ritmo llevas! Tus ingresos de hoy están por encima del promedio. ¡Sigue así!";
            if (finishedToday === totalToday && totalToday > 0) return "¡Agenda completada! Has atendido a todos tus clientes de hoy con éxito.";
            if (totalToday > 5 && finishedToday < 2) return "Día concurrido: Recuerda mantener el ritmo para que la fila fluya con rapidez.";
            return "Consejo: Revisa tu 'Reporte de Actividad' para ver cuáles son tus horas más productivas de la semana.";
          };

          return (
            <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#000' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ✨ Asistente MyTurn
              </h3>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.9, lineHeight: '1.4' }}>
                "{getMessage()}"
              </p>
            </div>
          );
        })() : null}

        <div style={{ textAlign: 'center', marginTop: '0.5rem', marginBottom: '1rem' }}>
          <button 
            onClick={() => {
              if (subscription?.plan === 'Free') {
                alert('El Soporte Técnico directo es exclusivo para planes Professional y Enterprise. ¡Mejora tu plan para acceder!');
                return;
              }
              setShowSupportModal(true);
            }}
            style={{ 
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              opacity: 0.6,
              textDecoration: 'underline'
            }}
          >
            <LifeBuoy size={14} /> Soporte MyTurn
          </button>
        </div>
      </aside>

      {showShareModal && (() => {
        const businessUrl = shareUrl;
        const encodedUrl = encodeURIComponent(businessUrl);
        const shareText = encodeURIComponent(`¡Visita ${businessName} y reserva tu turno en línea!`);
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}&margin=10`;
        const links = [
          { label: 'WhatsApp', color: '#25D366', emoji: '📱', href: `https://wa.me/?text=${shareText}%20${encodedUrl}` },
          { label: 'Facebook', color: '#1877F2', emoji: '👥', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
          { label: 'Twitter / X', color: '#000', emoji: '🐦', href: `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}` },
          { label: 'Correo', color: '#EA4335', emoji: '✉️', href: `mailto:?subject=${encodeURIComponent('Reserva en ' + businessName)}&body=${shareText}%20${encodedUrl}` },
        ];

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '380px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Compartir Negocio</h3>
                <button className="btn btn-outline" style={{ padding: '0.3rem', borderRadius: '50%' }} onClick={() => setShowShareModal(false)}><X size={18} /></button>
              </div>

              {/* QR Code */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>CÓDIGO QR PARA CLIENTES</p>
                <div style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', margin: '0 auto', width: 'fit-content', border: '1px solid var(--border)' }}>
                  <img 
                    src={qrSrc} 
                    alt="QR Code" 
                    style={{ width: '160px', height: '160px', display: 'block' }}
                  />
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.75rem', wordBreak: 'break-all' }}>{businessUrl}</p>
              </div>

              {/* Social Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {links.map(l => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: l.color, color: '#fff', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', transition: 'opacity 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{l.emoji}</span>
                    {l.label}
                  </a>
                ))}
                
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', marginTop: '0.25rem', borderColor: copied ? 'var(--success)' : 'var(--border)', color: copied ? 'var(--success)' : 'var(--text)' }}
                  onClick={() => { 
                    navigator.clipboard.writeText(businessUrl); 
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  <Copy size={16} /> {copied ? '¡Copiado!' : 'Copiar Enlace'}
                </button>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Tip: Imprime este QR y colócalo en tu local para que tus clientes agenden sin esperar.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

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
                  { id: 'efectivo', label: '💵 EFECTIVO' },
                  { id: 'tarjeta', label: '💳 TARJETA' },
                  { id: 'transferencia', label: '📲 TRANSF.' },
                  { id: 'credito', label: '📝 CRÉDITO' }
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

            <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Servicio Principal:</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{selectedAptForComplete.service}</span>
              </div>
              
              {extraServices.map((ex, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                      onClick={() => removeExtraService(idx)}
                      style={{ color: '#ef4444', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: '1rem' }}
                    >×</button>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{ex.name}:</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>${Number(ex.price).toFixed(2)}</span>
                </div>
              ))}

              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border)' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>AÑADIR OTRO SERVICIO</label>
                <select 
                  onChange={(e) => {
                    const s = dbServices.find(sv => sv.id === e.target.value);
                    if (s) addExtraService(s);
                    e.target.value = "";
                  }}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.75rem' }}
                >
                  <option value="">-- Seleccionar --</option>
                  {dbServices.filter(s => s.name !== selectedAptForComplete.service).map(s => (
                    <option key={s.id} value={s.id}>{s.name} (${s.price})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800 }}>Total a Cobrar:</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>
                  ${(() => {
                    if (!dbServices || dbServices.length === 0) return 'Calculando...';
                    const mainS = dbServices.find(sv => sv.name.toLowerCase() === selectedAptForComplete?.service.toLowerCase());
                    let base = mainS ? Number(mainS.price) : 25;
                    extraServices.forEach(ex => base += Number(ex.price));
                    const disc = base * (discountPercent / 100);
                    return (base - disc).toFixed(2);
                  })()}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Descuento (%):</span>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={discountPercent} 
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                  style={{ width: '60px', padding: '0.3rem', borderRadius: '4px', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--primary)', textAlign: 'right', fontWeight: 800 }}
                />
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
              <TrendingUp size={32} />
            </div>
            
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>
              Desbloquea MyTurn Premium
            </h3>
            
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5', fontSize: '0.875rem' }}>
              Estás en el <strong style={{ color: 'var(--text)' }}>Plan {subscription?.plan || 'Free'}</strong>. <br/>
              Ingresa tu código de invitación o promoción para activar las funciones avanzadas.
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                placeholder="Ingresa tu código aquí..."
                value={upgradeCode}
                onChange={(e) => setUpgradeCode(e.target.value.toUpperCase())}
                style={{ 
                  width: '100%', 
                  padding: '1rem', 
                  background: 'var(--background)', 
                  border: '2px solid var(--border)', 
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--primary)',
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setShowUpgradeModal(false)} 
                style={{ flex: 1, padding: '0.8rem' }}
              >
                Cerrar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleUpgradeWithCode}
                disabled={isUpgrading}
                style={{ flex: 2, padding: '0.8rem', fontWeight: 800 }}
              >
                {isUpgrading ? 'Validando...' : 'Activar Plan Premium'}
              </button>
            </div>
            
            <p style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              ¿No tienes un código? Contacta a soporte para adquirir uno.
            </p>
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

      {/* Security PIN Modal */}
      {showPinModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '360px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(245,158,11,0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
              <Lock size={30} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem' }}>
              {verifiedPin ? 'Seguridad Requerida' : 'Configurar PIN de Reportes'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {verifiedPin 
                ? 'Ingresa tu PIN para autorizar esta acción en el historial.' 
                : 'Crea un PIN de 4 dígitos para proteger la edición de tus reportes.'}
            </p>
            
            <input 
              type="password"
              maxLength={4}
              placeholder="0 0 0 0"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              style={{ 
                width: '100%', 
                padding: '1rem', 
                fontSize: '1.5rem', 
                textAlign: 'center', 
                letterSpacing: '1rem', 
                background: 'var(--background)', 
                border: '2px solid var(--border)', 
                borderRadius: 'var(--radius-lg)',
                fontWeight: 900,
                color: 'var(--primary)',
                marginBottom: '1.5rem'
              }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1 }} 
                onClick={() => {
                  setShowPinModal(false);
                  setPinInput('');
                }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                disabled={pinInput.length < 1}
                onClick={async () => {
                  if (!verifiedPin) {
                    // SETUP PIN
                    localStorage.setItem(`myturn_pin_${tenantId}`, pinInput);
                    setVerifiedPin(pinInput);
                    setPinInput('');
                    alert("PIN configurado correctamente.");
                  } else {
                    // VALIDATE PIN
                    if (pinInput === verifiedPin) {
                      setShowPinModal(false);
                      setPinInput('');
                      if (targetAptAction?.type === 'edit') {
                        setEditingApt(targetAptAction.apt);
                        setShowEditModal(true);
                      } else if (targetAptAction?.type === 'delete') {
                        if (confirm(`¿Seguro que quieres eliminar el registro de ${targetAptAction.apt.clientName}? Esta acción es irreversible.`)) {
                          try {
                            // 1. Delete linked transactions first (FK constraint)
                            await supabase.from('transactions').delete().eq('appointment_id', targetAptAction.apt.id);
                            
                            // 2. Delete appointment
                            const { error } = await supabase.from('appointments').delete().eq('id', targetAptAction.apt.id);
                            
                            if (error) {
                              alert("Error al eliminar: " + error.message);
                            }
                          } catch (err) {
                            console.error("Delete failed:", err);
                            alert("Ocurrió un error inesperado al intentar eliminar el registro.");
                          }
                        }
                        setTargetAptAction(null);
                      }
                    } else {
                      alert("PIN Incorrecto.");
                      setPinInput('');
                    }
                  }
                }}
              >
                {verifiedPin ? 'Verificar' : 'Registrar PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {showEditModal && editingApt && (
        <div className="modal-overlay">
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 900, marginBottom: '1.25rem' }}>Editar Registro</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>CLIENTE</label>
                <input 
                  type="text" 
                  value={editingApt.clientName}
                  onChange={(e) => setEditingApt({...editingApt, clientName: e.target.value})}
                  className="input"
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>SERVICIO</label>
                <select 
                  value={editingApt.service}
                  onChange={(e) => setEditingApt({...editingApt, service: e.target.value})}
                  className="input"
                >
                  {dbServices.map(s => <option key={s.id} value={s.name}>{s.name} - ${s.price}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>FECHA</label>
                  <input 
                    type="date" 
                    value={editingApt.date}
                    onChange={(e) => setEditingApt({...editingApt, date: e.target.value})}
                    className="input"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>HORA</label>
                  <input 
                    type="time" 
                    value={editingApt.time}
                    onChange={(e) => setEditingApt({...editingApt, time: e.target.value})}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={async () => {
                  const { error } = await supabase.from('appointments').update({
                    client_name: editingApt.clientName,
                    service: editingApt.service,
                    date: editingApt.date,
                    time: editingApt.time
                  }).eq('id', editingApt.id);

                  if (!error) {
                    setShowEditModal(false);
                    setTargetAptAction(null);
                    setEditingApt(null);
                  } else {
                    alert("Error al actualizar: " + error.message);
                  }
                }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiptModal && lastProcessedTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '320px', padding: 0, overflow: 'hidden', background: 'white', color: 'black' }}>
            {/* Contenido imprimible - Optimizado para Térmica y A4 */}
            <div className="print-only" style={{ padding: '0', background: 'white', color: 'black' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt={businessName} style={{ height: '50px', objectFit: 'contain', marginBottom: '0.5rem' }} />
                ) : (
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>{businessName}</div>
                )}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: '0' }}>{businessName}</h3>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, borderTop: '1px solid black', borderBottom: '1px solid black', margin: '0.5rem 0', padding: '2px 0' }}>COMPROBANTE DE PAGO</div>
                <div style={{ fontSize: '0.7rem' }}>{new Date().toLocaleString()}</div>
              </div>

              <div style={{ borderBottom: '1px dashed black', padding: '0.5rem 0', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.8rem' }}>CLIENTE:</span>
                  <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{lastProcessedTx.clientName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.8rem' }}>SERVICIO:</span>
                  <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{lastProcessedTx.description}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', borderTop: '1px solid black', paddingTop: '0.3rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '1rem' }}>TOTAL:</span>
                  <span style={{ fontWeight: 900, fontSize: '1.2rem' }}>${lastProcessedTx.amount.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800 }}>¡Gracias por visitarnos!</p>
                <p style={{ fontSize: '0.6rem', marginTop: '0.5rem' }}>ID: #TX-{lastProcessedTx.id.slice(0, 8)}</p>
              </div>
            </div>

            {/* Controles del Modal - No se imprimen */}
            <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem', padding: '1.5rem' }}>
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
                  onClick={() => setShowReceiptModal(false)}
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
                  onClick={() => window.print()}
                >
                  <Printer size={18} /> IMPRIMIR 
                </button>
              </div>
              
              <button 
                className="btn" 
                style={{ 
                  width: '100%', 
                  background: '#25D366', 
                  color: 'white', 
                  fontWeight: '900', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.5rem',
                  padding: '1rem',
                  borderRadius: '8px'
                }}
                onClick={() => {
                  if (!lastProcessedTx) return;
                  const phone = lastProcessedTx.clientPhone?.replace(/\D/g, '');
                  const message = encodeURIComponent(`📄 *RECIBO DE PAGO - ${businessName}*\n\n` + 
                    `*Cliente:* ${lastProcessedTx.clientName}\n` +
                    `*Servicio:* ${lastProcessedTx.description}\n` +
                    `*Total:* $${lastProcessedTx.amount.toFixed(2)}\n\n` +
                    `¡Gracias por su preferencia! ✨`);
                  window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                }}
              >
                <Share2 size={18} /> WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
      {showSupportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '56px', height: '56px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <LifeBuoy size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Centro de Soporte</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>¿En qué podemos ayudarte hoy?</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Categoría del Reporte</label>
                <select 
                  value={supportTicket.category} 
                  onChange={(e) => setSupportTicket({...supportTicket, category: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontWeight: 600 }}
                >
                  <option value="Avería">🛠️ Avería / Error</option>
                  <option value="Reporte">📊 Reporte / Datos</option>
                  <option value="Sugerencia">💡 Sugerencia</option>
                  <option value="Otro">❓ Otro</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Mensaje / Detalles</label>
                <textarea 
                  value={supportTicket.message}
                  onChange={(e) => setSupportTicket({...supportTicket, message: e.target.value})}
                  placeholder="Describe aquí lo que sucede..."
                  style={{ width: '100%', height: '120px', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setShowSupportModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Cerrar</button>
                <button 
                  onClick={handleSendTicket} 
                  className="btn btn-primary" 
                  disabled={isSubmittingTicket}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {isSubmittingTicket ? 'Enviando...' : <><Send size={16} /> Enviar Ticket</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
