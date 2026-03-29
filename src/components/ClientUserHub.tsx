import { LayoutGrid, Clock, Star, ArrowRight, Search, Plus, QrCode, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SavedBusiness {
  id: string;
  name: string;
  professional: string;
  title: string;
  logo: string;
  rating: number;
  lastVisit: string;
}

interface ClientUserHubProps {
  onSelectBusiness: (id: string | null) => void;
}

// GLOBAL_DIRECTORY is now empty, will fetch from Supabase
const GLOBAL_DIRECTORY: SavedBusiness[] = [];

export const ClientUserHub: React.FC<ClientUserHubProps> = ({ onSelectBusiness }) => {
  const [savedBusinesses, setSavedBusinesses] = useState<SavedBusiness[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SavedBusiness[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<'idle' | 'scanning' | 'success'>('idle');

  useEffect(() => {
    const fetchRealBusinesses = async () => {
      const { data } = await supabase.from('tenants').select('*');
      if (data) {
        setSavedBusinesses(data.map(t => ({
          id: t.slug || t.id,
          name: t.name,
          professional: 'Staff Profesional',
          title: 'Servicios',
          logo: t.logo || 'https://images.unsplash.com/photo-1593702295974-2510d9ec9a57?w=128&h=128&fit=crop',
          rating: 5.0,
          lastVisit: 'Descubierto'
        })));
      }
    };
    fetchRealBusinesses();
  }, []);

  useEffect(() => {
    const searchBusinesses = async () => {
      if (searchTerm.trim() === '') {
        setSearchResults([]);
        return;
      }
      
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .limit(10);
        
      if (data) {
        setSearchResults(data
          .filter(t => !savedBusinesses.find(s => s.id === (t.slug || t.id)))
          .map(t => ({
            id: t.slug || t.id,
            name: t.name,
            professional: 'Staff Profesional',
            title: 'Servicios',
            logo: t.logo || 'https://images.unsplash.com/photo-1593702295974-2510d9ec9a57?w=128&h=128&fit=crop',
            rating: 5.0,
            lastVisit: 'Descubierto'
          }))
        );
      }
    };

    const timeoutId = setTimeout(searchBusinesses, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, savedBusinesses]);

  const linkBusiness = (biz: SavedBusiness) => {
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
        const dental = GLOBAL_DIRECTORY.find(b => b.id === 'clinic-center');
        if (dental && !savedBusinesses.find(s => s.id === dental.id)) {
          linkBusiness(dental);
        }
        setIsScanning(false);
        setScanStep('idle');
      }, 1500);
    }, 2000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Search Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.5px' }}>Hola, <span style={{ color: 'var(--primary)' }}>Juan</span></h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>¿A dónde quieres ir hoy?</p>
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
                  onClick={() => linkBusiness(result)}
                  className="btn btn-primary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                >
                  Vincular
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
            {/* Camera View Simulation */}
            <div style={{ width: '100%', height: '100%', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '24px', overflow: 'hidden' }}>
              <img src="https://images.unsplash.com/photo-1593702295974-2510d9ec9a57?w=400&h=400&fit=crop" style={{ width: '100%', height: '100%', filter: 'grayscale(100%) blur(2px)', opacity: 0.5 }} alt="" />
            </div>
            {/* Scanning Line Animation */}
            {scanStep === 'scanning' && (
              <>
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  height: '2px', 
                  background: 'var(--primary)', 
                  boxShadow: '0 0 15px var(--primary)',
                  animation: 'scanner-loop 2s infinite linear' 
                }} />
                <style>{`
                  @keyframes scanner-loop {
                    0% { top: 10%; }
                    50% { top: 90%; }
                    100% { top: 10%; }
                  }
                `}</style>
              </>
            )}
            
            {/* Corners UI */}
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
                padding: '1.25rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                textAlign: 'center', 
                gap: '0.75rem', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                border: '1px solid var(--border)',
                background: 'var(--surface)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ 
                width: '72px', 
                height: '72px', 
                borderRadius: '50%', 
                padding: '3px',
                border: '2px solid var(--primary)',
                background: 'var(--background)'
              }}>
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
              if (input) {
                input.focus();
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            style={{ 
              padding: '1.25rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              textAlign: 'center', 
              gap: '0.75rem', 
              cursor: 'pointer',
              border: '2px dashed var(--border)',
              background: 'transparent',
              minHeight: '160px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.background = 'rgba(245,158,11,0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'transparent';
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
