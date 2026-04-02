import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarberManagement } from './BarberManagement';
import { InventoryManagement } from './InventoryManagement';
import { FinanceManagement, Transaction, StaffMember } from './FinanceManagement';
import { StaffManagement } from './StaffManagement';
import { MessagingCenter } from './MessagingCenter';
import { MessageCircle, Play, Check, X, TrendingUp, LayoutDashboard, Settings, Share2, Copy, QrCode, Plus, Calendar, Package, Wallet, Users, Clock, Scissors, ChevronRight, Search, CheckCircle2, Pause, AlertCircle, LogOut, Printer, HelpCircle, MoreVertical, CreditCard, ShieldAlert, Lock, User, BarChart2, FileText, Download, Edit, Trash2 } from 'lucide-react';


interface Appointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  date: string; // YYYY-MM-DD
  status: 'waiting' | 'attending' | 'finished' | 'cancelled';
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

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const manualToggleTimeRef = React.useRef<number>(0);

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


  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 3. Load Metadata & Setup Listeners (Once tenantId is known)
  useEffect(() => {
    if (!tenantId) return;

    const loadMetadata = async () => {
      try {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_members' }, () => {
        loadMetadata();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_tenants', filter: `tenant_id=eq.${tenantId}` }, () => {
        fetchSavedCustomers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
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
  const [newClient, setNewClient] = useState({ name: '', service: 'Corte Clásico', staffId: '', time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}` });
  const [copied, setCopied] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTimer, setActiveTimer] = useState(25 * 60); // Seconds left for current client
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAptForComplete, setSelectedAptForComplete] = useState<Appointment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'credito'>('efectivo');
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
    setNewClient({ name: '', service: firstService, staffId: '', time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}` });
    setShowAddForm(false);
  };

  const moveUp = async (idx: number) => {
    // Find the waiting appointments for the selected date sorted as displayed
    const waitingToday = appointments.filter(a => a.date === selectedDate && a.status !== 'finished' && a.status !== 'cancelled');
    if (idx <= 0) return; // already at top
    const current = waitingToday[idx];
    const prev = waitingToday[idx - 1];
    if (!current || !prev || prev.status === 'attending') return; // can't swap past the person being attended

    // Swap their date_time values in the DB so sorting order flips
    const currentDateTime = appointments.find(a => a.id === current.id);
    const prevDateTime = appointments.find(a => a.id === prev.id);
    if (!currentDateTime || !prevDateTime) return;

    // We need the raw date_time strings - get them from Supabase
    const [{ data: curData }, { data: prevData }] = await Promise.all([
      supabase.from('appointments').select('date_time').eq('id', current.id).single(),
      supabase.from('appointments').select('date_time').eq('id', prev.id).single(),
    ]);
    if (!curData || !prevData) return;

    await Promise.all([
      supabase.from('appointments').update({ date_time: prevData.date_time }).eq('id', current.id),
      supabase.from('appointments').update({ date_time: curData.date_time }).eq('id', prev.id),
    ]);
    // Realtime channel will refresh the list automatically
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
          <title>Reporte MyTurn - ${regFilterType === 'range' ? `${regStartDate} a ${regEndDate}` : regFilterValue}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { color: #f59e0b; margin-bottom: 5px; }
            .header-info { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #f9f9f9; padding: 12px; border-bottom: 2px solid #ddd; font-size: 12px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
            .total-box { margin-top: 30px; text-align: right; font-weight: bold; font-size: 1.2rem; }
            .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1>${businessName}</h1>
            <p>Reporte de Actividad: <strong>${
              regFilterType === 'day' ? regFilterValue : 
              regFilterType === 'month' ? regFilterValue : 
              regFilterType === 'year' ? 'Año ' + regFilterValue : 
              regFilterType === 'range' ? 'De ' + regStartDate + ' a ' + regEndDate :
              (() => {
                const d = new Date(regFilterValue + 'T00:00:00');
                const day = d.getDay(); 
                const diffToMon = (day === 0 ? -6 : 1) - day;
                const mon = new Date(d); mon.setDate(d.getDate() + diffToMon);
                const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
                return `Semana del ${mon.toLocaleDateString()} al ${sun.toLocaleDateString()}`;
              })()
            }</strong></p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Profesional</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(a => {
                const s = dbServices.find(sv => sv.name === a.service);
                return `
                  <tr>
                    <td>${a.date}</td>
                    <td>${a.clientName}</td>
                    <td>${a.service}</td>
                    <td>${staff.find(st => st.id === a.staffId)?.name || 'N/A'}</td>
                    <td>$${s ? Number(s.price).toFixed(2) : '0.00'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div class="total-box">
            Total Ingresos: $${getFilteredTxs('ingreso').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
          </div>
          <p style="font-size: 14px; margin-top: 5px;">Total Atendidos: ${filtered.length}</p>
          <div class="footer">Generado por MyTurn Business Automation - ${new Date().toLocaleString()}</div>
          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
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
        appointment_id: selectedAptForComplete.id,
        amount: finalAmount,
        type: 'ingreso',
        payment_method: paymentMethod,
        staff_id: selectedAptForComplete.staffId || null,
        category: allServiceNames,
        description: `Cliente: ${selectedAptForComplete.clientName}${discountPercent > 0 ? ` (Dcto ${discountPercent}%)` : ''}`
      }).select().single();

      if (txError) throw txError;

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
      await supabase.from('appointments').update({ status: 'finished' }).eq('id', selectedAptForComplete.id);
      
      if (appointments) {
        setAppointments(appointments.filter((a: Appointment) => a.id !== selectedAptForComplete.id));
      }
      
      const newTxForState: Transaction = {
        id: tx.id,
        type: 'ingreso' as const,
        amount: finalAmount,
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
      overflowX: 'hidden'
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
       <section style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          marginBottom: '2rem',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700, margin: 0 }}>
              {activeTab === 'queue' ? '' : 
               activeTab === 'agenda' ? 'Agenda de Citas' :
               activeTab === 'management' ? 'Gestión de Local' : 
               activeTab === 'inventory' ? 'Inventario Inteligente' :
               activeTab === 'staff' ? 'Equipo de Trabajo' : 
               activeTab === 'messages' ? 'Mensajería de Clientes' :
               activeTab === 'customers' ? 'Reporte de Actividad' : 'Finanzas y Reportes'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {(activeTab === 'queue' || activeTab === 'agenda') && (
              <>
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
                  onClick={async () => {
                    const newPaused = !isPaused;
                    setIsPaused(newPaused);
                    if (tenantId) {
                      await supabase.from('tenants').update({ is_paused: newPaused }).eq('id', tenantId);
                    }
                  }}
                >
                  {isPaused ? '▶️ REANUDAR' : '⏸️ EN PAUSA'}
                </button>
              </>
            )}
             <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              background: 'var(--surface)', 
              padding: '0.4rem', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--border)', 
              overflowX: 'auto', 
              maxWidth: '100%',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
              <button 
                className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`}
                onClick={() => handleTabClick('queue')}
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
              >
                <LayoutDashboard size={18} />
                <span>Cola</span>
              </button>
              <button 
                className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => handleTabClick('inventory')}
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
              >
                <Package size={18} />
                <span>Inventario</span>
              </button>
              <button 
                className={`nav-item ${activeTab === 'finance' ? 'active' : ''}`}
                onClick={() => handleTabClick('finance')}
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
              >
                <Wallet size={18} />
                <span>Finanzas</span>
                {subscription?.plan === 'Free' && <Lock size={12} style={{marginLeft: '4px'}} />}
              </button>
              <button 
                className={`nav-item ${activeTab === 'management' ? 'active' : ''}`}
                onClick={() => handleTabClick('management')}
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
              >
                <Settings size={18} />
                <span>Local</span>
              </button>
              <button 
                className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
                onClick={() => handleTabClick('customers')}
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
              >
                <BarChart2 size={18} />
                <span>Reporte</span>
              </button>
              <button 
                className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
                onClick={() => handleTabClick('messages')}
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', position: 'relative' }}
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
          <div style={{ 
            display: 'flex', 
            gap: '0.6rem', 
            overflowX: 'auto', 
            paddingBottom: '0.5rem', 
            marginBottom: '1rem', 
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
        )}

        {(activeTab === 'queue' || activeTab === 'agenda') ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {/* Open/Close status badge — clickable toggle */}
                <button 
                  className={`btn ${isOpen ? 'btn-primary' : 'btn-outline'}`}
                  onClick={async () => {
                    const newState = !isOpen;
                    // 1. Update main is_open status (Critical)
                    setIsOpen(newState);
                    if (newState) {
                      manualToggleTimeRef.current = Date.now();
                    }
                    await supabase.from('tenants').update({ is_open: newState }).eq('id', tenantId);
                    
                    // 2. Clear auto-close guard when opening manually 
                    // (Optional: if you want it to close AGAIN later if the hour hasn't passed, 
                    // but here we just ensure the 400 error is gone)
                    if (newState) {
                      // No-op for DB guard to avoid 400 error
                    }
                  }}
                  title={isOpen ? 'Haz clic para cerrar el negocio' : 'Haz clic para abrir el negocio'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isOpen ? 'var(--success)' : '#ef4444'}`,
                    background: isOpen ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    color: isOpen ? 'var(--success)' : '#ef4444',
                    fontWeight: 800, fontSize: '0.8rem',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOpen ? 'var(--success)' : '#ef4444', ...(isOpen ? { animation: 'pulse 2s infinite' } : {}) }} />
                  {isOpen ? 'ABIERTO' : 'CERRADO'}
                </button>

                {/* Date / En vivo label */}
                <div className="card" style={{ background: 'transparent', border: 'none', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
                    {selectedDate === getTodayStr() ? '📅 Hoy' : `📅 ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                      opacity: (isToday && apt.date !== getTodayStr()) ? 0.7 : 1
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
                          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: isCancelled ? '#ef4444' : 'inherit' }}>{apt.clientName}</h4>
                          {isCancelled && <span style={{ fontSize: '0.65rem', background: '#ef4444', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>TURNO CANCELADO</span>}
                          {apt.status === 'attending' && <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: 'black', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>SIENDO ATENDIDO</span>}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {apt.service} • <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{apt.time}</span>
                          {apt.status === 'attending' && apt.date === getTodayStr() && (
                            <span style={{ marginLeft: '1rem', color: 'var(--success)', fontWeight: 800 }}>⏳ {formatTime(activeTimer)}</span>
                          )}
                        </p>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column-reverse' : 'row', 
                        gap: '0.4rem',
                        alignItems: isMobile ? 'flex-end' : 'center'
                      }}>
                        {isCancelled ? (
                           <button className="btn btn-outline" style={{ fontSize: '0.7rem', borderColor: '#ef4444', color: '#ef4444', width: isMobile ? '100%' : 'auto' }} onClick={() => removeApt(apt.id)}>Quitar Alerta</button>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.4rem', width: isMobile ? '100%' : 'auto' }}>
                            <button className="btn btn-outline" style={{ fontSize: '0.7rem', width: isMobile ? '100%' : 'auto' }} onClick={async () => {
                              const newStatus = apt.arrived ? 'waiting' : 'arrived';
                              await supabase.from('appointments').update({ status: newStatus }).eq('id', apt.id);
                            }}>{apt.arrived ? '📍 LLEGÓ' : 'LLEGADA'}</button>
                            {apt.status === 'waiting' ? (
                              <button className="btn btn-primary" style={{ fontSize: '0.7rem', width: isMobile ? '100%' : 'auto' }} onClick={async () => {
                                await supabase.from('appointments').update({ status: 'waiting' }).eq('status', 'attending').eq('tenant_id', tenantId);
                                await supabase.from('appointments').update({ status: 'attending', started_at: new Date().toISOString() }).eq('id', apt.id);
                              }}>Atender</button>
                            ) : (
                              <button className="btn btn-success" style={{ fontSize: '0.7rem', width: isMobile ? '100%' : 'auto' }} onClick={() => { setSelectedAptForComplete(apt); setShowCompleteModal(true); }}>Listo</button>
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.4rem', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                          {apt.status === 'waiting' && (() => {
                              const waitingToday = appointments.filter((a: Appointment) => a.date === selectedDate && a.status !== 'finished' && a.status !== 'cancelled');
                              const myIdx = waitingToday.findIndex((a: Appointment) => a.id === apt.id);
                              return myIdx > 0 && waitingToday[myIdx - 1]?.status !== 'attending' ? (
                                <button
                                  title="Adelantar en la fila"
                                  className="btn btn-outline"
                                  onClick={() => moveUp(myIdx)}
                                  style={{ color: 'var(--primary)', borderColor: 'var(--primary)', padding: '0.25rem 0.5rem', flex: isMobile ? 1 : 'none' }}
                                >↑</button>
                              ) : null;
                            })()}
                          <button className="btn btn-outline" onClick={() => removeApt(apt.id)} style={{ color: 'var(--accent)', padding: '0.25rem 0.5rem', flex: isMobile ? 1 : 'none' }}><X size={14} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
        )}
          </div>
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
            />
          </div>
        ) : activeTab === 'staff' ? (
          <StaffManagement staff={staff} setStaff={setStaff} plan={subscription?.plan || 'Free'} />
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
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}
                >
                  <Printer size={18} /> PDF
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

            {/* Quick Stats Period */}
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
        ) : activeTab === 'messages' ? (
          <MessagingCenter tenantId={tenantId || ''} />
        ) : (
          <BarberManagement />
        )}

      </main>
      </section>

      <aside className={isMobile ? 'full-width-on-mobile' : ''} style={{ 
        width: isMobile ? '100%' : '320px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem',
        marginTop: isMobile ? '2rem' : 0
      }}>
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
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: 0, overflow: 'hidden' }}>
            <div className="print-only" style={{ padding: '2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt={businessName} style={{ height: '60px', objectFit: 'contain', marginBottom: '1rem' }} />
                ) : (
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--success)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <CheckCircle2 size={32} />
                  </div>
                )}
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)' }}>{businessName}</h3>
                <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Recibo de Pago</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date().toLocaleString()}</p>
              </div>

              <div style={{ borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)', padding: '1.5rem 0', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cliente:</span>
                  <span style={{ fontWeight: 700 }}>{lastProcessedTx.clientName}</span>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 800 }}>Servicios</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                    <span>{lastProcessedTx.mainService}</span>
                    <span style={{ fontWeight: 600 }}>${lastProcessedTx.mainPrice.toFixed(2)}</span>
                  </div>
                  {lastProcessedTx.extras?.map((ex: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      <span>+ {ex.name}</span>
                      <span>${Number(ex.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {lastProcessedTx.discountPercent > 0 && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                     <span style={{ fontSize: '0.9rem' }}>Descuento ({lastProcessedTx.discountPercent}%):</span>
                     <span style={{ fontWeight: 700 }}>-${(lastProcessedTx.subtotal - lastProcessedTx.amount).toFixed(2)}</span>
                   </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>TOTAL</span>
                  <span style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--primary)' }}>${lastProcessedTx.amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowReceiptModal(false)}>Cerrar</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}><Printer size={18} /> Imprimir</button>
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    className="btn" 
                    style={{ flex: 1, background: '#25D366', color: 'white', fontWeight: 900 }}
                    onClick={() => {
                      const extrasText = lastProcessedTx.extras?.map((ex: any) => `- ${ex.name}: $${ex.price}`).join('%0A') || '';
                      const text = `📄 *RECIBO DIGITAL*%0A%0A` +
                        `Cliente: ${lastProcessedTx.clientName}%0A` +
                        `Servicio: ${lastProcessedTx.mainService} ($${lastProcessedTx.mainPrice})%0A` +
                        (extrasText ? `Extras:%0A${extrasText}%0A` : '') +
                        `-------------------%0A` +
                        `TOTAL: $${lastProcessedTx.amount.toFixed(2)}%0A%0A` +
                        `¡Gracias por tu preferencia!`;
                      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                    }}
                  >
                    <Share2 size={18} /> WhatsApp
                  </button>
                  {lastProcessedTx.sessionId && (
                    <button 
                      className="btn" 
                      style={{ flex: 1, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid #3b82f6', fontWeight: 900 }}
                      onClick={sendReceiptToChat}
                    >
                      <MessageCircle size={18} /> Al Chat
                    </button>
                  )}
                </div>

                <button 
                  className="btn btn-outline" 
                  style={{ width: '100%', fontSize: '0.75rem' }}
                  onClick={() => {
                    const text = `*Recibo de Pago*\n\nCliente: ${lastProcessedTx.clientName}\nTotal: $${lastProcessedTx.amount.toFixed(2)}`;
                    navigator.clipboard.writeText(text);
                    alert("Copiado al portapapeles.");
                  }}
                >
                  <Copy size={14} /> Copiar Resumen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
