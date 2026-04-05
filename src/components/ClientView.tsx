import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Star, Clock, MapPin, Calendar, Bell, ArrowRight, Share2, History, MessageSquare, Award, CheckCircle, CheckCircle2, LayoutGrid, X, Plus, Send, Link2Off } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SmartTimer } from './SmartTimer';
import { BookingFlow } from './BookingFlow';
import { ClientUserHub } from './ClientUserHub';

// Helper to get local date in YYYY-MM-DD format
const getLocalDateStr = (d?: Date) => {
  const dateObj = d || new Date();
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

interface BusinessData {
  id: string;
  slug?: string;
  name: string;
  professional: string;
  title: string;
  awards: string[];
  services: { id: string, name: string, price: number, duration: number, icon: string }[];
  logo: string;
  rating: number;
  reviews: number;
  address: string;
  mapUrl: string;
  showReviews: boolean;
  bookingMode: 'online' | 'manual' | 'hybrid';
  color?: string;
  slogan?: string;
  isOpen: boolean;
  schedule?: any[];
}

const QueueItem: React.FC<{ item: any, isGlobalPaused: boolean }> = ({ item, isGlobalPaused }) => {
  const [localTimer, setLocalTimer] = useState(() => {
    const defaultDuration = (item.duration || 30) * 60;
    if (item.active && item.started_at) {
      const elapsedSeconds = Math.floor((new Date().getTime() - new Date(item.started_at).getTime()) / 1000);
      const remaining = defaultDuration - elapsedSeconds;
      return remaining > 0 ? remaining : 0;
    }
    return defaultDuration;
  });

  React.useEffect(() => {
    if (item.active && item.started_at) {
      const defaultDuration = (item.duration || 30) * 60;
      const elapsedSeconds = Math.floor((new Date().getTime() - new Date(item.started_at).getTime()) / 1000);
      const remaining = defaultDuration - elapsedSeconds;
      setLocalTimer(remaining > 0 ? remaining : 0);
    }
  }, [item.active, item.started_at, item.duration]);

  React.useEffect(() => {
    if (item.active && !isGlobalPaused && !item.isStalled) {
      const interval = setInterval(() => {
        setLocalTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGlobalPaused, item.active, item.isStalled]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        padding: '0.75rem', 
        background: item.isUser ? 'rgba(245,158,11,0.08)' : item.active ? 'rgba(255,255,255,0.03)' : 'transparent',
        borderRadius: 'var(--radius-md)',
        border: item.isUser ? '1px solid var(--primary)' : '1px solid var(--border)',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ 
        width: '36px', 
        height: '36px', 
        borderRadius: '50%', 
        background: item.isUser ? 'var(--primary)' : item.active ? 'var(--success)' : item.arrived ? 'var(--surface)' : 'var(--border)',
        color: (item.isUser || item.active) ? 'black' : 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.85rem',
        fontWeight: 900
      }}>
        {item.arrived && !item.active && !item.isUser ? <MapPin size={14} /> : item.pos}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 800, color: item.isUser ? 'var(--primary)' : 'var(--text)', margin: 0 }}>
          {item.label}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <p style={{ fontSize: '0.75rem', color: (item.active || item.isStalled) ? 'var(--success)' : item.arrived ? 'var(--primary)' : 'var(--text-muted)', fontWeight: (item.active || item.arrived || item.isStalled) ? 700 : 400, margin: 0 }}>
            {item.isStalled ? `Esperando... 🕒 ${fmt(localTimer)}` : item.active ? `Atendiendo... ⏳ ${fmt(localTimer)}` : item.status}
          </p>
          {item.isStalled && <span className="blinking-timer" style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 900 }}>RETRASADO</span>}
          {item.arrived && !item.active && !item.isStalled && <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>LLEGÓ</span>}
          {item.source === 'walkin' && !item.isUser && <span style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>📍 REFERIDO</span>}
        </div>
      </div>
      {item.active && !isGlobalPaused && <div className="pulse-success" style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)' }} />}
      {isGlobalPaused && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />}
    </div>
  );
};

export const ClientView: React.FC<{ initialSlug?: string }> = ({ initialSlug }) => {
  const [selectedBusinessSlug, setSelectedBusinessSlug] = useState<string | null>(initialSlug || null);
  const [dbBusiness, setDbBusiness] = useState<BusinessData | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkData, setLinkData] = useState({ name: '', contact: '' });
  const [hasAppointment, setHasAppointment] = useState(false);
  const [isGlobalPaused, setIsGlobalPaused] = useState(false);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewData, setReviewData] = useState({ name: '', rating: 5, comment: '' });
  const [approvedReviews, setApprovedReviews] = useState<any[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('myturn_chat_session_id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('myturn_chat_session_id', id);
    }
    return id;
  });

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [showMoreActions, setShowMoreActions] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSmallScreen = windowWidth < 480;

  const business = dbBusiness;

  const fetchApprovedReviews = useCallback(async () => {
    if (!dbBusiness?.id) return;
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('tenant_id', dbBusiness.id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    if (data) setApprovedReviews(data);
  }, [dbBusiness?.id]);

  const fetchChatMessages = useCallback(async () => {
    if (!dbBusiness?.id) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('tenant_id', dbBusiness.id)
      .or(`session_id.eq.${sessionId},is_broadcast.eq.true`)
      .order('created_at', { ascending: true });
    if (data) {
      setChatMessages(data);
      const lastSeen = localStorage.getItem('myturn_chat_last_seen') || '1970-01-01';
      const unread = data.filter(m => !m.is_from_client && m.created_at > lastSeen).length;
      setUnreadCount(showChat ? 0 : unread);
    }
  }, [dbBusiness?.id, sessionId, showChat]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !dbBusiness?.id) return;
    const msg = chatInput;
    setChatInput('');
    const { error } = await supabase.from('messages').insert({
      tenant_id: dbBusiness.id,
      session_id: sessionId,
      customer_name: (linkData.name || 'Cliente').split(' (')[0],
      content: msg,
      is_from_client: true
    });
    if (error) {
      alert('Error enviando mensaje');
      setChatInput(msg);
    }
  };


  const [isLinked, setIsLinked] = useState(false);

  // Profile & Appointment Sync
  useEffect(() => {
    const fetchProfileAndAppointment = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const deviceId = localStorage.getItem('myturn_client_device_id') || '';

      // 1. Check if linked & Auto-link it if logged in
      if (dbBusiness?.id) {
        const query = session?.user?.id
          ? supabase.from('saved_tenants').select('id').eq('tenant_id', dbBusiness.id).eq('user_id', session.user.id).maybeSingle()
          : supabase.from('saved_tenants').select('id').eq('tenant_id', dbBusiness.id).eq('client_device_id', deviceId).maybeSingle();
        
        const { data: link } = await query;
        if (link) {
          setIsLinked(true);
        } else if (session?.user) {
          // Auto-link for logged users visiting via direct link
          await supabase.from('saved_tenants').upsert({
            tenant_id: dbBusiness.id,
            user_id: session.user.id,
            client_device_id: deviceId
          });
          setIsLinked(true);
        } else {
          setIsLinked(false);
        }
      }

      if (session?.user) {
        // 2. Fetch Profile
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, phone')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (profile) {
          setLinkData({
            name: profile.full_name || '',
            contact: profile.phone || ''
          });
        }

        // 3. Fetch Active Appointment (Persistence Fix)
        if (dbBusiness?.id) {
          const { data: activeApt } = await supabase
            .from('appointments')
            .select('id')
            .eq('tenant_id', dbBusiness.id)
            .eq('client_user_id', session.user.id)
            .in('status', ['pending', 'waiting', 'attending'])
            .maybeSingle();
          
          if (activeApt) {
            localStorage.setItem(`myturn_active_appointment_id_${dbBusiness.id}`, activeApt.id);
            setHasAppointment(true);
          } else {
            localStorage.removeItem(`myturn_active_appointment_id_${dbBusiness.id}`);
            setHasAppointment(false);
          }
        }
      }
    };
    fetchProfileAndAppointment();
  }, [dbBusiness?.id]);

  const handleUnlink = async () => {
    if (!dbBusiness?.id) return;
    const { data: { session } } = await supabase.auth.getSession();
    const deviceId = localStorage.getItem('myturn_client_device_id') || '';

    const query = session?.user?.id
      ? supabase.from('saved_tenants').delete().eq('tenant_id', dbBusiness.id).eq('user_id', session.user.id)
      : supabase.from('saved_tenants').delete().eq('tenant_id', dbBusiness.id).eq('client_device_id', deviceId);
    
    const { error } = await query;
    if (!error) {
      setIsLinked(false);
    }
  };

  useEffect(() => {
    if (!selectedBusinessSlug) {
      setDbBusiness(null);
      return;
    }

    // Dynamic SaaS fetch by Slug
    const fetchSaaSInfo = async () => {
      try {
        // Search by slug OR by ID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedBusinessSlug);
        const query = isUuid 
          ? supabase.from('tenants').select('*').eq('id', selectedBusinessSlug).single()
          : supabase.from('tenants').select('*').eq('slug', selectedBusinessSlug).single();
        
        const { data: tenant, error } = await query;
        
        if (tenant && !error) {
          const { data: sData } = await supabase.from('services').select('*').eq('tenant_id', tenant.id);
          const serviceList = sData ? sData.map(s => ({
            id: s.id,
            name: s.name,
            price: s.price || 0,
            duration: s.duration_minutes || 30,
            icon: s.icon || 'Scissors'
          })) : [];

          setDbBusiness({
            id: tenant.id,
            name: tenant.name,
            professional: tenant.professional_name || tenant.owner || 'Profesional Principal',
            title: tenant.professional_title || tenant.industry || 'Servicios Profesionales',
            awards: [],
            services: serviceList,
            logo: tenant.logo || 'https://images.unsplash.com/photo-1593702295974-2510d9ec9a57?w=128&h=128&fit=crop',
            rating: tenant.rating_value || 5.0,
            reviews: tenant.reviews_count || 1,
            address: tenant.address || 'Ubicación local',
            mapUrl: tenant.map_url || '#',
            showReviews: tenant.show_reviews ?? false,
            bookingMode: (tenant.booking_mode as any) || 'online',
            color: tenant.color || '#f59e0b',
            slogan: tenant.slogan || '',
            isOpen: tenant.is_open ?? true,
            schedule: tenant.schedule || []
          });
          if (tenant.color) {
            document.documentElement.style.setProperty('--primary', tenant.color);
          }
          // Dynamic OG meta tags so social shares show the business logo & name
          const setMeta = (property: string, content: string) => {
            let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
            if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
            el.setAttribute('content', content);
          };
          const businessLogo = tenant.logo || '';
          const businessSlogan = tenant.slogan || `Reserva tu turno en ${tenant.name}`;
          document.title = tenant.name;
          setMeta('og:title', tenant.name);
          setMeta('og:description', businessSlogan);
          setMeta('og:image', businessLogo);
          setMeta('og:url', window.location.href);
          setMeta('og:type', 'website');
          // Persistence for refresh
          localStorage.setItem('myturn_last_view', 'client');
          localStorage.setItem('myturn_active_business_slug', selectedBusinessSlug);
          setNotFound(false);
        } else {
          setDbBusiness(null);
          setNotFound(true);
        }
      } catch (err) {
        setNotFound(true);
      }
    };
    fetchSaaSInfo();
  }, [selectedBusinessSlug]);

  useEffect(() => {
    if (!dbBusiness) return;

    const fetchQueue = async () => {
      // Fetch appointments AND services to get durations
      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .eq('tenant_id', dbBusiness.id)
        .in('status', ['pending', 'waiting', 'attending'])
        .order('date_time', { ascending: true });

      const { data: svcs } = await supabase
        .from('services')
        .select('id, duration_minutes')
        .eq('tenant_id', dbBusiness.id);

      if (appts) {
        const myId = localStorage.getItem(`myturn_active_appointment_id_${dbBusiness.id}`);
        setQueueItems(appts.map((d, index) => {
          const isAttending = d.status === 'attending';
          const isArrived = d.arrived;
          const isMyApt = d.id === myId;
          
          return {
            id: d.id,
            pos: index + 1,
            label: isMyApt 
              ? `Tú (${d.client_name.split(' (')[0]})` 
              : `Cliente #${100 + index}`,
            time: new Date(d.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            status: d.status === 'pending' ? 'Por confirmar' : isAttending ? 'Siguiendo Turno...' : isArrived ? 'En sala de espera' : 'En espera',
            active: isAttending,
            arrived: isArrived || isAttending,
            isUser: isMyApt,
            service_id: d.service_id,
            date_time: d.date_time,
            started_at: d.started_at,
            duration: svcs?.find(s => s.id === d.service_id)?.duration_minutes || 30,
            source: d.source || 'online'
          };
        }));
      }
    };

    fetchQueue();
    fetchApprovedReviews();
    fetchChatMessages();

    if (!dbBusiness?.id) return;

    const chan = supabase.channel('realtime:client_queue').on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'appointments', 
      filter: `tenant_id=eq.${dbBusiness.id}` 
    }, fetchQueue).subscribe();
    
    const tenantChan = supabase.channel('realtime:tenant_status').on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'tenants', 
      filter: `id=eq.${dbBusiness.id}` 
    }, (payload) => {
      if (payload.new) {
        const updated = payload.new as any;
        setDbBusiness(prev => prev ? ({ ...prev, isOpen: updated.is_open ?? true }) : null);
        if (updated.is_paused !== undefined) setIsGlobalPaused(updated.is_paused);
      }
    }).subscribe();
    
    const reviewChan = supabase.channel('realtime:reviews').on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'reviews', 
      filter: `tenant_id=eq.${dbBusiness.id}` 
    }, fetchApprovedReviews).subscribe();

    const chatChan = supabase.channel('realtime:chat').on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'messages', 
      filter: `tenant_id=eq.${dbBusiness.id}` 
    }, fetchChatMessages).subscribe();

    return () => { 
      supabase.removeChannel(chan); 
      supabase.removeChannel(tenantChan);
      supabase.removeChannel(reviewChan);
      supabase.removeChannel(chatChan);
    };
  }, [dbBusiness?.id, fetchChatMessages]);

  const getMyQueueInfo = () => {
    // For this prototype, we assume the user is NOT yet in the queue unless we have a 'local session' 
    // but we can calculate the general wait time
    const totalWait = queueItems.reduce((acc, item) => {
      let waitTime = item.duration || 30;
      if (item.active && item.started_at) {
        const elapsedMinutes = Math.floor((new Date().getTime() - new Date(item.started_at).getTime()) / 60000);
        waitTime = Math.max(0, waitTime - elapsedMinutes);
      }
      return acc + waitTime;
    }, 0);
    return {
      wait: totalWait,
      clients: queueItems.length,
      nextTurn: (queueItems[queueItems.length - 1]?.pos || 0) + 1
    };
  };

  const queueInfo = getMyQueueInfo();
  
  // Logic for stalling: If the first item in queue is overdue and NOT being attended
  const firstItem = queueItems[0];
  const isQueueStalled = !!(firstItem && !firstItem.active && new Date().getTime() > new Date(firstItem.date_time).getTime());

  const handleSaveToHub = async () => {
    if (!dbBusiness || !linkData.name) return;
    setIsLinking(true);
    const deviceId = localStorage.getItem('myturn_client_device_id') || crypto.randomUUID();
    localStorage.setItem('myturn_client_device_id', deviceId);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    await supabase.from('saved_tenants').upsert({
      client_device_id: deviceId,
      tenant_id: dbBusiness.id,
      client_name: linkData.name,
      client_contact: linkData.contact,
      user_id: session?.user?.id || null
    });

    // Update central users table if logged in
    if (session?.user) {
      await supabase.from('users').update({
        full_name: linkData.name,
        phone: linkData.contact
      }).eq('id', session.user.id);
    }
    
    setIsLinking(false);
    setShowLinkModal(false);
    setIsLinked(true);
    alert('¡Negocio guardado en tu panel personal!');
  };






  if (notFound) {
    return (
      <div className="animate-fade-in card" style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
        <X size={48} color="var(--accent)" style={{ marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem' }}>Negocio no encontrado</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>El enlace que seguiste podría estar roto o el negocio ha cambiado su dirección.</p>
        <button className="btn btn-primary" onClick={() => setSelectedBusinessSlug(null)}>
          Ver Directorio de Negocios
        </button>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', paddingBottom: '2rem' }}>
        <ClientUserHub onSelectBusiness={setSelectedBusinessSlug} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ 
      width: '100%',
      maxWidth: '600px', 
      margin: '0 auto', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: isSmallScreen ? '1rem' : '1.5rem', 
      padding: isSmallScreen ? '0 0.25rem 2rem' : '0 0 2rem' 
    }}>
      {showBooking && (
        <BookingFlow 
          tenantId={business.id}
          sessionId={sessionId}
          queueInfo={queueInfo}
          onClose={() => setShowBooking(false)} 
          onSuccess={() => setHasAppointment(true)}
        />
      )}

      {showShareModal && (() => {
        // Build the canonical business URL (clean link, not the user's current session URL)
        const canonicalSlug = business?.slug || selectedBusinessSlug || dbBusiness?.id;
        const businessUrl = `${window.location.origin}/${canonicalSlug}`;
        const shareUrl = encodeURIComponent(businessUrl);
        const shareText = encodeURIComponent(`¡Visita ${business?.name || 'este negocio'} y reserva tu turno en línea!`);
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${shareUrl}&margin=10`;
        const links = [
          { label: 'WhatsApp', color: '#25D366', emoji: '📱', href: `https://wa.me/?text=${shareText}%20${shareUrl}` },
          { label: 'Facebook', color: '#1877F2', emoji: '👥', href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}` },
          { label: 'Twitter / X', color: '#000', emoji: '🐦', href: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}` },
          { label: 'Correo', color: '#EA4335', emoji: '✉️', href: `mailto:?subject=${encodeURIComponent('Reserva en ' + (business?.name || 'el negocio'))}&body=${shareText}%20${shareUrl}` },
        ];
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '380px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Compartir {business?.name || 'Negocio'}</h3>
                <button className="btn btn-outline" style={{ padding: '0.3rem', borderRadius: '50%' }} onClick={() => setShowShareModal(false)}><X size={18} /></button>
              </div>

              {/* QR Code */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>ESCANEA PARA ABRIR EN OTRO TELÉFONO</p>
                <img 
                  src={qrSrc} 
                  alt="QR Code" 
                  style={{ width: '160px', height: '160px', borderRadius: 'var(--radius-md)', border: '4px solid white', background: 'white' }}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', wordBreak: 'break-all' }}>{businessUrl}</p>
              </div>

              {/* Social Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {links.map(l => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: l.color, color: '#fff', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{l.emoji}</span>
                    {l.label}
                  </a>
                ))}
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', marginTop: '0.25rem' }}
                  onClick={() => { navigator.clipboard.writeText(businessUrl); alert('¡Enlace copiado!'); setShowShareModal(false); }}
                >
                  📋 Copiar enlace
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showLinkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '380px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem', textAlign: 'center' }}>Vincular Negocio 🔗</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Guarda este negocio en tu panel para agendar más rápido.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>TU NOMBRE</label>
                <input 
                  type="text" 
                  value={linkData.name} 
                  onChange={(e) => setLinkData({ ...linkData, name: e.target.value })}
                  placeholder="Ej: Carlos Ruiz"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>TÉLEFONO O CORREO</label>
                <input 
                  type="text" 
                  value={linkData.contact} 
                  onChange={(e) => setLinkData({ ...linkData, contact: e.target.value })}
                  placeholder="Para identificarte con el negocio"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowLinkModal(false)} style={{ flex: 1 }}>Cerrar</button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveToHub}
                disabled={!linkData.name || isLinking}
                style={{ flex: 2, fontWeight: 900 }}
              >
                {isLinking ? 'Vinculando...' : 'GUARDAR NEGOCIO'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-outline" style={{ padding: '0.4rem', borderRadius: '50%' }} onClick={() => {
          localStorage.removeItem('myturn_active_business_slug');
          localStorage.setItem('myturn_last_view', 'landing');
          setSelectedBusinessSlug(null);
        }}>
          <ChevronLeft size={24} />
        </button>
        
        <div style={{ 
          display: 'flex', 
          gap: isSmallScreen ? '0.5rem' : '1rem', 
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginRight: '0.25rem'
        }}>
          <button 
            className="btn btn-outline" 
            style={{ padding: '0.4rem', borderRadius: '50%' }} 
            onClick={() => setShowLinkModal(true)} 
            title="Vincularme a este negocio"
          >
            <Plus size={isSmallScreen ? 20 : 18} />
          </button>
          
          <button 
            className="btn btn-outline" 
            style={{ padding: '0.4rem', borderRadius: '50%' }} 
            title="Compartir este negocio"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 size={isSmallScreen ? 20 : 18} />
          </button>
          
          <button 
            className="btn btn-outline" 
            style={{ padding: '0.4rem', borderRadius: '50%' }} 
            title="Activar alertas de turno"
            onClick={async () => {
              const granted = await Notification.requestPermission();
              if (granted === 'granted') alert('Alertas activadas');
            }}
          >
            <Bell size={isSmallScreen ? 20 : 18} />
          </button>

          <div style={{ position: 'relative' }}>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0.4rem', borderRadius: '50%' }} 
              title="Chat con el negocio"
              onClick={() => {
                setShowChat(!showChat);
                if (!showChat) {
                  localStorage.setItem('myturn_chat_last_seen', new Date().toISOString());
                  setUnreadCount(0);
                }
              }}
            >
              <MessageSquare size={isSmallScreen ? 20 : 18} />
              {unreadCount > 0 && (
                <span style={{ 
                  position: 'absolute', 
                  top: '-4px', 
                  right: '-4px', 
                  background: '#ff3b30', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: '18px', 
                  height: '18px', 
                  fontSize: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 900,
                  border: '2px solid var(--background)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Chat Dropdown Window */}
            {showChat && (
              <div className="card animate-scale-in" style={{ 
                position: 'absolute', 
                top: 'calc(100% + 4px)', 
                right: '0', 
                width: 'min(350px, calc(100vw - 32px))', 
                height: 'min(450px, 70vh)', 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden', 
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)', 
                borderRadius: '1.5rem', 
                border: '1px solid var(--border)', 
                background: 'var(--surface)',
                zIndex: 1300
              }}>
                <div style={{ padding: '1rem 1.25rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Chat de Atención</span>
                  </div>
                  <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>
                
                <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--background)' }}>
                  {chatMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>¿Alguna duda sobre tu turno?</p>
                    </div>
                  ) : (
                    chatMessages.map((m, idx) => (
                      <div key={m.id || idx} style={{ alignSelf: m.is_from_client ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                        <div style={{ 
                          padding: '0.6rem 0.9rem', 
                          borderRadius: m.is_from_client ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0', 
                          background: m.is_broadcast ? 'rgba(245,158,11,0.15)' : m.is_from_client ? 'var(--primary)' : 'var(--surface)',
                          color: m.is_broadcast ? 'var(--primary)' : m.is_from_client ? 'black' : 'var(--text)',
                          border: m.is_broadcast ? '1px solid var(--primary)' : 'none',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          boxShadow: 'var(--shadow-sm)',
                          direction: 'ltr',
                          textAlign: 'left'
                        }}>
                          {m.image_url && (
                            <img 
                              src={m.image_url} 
                              alt="Ad" 
                              style={{ width: '100%', borderRadius: '0.5rem', marginBottom: '0.5rem', display: 'block' }} 
                              onLoad={(e) => {
                                 const target = e.target as any;
                                 target.parentNode.scrollIntoView({ behavior: 'smooth' });
                              }}
                            />
                          )}
                          {m.is_broadcast ? (
                            <div className="rich-content" dangerouslySetInnerHTML={{ __html: m.content }} />
                          ) : (
                            m.content
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Escribe aquí..."
                    style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 'var(--radius-full)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem' }}
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={!chatInput.trim()}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'black', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Header Profile */}
      <div className="card" style={{ padding: isSmallScreen ? '1rem' : '1.5rem', background: 'linear-gradient(135deg, var(--surface) 0%, rgba(245,158,11,0.05) 100%)' }}>
        <div style={{ display: 'flex', gap: isSmallScreen ? '0.75rem' : '1.25rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <img 
              src={business?.logo} 
              alt={business?.name} 
              style={{ width: isSmallScreen ? '64px' : '84px', height: isSmallScreen ? '64px' : '84px', borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: '2px solid var(--primary)' }} 
            />
            <div style={{ position: 'absolute', bottom: '-8px', right: '-8px', background: 'var(--primary)', color: 'black', padding: '4px', borderRadius: '50%', border: '2px solid var(--surface)' }}>
              <Award size={14} />
            </div>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 900, 
              letterSpacing: '-0.5px', 
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }} title={business?.name}>
              {business?.name}
            </h2>
            <div style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 800, marginTop: '0.2rem', textTransform: 'uppercase' }}>
              {business?.professional}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {business?.title}
            </p>
            {business?.showReviews && (
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.8rem' }}
              >
                <div 
                  onClick={() => document.getElementById('testimonios-section')?.scrollIntoView({ behavior: 'smooth' })}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  <Star size={12} color="#f59e0b" fill="#f59e0b" />
                  <span style={{ color: 'var(--text)', fontWeight: 800 }}>
                    {approvedReviews.length > 0 
                      ? (approvedReviews.reduce((acc, r) => acc + r.rating, 0) / approvedReviews.length).toFixed(1)
                      : (business?.rating || 5.0)}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    ({approvedReviews.length} {approvedReviews.length === 1 ? 'reseña' : 'reseñas'})
                  </span>
                </div>
                <button 
                  onClick={() => setShowReviewModal(true)}
                  style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                >
                  Dejar opinión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Status / Smart Timer */}
      {hasAppointment ? (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isGlobalPaused && (
            <div className="card animate-pulse" style={{ background: 'rgba(239,68,68,0.1)', borderColor: '#ef4444', padding: isSmallScreen ? '0.75rem' : '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="pulse-danger" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ef4444', margin: 0, lineHeight: 1.2 }}>EL PROFESIONAL HIZO UNA PAUSA Y REINICIA EN BREVE</p>
            </div>
          )}
          <div className="card" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'var(--success)', padding: isSmallScreen ? '0.75rem' : '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 color="var(--success)" size={20} />
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)', margin: 0 }}>
              {(() => {
                const myId = localStorage.getItem(`myturn_active_appointment_id_${dbBusiness.id}`);
                const apt = queueItems.find(q => q.id === myId);
                const localToday = getLocalDateStr();
                const isToday = apt?.date_time ? getLocalDateStr(new Date(apt.date_time)) === localToday : false;
                if (isToday) {
                  return `¡Tienes un turno activo para hoy a las ${apt?.time || '...'}!`;
                } else if (apt?.date_time) {
                  const dateStr = new Date(apt.date_time).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
                  return `Tienes una cita programada para el ${dateStr} a las ${apt.time}.`;
                }
                return '¡Tienes un turno activo!';
              })()}
            </p>
          </div>
          <div style={{ textAlign: 'center', padding: '0 1rem', marginTop: '0.5rem', marginBottom: '-0.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, lineHeight: '1.4', margin: 0 }}>
              <span style={{ color: 'var(--primary)' }}>⚠️ Nota:</span> El tiempo estimado está sujeto a cambio, activa las alertas y llega antes a tu cita.
            </p>
          </div>
          <SmartTimer 
            remainingMinutes={(() => {
              const myId = localStorage.getItem(`myturn_active_appointment_id_${dbBusiness.id}`);
              const apt = queueItems.find(q => q.id === myId);
              const myIdx = queueItems.findIndex(q => q.id === myId);
              
              if (apt && myIdx !== -1) {
                // 1. Wait based on people ahead
                const queueWait = queueItems.slice(0, myIdx).reduce((acc, item) => {
                    const baseDuration = item.duration || 30;
                    if (item.active && item.started_at) {
                      const elapsedMinutes = Math.floor((new Date().getTime() - new Date(item.started_at).getTime()) / 60000);
                      const remaining = baseDuration - elapsedMinutes;
                      return acc + remaining; 
                    }
                    return acc + baseDuration;
                  }, 0);
                  const adjustedQueueWait = Math.max(0, queueWait);
                
                const scheduledDate = new Date(apt.date_time);
                const now = new Date();
                const timeUntilScheduled = Math.max(0, Math.floor((scheduledDate.getTime() - now.getTime()) / 60000));
                
                return Math.max(adjustedQueueWait, timeUntilScheduled);
              }
              return queueInfo.wait;
            })()} 
            remainingClients={(() => {
              const myId = localStorage.getItem(`myturn_active_appointment_id_${dbBusiness.id}`);
              const myIdx = queueItems.findIndex(q => q.id === myId);
              return myIdx !== -1 ? myIdx : queueInfo.clients;
            })()} 
            turnNumber={(() => {
              const myId = localStorage.getItem(`myturn_active_appointment_id_${dbBusiness.id}`);
              const item = queueItems.find(q => q.id === myId);
              return item ? item.pos : queueInfo.nextTurn;
            })()} 
            status={(() => {
              const myId = localStorage.getItem(`myturn_active_appointment_id_${dbBusiness.id}`);
              const item = queueItems.find(q => q.id === myId);
              const myIdx = queueItems.findIndex(q => q.id === myId);
              if (item?.active) return 'in_progress';
              if (myIdx === 0) return 'next';
              return 'waiting';
            })()}
            isPaused={isGlobalPaused}
            isStalled={isQueueStalled}
            isOpen={dbBusiness.isOpen}
            isToday={(() => {
              const myId = localStorage.getItem(`myturn_active_appointment_id_${dbBusiness.id}`);
              const item = queueItems.find(q => q.id === myId);
              if (!item?.date_time) return true; 
              return getLocalDateStr(new Date(item.date_time)) === getLocalDateStr();
            })()}
          />
        </div>
      ) : (
        <div className="card" style={{ padding: isSmallScreen ? '1rem' : '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {business.bookingMode === 'manual' ? '📍 Orden de Llegada' : '¿Listo para tu cita?'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {business.bookingMode === 'manual' 
              ? 'Este negocio solo atiende por orden de llegada. ¡Ven directamente al establecimiento!' 
              : 'Reserva ahora y sigue tu turno en tiempo real.'}
          </p>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontWeight: 800, opacity: business.bookingMode === 'manual' ? 0.5 : 1, cursor: business.bookingMode === 'manual' ? 'not-allowed' : 'pointer' }}
            onClick={() => business.bookingMode !== 'manual' && setShowBooking(true)}
            disabled={business.bookingMode === 'manual'}
          >
            {business.bookingMode === 'manual' ? 'Agendamiento Online no disponible' : 'Agendar Turno Ahora'} <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
          </button>
        </div>
      )}

      {/* Live Queue Section */}
      <section className="card" style={{ padding: isSmallScreen ? '1rem' : '1.5rem', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <LayoutGrid size={20} color="var(--primary)" /> En Vivo: La Cola
          </h3>
          <span style={{ 
            fontSize: '0.75rem', 
            background: !dbBusiness?.isOpen ? 'rgba(239,68,68,0.1)' : (isGlobalPaused ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'), 
            color: !dbBusiness?.isOpen ? '#ef4444' : (isGlobalPaused ? 'var(--primary)' : 'var(--success)'), 
            padding: '0.2rem 0.6rem', 
            borderRadius: 'var(--radius-full)', 
            fontWeight: 800 
          }}>
            {!dbBusiness?.isOpen ? 'Cerrado' : (isGlobalPaused ? 'En Pausa' : 'Abierto')}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {queueItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              La fila está vacía en este momento.
            </div>
          ) : (
            queueItems.map((item) => (
              <QueueItem key={item.pos} item={item} isGlobalPaused={isGlobalPaused} />
            ))
          )}
        </div>
      </section>

      {/* Services List Tagged */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Servicios del Professional</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
          {business?.services.map(s => (
            <div key={s.id} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
              <div style={{ flex: 1 }}>
                <div>{s.name}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>${s.price} • {s.duration} min</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews Section */}
      <div id="testimonios-section" className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Testimonios de Clientes</h3>
          <button 
            onClick={() => setShowReviewModal(true)}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
          >
            Escribir Reseña
          </button>
        </div>
        
        {approvedReviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {approvedReviews.slice(0, showAllReviews ? undefined : 3).map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{r.client_name}</span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1,2,3,4,5].map(star => <Star key={star} size={10} fill={star <= r.rating ? "var(--primary)" : "none"} color={star <= r.rating ? "var(--primary)" : "var(--text-muted)"} />)}
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>"{r.comment}"</p>
              </div>
            ))}
            
            {approvedReviews.length > 3 && (
              <button 
                onClick={() => setShowAllReviews(!showAllReviews)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', padding: '0.5rem 0' }}
              >
                {showAllReviews ? 'Ver menos ↑' : `Ver todas (${approvedReviews.length}) ↓`}
              </button>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Aún no hay reseñas aprobadas. ¡Sé el primero en opinar!</p>
        )}
      </div>

      {/* Info & Support */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <a 
          href={business?.mapUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="card" 
          style={{ padding: '1rem', textDecoration: 'none', color: 'inherit', border: '1px solid var(--border)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <MapPin size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)' }}>Ubicación</span>
          </div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: 0 }}>{business?.address}</p>
        </a>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Calendar size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Horario</span>
          </div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: 0 }}>
            {(() => {
              if (!business?.schedule) return "Consulta el Horario";
              const now = new Date();
              const dayNameRaw = now.toLocaleDateString('es-ES', { weekday: 'long' });
              const dayName = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1);
              const sched = business.schedule.find(s => s.day === dayName);
              if (!sched?.isOpen) return "Cerrado hoy";
              return sched.hours || "09:00 - 18:00";
            })()}
          </p>
        </div>
      </div>

      {hasAppointment && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button 
            className="btn btn-outline" 
            style={{ flex: 1, padding: '1rem', borderColor: '#ef4444', color: '#ef4444' }} 
            onClick={async () => { 
                const myId = localStorage.getItem(`myturn_active_appointment_id_${dbBusiness.id}`);
                if (myId) {
                    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', myId);
                }
                localStorage.removeItem(`myturn_active_appointment_id_${dbBusiness.id}`); 
                setHasAppointment(false); 
            }}
          >
            Cancelar Turno
          </button>
        </div>
      )}

      {showReviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '380px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', textAlign: 'center' }}>Tu Opinión Vale ⭐</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                Cuéntanas cómo fue tu experiencia en {business?.name}.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                {[1, 2, 3, 4, 5].map(star => (
                   <button 
                    key={star}
                    onClick={() => setReviewData({...reviewData, rating: star})}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
                   >
                     <Star 
                        size={28} 
                        fill={star <= reviewData.rating ? "var(--primary)" : "none"} 
                        color={star <= reviewData.rating ? "var(--primary)" : "var(--text-muted)"} 
                     />
                   </button>
                ))}
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>TU NOMBRE</label>
                <input 
                  type="text" 
                  value={reviewData.name} 
                  onChange={(e) => setReviewData({ ...reviewData, name: e.target.value })}
                  placeholder="Ej: Carlos Ruiz"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>COMENTARIO</label>
                <textarea 
                  rows={3}
                  value={reviewData.comment} 
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  placeholder="¿Qué tal estuvo el servicio?"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)', resize: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowReviewModal(false)} style={{ flex: 1 }}>Cancelar</button>
              <button 
                className="btn btn-primary" 
                disabled={!reviewData.name || isSubmittingReview}
                onClick={async () => {
                   if (!dbBusiness) return;
                   setIsSubmittingReview(true);
                   const { error } = await supabase.from('reviews').insert({
                     tenant_id: dbBusiness.id,
                     client_name: reviewData.name,
                     rating: reviewData.rating,
                     comment: reviewData.comment,
                     is_approved: false
                   });
                   setIsSubmittingReview(false);
                   if (!error) {
                     alert('¡Gracias! Tu reseña ha sido enviada y será visible una vez que el administrador la apruebe.');
                     setShowReviewModal(false);
                     setReviewData({ name: '', rating: 5, comment: '' });
                   } else {
                     alert('Error al enviar la reseña. Inténtalo de nuevo.');
                   }
                }}
                style={{ flex: 2, fontWeight: 900 }}
              >
                  {isSubmittingReview ? 'Enviando...' : 'ENVIAR RESEÑA'}
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Bottom Unlink Action */}
      {isLinked && (
        <div style={{ 
          marginTop: '2rem', 
          padding: '2rem 1rem', 
          borderTop: '1px solid var(--border)', 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            ¿Ya no frecuentas este negocio?
          </p>
          <button 
            onClick={() => {
              if (window.confirm('¿Estás seguro de que quieres desvincularte de este negocio? Ya no aparecerá en tu panel personal.')) {
                handleUnlink();
              }
            }}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#ef4444', 
              fontSize: '0.9rem', 
              fontWeight: 800, 
              textDecoration: 'underline',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Link2Off size={16} /> Desvincularme de este negocio
          </button>
        </div>
      )}
    </div>
  );
};
