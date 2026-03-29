import React, { useState, useEffect } from 'react';
import { ChevronLeft, Star, Clock, MapPin, Calendar, Bell, ArrowRight, Share2, History, MessageSquare, Award, CheckCircle, CheckCircle2, LayoutGrid } from 'lucide-react';
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
  services: string[];
  logo: string;
  rating: number;
  reviews: number;
  address: string;
  mapUrl: string;
  showReviews: boolean;
  bookingMode: 'online' | 'manual' | 'hybrid';
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
  const [hasAppointment, setHasAppointment] = useState(false);
  const [isGlobalPaused, setIsGlobalPaused] = useState(false);
  const [queueItems, setQueueItems] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedBusinessSlug) {
      setDbBusiness(null);
      return;
    }

    // Dynamic SaaS fetch by Slug
    const fetchSaaSInfo = async () => {
      const { data: tenant } = await supabase.from('tenants').select('*').eq('slug', selectedBusinessSlug).single();
      
      if (tenant) {
        // Fetch services for this tenant
        const { data: sData } = await supabase.from('services').select('name').eq('tenant_id', tenant.id);
        const serviceNames = sData ? sData.map(s => s.name) : ['Servicio General'];

        setDbBusiness({
          id: tenant.id,
          name: tenant.name,
          professional: tenant.owner || 'Profesional Principal',
          title: tenant.industry || 'Servicios Profesionales',
          awards: [],
          services: serviceNames,
          logo: tenant.logo || 'https://images.unsplash.com/photo-1593702295974-2510d9ec9a57?w=128&h=128&fit=crop',
          rating: 5.0,
          reviews: 1,
          address: tenant.address || 'Ubicación local',
          mapUrl: '#',
          showReviews: false,
          bookingMode: 'online'
        });
      } else {
        setDbBusiness(null);
      }
    };
    fetchSaaSInfo();
  }, [selectedBusinessSlug]);

  useEffect(() => {
    if (!dbBusiness) return;

    const fetchQueue = async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('tenant_id', dbBusiness.id)
        .in('status', ['waiting', 'attending', 'arrived'])
        .order('date_time', { ascending: true });

      if (data) {
        setQueueItems(data.map((d, index) => {
          const isAttending = d.status === 'attending';
          const isArrived = d.status === 'arrived';
          return {
            pos: index + 1,
            label: `Cliente #${100 + index} (${d.client_name.split(' (')[0]})`,
            status: isAttending ? 'Siguiendo Turno...' : isArrived ? 'En sala de espera' : `En espera (Aprox. ${Math.max(15, index * 25)} min)`,
            active: isAttending,
            arrived: isArrived || isAttending,
            isUser: false,
          };
        }));
      }
    };

    fetchQueue();

    const channel = supabase.channel('realtime:public_queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
         fetchQueue();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dbBusiness?.id]);



  const business = dbBusiness;


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
          onClose={() => { 
            setShowBooking(false); 
            setHasAppointment(true); 
          }} 
        />
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
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)', margin: 0 }}>¡Tienes un turno activo para hoy a las 14:30!</p>
          </div>
          <SmartTimer 
            remainingMinutes={120} 
            remainingClients={4} 
            turnNumber={5} 
            status="waiting" 
            isPaused={isGlobalPaused}
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
          <span style={{ fontSize: '0.75rem', background: isGlobalPaused ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: isGlobalPaused ? '#ef4444' : 'var(--success)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 800 }}>
            {isGlobalPaused ? 'Pausado' : 'Abierto'}
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
            <div key={s} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
              {s}
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
          <button className="btn btn-outline" style={{ flex: 1, padding: '1rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => setHasAppointment(false)}>
            Cancelar Turno
          </button>
          <button className="btn btn-outline" style={{ padding: '1rem' }}>
            <MessageSquare size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
