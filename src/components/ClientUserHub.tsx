import { LayoutGrid, Clock, Star, ArrowRight, Search, Plus, QrCode, X, CheckCircle2, Loader2, User, LogOut, Edit3, Phone, Mail, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ClientAuth } from './ClientAuth';

interface SavedBusiness {
  id: string;
  name: string;
  professional: string;
  title: string;
  logo: string;
  rating: number;
  lastVisit: string;
  isAlreadySaved?: boolean;
}

interface ClientUserHubProps {
  onSelectBusiness: (id: string | null) => void;
}

export const ClientUserHub: React.FC<ClientUserHubProps> = ({ onSelectBusiness }) => {
  const [savedBusinesses, setSavedBusinesses] = useState<SavedBusiness[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile Editor State
  const [editData, setEditData] = useState({ full_name: '', phone: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SavedBusiness[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<'idle' | 'scanning' | 'success'>('idle');

  const getDeviceId = () => {
    let id = localStorage.getItem('myturn_client_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('myturn_client_device_id', id);
    }
    return id;
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (data) {
        setProfile(data);
        setEditData({ full_name: data.full_name || '', phone: data.phone || '' });
      } else if (error) {
        console.error('Fetch profile error:', error);
      }
    } catch (err) {
      console.error('Fetch profile catch:', err);
    }
  };

  const syncSavedBusinesses = async (userId: string | null) => {
    const deviceId = getDeviceId();
    
    // If logged in, ensure anonymous businesses are linked to this user
    if (userId) {
      await supabase.from('saved_tenants').update({ user_id: userId }).eq('client_device_id', deviceId).is('user_id', null);
    }

    const query = userId 
      ? supabase.from('saved_tenants').select('tenant_id').eq('user_id', userId)
      : supabase.from('saved_tenants').select('tenant_id').eq('client_device_id', deviceId);
    
    const { data: savedIds } = await query;
    
    if (savedIds && savedIds.length > 0) {
      const ids = savedIds.map(s => s.tenant_id);
      const { data: tenants } = await supabase.from('tenants').select('*').in('id', ids);
      if (tenants) {
        setSavedBusinesses(tenants.map(t => ({
          id: t.slug || t.id,
          name: t.name,
          professional: t.professional_name || 'Personal Principal',
          title: t.professional_title || 'Servicios',
          logo: t.logo || 'https://images.unsplash.com/photo-1593702295974-2510d9ec9a57?w=128&h=128&fit=crop',
          rating: 5.0,
          lastVisit: 'Guardado'
        })));
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
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
        await fetchProfile(session.user.id);
        await syncSavedBusinesses(session.user.id);
        setShowAuth(false);
      } else {
        setUser(null);
        setProfile(null);
        await syncSavedBusinesses(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.from('users').update({
        full_name: editData.full_name,
        phone: editData.phone
      }).eq('id', user.id);

      if (error) throw error;
      
      setProfile({ ...profile, ...editData });
      setShowProfileEditor(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const searchBusinesses = async () => {
      if (searchTerm.trim() === '') {
        setSearchResults([]);
        return;
      }
      
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`)
        .limit(10);
        
      if (data) {
        setSearchResults(data.map(t => {
          const id = t.slug || t.id;
          const isAlreadySaved = savedBusinesses.some(s => s.id === id);
          
          return {
            id,
            realId: t.id,
            name: t.name,
            professional: t.professional_name || 'Personal Principal',
            title: t.professional_title || 'Servicios',
            logo: t.logo || 'https://images.unsplash.com/photo-1593702295974-2510d9ec9a57?w=128&h=128&fit=crop',
            rating: 5.0,
            lastVisit: isAlreadySaved ? 'Ya vinculado' : 'Descubierto',
            isAlreadySaved
          } as any;
        }));
      }
    };

    const timeoutId = setTimeout(searchBusinesses, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, savedBusinesses]);

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
    setSearchResults([]);
  };

  const simulateScan = () => {
    setIsScanning(true);
    setScanStep('scanning');
    setTimeout(() => {
      setScanStep('success');
      setTimeout(() => {
        setIsScanning(false);
        setScanStep('idle');
      }, 1500);
    }, 2000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Auth Modal */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <ClientAuth onSuccess={() => setShowAuth(false)} onClose={() => setShowAuth(false)} />
        </div>
      )}

      {/* Profile Editor Modal */}
      {showProfileEditor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Editar Perfil</h3>
              <button onClick={() => setShowProfileEditor(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>NOMBRE COMPLETO</label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                  <input 
                    type="text" 
                    value={editData.full_name}
                    onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>TELÉFONO</label>
                <div style={{ position: 'relative' }}>
                  <Phone style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                  <input 
                    type="tel" 
                    value={editData.phone}
                    onChange={(e) => setEditData({...editData, phone: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>
              
              {errorMsg && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>{errorMsg}</p>
              )}

              <button 
                onClick={handleUpdateProfile}
                disabled={loading}
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem', fontWeight: 900, marginTop: '1rem' }}
              >
                {loading ? 'Guardando...' : 'GUARDAR CAMBIOS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Profile Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '0.25rem' }}>
            Hola, <span style={{ color: 'var(--primary)' }}>{profile?.full_name || 'Invitado'}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {user ? user.email : '¿A dónde quieres ir hoy?'}
          </p>
        </div>
        
        {user ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button 
              onClick={() => setShowProfileEditor(true)}
              className="btn btn-outline" 
              style={{ padding: '0.6rem', borderRadius: '12px' }}
              title="Configuración de Perfil"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="btn btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', fontSize: '0.8rem' }}
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
              <span style={{ fontWeight: 800 }}>SALIR</span>
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowAuth(true)}
            className="btn btn-primary" 
            style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 800 }}
          >
            Iniciar Sesión
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', position: 'relative' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Busca por nombre o palabra clave..." 
            style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
        <button 
          onClick={simulateScan}
          className="btn btn-outline" 
          style={{ width: '56px', height: '56px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-lg)' }}
          title="Escanear Código QR"
        >
          <QrCode size={24} />
        </button>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="card shadow-lg" style={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            right: 0, 
            marginTop: '0.5rem', 
            zIndex: 100, 
            maxHeight: '300px', 
            overflowY: 'auto',
            padding: '0.5rem'
          }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', margin: '0.5rem', textTransform: 'uppercase' }}>Resultados del Directorio</p>
            {searchResults.map(result => (
              <div key={result.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'default' }}>
                <img src={result.logo} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="" />
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800, margin: 0 }}>{result.name}</h4>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{result.professional}</p>
                </div>
                <button 
                  onClick={() => {
                    if (result.isAlreadySaved) {
                      onSelectBusiness(result.id);
                    } else {
                      linkBusiness(result);
                    }
                  }}
                  className={result.isAlreadySaved ? "btn btn-outline" : "btn btn-primary"} 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                >
                  {result.isAlreadySaved ? 'Abrir' : 'Vincular'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Scanning Simulation Modal */}
      {isScanning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2rem',
          backdropFilter: 'blur(8px)'
        }}>
          <button 
            onClick={() => setIsScanning(false)}
            style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            <X size={32} />
          </button>
          
          <div style={{ position: 'relative', width: '280px', height: '280px' }}>
            <div style={{ width: '100%', height: '100%', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '24px', overflow: 'hidden' }}>
              <img src="https://images.unsplash.com/photo-1593702295974-2510d9ec9a57?w=400&h=400&fit=crop" style={{ width: '100%', height: '100%', filter: 'grayscale(100%) blur(2px)', opacity: 0.5 }} alt="" />
            </div>
            {scanStep === 'scanning' && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--primary)', boxShadow: '0 0 15px var(--primary)', animation: 'scanner-loop 2s infinite linear' }} />
            )}
            <div style={{ position: 'absolute', top: 20, left: 20, width: 40, height: 40, borderLeft: '4px solid var(--primary)', borderTop: '4px solid var(--primary)' }} />
            <div style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRight: '4px solid var(--primary)', borderTop: '4px solid var(--primary)' }} />
            <div style={{ position: 'absolute', bottom: 20, left: 20, width: 40, height: 40, borderLeft: '4px solid var(--primary)', borderBottom: '4px solid var(--primary)' }} />
            <div style={{ position: 'absolute', bottom: 20, right: 20, width: 40, height: 40, borderRight: '4px solid var(--primary)', borderBottom: '4px solid var(--primary)' }} />

            {scanStep === 'success' && (
              <div className="animate-scale-in" style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.8)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 color="white" size={80} />
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem' }}>
              {scanStep === 'scanning' ? 'Escaneando Código QR...' : '¡Negocio Vinculado!'}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
              {scanStep === 'scanning' ? 'Apunta la cámara al código QR del establecimiento.' : 'El negocio se ha añadido a tu panel personal.'}
            </p>
            {scanStep === 'scanning' && <Loader2 className="animate-spin" style={{ color: 'var(--primary)', marginTop: '1.5rem' }} size={32} />}
          </div>
        </div>
      )}

      {/* Grid of Logos (My Businesses) */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutGrid size={20} color="var(--primary)" /> Mis Negocios
          </h2>
          <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Ver Todos</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
          {savedBusinesses.map(biz => (
            <button 
              key={biz.id}
              onClick={() => onSelectBusiness(biz.id)}
              className="card"
              style={{ 
                padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--border)', background: 'var(--surface)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', padding: '3px', border: '2px solid var(--primary)', background: 'var(--background)' }}>
                <img src={biz.logo} alt={biz.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 900, marginBottom: '0.2rem', color: 'var(--text)' }}>{biz.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Star size={10} fill="var(--primary)" color="var(--primary)" />
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{biz.rating}</span>
                  <span>•</span>
                  <span style={{ fontWeight: 600 }}>{biz.lastVisit}</span>
                </div>
              </div>
            </button>
          ))}
          
          <button 
            className="card"
            onClick={() => {
              const input = document.querySelector('input');
              if (input) { input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            }}
            style={{ 
              padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.75rem', cursor: 'pointer', border: '2px dashed var(--border)', background: 'transparent', minHeight: '160px', transition: 'all 0.2s'
            }}
          >
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Plus size={24} />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)' }}>Vincular Nuevo</span>
          </button>
        </div>
      </section>

      {/* Recommended/Ads */}
      <section className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(0,0,0,0) 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>Prueba "Corte VIP"</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Descubre servicios premium cerca de ti.</p>
        </div>
        <ArrowRight size={24} color="var(--primary)" />
      </section>
    </div>
  );
};
