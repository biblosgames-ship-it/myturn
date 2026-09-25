import React, { useState } from 'react';
import { QrCode, Printer, Download, Copy, CheckCircle2, X, ExternalLink, Sparkles, FileText, Loader2, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  const [downloadingType, setDownloadingType] = useState<'poster' | 'pdf' | 'qr' | null>(null);
  const [posterTheme, setPosterTheme] = useState<'clean' | 'dark'>('clean');

  const clientUrl = `${window.location.origin}/${tenant.slug || tenant.id}`;
  const encodedUrl = encodeURIComponent(clientUrl);
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodedUrl}&margin=15&format=png`;

  const handlePrint = () => {
    window.print();
  };

  // Descarga la página completa del cartel con logo, pasos e instrucciones en alta definición
  const handleDownloadPosterImage = async () => {
    const element = document.getElementById('printable-qr-poster');
    if (!element) return;
    try {
      setDownloadingType('poster');
      const canvas = await html2canvas(element, {
        scale: 3, // Ultra alta resolución para impresión
        useCORS: true,
        allowTaint: false,
        backgroundColor: posterTheme === 'clean' ? '#ffffff' : '#09090b',
        logging: false,
      });
      const cleanName = tenant.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Cartel_${cleanName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generando imagen del cartel:', err);
      alert('Hubo un inconveniente al generar la imagen. Puedes usar la opción de "Descargar PDF A4" o "Imprimir Cartel".');
    } finally {
      setDownloadingType(null);
    }
  };

  // Genera y descarga un PDF en formato A4 listo para imprimir
  const handleDownloadPdf = async () => {
    const element = document.getElementById('printable-qr-poster');
    if (!element) return;
    try {
      setDownloadingType('pdf');
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: posterTheme === 'clean' ? '#ffffff' : '#09090b',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const imgProps = pdf.getImageProperties(imgData);

      const margin = 12; // Margen de 12mm
      const usableWidth = pageWidth - (margin * 2);
      const usableHeight = pageHeight - (margin * 2);

      let printWidth = usableWidth;
      let printHeight = (imgProps.height * usableWidth) / imgProps.width;

      if (printHeight > usableHeight) {
        printHeight = usableHeight;
        printWidth = (imgProps.width * usableHeight) / imgProps.height;
      }

      const x = (pageWidth - printWidth) / 2;
      const y = (pageHeight - printHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, printWidth, printHeight);
      const cleanName = tenant.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`Cartel_${cleanName}.pdf`);
    } catch (err) {
      console.error('Error generando PDF del cartel:', err);
      alert('Hubo un inconveniente al generar el PDF. Puedes usar "Imprimir Cartel".');
    } finally {
      setDownloadingType(null);
    }
  };

  // Descarga únicamente el recuadro del código QR
  const handleDownloadRawQr = async () => {
    try {
      setDownloadingType('qr');
      const res = await fetch(qrImageSrc);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_Solo_${tenant.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open(qrImageSrc, '_blank');
    } finally {
      setDownloadingType(null);
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
    <div
      className="business-qr-modal-overlay"
      style={{
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
      }}
    >
      <div
        className="business-qr-modal-container animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        {/* Modal Top Bar */}
        <div className="card no-print" style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <QrCode size={22} color="var(--primary)" /> Cartel QR para el Negocio
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
              Página completa con logotipo, pasos e instrucciones lista para imprimir y colocar en el mostrador.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
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
                Hoja Blanca (Ahorro Tinta)
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

            {/* Descargar Cartel Completo (Imagen PNG) */}
            <button
              onClick={handleDownloadPosterImage}
              disabled={!!downloadingType}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}
              title="Descarga la página completa del cartel con logo, código y pasos en imagen PNG"
            >
              {downloadingType === 'poster' ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Generando...
                </>
              ) : (
                <>
                  <ImageIcon size={16} /> Descargar Cartel PNG
                </>
              )}
            </button>

            {/* Descargar PDF A4 */}
            <button
              onClick={handleDownloadPdf}
              disabled={!!downloadingType}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}
              title="Descarga el cartel en archivo PDF tamaño A4 listo para imprimir"
            >
              {downloadingType === 'pdf' ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Creando PDF...
                </>
              ) : (
                <>
                  <FileText size={16} /> Descargar PDF A4
                </>
              )}
            </button>

            {/* Imprimir Directo */}
            <button
              onClick={handlePrint}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem', fontWeight: 700 }}
              title="Abrir diálogo de impresión de la computadora"
            >
              <Printer size={16} /> Imprimir
            </button>

            {/* Solo recuadro QR */}
            <button
              onClick={handleDownloadRawQr}
              disabled={!!downloadingType}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.65rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}
              title="Descargar únicamente el recuadro del código QR"
            >
              {downloadingType === 'qr' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Solo QR</span>
            </button>

            <button
              onClick={onClose}
              className="btn btn-outline"
              style={{ padding: '0.5rem', borderRadius: '50%', marginLeft: '0.25rem' }}
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Poster Container for Screen Preview */}
        <div
          className="business-qr-poster-scroll"
          style={{
            overflowY: 'auto',
            maxHeight: 'calc(94vh - 120px)',
            display: 'flex',
            justifyContent: 'center',
            padding: '0.5rem 0'
          }}
        >
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
                  crossOrigin="anonymous"
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
                crossOrigin="anonymous"
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
