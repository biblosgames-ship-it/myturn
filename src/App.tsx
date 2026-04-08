import React, { useState, useEffect } from 'react';
import { User, LayoutDashboard, Menu, X, ArrowRight, Play, Check, Clock, TrendingUp, ShieldCheck, Phone, LogOut } from 'lucide-react';
import { BarberDashboard } from './components/BarberDashboard';
import { ClientView } from './components/ClientView';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { BarberAuth } from './components/BarberAuth';
import { PasswordReset } from './components/PasswordReset';
import { supabase } from './lib/supabase';

type AppView = 'landing' | 'barber' | 'client' | 'superadmin' | 'barber_login' | 'superadmin_login' | 'reset_password';

function App() {
  const [view, setView] = useState<AppView>('landing');
  const [tenant, setTenant] = useState<{ id: string, name: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [user, setUser] = useState<any>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [editData, setEditData] = useState({ full_name: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    let timer: any;
    if (loading) {
      timer = setTimeout(() => setShowRetry(true), 5000);
    } else {
      setShowRetry(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSmallScreen = windowWidth < 480;

  // PWA Install prompt capture
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
  };

  // 1. Initial State from LocalStorage (Immediate UI fallback)
  useEffect(() => {
    const savedView = localStorage.getItem('myturn_last_view');
    if (savedView === 'barber' || savedView === 'superadmin' || savedView === 'client') {
      setView(savedView as AppView);
    }
  }, []);

  // 2. Real Auth Check & Routing
  useEffect(() => {
    const initApp = async () => {
      const timeoutId = setTimeout(() => {
        setLoading(false);
        console.warn('App initialization timed out, forcing load.');
      }, 8000); // 8 second safety timeout

      try {
        setLoading(true);
        
        // 1. Check for tenant slug in URL (Priority 1 - Immediate Routing)
        const path = window.location.pathname.replace(/^\/|\/$/g, '');
        if (path === 'reset-password') {
          setView('reset_password');
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        if (path && path !== '') {
          setTenant({ id: path, name: '' });
          setView('client');
          // We don't return here because we still want to check auth in background
        }

        // 2. Real Auth Check
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          // Query user role and tenant
          let { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('role, tenant_id')
            .eq('id', session.user.id)
            .maybeSingle();

          if (fetchError) console.error('Error fetching user data:', fetchError);

          // If user document is missing (e.g. first Google Login), create it
          if (!userData && !fetchError) {
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                role: 'client',
                full_name: session.user.user_metadata.full_name || 'Nuevo Cliente',
                phone: session.user.phone || null
              })
              .select('role, tenant_id')
              .maybeSingle();
            
            if (!insertError) {
              userData = newUser;
            }
          }

          if (userData) {
            setUser(session.user);
            setEditData({
              full_name: session.user.user_metadata.full_name || '',
              phone: session.user.phone || ''
            });
            const savedView = localStorage.getItem('myturn_last_view');
            
            if (userData.role === 'superadmin' || userData.role === 'admin') {
              handleSetView('superadmin');
            } else if (userData.role === 'client') {
              const savedSlug = localStorage.getItem('myturn_active_business_slug');
              // If we already have a path-based tenant, keep it. 
              // Otherwise fallback to saved slug if they were in client view.
              if (!path && savedView === 'client' && savedSlug) {
                setTenant({ id: savedSlug, name: '' });
                handleSetView('client');
              } else if (!path) {
                handleSetView('landing');
              }
            } else {
              // Priority: If they are a professional but came via a client link, 
              // we should probably still show them the client view or their dashboard?
              // Standard behavior: professionals go to barber dashboard.
              if (!path) {
                if (savedView === 'superadmin' && userData.role === 'superadmin') {
                   handleSetView('superadmin');
                } else {
                   handleSetView('barber');
                }
              }
              
              if (userData.tenant_id && !path) {
                setTenant({ id: userData.tenant_id, name: '' });
              }
            }
          }
        } else {
          // No session, check query params
          const params = new URLSearchParams(window.location.search);
          const barberId = params.get('barber');
          if (barberId) {
            setTenant({ id: barberId, name: '' });
            setView('client');
          } else if (!path && localStorage.getItem('myturn_last_view') === 'landing') {
             setView('landing');
          }
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    initApp();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user || null);
      if (session?.user) {
        setEditData({
          full_name: session.user.user_metadata.full_name || '',
          phone: session.user.phone || ''
        });
      }
      if (!session) {
        setView('landing');
        localStorage.removeItem('myturn_last_view');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSetView = (newView: AppView) => {
    setView(newView);
    if (newView === 'barber' || newView === 'superadmin' || newView === 'client') {
      localStorage.setItem('myturn_last_view', newView);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    setProfileError('');
    try {
      const { error } = await supabase.from('users').update({
        full_name: editData.full_name,
        phone: editData.phone
      }).eq('id', user.id);

      if (error) throw error;
      
      // Update auth metadata too
      await supabase.auth.updateUser({
        data: { full_name: editData.full_name }
      });

      setShowProfileEditor(false);
      alert('Perfil actualizado correctamente');
    } catch (err: any) {
      setProfileError(err.message || 'Error al actualizar');
    } finally {
      setProfileLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#000',
        gap: '2rem',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ animation: 'logoRise 1.5s ease-out forwards' }}>
          <img src="/logo-inicio.png" alt="My Turn" style={{ height: '120px', filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.1))' }} />
        </div>
        {showRetry && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>La conexión está tardando más de lo habitual...</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontWeight: 800 }}
            >
              🔄 REINTENTAR CARGA
            </button>
          </div>
        )}
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'superadmin': 
        return <SuperAdminDashboard />;
      case 'superadmin_login':
        return <BarberAuth isSuperAdmin onSuccess={() => handleSetView('superadmin')} />;
      case 'barber_login':
        return <BarberAuth onSuccess={() => handleSetView('barber')} />;
      case 'barber': 
        return <BarberDashboard />;
      case 'client': 
        return <ClientView initialSlug={tenant?.id} />;
      case 'reset_password':
        return <PasswordReset onComplete={() => setView('client')} />;
      default: 
        return <ClientView initialSlug={tenant?.id} />;
    }
  };

  return (
    <div className="app-container">
       <header className="no-print">
        <div className="logo" onClick={() => { handleSetView('client'); setIsMenuOpen(false); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo-myturn.png" alt="MyTurn Logo" style={{ height: '32px', width: 'auto' }} />
          <span style={{ letterSpacing: '2px', fontWeight: 900 }}>MYTURN</span>
        </div>
        
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {showInstallBanner && (
            <button 
              onClick={handleInstall}
              className="btn btn-primary hide-on-mobile"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 800, gap: '0.4rem', border: 'none' }}
            >
              📲 Instalar App
            </button>
          )}
            <div 
              className="badge badge-success hide-on-mobile" 
              style={{ cursor: 'pointer', background: 'var(--primary)', color: 'black', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }} 
              onClick={() => { handleSetView('client'); setIsMenuOpen(false); }}
            >
              Agendar Turno
            </div>
          <button 
            className="btn btn-outline" 
            style={{ 
              padding: '0.4rem', 
              borderRadius: 'var(--radius-full)', 
              border: isSmallScreen ? 'none' : '1px solid var(--border)',
              zIndex: 10001,
              position: 'relative'
            }} 
            onClick={() => {
              console.log('Toggling menu:', !isMenuOpen);
              setIsMenuOpen(!isMenuOpen);
            }}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </header>

      {/* Mobile Menu Drawer */}
      {isMenuOpen && (
        <div 
          className="animate-fade-in"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'var(--background)', 
            zIndex: 9999, 
            display: 'flex', 
            flexDirection: 'column', 
            padding: '5rem 2rem 2rem',
            gap: '1rem'
          }}
        >
          {/* Close button inside menu for redundancy */}
          <button 
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text)' }}
            onClick={() => setIsMenuOpen(false)}
          >
            <X size={32} />
          </button>

          {/* Primary View Toggles (Visible only in menu on small screens) */}
          {isSmallScreen && (
            <>
              <button className="btn btn-primary" style={{ padding: '1rem', justifyContent: 'center', fontSize: '1rem' }} onClick={() => { handleSetView('client'); setIsMenuOpen(false); }}>
                📅 AGENDAR MI TURNO
              </button>
              {showInstallBanner && (
                <button className="btn btn-outline" style={{ padding: '1rem', justifyContent: 'center', color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={handleInstall}>
                  📲 INSTALAR APLICACIÓN
                </button>
              )}
              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '0.5rem 0' }} />
            </>
          )}

          {user && (
            <button className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', borderColor: 'rgba(245,158,11,0.2)' }} onClick={() => { setShowProfileEditor(true); setIsMenuOpen(false); }}>
              <User size={20} /> Mi Perfil
            </button>
          )}
          <button className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }} onClick={() => { handleSetView('client'); setIsMenuOpen(false); }}>
            <User size={20} /> Soy Cliente
          </button>
          <button className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }} onClick={() => { handleSetView('barber_login'); setIsMenuOpen(false); }}>
            <LayoutDashboard size={20} /> Soy Profesional
          </button>
          
          <div style={{ marginTop: 'auto', textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            MY TURN v1.2.5 • SaaS
          </div>
        </div>
      )}

      {renderView()}

      <footer className="no-print" style={{ 
        padding: '2rem', 
        borderTop: '1px solid var(--border)', 
        textAlign: 'center',
        color: 'var(--text-muted)',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem' }}>© 2026 My Turn Inc. • Tecnología Adaptativa</p>
          <button 
            onClick={() => handleSetView('superadmin_login')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-muted)', 
              fontSize: '0.75rem', 
              cursor: 'pointer',
              textDecoration: 'underline',
              opacity: 0.5
            }}
          >
            Portal Administrativo (SaaS)
          </button>
        </div>
      </footer>

      {/* Profile Editor Modal */}
      {showProfileEditor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
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
              
              {profileError && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>{profileError}</p>
              )}

              <button 
                onClick={handleUpdateProfile}
                disabled={profileLoading}
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem', fontWeight: 900, marginTop: '1rem' }}
              >
                {profileLoading ? 'Guardando...' : 'GUARDAR CAMBIOS'}
              </button>

              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/';
                }}
                className="btn btn-outline" 
                style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.1)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
              >
                <LogOut size={16} />
                <span style={{ fontWeight: 800 }}>CERRAR SESIÓN</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
