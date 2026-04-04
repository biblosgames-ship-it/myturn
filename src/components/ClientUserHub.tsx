import { LayoutGrid, Clock, Star, ArrowRight, Search, Plus, QrCode, X, CheckCircle2, Loader2, User, LogOut, Edit3, Phone, Mail, Settings, Scissors, Heart, Sparkles, Footprints, Camera, Share2, Facebook } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ClientAuth } from './ClientAuth';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface SavedBusiness {
  id: string;
  realId?: string;
  name: string;
  professional: string;
  title: string;
  logo: string;
  rating: number;
  lastVisit: string;
  isAlreadySaved?: boolean;
  isFavorite?: boolean;
  category?: string;
}

interface ClientUserHubProps {
  onSelectBusiness: (id: string | null) => void;
}

export const ClientUserHub: React.FC<ClientUserHubProps> = ({ onSelectBusiness }) => {
  const [savedBusinesses, setSavedBusinesses] = useState<SavedBusiness[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [isScanningSimulated, setIsScanningSimulated] = useState(false);
  const [discoverBusinesses, setDiscoverBusinesses] = useState<SavedBusiness[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [showCategories, setShowCategories] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleShare = () => {
    setShowShareModal(true);
  };

  const shareMessage = `¡Hola! 😃
Quería contarte sobre MyTurn, es una aplicación que uso pa agendar mis citas sin necesidad de hacer fila, si la implementas en tu negocio, me ayudarías a aprovechar mejor mi tiempo. 

Te dejo el link para que la pruebes: https://myturn-sigma.vercel.app/

Estoy seguro de que te va a encantar y te ahorrará muchísimo tiempo y llevara tu negocio a otro nivel. 

Solo tienes que accede como profesional y crear una cuenta free. Configurala con tu marca, logo, colores, ubicación, horarios, servicios y demás en la sección ⚙️ Local. 

Comparte tu negocio con tus otros clientes e invitalos a agendar su próxima cita descargando la webapp desde su navegador agregándola a la pantalla principal. 

Listo, ya tienes una página web profesional de tu negocio que a la vez es; 
       a. agenda
       b. gestor de turnos en vivo cronometrado. 
       c. comunicación con tus clientes. 
       d. gestor de cobros y finanzas. 
       e. generador de reportes estadísticos. 
       f. canal de difusión y promoción. 
       g. inventario inteligente. 
       h. y asistente personal. 

¡Cuéntame qué tal te va! Espero agendar mi proxima cita por My Turn.`;

  const handlePlatformShare = (platform: 'whatsapp' | 'gmail' | 'messenger' | 'instagram' | 'copy') => {
    const encodedMessage = encodeURIComponent(shareMessage);
    const url = 'https://myturn-sigma.vercel.app/';

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        break;
      case 'gmail':
        window.open(`mailto:?subject=Invitación a conocer MyTurn&body=${encodedMessage}`, '_self');
        break;
      case 'messenger':
        // Messenger for mobile web is tricky, this is the most reliable desktop/mobile fallback
        window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=2914438852200547&redirect_uri=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'instagram':
        // Instagram doesn't support direct text sharing via URL. We copy to clipboard and open Instagram.
        navigator.clipboard.writeText(shareMessage);
        alert('Mensaje copiado al portapapeles. Ahora abre Instagram y pégalo en un mensaje directo.');
        window.open('https://www.instagram.com/direct/inbox/', '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(shareMessage);
        alert('¡Mensaje copiado!');
        break;
    }
    setShowShareModal(false);
  };

  const categories = [
    { label: 'Todas', icon: LayoutGrid },
    { label: 'Belleza', icon: Scissors },
    { label: 'Salud / Bienestar', icon: Heart },
    { label: 'Vehículos', icon: Sparkles },
    { label: 'Servicios Profesionales', icon: User },
    { label: 'Educación', icon: Sparkles },
    { label: 'Servicios del Hogar', icon: Sparkles },
    { label: 'Eventos/entretenimiento', icon: Sparkles },
    { label: 'Gimnasio', icon: Footprints },
    { label: 'Servicios especiales', icon: Star }
  ];

  const getDeviceId = () => {
    let id = localStorage.getItem('myturn_client_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('myturn_client_device_id', id);
    }
    return id;
  };

  const syncSavedBusinesses = async (userId: string | null) => {
    const deviceId = getDeviceId();
    
    if (userId) {
      await supabase.from('saved_tenants').update({ user_id: userId }).eq('client_device_id', deviceId).is('user_id', null);
    }

    const query = userId 
      ? supabase.from('saved_tenants').select('tenant_id, is_favorite').eq('user_id', userId)
      : supabase.from('saved_tenants').select('tenant_id, is_favorite').eq('client_device_id', deviceId);
    
    const { data: savedIds } = await query;
    
    if (savedIds && savedIds.length > 0) {
      const ids = savedIds.map(s => s.tenant_id);
      const { data: tenants } = await supabase.from('tenants').select('*').in('id', ids);
      if (tenants) {
        setSavedBusinesses(tenants.map(t => ({
          id: t.slug || t.id,
          realId: t.id,
          name: t.name,
          professional: t.professional_name || 'Personal Principal',
          title: t.professional_title || 'Servicios',
          logo: t.logo || 'https://images.unsplash.com/photo-1593702295974-2510d9ec9a57?w=128&h=128&fit=crop',
          rating: 5.0,
          lastVisit: 'Guardado',
          category: t.category,
          isFavorite: savedIds.find(s => s.tenant_id === t.id)?.is_favorite || false
        })).sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)));
      }
    } else {
      setSavedBusinesses([]);
    }
  };

  const toggleFavorite = async (realId: string, currentStatus: boolean) => {
    const deviceId = getDeviceId();
    const { data: { session } } = await supabase.auth.getSession();
    const newStatus = !currentStatus;

    const query = session?.user?.id 
      ? supabase.from('saved_tenants').update({ is_favorite: newStatus }).eq('tenant_id', realId).eq('user_id', session.user.id)
      : supabase.from('saved_tenants').update({ is_favorite: newStatus }).eq('tenant_id', realId).eq('client_device_id', deviceId);
    
    await query;

    setSavedBusinesses(prev => {
      const updated = prev.map(b => b.realId === realId ? { ...b, isFavorite: newStatus } : b);
      return [...updated].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    });
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await syncSavedBusinesses(session.user.id);
      } else {
        await syncSavedBusinesses(null);
      }
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await syncSavedBusinesses(session.user.id);
        setShowAuth(false);
      } else {
        setUser(null);
        await syncSavedBusinesses(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchDiscoverBusinesses = async () => {
    let query = supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (selectedCategory !== 'Todas') {
      query = query.eq('category', selectedCategory);
    }
    
    const { data } = await query;
    
    if (data) {
      setDiscoverBusinesses(data.map(t => ({
        id: t.slug || t.id,
        realId: t.id,
        name: t.name,
        professional: t.professional_name || 'Personal Principal',
        title: t.professional_title || 'Servicios',
        logo: t.logo || 'https://images.unsplash.com/photo-1593702295974-2510d9ec9a57?w=128&h=128&fit=crop',
        rating: 5.0,
        lastVisit: 'Sugerido',
        category: t.category
      })));
    }
  };

  useEffect(() => {
    fetchDiscoverBusinesses();
  }, [selectedCategory]);

  const allBusinesses = [
    ...savedBusinesses.map(b => ({ ...b, isSaved: true })),
    ...discoverBusinesses.filter(d => !savedBusinesses.some(s => s.realId === d.realId)).map(d => ({ ...d, isSaved: false }))
  ].filter(biz => {
    if (selectedCategory !== 'Todas') {
      if (biz.category !== selectedCategory) return false;
    }
    
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();
    return biz.name.toLowerCase().includes(term) || 
           biz.professional.toLowerCase().includes(term) ||
           biz.title.toLowerCase().includes(term);
  }).sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return 0;
  });

  const linkBusiness = async (biz: SavedBusiness & { realId?: string }) => {
    const deviceId = getDeviceId();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (biz.realId) {
      await supabase.from('saved_tenants').upsert({
        client_device_id: deviceId,
        tenant_id: biz.realId,
        user_id: session?.user?.id || null
      });
    }
    setSavedBusinesses([...savedBusinesses, biz]);
    setSearchTerm('');
  };

  const startScan = () => {
    setIsScanning(true);
    setScanStep('scanning');
    setIsScanningSimulated(false);
  };

  useEffect(() => {
    if (isScanning && !isScanningSimulated) {
      const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      }, false);

      scanner.render(async (decodedText) => {
        let slug = decodedText;
        if (decodedText.includes('/')) {
           const parts = decodedText.split('/');
           slug = parts[parts.length - 1];
        }

        const { data } = await supabase.from('tenants').select('*').or(`slug.eq.${slug},id.eq.${slug}`).maybeSingle();
        if (data) {
          scanner.clear();
          const biz = {
            id: data.slug || data.id,
            realId: data.id,
            name: data.name,
            professional: data.professional_name || 'Personal Principal',
            title: data.professional_title || 'Servicios',
            logo: data.logo || 'https://images.unsplash.com/photo-1593702295974-2510d9ec9a57?w=128&h=128&fit=crop',
            rating: 5.0,
            lastVisit: 'Recién Escaneado'
          };
          await linkBusiness(biz as any);
          setScanStep('success');
          setTimeout(() => {
            setIsScanning(false);
            setScanStep('idle');
          }, 1500);
        }
      }, () => {});

      return () => {
        scanner.clear();
      };
    }
  }, [isScanning]);

  if (loading) {
     return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0.5rem 2rem', overflowX: 'hidden' }}>
      
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <ClientAuth onSuccess={() => setShowAuth(false)} onClose={() => setShowAuth(false)} />
        </div>
      )}

      {/* Marketplace Header (Hero) */}
      <div style={{ 
        padding: '1.5rem 1rem', 
        borderRadius: 'var(--radius-lg)', 
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(24,24,27,0.4) 100%)',
        border: '1px solid rgba(245,158,11,0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, lineHeight: 1.2 }}>
                No pierdas tiempo esperando. <br />
                <span style={{ color: 'var(--primary)' }}>Haz fila desde tu celular.</span>
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', maxWidth: '80%' }}>
                Descubre cientos de negocios cerca de ti y agenda tu proxima cita.
              </p>
            </div>
            {!user && (
              <button 
                onClick={() => setShowAuth(true)}
                className="btn btn-primary" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', fontWeight: 900, borderRadius: 'var(--radius-full)' }}
              >
                ENTRAR
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Busca por nombre o palabra clave..." 
                style={{ width: '100%', padding: '1.25rem 1rem 1.25rem 3rem', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: 'none', color: 'var(--text)', boxShadow: 'var(--shadow-flat)', fontSize: '0.9rem' }}
              />
            </div>
            <button 
              onClick={startScan}
              className="btn btn-outline" 
              style={{ width: '60px', height: '60px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: 'none', boxShadow: 'var(--shadow-flat)' }}
            >
              <QrCode size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Categories Toggle Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-0.5rem' }}>
        <button 
          onClick={() => setShowCategories(!showCategories)}
          style={{ 
            background: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-full)', 
            padding: '0.4rem 1rem', 
            fontSize: '0.75rem', 
            fontWeight: 800, 
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: 'var(--shadow-flat)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <LayoutGrid size={14} color={showCategories ? 'var(--primary)' : 'currentColor'} />
          {showCategories ? 'OCULTAR CATEGORÍAS' : 'BUSCAR POR CATEGORÍA'}
          <ArrowRight size={14} style={{ transform: showCategories ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.3s' }} />
        </button>
      </div>

      <div style={{ 
        maxHeight: showCategories ? '200px' : '0', 
        overflow: 'hidden', 
        transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: showCategories ? 1 : 0,
        pointerEvents: showCategories ? 'auto' : 'none',
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: '0.2rem', 
        padding: showCategories ? '0.5rem 0' : '0',
        width: '100%',
        maxWidth: '350px',
        margin: '0 auto'
      }}>
        {categories.map((cat, i) => (
          <button 
            key={i} 
            onClick={() => setSelectedCategory(cat.label)}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '0.25rem', 
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: selectedCategory === cat.label ? 'var(--primary)' : 'var(--surface)', 
              border: '1px solid var(--border)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: 'var(--shadow-flat)',
              transition: 'all 0.2s'
            }}>
              <cat.icon size={16} color={selectedCategory === cat.label ? 'black' : 'var(--text-muted)'} />
            </div>
            <span style={{ 
              fontSize: '0.42rem', 
              fontWeight: 800, 
              color: selectedCategory === cat.label ? 'var(--primary)' : 'var(--text-muted)', 
              textTransform: 'uppercase',
              textAlign: 'center',
              lineHeight: 1.1,
              width: '100%',
              display: 'block',
              wordBreak: 'break-word',
              hyphens: 'auto',
              whiteSpace: 'normal',
              marginTop: '4px'
            }}>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Main Business Feed */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '0 0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white' }}>
            {searchTerm ? 'Resultados de búsqueda' : 'Directorio de Negocios'}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800 }}>Ver todos</span>
        </div>

        <div 
          className="marketplace-grid"
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '0.75rem', 
            width: '100%',
            overflow: 'visible'
          }}
        >
          {allBusinesses.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Search size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ fontWeight: 700 }}>No encontramos lo que buscas</p>
              <p style={{ fontSize: '0.8rem' }}>Prueba con otra palabra o categoría</p>
            </div>
          ) : (
            allBusinesses.map(biz => (
              <div 
                key={biz.realId}
                onClick={() => onSelectBusiness(biz.id)}
                className="card"
                style={{ 
                  position: 'relative', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: 'none', background: 'var(--surface)', boxShadow: 'var(--shadow-flat)', borderRadius: '24px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-flat)';
                }}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (biz.realId) toggleFavorite(biz.realId, !!biz.isFavorite);
                  }}
                  style={{ 
                    position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: biz.isFavorite ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', zIndex: 10, padding: '4px'
                  }}
                >
                  <Star size={20} fill={biz.isFavorite ? 'var(--primary)' : 'none'} style={{ transition: 'all 0.2s' }} />
                </button>

                <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '50%', padding: '3px', border: '2px solid var(--primary)', background: 'var(--background)' }}>
                  <img src={biz.logo} alt={biz.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  {!biz.isSaved && (
                    <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: 'var(--primary)', color: 'black', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                      <Plus size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '0.25rem', color: 'var(--text)' }}>{biz.name}</h4>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>{biz.professional}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                    <Star size={12} fill="var(--primary)" color="var(--primary)" />
                    <span style={{ fontWeight: 800, color: 'var(--text)' }}>{biz.rating}</span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{biz.lastVisit}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Promo banner */}
      <section 
        className="card" 
        onClick={handleShare}
        style={{ 
          padding: '1.5rem', 
          background: '#0a0a0a', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          border: '1px solid #1a1a1a', 
          boxShadow: 'var(--shadow-flat)', 
          borderRadius: '24px',
          cursor: 'pointer',
          transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '0.25rem', lineHeight: 1.2 }}>
            Comparte My Turn con tus negocios...
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            y olvídate de hacer fila.
          </p>
        </div>
        <div style={{ background: 'var(--primary)', padding: '0.75rem', borderRadius: '12px', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Share2 size={20} strokeWidth={3} />
        </div>
      </section>

      {/* QR Scanning Modal */}
      {isScanning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', backdropFilter: 'blur(10px)' }}>
          <button onClick={() => setIsScanning(false)} style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'none', border: 'none', color: 'white' }}><X size={32} /></button>
          <div style={{ position: 'relative', width: '300px', height: '300px' }}>
            <div id="reader" style={{ width: '100%', height: '100%', border: '4px solid rgba(245,158,11,0.3)', borderRadius: '32px', overflow: 'hidden', background: '#000' }}></div>
            <div style={{ position: 'absolute', top: 20, left: 20, width: 50, height: 50, borderLeft: '6px solid var(--primary)', borderTop: '6px solid var(--primary)', borderRadius: '12px 0 0 0' }} />
            <div style={{ position: 'absolute', top: 20, right: 20, width: 50, height: 50, borderRight: '6px solid var(--primary)', borderTop: '6px solid var(--primary)', borderRadius: '0 12px 0 0' }} />
            <div style={{ position: 'absolute', bottom: 20, left: 20, width: 50, height: 50, borderLeft: '6px solid var(--primary)', borderBottom: '6px solid var(--primary)', borderRadius: '0 0 0 12px' }} />
            <div style={{ position: 'absolute', bottom: 20, right: 20, width: 50, height: 50, borderRight: '6px solid var(--primary)', borderBottom: '6px solid var(--primary)', borderRadius: '0 0 12px 0' }} />
          </div>
          <p style={{ color: 'white', fontWeight: 800, letterSpacing: '1px' }}>ESCANEA EL CÓDIGO QR</p>
        </div>
      )}
      {/* Share Options Modal */}
      {showShareModal && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1100, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' 
          }}
          onClick={() => setShowShareModal(false)}
        >
          <div 
            style={{ 
              background: 'var(--surface)', borderRadius: '24px', width: '100%', maxWidth: '320px', 
              padding: '2rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.5rem',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Enviar Invitación</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selecciona donde quieres compartir MyTurn</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <button 
                onClick={() => handlePlatformShare('whatsapp')}
                style={{ background: 'rgba(37, 211, 102, 0.1)', border: '1px solid rgba(37, 211, 102, 0.2)', padding: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <div style={{ color: '#25D366' }}>
                  <Phone size={24} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>WhatsApp</span>
              </button>

              <button 
                onClick={() => handlePlatformShare('instagram')}
                style={{ background: 'rgba(225, 48, 108, 0.1)', border: '1px solid rgba(225, 48, 108, 0.2)', padding: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <div style={{ color: '#E1306C' }}>
                  <Camera size={24} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Instagram</span>
              </button>

              <button 
                onClick={() => handlePlatformShare('messenger')}
                style={{ background: 'rgba(59, 89, 152, 0.1)', border: '1px solid rgba(59, 89, 152, 0.2)', padding: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <div style={{ color: '#3b5998' }}>
                  <Facebook size={24} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Facebook</span>
              </button>

              <button 
                onClick={() => handlePlatformShare('gmail')}
                style={{ background: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.2)', padding: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <div style={{ color: '#EA4335' }}>
                  <Mail size={24} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Gmail</span>
              </button>
            </div>

            <button 
              onClick={() => handlePlatformShare('copy')}
              style={{ width: '100%', background: 'var(--border)', border: 'none', padding: '0.75rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Copiar Mensaje Completo
            </button>
            
            <button 
              onClick={() => setShowShareModal(false)}
              style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
