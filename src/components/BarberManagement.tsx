import React, { useState, useEffect, useCallback } from 'react';
import { 
  Scissors, Clock, Plus, Trash2, Save, Calendar, Coffee, Moon, Sun, CheckCircle2, 
  Stethoscope, Palette, Brush, User, Users, Heart, Activity, Car, Smartphone, Zap, Star, 
  Smile, Wind, Droplets, Briefcase, ShoppingBag, Bold, Italic, Underline, Type, 
  Image as ImageIcon, Eye, X, Minus, Sparkles, Cross, Wrench, Shield, Calculator, Building, 
  Book, GraduationCap, PenTool, Home, Hammer, Key, Music, Mic, Ticket, MonitorPlay, Dumbbell, Flame, Timer
} from 'lucide-react';


import { supabase } from '../lib/supabase';

const availableIcons = [
  // Belleza
  { name: 'Scissors', Icon: Scissors }, { name: 'Sparkles', Icon: Sparkles }, { name: 'Smile', Icon: Smile }, { name: 'Palette', Icon: Palette }, { name: 'Brush', Icon: Brush },
  // Salud/Bienestar
  { name: 'Stethoscope', Icon: Stethoscope }, { name: 'Heart', Icon: Heart }, { name: 'Activity', Icon: Activity }, { name: 'Cross', Icon: Cross },
  // Vehículos
  { name: 'Car', Icon: Car }, { name: 'Wrench', Icon: Wrench }, { name: 'Shield', Icon: Shield },
  // Servicios Profesionales
  { name: 'Briefcase', Icon: Briefcase }, { name: 'Calculator', Icon: Calculator }, { name: 'Building', Icon: Building }, { name: 'User', Icon: User }, { name: 'Users', Icon: Users },
  // Educación
  { name: 'Book', Icon: Book }, { name: 'GraduationCap', Icon: GraduationCap }, { name: 'PenTool', Icon: PenTool },
  // Servicios del hogar
  { name: 'Home', Icon: Home }, { name: 'Hammer', Icon: Hammer }, { name: 'Key', Icon: Key }, { name: 'Wind', Icon: Wind }, { name: 'Droplets', Icon: Droplets },
  // Eventos y Otros
  { name: 'Music', Icon: Music }, { name: 'Mic', Icon: Mic }, { name: 'Ticket', Icon: Ticket }, { name: 'MonitorPlay', Icon: MonitorPlay }, { name: 'Coffee', Icon: Coffee },
  // Tecnología y Fitness
  { name: 'Smartphone', Icon: Smartphone }, { name: 'Zap', Icon: Zap }, { name: 'Star', Icon: Star }, { name: 'Dumbbell', Icon: Dumbbell }, { name: 'Flame', Icon: Flame }, { name: 'Timer', Icon: Timer }, { name: 'ShoppingBag', Icon: ShoppingBag }
];

interface Service {
  id?: string;
  name: string;
  price: number;
  duration: number;
  icon: string;
  capacity: number;
}

interface DaySchedule {
  day: string;
  isOpen: boolean;
  hours: string;
  booking_end_time?: string;
}





export const BarberManagement: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [activeTab, setActiveTab] = useState<'services' | 'schedule' | 'brand' | 'reviews'>('brand');
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(tenantId);





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
    reviewsCount: 1,
    category: 'Belleza',
    requireConfirmation: false
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReview, setNewReview] = useState({ client_name: '', rating: 5, comment: '' });
  const [activeIconPicker, setActiveIconPicker] = useState<number | null>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState<number | null>(null);

  const handleCustomIconUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 500KB)
    if (file.size > 500 * 1024) {
      alert("La imagen es demasiado grande. Por favor, selecciona una de menos de 500KB.");
      return;
    }
    
    setIsUploadingIcon(idx);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}_service_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage.from('logos').upload(fileName, file);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
      updateService(idx, 'icon', publicUrl);
      setActiveIconPicker(null);
    } catch (err) {
      console.error("Error subiendo icono personalizado:", err);
      alert("No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setIsUploadingIcon(null);
    }
  };

  const loadCatalog = useCallback(async () => {
    // 1. Load Business Branding & Schedule
    if (tenantId) {
      setCurrentTenantId(tenantId);
      const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single();

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
          reviewsCount: tenant.reviews_count || 1,
          category: tenant.category || 'Belleza',
          requireConfirmation: tenant.require_confirmation ?? false
        });
        if (tenant.schedule) setWeeksSchedule(tenant.schedule);
        if (tenant.lunch_break) setLunchBreak(tenant.lunch_break);
        
        // Fetch Reviews (filtered by tenantId)
        const { data: revs } = await supabase.from('reviews').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (revs) setReviews(revs);
      }
    }

    // 2. Load Services from DB (STRICTLY FILTERED by tenantId)
    console.log('Cargando servicios para tenant:', tenantId);
    const { data: dbServices, error: resError } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (resError) {
      console.error('Error cargando servicios:', resError);
      setIsLoading(false);
      return;
    }

    if (dbServices) {
      console.log(`Servicios cargados: ${dbServices.length}`);
      setServices(dbServices.map(s => ({
        id: s.id,
        name: s.name,
        price: s.price,
        duration: s.duration_minutes,
        icon: s.icon || 'Scissors',
        capacity: s.capacity || 1
      })));
    } else {
      setServices([]);
    }
    setIsLoading(false);
  }, [tenantId]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);





  const addService = () => {
    // Generate a temporary UUID for the new service to avoid DB null constraint issues during upsert
    const newId = crypto.randomUUID();
    setServices([...services, { id: newId, name: 'Nuevo Servicio', price: 0, duration: 30, icon: 'Star', capacity: 1 }]);
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
      if (!tenantId) throw new Error('No tenant found');
      const targetTenantId = tenantId;

      let finalLogoUrl = brand.logo;

      // 1. Upload Logo if changed
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${tenantId}.${fileExt}`;
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
      const { error: tenantError } = await supabase.from('tenants').update({ 
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
        category: brand.category,
        require_confirmation: brand.requireConfirmation,
        schedule: weeksSchedule,
        lunch_break: lunchBreak
      }).eq('id', tenantId);

      if (tenantError) {
        console.error("Error updating tenant:", tenantError);
        throw new Error(`Error al actualizar configuración: ${tenantError.message}`);
      }

      // 2. Sync Services
      const currentIds = services.filter(s => s.id).map(s => s.id);
      const { data: existing } = await supabase.from('services').select('id').eq('tenant_id', tenantId);
      
      if (existing) {
        const toDelete = existing.filter(e => !currentIds.includes(e.id)).map(e => e.id);
        if (toDelete.length > 0) {
          const { error: delError } = await supabase.from('services').delete().in('id', toDelete).eq('tenant_id', tenantId);
          if (delError) {
            console.error("Error deleting services:", delError);
            throw new Error(`Error al limpiar servicios antiguos: ${delError.message}`);
          }
        }
      }

      const toUpsert = services.map(s => ({
        id: s.id || crypto.randomUUID(), // Guarantee an ID is always present
        tenant_id: tenantId,
        name: s.name,
        price: s.price,
        duration_minutes: s.duration,
        icon: s.icon,
        capacity: s.capacity || 1
      }));

      if (toUpsert.length > 0) {
        console.log('Realizando upsert de servicios:', toUpsert.length);
        const { error: upError } = await supabase.from('services').upsert(toUpsert);
        if (upError) {
          console.error("Error upserting services:", upError);
          throw new Error(`Error al guardar catálogo de servicios: ${upError.message}`);
        }
      }

      console.log('Guardado exitoso. Refrescando catálogo...');
      document.documentElement.style.setProperty('--primary', brand.color);
      
      // Refresh catalog to ensure state has proper DB IDs
      await loadCatalog();

      alert("✅ ¡Configuración guardada correctamente!");
    } catch (err: any) {
      console.error("CRITICAL SAVE ERROR:", err);
      alert(`❌ ${err.message || "Error desconocido al guardar"}`);
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
                  <ImageIcon size={16} />
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SLOGAN / FRASE</label>
                    <input 
                      type="text" 
                      value={brand.slogan}
                      onChange={(e) => setBrand({...brand, slogan: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>CATEGORÍA DE NEGOCIO</label>
                    <select 
                      value={brand.category}
                      onChange={(e) => setBrand({...brand, category: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 600 }}
                    >
                      <option value="Belleza">Belleza</option>
                      <option value="Salud / Bienestar">Salud / Bienestar</option>
                      <option value="Vehículos">Vehículos</option>
                      <option value="Servicios Profesionales">Servicios Profesionales</option>
                      <option value="Educación">Educación</option>
                      <option value="Servicios del Hogar">Servicios del Hogar</option>
                      <option value="Eventos/entretenimiento">Eventos/entretenimiento</option>
                      <option value="Fitness">Fitness</option>
                      <option value="Servicios especiales">Servicios especiales</option>
                    </select>
                  </div>
                </div>

                {/* Color Picker Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>COLOR DE MARCA (BOTONES Y ACENTOS)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ position: 'relative', width: '42px', height: '42px' }}>
                      <input 
                        type="color" 
                        value={brand.color}
                        onChange={(e) => setBrand({...brand, color: e.target.value})}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          padding: 0, 
                          border: 'none', 
                          borderRadius: '8px', 
                          background: 'none', 
                          cursor: 'pointer',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          zIndex: 2,
                          opacity: 0
                        }}
                      />
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        background: brand.color, 
                        borderRadius: '8px', 
                        border: '2px solid var(--border)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                    <input 
                      type="text" 
                      value={brand.color}
                      onChange={(e) => setBrand({...brand, color: e.target.value})}
                      placeholder="#000000"
                      style={{ 
                        flex: 1, 
                        padding: '0.75rem', 
                        background: 'var(--background)', 
                        border: '1px solid var(--border)', 
                        borderRadius: 'var(--radius-md)', 
                        color: 'var(--text)', 
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}
                    />
                  </div>
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

            <div style={{ padding: '1.25rem', background: 'rgba(16,185,129,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800 }}>Confirmación Manual de Citas</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', maxWidth: '350px' }}>Exige tu aprobación antes de que las citas pasen a la cola oficial. Útil para verificar depósitos bancarios.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={brand.requireConfirmation}
                  onChange={(e) => setBrand({...brand, requireConfirmation: e.target.checked})}
                  style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                />
              </div>
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
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* LEFT: ICON */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
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

                  {/* CENTER-LEFT: NAME & PRICE (Vertical) */}
                  <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '180px' }}>
                    <input 
                      type="text" 
                      value={s.name}
                      onChange={(e) => updateService(idx, 'name', e.target.value)}
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, width: '100%', fontSize: '1rem', padding: '0.2rem 0' }}
                      placeholder="Nombre del servicio"
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--success)' }}>$</span>
                      <input 
                        type="number" 
                        value={s.price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateService(idx, 'price', isNaN(val) ? 0 : val);
                        }}
                        style={{ 
                          width: '80px', 
                          padding: '0.3rem 0.6rem',
                          background: 'var(--surface)', 
                          border: '1px solid var(--border)', 
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text)',
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Costo base</span>
                    </div>
                  </div>

                  {/* CENTER-RIGHT: DURATION & CAPACITY (Horizontal, but wraps together) */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto' }}>
                    {/* DURATION */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--surface)', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <button 
                        onClick={() => updateService(idx, 'duration', Math.max(1, s.duration - 1))}
                        style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}
                      >
                        <Minus size={14} />
                      </button>
                      <input 
                        type="number" 
                        value={s.duration}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          updateService(idx, 'duration', isNaN(val) ? 0 : val);
                        }}
                        style={{ 
                          width: '35px', 
                          background: 'transparent', 
                          border: 'none',
                          color: 'var(--text)',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        }}
                      />
                      <button 
                        onClick={() => updateService(idx, 'duration', s.duration + 1)}
                        style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}
                      >
                        <Plus size={14} />
                      </button>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', marginLeft: '4px' }}>MIN</span>
                    </div>

                    {/* CAPACITY */}
                    <div title="Cupos por turno" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(59,130,246,0.1)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <Users size={14} style={{ color: '#3b82f6' }} />
                      <input 
                        type="number" 
                        min="1"
                        max="100"
                        value={s.capacity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          updateService(idx, 'capacity', isNaN(val) ? 1 : Math.max(1, val));
                        }}
                        style={{ 
                          width: '35px', 
                          background: 'transparent', 
                          border: 'none',
                          color: 'var(--text)',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          textAlign: 'center'
                        }}
                      />
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>CUPOS</span>
                    </div>
                  </div>

                  {/* RIGHT: DELETE */}
                  <button 
                    onClick={() => removeService(idx)}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: 'pointer', marginLeft: 'auto' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                
                {/* Ocultando icon picker en un dropdown */}
                <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => setActiveIconPicker(activeIconPicker === idx ? null : idx)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      color: 'var(--text)',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}
                  >
                    {s.icon.startsWith('http') ? (
                       <img src={s.icon} alt="Icono" style={{ width: 16, height: 16, objectFit: 'contain', borderRadius: '2px' }} />
                    ) : (
                       (() => {
                         const Found = availableIcons.find(a => a.name === s.icon)?.Icon || availableIcons[0].Icon;
                         return <Found size={16} />;
                       })()
                    )}
                    Cambiar Icono o Imagen
                  </button>

                  {activeIconPicker === idx && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '0.5rem',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      width: '320px',
                      zIndex: 50,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      maxHeight: '300px',
                      overflowY: 'auto'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Elige un icono:</span>
                        <button onClick={() => setActiveIconPicker(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {availableIcons.map(({ name, Icon }) => (
                          <button
                            key={name}
                            onClick={() => {
                              updateService(idx, 'icon', name);
                              setActiveIconPicker(null);
                            }}
                            title={name}
                            style={{
                              padding: '0.5rem',
                              background: s.icon === name ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                              color: s.icon === name ? 'black' : 'var(--text)',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Icon size={18} />
                          </button>
                        ))}
                      </div>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, display: 'block', marginBottom: '0.6rem' }}>O sube tu imagen propia:</span>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem',
                          background: 'rgba(59,130,246,0.1)',
                          border: '1px dashed rgba(59,130,246,0.5)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#3b82f6',
                          cursor: isUploadingIcon === idx ? 'wait' : 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}>
                          {isUploadingIcon === idx ? (
                            <span>Subiendo...</span>
                          ) : (
                            <>
                              <ImageIcon size={16} />
                              <span>Subir Imagen (Máx 500KB)</span>
                              <input 
                                type="file" 
                                accept="image/png, image/jpeg, image/webp" 
                                style={{ display: 'none' }}
                                onChange={(e) => handleCustomIconUpload(e, idx)}
                                disabled={isUploadingIcon === idx}
                              />
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  )}
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
                        style={{ background: 'var(--surface-hover)', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', textAlign: 'center', width: '100px', color: 'var(--text)', fontSize: '0.75rem' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>AGENDA HASTA</label>
                        <input 
                          type="time" 
                          value={item.booking_end_time || ''}
                          onChange={(e) => {
                            const newSchedule = [...weeksSchedule];
                            newSchedule[idx].booking_end_time = e.target.value;
                            setWeeksSchedule(newSchedule);
                          }}
                          style={{ background: 'var(--surface-hover)', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', textAlign: 'center', width: '105px', color: 'var(--text)', fontSize: '0.85rem', fontWeight: 600 }}
                        />
                      </div>
                      <button style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Clock size={14} /></button>
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

