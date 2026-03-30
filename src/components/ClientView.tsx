import React, { useState, useEffect } from 'react';
import { ChevronLeft, Star, Clock, MapPin, Calendar, Bell, ArrowRight, Share2, History, MessageSquare, Award, CheckCircle, CheckCircle2, LayoutGrid, X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SmartTimer } from './SmartTimer';
import { BookingFlow } from './BookingFlow';
import { ClientUserHub } from './ClientUserHub';

interface BusinessData {
  id: string;
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
}

const QueueItem: React.FC<{ item: any, isGlobalPaused: boolean }> = ({ item, isGlobalPaused }) => {
  const [localTimer, setLocalTimer] = useState(25 * 60);

  React.useEffect(() => {
    if (item.active && !isGlobalPaused) {
      const interval = setInterval(() => {
        setLocalTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGlobalPaused, item.active]);

  const fmt = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`;

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
          <p style={{ fontSize: '0.75rem', color: item.active ? 'var(--success)' : item.arrived ? 'var(--primary)' : 'var(--text-muted)', fontWeight: (item.active || item.arrived) ? 700 : 400, margin: 0 }}>
            {item.active ? `Atendiendo... ⏳ ${fmt(localTimer)}` : item.status}
          </p>
          {item.arrived && !item.active && <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>LLEGÓ</span>}
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
            rating: 5.0,
            reviews: 1,
            address: tenant.address || 'Ubicación local',
            mapUrl: '#',
            showReviews: tenant.show_reviews ?? false,
            bookingMode: (tenant.booking_mode as any) || 'online',
            color: tenant.color || '#f59e0b',
            slogan: tenant.slogan || '',
            isOpen: tenant.is_open ?? true
          });
          if (tenant.color) {
            document.documentElement.style.setProperty('--primary', tenant.color);
          }
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
        .in('status', ['waiting', 'attending', 'arrived'])
        .order('date_time', { ascending: true });

      const { data: svcs } = await supabase
        .from('services')
        .select('id, duration_minutes')
        .eq('tenant_id', dbBusiness.id);

      if (appts) {
        const myId = localStorage.getItem('myturn_active_appointment_id');
        setQueueItems(appts.map((d, index) => {
          const isAttending = d.status === 'attending';
          const isArrived = d.status === 'arrived';
          const isMyApt = d.id === myId;
          
          return {
            id: d.id,
            pos: index + 1,
            label: isMyApt 
              ? `Tú (${d.client_name.split(' (')[0]})` 
              : `Cliente #${100 + index}`,
            time: new Date(d.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            status: isAttending ? 'Siguiendo Turno...' : isArrived ? 'En sala de espera' : 'En espera',
            active: isAttending,
            arrived: isArrived || isAttending,
            isUser: isMyApt,
            service_id: d.service_id
          };
        }));
      }
    };

    fetchQueue();
    const chan = supabase.channel('realtime:client_queue').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `tenant_id=eq.${dbBusiness.id}` }, fetchQueue).subscribe();
    
    // Realtime listener for business open/close status
    const tenantChan = supabase.channel('realtime:tenant_status').on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'tenants', 
      filter: `id=eq.${dbBusiness.id}` 
    }, (payload) => {
      if (payload.new) {
        const updated = payload.new as any;
        setDbBusiness(prev => prev ? ({ ...prev, isOpen: updated.is_open ?? true }) : null);
      }
    }).subscribe();

    return () => { 
      supabase.removeChannel(chan); 
      supabase.removeChannel(tenantChan);
    };
  }, [dbBusiness?.id]);

  const getMyQueueInfo = () => {
    // For this prototype, we assume the user is NOT yet in the queue unless we have a 'local session' 
    // but we can calculate the general wait time
    const totalWait = queueItems.reduce((acc, item) => {
      const svc = dbBusiness?.services.find(s => s.id === item.service_id);
      return acc + (svc?.duration || 25);
    }, 0);
    return {
      wait: totalWait,
      clients: queueItems.length,
      nextTurn: (queueItems[queueItems.length - 1]?.pos || 0) + 1
    };
  };

  const queueInfo = getMyQueueInfo();

  const handleSaveToHub = async () => {
    if (!dbBusiness || !linkData.name) return;
    setIsLinking(true);
    const deviceId = localStorage.getItem('myturn_client_device_id') || crypto.randomUUID();
    localStorage.setItem('myturn_client_device_id', deviceId);
    
    await supabase.from('saved_tenants').upsert({
      client_device_id: deviceId,
      tenant_id: dbBusiness.id,
      client_name: linkData.name,
      client_contact: linkData.contact
    });
    
    setIsLinking(false);
    setShowLinkModal(false);
    alert('¡Negocio guardado en tu panel personal!');
  };



  const business = dbBusiness;


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
      <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.5rem', textAlign: 'center' }}>Selecciona un Negocio</h2>
        <ClientUserHub onSelectBusiness={setSelectedBusinessSlug} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      {showBooking && (
        <BookingFlow 
          tenantId={business.id}
          queueInfo={queueInfo}
          onClose={() => { 
            setShowBooking(false); 
            setHasAppointment(true); 
          }} 
        />
      )}

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
        <button className="btn btn-outline" style={{ padding: '0.4rem', borderRadius: '50%' }} onClick={() => setSelectedBusinessSlug(null)}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" style={{ padding: '0.4rem', borderRadius: '50%' }} onClick={() => setIsGlobalPaused(!isGlobalPaused)} title="Simular Pausa Admin">
            <Clock size={18} color={isGlobalPaused ? '#ef4444' : 'currentColor'} />
          </button>
          <button className="btn btn-outline" style={{ padding: '0.4rem', borderRadius: '50%' }} onClick={() => setShowLinkModal(true)} title="Vincularme a este negocio">
            <Plus size={18} />
          </button>
          <button className="btn btn-outline" style={{ padding: '0.4rem', borderRadius: '50%' }}><Share2 size={18} /></button>
          <button className="btn btn-outline" style={{ padding: '0.4rem', borderRadius: '50%' }}><Bell size={18} /></button>
        </div>
      </div>

      {/* Header Profile */}
      <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, var(--surface) 0%, rgba(245,158,11,0.05) 100%)' }}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <img 
              src={business?.logo} 
              alt={business?.name} 
              style={{ width: '84px', height: '84px', borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: '2px solid var(--primary)' }} 
            />
            <div style={{ position: 'absolute', bottom: '-8px', right: '-8px', background: 'var(--primary)', color: 'black', padding: '4px', borderRadius: '50%', border: '2px solid var(--surface)' }}>
              <Award size={14} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>{business?.name}</h2>
            <div style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 800, marginTop: '0.2rem', textTransform: 'uppercase' }}>
              {business?.professional}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {business?.title}
            </p>
            {business?.showReviews && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{business?.rating}</span>
                <span>({business?.reviews} reseñas)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Status / Smart Timer */}
      {hasAppointment ? (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isGlobalPaused && (
            <div className="card animate-pulse" style={{ background: 'rgba(239,68,68,0.1)', borderColor: '#ef4444', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="pulse-danger" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>EL PROFESIONAL HIZO UNA PAUSA Y REINICIA EN BREVE</p>
            </div>
          )}
          <div className="card" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'var(--success)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 color="var(--success)" size={20} />
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)', margin: 0 }}>
              ¡Tienes un turno activo para hoy a las {(() => {
                const myId = localStorage.getItem('myturn_active_appointment_id');
                const apt = queueItems.find(q => q.id === myId);
                // Note: queueItems doesn't have the full date_time yet, we should probably fetch the full object if we want the actual saved time
                // For now, let's look for it in the raw appointments data (if we had it) or just use the first 'waiting' time
                return apt?.time || '9:00'; 
              })()}!
            </p>
          </div>
          <SmartTimer 
            remainingMinutes={(() => {
              const myId = localStorage.getItem('myturn_active_appointment_id');
              const myIdx = queueItems.findIndex(q => q.id === myId);
              if (myIdx !== -1) {
                return queueItems.slice(0, myIdx).reduce((acc, item) => {
                  const svc = dbBusiness?.services.find(s => s.id === item.service_id);
                  return acc + (svc?.duration || 25);
                }, 0);
              }
              return queueInfo.wait;
            })()} 
            remainingClients={(() => {
              const myId = localStorage.getItem('myturn_active_appointment_id');
              const myIdx = queueItems.findIndex(q => q.id === myId);
              return myIdx !== -1 ? myIdx : queueInfo.clients;
            })()} 
            turnNumber={(() => {
              const myId = localStorage.getItem('myturn_active_appointment_id');
              const item = queueItems.find(q => q.id === myId);
              return item ? item.pos : queueInfo.nextTurn;
            })()} 
            status={(() => {
              const myId = localStorage.getItem('myturn_active_appointment_id');
              const item = queueItems.find(q => q.id === myId);
              if (item?.active) return 'in_progress';
              return 'waiting';
            })()}
            isPaused={isGlobalPaused}
            isOpen={dbBusiness?.isOpen}
          />
        </div>
      ) : (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
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
      <section className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
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
          <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: 0 }}>09:00 - 18:00</p>
        </div>
      </div>

      {hasAppointment && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button 
            className="btn btn-outline" 
            style={{ flex: 1, padding: '1rem', borderColor: '#ef4444', color: '#ef4444' }} 
            onClick={async () => { 
                const myId = localStorage.getItem('myturn_active_appointment_id');
                if (myId) {
                    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', myId);
                }
                localStorage.removeItem('myturn_active_appointment_id'); 
                setHasAppointment(false); 
            }}
          >
            Cancelar Turno
          </button>
          <button className="btn btn-outline" style={{ padding: '1rem' }}>
            <MessageSquare size={20} />
          </button>
        </div>
      )}
      {/* Diagnostic Footer (Internal) */}
      <div style={{ position: 'fixed', bottom: '1rem', left: '1rem', opacity: 0.8, fontSize: '0.7rem', color: 'var(--primary)', fontFamily: 'monospace', zIndex: 9999, background: 'rgba(0,0,0,0.8)', padding: '0.4rem', border: '1px solid var(--primary)', borderRadius: '4px', pointerEvents: 'auto' }}>
        🚩 CLIENTE_ID: {dbBusiness?.id || 'NO_UUID'}
      </div>
    </div>
  );
};
