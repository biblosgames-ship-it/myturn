import React, { useState, useEffect } from 'react';
import { 
  Scissors, Clock, Plus, Trash2, Save, Calendar, Coffee, Moon, Sun, CheckCircle2, 
  Stethoscope, Palette, Brush, User, Heart, Activity, Car, Smartphone, Zap, Star, 
  Smile, Wind, Droplets, Briefcase, ShoppingBag
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const availableIcons = [
  { name: 'Scissors', Icon: Scissors },
  { name: 'Stethoscope', Icon: Stethoscope },
  { name: 'Palette', Icon: Palette },
  { name: 'Brush', Icon: Brush },
  { name: 'User', Icon: User },
  { name: 'Heart', Icon: Heart },
  { name: 'Activity', Icon: Activity },
  { name: 'Coffee', Icon: Coffee },
  { name: 'Car', Icon: Car },
  { name: 'Smartphone', Icon: Smartphone },
  { name: 'Zap', Icon: Zap },
  { name: 'Star', Icon: Star },
  { name: 'Smile', Icon: Smile },
  { name: 'Wind', Icon: Wind },
  { name: 'Droplets', Icon: Droplets },
  { name: 'Briefcase', Icon: Briefcase },
  { name: 'ShoppingBag', Icon: ShoppingBag },
];

interface Service {
  id?: string;
  name: string;
  price: number;
  duration: number;
  icon: string;
}

interface DaySchedule {
  day: string;
  isOpen: boolean;
  hours: string;
}

export const BarberManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'schedule' | 'brand' | 'reviews' | 'messages'>('brand');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [chatReply, setChatReply] = useState('');
  const [broadcastData, setBroadcastData] = useState({ content: '', imageUrl: '' });
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);


  const [weeksSchedule, setWeeksSchedule] = useState<DaySchedule[]>([
    { day: 'Lunes', isOpen: true, hours: '09:00 - 18:00' },
    { day: 'Martes', isOpen: true, hours: '09:00 - 18:00' },
    { day: 'Miércoles', isOpen: true, hours: '09:00 - 18:00' },
    { day: 'Jueves', isOpen: true, hours: '09:00 - 18:00' },
    { day: 'Viernes', isOpen: true, hours: '09:00 - 18:00' },
    { day: 'Sábado', isOpen: false, hours: '09:00 - 14:00' },
    { day: 'Domingo', isOpen: false, hours: '09:00 - 14:00' },
  ]);
  const [lunchBreak, setLunchBreak] = useState({ start: '13:00', end: '14:00', enabled: true });
  const [brand, setBrand] = useState({
    name: '',
    professionalName: '',
    professionalTitle: '',
    logo: '',
    color: '#f59e0b',
    slogan: '',
    showReviews: true,
    bookingMode: 'online' as 'online' | 'manual' | 'hybrid',
    closingTime: '20:00',
    address: '',
    mapUrl: '',
    ratingValue: 5.0,
    reviewsCount: 1
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReview, setNewReview] = useState({ client_name: '', rating: 5, comment: '' });

  useEffect(() => {
    const loadCatalog = async () => {
      // 1. Load Business Branding & Schedule
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
        if (userData?.tenant_id) {
          const { data: tenant } = await supabase.from('tenants').select('*').eq('id', userData.tenant_id).single();
          if (tenant) {
            setBrand({
              name: tenant.name || '',
              professionalName: tenant.professional_name || '',
              professionalTitle: tenant.professional_title || '',
              logo: tenant.logo || '',
              color: tenant.color || '#f59e0b',
              slogan: tenant.slogan || '',
              showReviews: tenant.show_reviews ?? true,
              bookingMode: (tenant.booking_mode as any) || 'online',
              closingTime: tenant.closing_time || '20:00',
              address: tenant.address || '',
              mapUrl: tenant.map_url || '',
              ratingValue: tenant.rating_value || 5.0,
              reviewsCount: tenant.reviews_count || 1
            });
            if (tenant.schedule) setWeeksSchedule(tenant.schedule);
            if (tenant.lunch_break) setLunchBreak(tenant.lunch_break);
            
            // Fetch Reviews
            const { data: revs } = await supabase.from('reviews').select('*').eq('tenant_id', userData.tenant_id).order('created_at', { ascending: false });
            if (revs) setReviews(revs);

            // Fetch Messages
            const { data: msgs } = await supabase.from('messages').select('*').eq('tenant_id', userData.tenant_id).order('created_at', { ascending: true });
            if (msgs) setChatMessages(msgs);
          }
        }
      }

      // 2. Load Services from DB
      const { data: dbServices } = await supabase.from('services').select('*').order('created_at', { ascending: true });
      if (dbServices && dbServices.length > 0) {
        setServices(dbServices.map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration: s.duration_minutes,
          icon: s.icon || 'Scissors'
        })));
      } else {
        setServices([]);
      }
      setIsLoading(false);
    };

    loadCatalog();

    // Realtime for Messages
    let msgChan: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
      if (userData?.tenant_id) {
        msgChan = supabase.channel('realtime:admin_messages').on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `tenant_id=eq.${userData.tenant_id}`
        }, (res) => {
          if (res.eventType === 'INSERT') {
            setChatMessages(prev => [...prev, res.new]);
          }
        }).subscribe();
      }
    };
    setupRealtime();

    return () => {
      if (msgChan) supabase.removeChannel(msgChan);
    };
  }, []);

  const handleSendReply = async () => {
    if (!chatReply.trim() || !selectedSessionId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
    if (userData?.tenant_id) {
       const msg = chatReply;
       setChatReply('');
       await supabase.from('messages').insert({
         tenant_id: userData.tenant_id,
         session_id: selectedSessionId,
         content: msg,
         is_from_client: false
       });
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastData.content.trim()) return;
    setIsSendingBroadcast(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
      if (userData?.tenant_id) {
         await supabase.from('messages').insert({
           tenant_id: userData.tenant_id,
           session_id: 'broadcast',
           content: broadcastData.content,
           image_url: broadcastData.imageUrl || null,
           is_from_client: false,
           is_broadcast: true,
           customer_name: 'ANUNCIO'
         });
         setBroadcastData({ content: '', imageUrl: '' });
         alert('¡Mensaje de difusión enviado con éxito!');
      }
    } catch (err) {
      console.error(err);
      alert('Error al enviar la difusión');
    } finally {
      setIsSendingBroadcast(false);
    }
  };


  const addService = () => {
    setServices([...services, { name: 'Nuevo Servicio', price: 0, duration: 30, icon: 'Star' }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: keyof Service, value: any) => {
    const newServices = [...services];
    newServices[index] = { ...newServices[index], [field]: value };
    setServices(newServices);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
      if (!userData?.tenant_id) throw new Error('No tenant found');

      let finalLogoUrl = brand.logo;

      // 1. Upload Logo if changed
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${userData.tenant_id}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath);
        
        finalLogoUrl = publicUrl;
      }

      // 2. Update Tenant Branding & Settings
      await supabase.from('tenants').update({ 
        name: brand.name,
        professional_name: brand.professionalName,
        professional_title: brand.professionalTitle,
        logo: finalLogoUrl,
        slogan: brand.slogan,
        color: brand.color,
        show_reviews: brand.showReviews,
        booking_mode: brand.bookingMode,
        closing_time: brand.closingTime,
        address: brand.address,
        map_url: brand.mapUrl,
        rating_value: brand.ratingValue,
        reviews_count: brand.reviewsCount,
        schedule: weeksSchedule,
        lunch_break: lunchBreak
      }).eq('id', userData.tenant_id);

      // 2. Sync Services
      const currentIds = services.filter(s => s.id).map(s => s.id);
      const { data: existing } = await supabase.from('services').select('id');
      
      if (existing) {
        const toDelete = existing.filter(e => !currentIds.includes(e.id)).map(e => e.id);
        if (toDelete.length > 0) {
          await supabase.from('services').delete().in('id', toDelete);
        }
      }

      const toUpsert = services.map(s => ({
        ...(s.id ? { id: s.id } : {}),
        name: s.name,
        price: s.price,
        duration_minutes: s.duration,
        icon: s.icon
      }));

      if (toUpsert.length > 0) {
        await supabase.from('services').upsert(toUpsert);
      }

      document.documentElement.style.setProperty('--primary', brand.color);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al guardar. Revisa tu conexión.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('brand')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'brand' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: activeTab === 'brand' ? '2px solid var(--primary)' : 'none'
          }}
        >
          Mi Marca
        </button>
        <button 
          onClick={() => setActiveTab('services')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'services' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: activeTab === 'services' ? '2px solid var(--primary)' : 'none'
          }}
        >
          Servicios y Precios
        </button>
        <button 
          onClick={() => setActiveTab('schedule')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'schedule' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: activeTab === 'schedule' ? '2px solid var(--primary)' : 'none'
          }}
        >
          Horarios y Descansos
        </button>
        <button 
          onClick={() => setActiveTab('reviews')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'reviews' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: activeTab === 'reviews' ? '2px solid var(--primary)' : 'none'
          }}
        >
          Reseñas y Feedback
        </button>
        <button 
          onClick={() => setActiveTab('messages')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'messages' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: activeTab === 'messages' ? '2px solid var(--primary)' : 'none',
            position: 'relative'
          }}
        >
          Mensajería de Clientes
          {chatMessages.filter(m => !m.is_read && m.is_from_client).length > 0 && (
            <span style={{ position: 'absolute', top: '0', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
              {chatMessages.filter(m => !m.is_read && m.is_from_client).length}
            </span>
          )}
        </button>

      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
            <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Cargando configuración...</p>
          </div>
        ) : activeTab === 'brand' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Personalización de Marca</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1.5rem', alignItems: 'start' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ 
                  width: '120px', 
                  height: '120px', 
                  borderRadius: 'var(--radius-lg)', 
                  background: `url(${brand.logo}) center/cover`,
                  border: '2px solid var(--border)',
                  overflow: 'hidden'
                }} />
                <label style={{ 
                  position: 'absolute', 
                  bottom: '-5px', 
                  right: '-5px', 
                  background: 'var(--primary)', 
                  color: 'black',
                  padding: '8px', 
                  borderRadius: '50%', 
                  border: '2px solid var(--surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Scissors size={16} />
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoFile(file);
                        const url = URL.createObjectURL(file);
                        setBrand({...brand, logo: url});
                      }
                    }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>NOMBRE DEL NEGOCIO</label>
                  <input 
                    type="text" 
                    value={brand.name}
                    onChange={(e) => setBrand({...brand, name: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontWeight: 600 }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>NOMBRE PROFESIONAL</label>
                    <input 
                      type="text" 
                      value={brand.professionalName}
                      onChange={(e) => setBrand({...brand, professionalName: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TÍTULO / ESPECIALIDAD</label>
                    <input 
                      type="text" 
                      value={brand.professionalTitle}
                      onChange={(e) => setBrand({...brand, professionalTitle: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SLOGAN / FRASE</label>
                  <input 
                    type="text" 
                    value={brand.slogan}
                    onChange={(e) => setBrand({...brand, slogan: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
            </div>


            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '1rem' }}>📍 Ubicación y Google Maps</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>DIRECCIÓN FÍSICA</label>
                <input 
                  type="text" 
                  placeholder="Ej. Calle Principal #123"
                  value={brand.address}
                  onChange={(e) => setBrand({...brand, address: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>GOOGLE MAPS URL</label>
                <input 
                  type="text" 
                  placeholder="https://goo.gl/maps/..."
                  value={brand.mapUrl}
                  onChange={(e) => setBrand({...brand, mapUrl: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: '0.875rem' }}
                />
              </div>
            </div>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: brand.showReviews ? '1rem' : 0 }}>
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800 }}>Habilitar Reseñas Públicas</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Muestra tu calificación y reseñas en el perfil público.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={brand.showReviews}
                  onChange={(e) => setBrand({...brand, showReviews: e.target.checked})}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>
              
              {brand.showReviews && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(59,130,246,0.2)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>CALIFICACIÓN (ESTRELLAS)</label>
                    <input 
                      type="number" step="0.1" min="1" max="5"
                      value={brand.ratingValue}
                      onChange={(e) => setBrand({...brand, ratingValue: parseFloat(e.target.value)})}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontWeight: 700 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>CANTIDAD DE RESEÑAS</label>
                    <input 
                      type="number"
                      value={brand.reviewsCount}
                      onChange={(e) => setBrand({...brand, reviewsCount: parseInt(e.target.value)})}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontWeight: 700 }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '1.25rem', background: 'rgba(245,158,11,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary)' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 800 }}>Modo de Agendamiento</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Define cómo los clientes pueden interactuar con tu cola.</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                {[
                  { id: 'online', label: '🌐 SOLO ONLINE', desc: 'Solo citas por app' },
                  { id: 'manual', label: '📍 SOLO MANUAL', desc: 'Orden de llegada' },
                  { id: 'hybrid', label: '⚖️ HÍBRIDO', desc: 'Citas + Presencial' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setBrand({...brand, bookingMode: mode.id as any})}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: brand.bookingMode === mode.id ? 'var(--primary)' : 'var(--background)',
                      color: brand.bookingMode === mode.id ? 'black' : 'var(--text)',
                      border: brand.bookingMode === mode.id ? 'none' : '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{mode.label}</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{mode.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '1.25rem', background: 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800 }}>Cierre Automático</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>El negocio se pondrá en modo "Cerrado" automáticamente a esta hora.</p>
                </div>
                <input 
                  type="time" 
                  value={brand.closingTime}
                  onChange={(e) => setBrand({...brand, closingTime: e.target.value})}
                  style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>
        ) : activeTab === 'services' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Catálogo de Servicios</h3>
              <button className="btn btn-primary" onClick={addService} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                <Plus size={16} /> Añadir Servicio
              </button>
            </div>
            
            {services.map((s, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '1rem',
                padding: '1.25rem', 
                background: 'var(--background)', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)' 
              }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <div 
                      style={{ 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: 'var(--radius-sm)', 
                        background: 'var(--surface-hover)', 
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border)',
                        cursor: 'pointer'
                      }}
                      title="Cambiar Icono"
                    >
                      {React.createElement(availableIcons.find(i => i.name === s.icon)?.Icon || Star, { size: 24 })}
                    </div>
                  </div>
                <div style={{ flex: 2 }}>
                  <input 
                    type="text" 
                    value={s.name}
                    onChange={(e) => updateService(idx, 'name', e.target.value)}
                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>$</span>
                  <input 
                    type="number" 
                    value={s.price}
                    onChange={(e) => updateService(idx, 'price', parseFloat(e.target.value))}
                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text)', width: '60px' }}
                  />
                </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input 
                      type="number" 
                      value={s.duration}
                      onChange={(e) => updateService(idx, 'duration', parseInt(e.target.value))}
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text)', width: '40px' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>min</span>
                  </div>
                  <button 
                    onClick={() => removeService(idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                {/* Icon Picker Strip */}
                <div style={{ 
                  display: 'flex', 
                  gap: '0.4rem', 
                  overflowX: 'auto', 
                  padding: '0.5rem', 
                  background: 'var(--surface)', 
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  scrollbarWidth: 'none'
                }}>
                  {availableIcons.map(({ name, Icon }) => (
                    <button
                      key={name}
                      onClick={() => updateService(idx, 'icon', name)}
                      style={{
                        padding: '0.4rem',
                        background: s.icon === name ? 'var(--primary)' : 'transparent',
                        color: s.icon === name ? 'black' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'reviews' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Moderación de Reseñas</h3>
              <button 
                onClick={() => setShowAddReview(true)}
                className="btn btn-primary" 
                style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}
              >
                + Crear Reseña Manual
              </button>
            </div>

            {showAddReview && (
              <div className="card animate-scale-in" style={{ padding: '1.5rem', background: 'var(--surface-hover)', border: '1px solid var(--primary)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '1rem' }}>Nueva Reseña (Auto-aprobada)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <input 
                      type="text" placeholder="Nombre del cliente" value={newReview.client_name}
                      onChange={(e) => setNewReview({...newReview, client_name: e.target.value})}
                      style={{ width: '100%', padding: '0.6rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                    />
                    <select 
                      value={newReview.rating}
                      onChange={(e) => setNewReview({...newReview, rating: parseInt(e.target.value)})}
                      style={{ width: '100%', padding: '0.6rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                    >
                      {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} Estrellas</option>)}
                    </select>
                  </div>
                  <textarea 
                    placeholder="Comentario o testimonio..." value={newReview.comment}
                    onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                    style={{ width: '100%', padding: '0.6rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', resize: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddReview(false)}>Cancelar</button>
                    <button 
                      className="btn btn-primary" style={{ flex: 2 }}
                      disabled={!newReview.client_name}
                      onClick={async () => {
                         const { data: { user } } = await supabase.auth.getUser();
                         if (!user) return;
                         const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
                         if (!userData?.tenant_id) return;

                         const { data: rev, error } = await supabase.from('reviews').insert({
                           tenant_id: userData.tenant_id,
                           client_name: newReview.client_name,
                           rating: newReview.rating,
                           comment: newReview.comment,
                           is_approved: true
                         }).select().single();

                         if (!error && rev) {
                           setReviews([rev, ...reviews]);
                           setShowAddReview(false);
                           setNewReview({ client_name: '', rating: 5, comment: '' });
                         }
                      }}
                    >Guardar Reseña</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {reviews.filter(r => !r.is_approved).length} pendientes de aprobación
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviews.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Aún no has recibido reseñas de tus clientes.
                </div>
              ) : (
                reviews.map(r => (
                  <div key={r.id} className="card" style={{ padding: '1.25rem', border: `1px solid ${r.is_approved ? 'var(--border)' : 'var(--primary)'}`, background: r.is_approved ? 'var(--background)' : 'rgba(245,158,11,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                          {r.client_name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 800, margin: 0, fontSize: '0.875rem' }}>{r.client_name}</p>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {[1,2,3,4,5].map(star => <Star key={star} size={10} fill={star <= r.rating ? "var(--primary)" : "none"} color={star <= r.rating ? "var(--primary)" : "var(--text-muted)"} />)}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.875rem', margin: '0 0 1rem 0', color: 'var(--text)' }}>"{r.comment || 'Sin comentario'}"</p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={async () => {
                          const { error } = await supabase.from('reviews').delete().eq('id', r.id);
                          if (!error) setReviews(reviews.filter(rev => rev.id !== r.id));
                        }}
                        className="btn btn-outline" 
                        style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                      >
                        Eliminar
                      </button>
                      <button 
                        onClick={async () => {
                           const { error } = await supabase.from('reviews').update({ is_approved: !r.is_approved }).eq('id', r.id);
                           if (!error) {
                             setReviews(reviews.map(rev => rev.id === r.id ? { ...rev, is_approved: !rev.is_approved } : rev));
                           }
                        }}
                        className="btn btn-primary" 
                        style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', background: r.is_approved ? '#ef4444' : 'var(--primary)' }}
                      >
                        {r.is_approved ? 'Desaprobar' : 'Aprobar'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'messages' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Mensajería de Clientes</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Chat en Vivo Activo</span>
              </div>
            </div>

            {/* Broadcast Creation Tool */}
            <div style={{ padding: '1.5rem', background: 'rgba(245,158,11,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary)' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={16} /> Enviar Mensaje Masivo / Difusión
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>CONTENIDO DEL MENSAJE (OFERTAS, AVISOS...)</label>
                  <textarea 
                    rows={2}
                    value={broadcastData.content}
                    onChange={(e) => setBroadcastData({...broadcastData, content: e.target.value})}
                    placeholder="Escribe el mensaje que verán TODOS tus clientes..."
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: '0.875rem', resize: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>URL DE IMAGEN (OPCIONAL)</label>
                  <input 
                    type="text"
                    value={broadcastData.imageUrl}
                    onChange={(e) => setBroadcastData({...broadcastData, imageUrl: e.target.value})}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    style={{ width: '100%', padding: '0.7rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: '0.85rem' }}
                  />
                </div>
                <button 
                  onClick={handleSendBroadcast}
                  disabled={isSendingBroadcast || !broadcastData.content.trim()}
                  className="btn btn-primary"
                  style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}
                >
                  {isSendingBroadcast ? 'Enviando...' : '🚀 Enviar a todos los clientes'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', height: '500px', overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
              {/* List of Chats */}
              <div style={{ width: '250px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-muted)' }}>CONVERSACIONES</div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {Array.from(new Set(chatMessages.filter(m => !m.is_broadcast).map(m => m.session_id))).map(sid => {
                    const sessionMsgs = chatMessages.filter(m => m.session_id === sid);
                    const lastMsg = sessionMsgs[sessionMsgs.length - 1];
                    const unreadCount = sessionMsgs.filter(m => !m.is_read && m.is_from_client).length;
                    return (
                      <div 
                        key={sid} 
                        onClick={() => {
                          setSelectedSessionId(sid);
                          const unreadIds = sessionMsgs.filter(m => !m.is_read && m.is_from_client).map(m => m.id);
                          if (unreadIds.length > 0) {
                            supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then(() => {
                               setChatMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, is_read: true } : m));
                            });
                          }
                        }}
                        style={{ 
                          padding: '1rem', 
                          borderBottom: '1px solid var(--border)', 
                          cursor: 'pointer', 
                          background: selectedSessionId === sid ? 'rgba(245,158,11,0.05)' : 'transparent',
                          borderLeft: selectedSessionId === sid ? '4px solid var(--primary)' : '4px solid transparent'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{sessionMsgs.find(m => m.customer_name)?.customer_name || 'Cliente'}</span>
                          {unreadCount > 0 && <span style={{ background: 'red', color: 'white', borderRadius: '50%', padding: '0 5px', fontSize: '10px', height: '16px', display: 'flex', alignItems: 'center' }}>{unreadCount}</span>}
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMsg.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Chat Window */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
                {selectedSessionId ? (
                  <>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--background)', fontWeight: 800, fontSize: '0.9rem' }}>
                      {chatMessages.find(m => m.session_id === selectedSessionId)?.customer_name || 'Cliente'}
                    </div>
                    <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#0a0a0a' }}>
                      {chatMessages.filter(m => m.session_id === selectedSessionId).map(m => (
                        <div key={m.id} style={{ alignSelf: m.is_from_client ? 'flex-start' : 'flex-end', maxWidth: '75%' }}>
                          <div style={{ 
                            padding: '0.6rem 0.9rem', 
                            borderRadius: m.is_from_client ? '1rem 1rem 1rem 0' : '1rem 1rem 0 1rem',
                            background: m.is_from_client ? 'var(--surface)' : 'var(--primary)',
                            color: m.is_from_client ? 'var(--text)' : 'black',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}>
                            {m.content}
                          </div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.2rem', textAlign: m.is_from_client ? 'left' : 'right' }}>
                            {new Date(m.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '0.75rem', background: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        value={chatReply}
                        onChange={(e) => setChatReply(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                        placeholder="Responde aquí..."
                        style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 'var(--radius-full)', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem' }}
                      />
                      <button onClick={handleSendReply} className="btn btn-primary" style={{ padding: '0 1.25rem', borderRadius: 'var(--radius-full)' }}>Enviar</button>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Selecciona una conversación para responder
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'schedule' ? (

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Disponibilidad Semanal</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {weeksSchedule.map((item, idx) => (
                <div key={item.day} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.75rem 1rem', 
                  background: !item.isOpen ? 'rgba(239,68,68,0.05)' : 'var(--background)', 
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  opacity: item.isOpen ? 1 : 0.8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input 
                      type="checkbox" 
                      checked={item.isOpen} 
                      onChange={(e) => {
                        const newSchedule = [...weeksSchedule];
                        newSchedule[idx].isOpen = e.target.checked;
                        setWeeksSchedule(newSchedule);
                      }}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: 600, width: '100px' }}>{item.day}</span>
                  </div>
                  
                  {!item.isOpen ? (
                    <span style={{ color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 600 }}>Cerrado</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <input 
                        type="text" 
                        value={item.hours}
                        onChange={(e) => {
                          const newSchedule = [...weeksSchedule];
                          newSchedule[idx].hours = e.target.value;
                          setWeeksSchedule(newSchedule);
                        }}
                        style={{ background: 'var(--surface-hover)', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', textAlign: 'center', width: '120px', color: 'var(--text)' }}
                      />
                      <button style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Clock size={16} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ 
              padding: '1rem', 
              background: lunchBreak.enabled ? 'rgba(245,158,11,0.05)' : 'var(--background)', 
              borderRadius: 'var(--radius-md)', 
              border: `1px solid ${lunchBreak.enabled ? 'var(--primary)' : 'var(--border)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Coffee size={18} color={lunchBreak.enabled ? "var(--primary)" : "var(--text-muted)"} />
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase' }}>Descanso Almuerzo</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={lunchBreak.enabled}
                  onChange={(e) => setLunchBreak({...lunchBreak, enabled: e.target.checked})}
                  style={{ cursor: 'pointer' }}
                />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>INICIO</label>
                  <input 
                    type="time" 
                    disabled={!lunchBreak.enabled}
                    value={lunchBreak.start}
                    onChange={(e) => setLunchBreak({...lunchBreak, start: e.target.value})}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>FIN</label>
                  <input 
                    type="time" 
                    disabled={!lunchBreak.enabled}
                    value={lunchBreak.end}
                    onChange={(e) => setLunchBreak({...lunchBreak, end: e.target.value})}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                  />
                </div>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {lunchBreak.enabled 
                  ? `Bloqueo automático de ${lunchBreak.start} a ${lunchBreak.end} todos los días laborables.`
                  : 'Descanso de almuerzo desactivado.'}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ position: 'relative' }}>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={isSaving}
          style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', padding: '1rem', width: '100%', opacity: isSaving ? 0.7 : 1 }}
        >
          <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
        {showSaved && (
          <div style={{ 
            position: 'absolute', 
            top: '-50px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            background: 'var(--success)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            animation: 'fade-in-up 0.3s ease-out'
          }}>
            <CheckCircle2 size={16} /> ¡Configuración Guardada!
          </div>
        )}
      </div>
    </div>
  );
};

