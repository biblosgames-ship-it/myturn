import React, { useState } from 'react';
import { QrCode, Printer, Download, Copy, CheckCircle2, X, ExternalLink, Sparkles, Scissors, Smartphone } from 'lucide-react';

interface BusinessQrPosterModalProps {
  tenant: {
    id: string;
    name: string;
    slug?: string;
    logo?: string;
    slogan?: string;
    professional_name?: string;
  };
  onClose: () => void;
}

export const BusinessQrPosterModal: React.FC<BusinessQrPosterModalProps> = ({ tenant, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [posterTheme, setPosterTheme] = useState<'clean' | 'dark'>('clean');

  const clientUrl = `${window.location.origin}/${tenant.slug || tenant.id}`;
  const encodedUrl = encodeURIComponent(clientUrl);
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodedUrl}&margin=15&format=png`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = async () => {
    try {
      setDownloading(true);
      const res = await fetch(qrImageSrc);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_${tenant.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback
      window.open(qrImageSrc, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(clientUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert(clientUrl);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div className="animate-scale-in no-print" style={{
        width: '100%',
        maxWidth: '820px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Modal Top Bar */}
        <div className="card" style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <QrCode size={22} color="var(--primary)" /> Cartel QR para el Negocio
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
              Listo para imprimir y colocar en el mostrador o pared del local.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Theme Toggle */}
            <div style={{ display: 'flex', background: 'var(--background)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setPosterTheme('clean')}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: posterTheme === 'clean' ? 'var(--surface)' : 'transparent',
                  color: posterTheme === 'clean' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Hoja Blanca (Tinta Ahorro)
              </button>
              <button
                type="button"
                onClick={() => setPosterTheme('dark')}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: posterTheme === 'dark' ? 'var(--surface)' : 'transparent',
                  color: posterTheme === 'dark' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Fondo Oscuro
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 800 }}
            >
              <Printer size={16} /> Imprimir Cartel
            </button>

            <button
              onClick={handleDownloadQr}
              disabled={downloading}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
              title="Descargar solo la imagen del código QR"
            >
              <Download size={16} /> QR PNG
            </button>

            <button
              onClick={onClose}
              className="btn btn-outline"
              style={{ padding: '0.5rem', borderRadius: '50%' }}
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Poster Container for Screen Preview */}
        <div style={{
          overflowY: 'auto',
          maxHeight: 'calc(94vh - 120px)',
          display: 'flex',
          justifyContent: 'center',
          padding: '0.5rem 0'
        }}>
          {/* THE PRINTABLE FLYER ELEMENT */}
          <div
            id="printable-qr-poster"
            style={{
              width: '100%',
              maxWidth: '560px',
              minHeight: '750px',
              background: posterTheme === 'clean' ? '#ffffff' : '#09090b',
              color: posterTheme === 'clean' ? '#0f172a' : '#f8fafc',
              border: posterTheme === 'clean' ? '2px solid #e2e8f0' : '2px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '24px',
              padding: '2.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              boxSizing: 'border-box'
            }}
          >
            {/* Header: Logo & Business Branding */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                overflow: 'hidden',
                background: '#f8fafc',
                border: '3px solid #f59e0b',
                boxShadow: '0 8px 16px rgba(245, 158, 11, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={tenant.logo || 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=200&h=200&fit=crop'}
                  alt={tenant.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=200&h=200&fit=crop';
                  }}
                />
              </div>

              <div>
                <h1 style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  margin: 0,
                  color: posterTheme === 'clean' ? '#0f172a' : '#ffffff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15
                }}>
                  {tenant.name}
                </h1>
                <p style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: posterTheme === 'clean' ? '#64748b' : '#94a3b8',
                  margin: '0.35rem 0 0 0'
                }}>
                  {tenant.slogan || '¡Bienvenido! Reserva y sigue tu turno en tiempo real'}
                </p>
              </div>

              {/* Call to action ribbon */}
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000000',
                padding: '0.45rem 1.25rem',
                borderRadius: '999px',
                fontWeight: 900,
                fontSize: '0.9rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginTop: '0.25rem',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}>
                <Sparkles size={16} /> ESCANEA PARA TOMAR TU TURNO
              </div>
            </div>

            {/* Central QR Code Box */}
            <div style={{
              margin: '1.5rem 0',
              padding: '1.25rem',
              background: '#ffffff',
              borderRadius: '22px',
              border: '2px solid #cbd5e1',
              boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <img
                src={qrImageSrc}
                alt={`Código QR ${tenant.name}`}
                style={{
                  width: '240px',
                  height: '240px',
                  display: 'block',
                  borderRadius: '12px'
                }}
              />
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#475569',
                letterSpacing: '0.02em'
              }}>
                {clientUrl.replace(/^https?:\/\//, '')}
              </span>
            </div>

            {/* 3 Step Instruction Guide */}
            <div style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              background: posterTheme === 'clean' ? '#f8fafc' : 'rgba(255,255,255,0.04)',
              border: posterTheme === 'clean' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '1rem 0.75rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  1
                </div>
                <strong style={{ fontSize: '0.8rem', fontWeight: 800 }}>Abre tu Cámara</strong>
                <span style={{ fontSize: '0.7rem', color: posterTheme === 'clean' ? '#64748b' : '#94a3b8', lineHeight: 1.2 }}>
                  Apunta hacia el código QR (sin apps raras)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  2
                </div>
                <strong style={{ fontSize: '0.8rem', fontWeight: 800 }}>Elige tu Servicio</strong>
                <span style={{ fontSize: '0.7rem', color: posterTheme === 'clean' ? '#64748b' : '#94a3b8', lineHeight: 1.2 }}>
                  Selecciona corte, barbero y aparta tu turno
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  3
                </div>
                <strong style={{ fontSize: '0.8rem', fontWeight: 800 }}>Sigue tu Turno</strong>
                <span style={{ fontSize: '0.7rem', color: posterTheme === 'clean' ? '#64748b' : '#94a3b8', lineHeight: 1.2 }}>
                  Relájate y mira en vivo cuántos faltan
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              paddingTop: '0.75rem',
              borderTop: posterTheme === 'clean' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.75rem',
              color: posterTheme === 'clean' ? '#94a3b8' : '#64748b'
            }}>
              <span>💈 Sin filas de espera ni demoras</span>
              <strong style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                ⚡ Powered by MyTurn
              </strong>
            </div>
          </div>
        </div>

        {/* Modal Bottom Quick Copy Bar */}
        <div className="card no-print" style={{
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Enlace directo del cliente: <strong style={{ color: 'var(--text)' }}>{clientUrl}</strong>
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleCopyLink}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {copied ? <CheckCircle2 size={14} color="var(--success)" /> : <Copy size={14} />}
              {copied ? '¡Copiado!' : 'Copiar Link'}
            </button>
            <button
              onClick={() => window.open(clientUrl, '_blank')}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ExternalLink size={14} /> Probar Web
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
