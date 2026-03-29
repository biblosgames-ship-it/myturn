import React, { useState, useEffect } from 'react';
import { User, LayoutDashboard, Menu, X, ArrowRight, Play, Check, Clock, TrendingUp, ShieldCheck } from 'lucide-react';
import { BarberDashboard } from './components/BarberDashboard';
import { ClientView } from './components/ClientView';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { BarberAuth } from './components/BarberAuth';

type AppView = 'landing' | 'barber' | 'client' | 'superadmin' | 'barber_login' | 'superadmin_login';

function App() {
  const [view, setView] = useState<AppView>('landing');
  const [tenant, setTenant] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    const path = window.location.pathname.replace(/^\/|\/$/g, '');
    if (path && path !== '') {
      setTenant({ id: path, name: '' });
      setView('client');
    } else {
      const params = new URLSearchParams(window.location.search);
      const barberId = params.get('barber');
      if (barberId) {
        setTenant({ id: barberId, name: '' });
        setView('client');
      }
    }
  }, []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const renderView = () => {
    switch (view) {
      case 'superadmin': 
        return <SuperAdminDashboard />;
      case 'superadmin_login':
        return <BarberAuth isSuperAdmin onSuccess={() => setView('superadmin')} />;
      case 'barber_login':
        return <BarberAuth onSuccess={() => setView('barber')} />;
      case 'barber': 
        return <BarberDashboard />;
      case 'client': 
        return <ClientView initialSlug={tenant?.id} />;
      default: return (
        <main className="animate-fade-in" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.1 }}>
            Gestiona tu tiempo, <br />
            <span style={{ color: 'var(--primary)' }}>No tu fila.</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
            La plataforma inteligente para la gestión de turnos que prioriza la experiencia del cliente y la eficiencia operativa.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setView('client')}>
              Soy Cliente <ArrowRight size={18} />
            </button>
            <button className="btn btn-outline" onClick={() => setView('barber_login')}>
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
        <div className="logo" onClick={() => setView('landing')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo-myturn.png" alt="MyTurn Logo" style={{ height: '38px', width: 'auto' }} />
          <span style={{ letterSpacing: '2px', fontWeight: 900 }}>MYTURN</span>
        </div>
        
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="badge badge-success" style={{ cursor: 'pointer', background: 'var(--primary)', color: 'black' }} onClick={() => setView(view === 'landing' ? 'client' : 'landing')}>
            {view === 'landing' ? 'Agendar Turno' : 'Volver al Inicio'}
          </div>
          <button className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: 'var(--radius-full)' }} onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      {renderView()}

      <footer style={{ 
        padding: '2rem', 
        borderTop: '1px solid var(--border)', 
        textAlign: 'center',
        color: 'var(--text-muted)',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem' }}>© 2026 MyTurn Barber Inc. • Tecnología Adaptativa</p>
          <button 
            onClick={() => setView('superadmin_login')}
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
