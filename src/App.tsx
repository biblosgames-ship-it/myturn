import React, { useState, useEffect } from 'react';
import { User, LayoutDashboard, Menu, X, ArrowRight, Play, Check, Clock, TrendingUp, ShieldCheck } from 'lucide-react';
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
      setLoading(true);
      
      // Check for tenant slug in URL (Priority 1)
      const path = window.location.pathname.replace(/^\/|\/$/g, '');
      if (path === 'reset-password') {
        setView('reset_password');
        setLoading(false);
        return;
      }

      if (path && path !== '') {
        setTenant({ id: path, name: '' });
        setView('client');
        setLoading(false);
        return;
      }

      // Check current session (Priority 2)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Query user role and tenant
        let { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('role, tenant_id')
          .eq('id', session.user.id)
          .maybeSingle();

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
          if (userData.role === 'superadmin') {
            handleSetView('superadmin');
          } else if (userData.role === 'client') {
            const saved = localStorage.getItem('myturn_last_view');
            const savedSlug = localStorage.getItem('myturn_active_business_slug');
            if (saved === 'client' && savedSlug) {
              setTenant({ id: savedSlug, name: '' });
              handleSetView('client');
            } else {
              handleSetView('landing');
            }
          } else {
            handleSetView('barber');
            if (userData.tenant_id) {
              setTenant({ id: userData.tenant_id, name: '' });
            }
          }
        }
      } else {
        // No session, check query params or stay on landing/storage fallback
        const params = new URLSearchParams(window.location.search);
        const barberId = params.get('barber');
        if (barberId) {
          setTenant({ id: barberId, name: '' });
          setView('client');
        } else if (localStorage.getItem('myturn_last_view') === 'landing') {
           setView('landing');
        }
      }
      
      setLoading(false);
    };

    initApp();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
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
    if (newView === 'barber' || newView === 'superadmin' || newView === 'landing') {
      localStorage.setItem('myturn_last_view', newView);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'var(--background)' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo-myturn.png" alt="MyTurn" className="animate-pulse" style={{ height: '60px', marginBottom: '1rem' }} />
          <div style={{ color: 'var(--primary)', fontWeight: 800, letterSpacing: '2px' }}>CARGANDO SESIÓN...</div>
        </div>
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
        return <PasswordReset onComplete={() => setView('landing')} />;
      default: return (
        <main style={{ flex: 1, padding: isSmallScreen ? '0.75rem' : '2rem', overflowY: 'auto' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.1 }}>
            Gestiona tu tiempo, <br />
            <span style={{ color: 'var(--primary)' }}>No tu fila.</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
            La plataforma inteligente para la gestión de turnos que prioriza la experiencia del cliente y la eficiencia operativa.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => handleSetView('client')}>
              Soy Cliente <ArrowRight size={18} />
            </button>
            <button className="btn btn-outline" onClick={() => handleSetView('barber_login')}>
              Soy Profesional
            </button>
          </div>
        </main>
      );
    }
  };

  return (
    <div className="app-container">
       <header>
        <div className="logo" onClick={() => { handleSetView('landing'); setIsMenuOpen(false); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo-myturn.png" alt="MyTurn Logo" style={{ height: '32px', width: 'auto' }} />
          {!isSmallScreen && <span style={{ letterSpacing: '2px', fontWeight: 900 }}>MYTURN</span>}
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
              onClick={() => { handleSetView(view === 'landing' ? 'client' : 'landing'); setIsMenuOpen(false); }}
            >
              {view === 'landing' ? 'Agendar Turno' : 'Volver al Inicio'}
            </div>
          <button className="btn btn-outline" style={{ padding: '0.4rem', borderRadius: 'var(--radius-full)', border: isSmallScreen ? 'none' : '1px solid var(--border)' }} onClick={() => setIsMenuOpen(!isMenuOpen)}>
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
              <button className="btn btn-primary" style={{ padding: '1rem', justifyContent: 'center', fontSize: '1rem' }} onClick={() => { handleSetView(view === 'landing' ? 'client' : 'landing'); setIsMenuOpen(false); }}>
                {view === 'landing' ? '📅 AGENDAR MI TURNO' : '🏠 VOLVER AL INICIO'}
              </button>
              {showInstallBanner && (
                <button className="btn btn-outline" style={{ padding: '1rem', justifyContent: 'center', color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={handleInstall}>
                  📲 INSTALAR APLICACIÓN
                </button>
              )}
              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '0.5rem 0' }} />
            </>
          )}

          <button className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }} onClick={() => { handleSetView('landing'); setIsMenuOpen(false); }}>
            <ArrowRight size={20} /> Inicio
          </button>
          <button className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }} onClick={() => { handleSetView('client'); setIsMenuOpen(false); }}>
            <User size={20} /> Soy Cliente
          </button>
          <button className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }} onClick={() => { handleSetView('barber_login'); setIsMenuOpen(false); }}>
            <LayoutDashboard size={20} /> Soy Profesional
          </button>
          <button className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }} onClick={() => { handleSetView('superadmin_login'); setIsMenuOpen(false); }}>
            <ShieldCheck size={20} /> Administración
          </button>
          
          <div style={{ marginTop: 'auto', textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            MYTURN v1.2.5 • SaaS
          </div>
        </div>
      )}

      {renderView()}

      <footer style={{ 
        padding: '2rem', 
        borderTop: '1px solid var(--border)', 
        textAlign: 'center',
        color: 'var(--text-muted)',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem' }}>© 2026 MyTurn Inc. • Tecnología Adaptativa</p>
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
    </div>
  );
}

export default App;
