import React, { useState, useEffect } from 'react';
import { 
  Sparkles, ChevronRight, ChevronLeft, X, CheckCircle2, 
  Settings, Scissors, Calendar, Users, Share2, LayoutDashboard, 
  Building2, Clock, DollarSign, HelpCircle, ArrowRight
} from 'lucide-react';

export interface TourStep {
  id: string;
  tab?: 'queue' | 'agenda' | 'finance' | 'inventory' | 'management' | 'staff' | 'stations' | 'profile' | 'customers' | 'messages' | 'pricing';
  managementSubTab?: 'brand' | 'services' | 'schedule' | 'reviews' | 'form' | 'promotions';
  title: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
  fieldsToFill: {
    label: string;
    detail: string;
  }[];
  actionText: string;
  targetSelector?: string;
}

interface BusinessOnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  businessName: string;
  shareUrl: string;
  onOpenShareModal?: () => void;
}

export const BusinessOnboardingTour: React.FC<BusinessOnboardingTourProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  businessName,
  shareUrl,
  onOpenShareModal
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const steps: TourStep[] = [
    {
      id: 'brand',
      tab: 'management',
      managementSubTab: 'brand',
      badge: 'Paso 1 de 6 • Identidad',
      title: 'Configura la Identidad de tu Negocio',
      icon: <Building2 size={24} color="#f59e0b" />,
      description: 'Define cómo tus clientes verán tu marca en su pantalla de reservas y en sus recibos digitales.',
      fieldsToFill: [
        { label: 'Logo de tu Negocio', detail: 'Sube tu logo para que aparezca en el encabezado de tu link público y recibos.' },
        { label: 'Nombre Comercial', detail: 'El nombre con el que tus clientes te conocen (ej: Barbería Elite).' },
        { label: 'Teléfono / WhatsApp', detail: 'Tus clientes podrán contactarte directamente si tienen consultas.' },
        { label: 'Color Corporativo', detail: 'Personaliza los botones y detalles con el color de tu marca.' }
      ],
      actionText: 'Ir a Configurar Mi Marca',
      targetSelector: '[data-tutorial="nav-management"]'
    },
    {
      id: 'services',
      tab: 'management',
      managementSubTab: 'services',
      badge: 'Paso 2 de 6 • Servicios',
      title: 'Crea tu Catálogo de Servicios y Precios',
      icon: <Scissors size={24} color="#3b82f6" />,
      description: 'Define qué servicios ofreces, su tarifa en dinero y la duración aproximada en minutos.',
      fieldsToFill: [
        { label: 'Nombre del Servicio', detail: 'Ej: Corte Clásico, Barba y Afeitado, Tinte, Lavado, etc.' },
        { label: 'Precio ($)', detail: 'Monto a cobrar por el servicio. Se reflejará automáticamente en Finanzas.' },
        { label: 'Duración (Minutos)', detail: 'Tiempo aproximado (ej: 30 min, 45 min). El sistema lo usa para calcular turnos sin cruces.' },
        { label: 'Ícono Representativo', detail: 'Elige un icono atractivo para que los clientes identifiquen el servicio al instante.' }
      ],
      actionText: 'Ver y Agregar Servicios',
      targetSelector: '[data-tutorial="subtab-services"]'
    },
    {
      id: 'schedule',
      tab: 'management',
      managementSubTab: 'schedule',
      badge: 'Paso 3 de 6 • Horarios',
      title: 'Establece tus Horarios de Atención',
      icon: <Clock size={24} color="#10b981" />,
      description: 'Indica los días que abres y las horas de trabajo para que los clientes no reserven fuera de tu jornada.',
      fieldsToFill: [
        { label: 'Días de Apertura', detail: 'Activa o desactiva qué días trabajas (ej: Lunes a Sábado).' },
        { label: 'Hora de Apertura y Cierre', detail: 'Define el rango de atención comercial (ej: 09:00 - 19:00).' },
        { label: 'Descanso de Almuerzo', detail: 'Configura un intervalo de descanso para que nadie agende en tu hora de comida.' }
      ],
      actionText: 'Configurar Horarios',
      targetSelector: '[data-tutorial="subtab-schedule"]'
    },
    {
      id: 'staff',
      tab: 'staff',
      badge: 'Paso 4 de 6 • Equipo',
      title: 'Registra a tus Barberos y Profesionales',
      icon: <Users size={24} color="#8b5cf6" />,
      description: 'Si cuentas con un equipo de trabajo, agrégalos para que los clientes elijan con quién atenderse.',
      fieldsToFill: [
        { label: 'Nombre y Rol', detail: 'Nombre del barbero o especialista y su especialidad.' },
        { label: 'Foto de Perfil', detail: 'Una foto profesional genera confianza en los clientes nuevos.' },
        { label: '% de Comisión Pactado', detail: 'El sistema calculará automáticamente sus pagos y comisiones diarias según las citas que atienda.' }
      ],
      actionText: 'Ir al Módulo de Equipo',
      targetSelector: '[data-tutorial="nav-staff"]'
    },
    {
      id: 'share',
      tab: 'queue',
      badge: 'Paso 5 de 6 • Clientes',
      title: 'Tu Enlace Público de Citas y Código QR',
      icon: <Share2 size={24} color="#ec4899" />,
      description: '¡Tu negocio está listo en línea! Ahora comparte tu enlace único para que tus clientes agenden turnos 24/7.',
      fieldsToFill: [
        { label: 'Copiar Enlace Web', detail: 'Pega tu link en la biografía de Instagram, Facebook o estado de WhatsApp.' },
        { label: 'Descargar Código QR', detail: 'Imprime el código QR generado y pégalo en el mostrador o cristal de tu local.' },
        { label: 'Cero Interrupciones', detail: 'Tus clientes reservan solos en segundos sin llamadas ni mensajes manuales.' }
      ],
      actionText: 'Ver Mi Enlace y Código QR',
      targetSelector: '[data-tutorial="nav-share"]'
    },
    {
      id: 'ready',
      tab: 'queue',
      badge: 'Paso 6 de 6 • Operación',
      title: '¡Todo Listo! Empieza a Atender',
      icon: <CheckCircle2 size={24} color="#10b981" />,
      description: 'Conoce tus dos pantallas principales de control diario para atender a tus clientes sin estrés.',
      fieldsToFill: [
        { label: 'Cola en Vivo (En Vivo)', detail: 'Monitorea en tiempo real los clientes que van llegando en el día, llama al siguiente y procesa cobros.' },
        { label: 'Agenda (Calendario)', detail: 'Revisa las citas programadas a futuro por día, semana o mes.' },
        { label: 'Finanzas y Reportes', detail: 'Consulta los ingresos por servicios, ventas de tienda y comisiones del equipo en cualquier momento.' }
      ],
      actionText: 'Ir a Cola en Vivo y Finalizar',
      targetSelector: '[data-tutorial="nav-queue"]'
    }
  ];

  const currentStep = steps[currentStepIndex];

  // Apply tab switch when action button is clicked
  const handleExecuteStepAction = () => {
    if (currentStep.tab) {
      setActiveTab(currentStep.tab);
    }
    if (currentStep.id === 'share' && onOpenShareModal) {
      onOpenShareModal();
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      const nextStep = steps[nextIndex];
      if (nextStep.tab) {
        setActiveTab(nextStep.tab);
      }
    } else {
      // Finished tour
      localStorage.setItem('myturn_business_tour_completed', 'true');
      localStorage.removeItem('myturn_new_business_onboarding');
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      const prevStep = steps[prevIndex];
      if (prevStep.tab) {
        setActiveTab(prevStep.tab);
      }
    }
  };

  // Add glowing highlight effect to target DOM element if found
  useEffect(() => {
    if (!isOpen || isMinimized) return;

    // Remove any previous highlight class
    document.querySelectorAll('.myturn-tutorial-highlight').forEach(el => {
      el.classList.remove('myturn-tutorial-highlight');
    });

    if (currentStep.targetSelector) {
      const targetEl = document.querySelector(currentStep.targetSelector);
      if (targetEl) {
        targetEl.classList.add('myturn-tutorial-highlight');
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    return () => {
      document.querySelectorAll('.myturn-tutorial-highlight').forEach(el => {
        el.classList.remove('myturn-tutorial-highlight');
      });
    };
  }, [currentStepIndex, isOpen, isMinimized, activeTab]);

  if (!isOpen) return null;

  // Minimized floating bubble
  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 10000,
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: '#000',
          padding: '0.75rem 1.25rem',
          borderRadius: '999px',
          fontWeight: 900,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4), 0 2px 8px rgba(0,0,0,0.5)',
          cursor: 'pointer',
          animation: 'bounce 2s infinite'
        }}
      >
        <Sparkles size={18} />
        <span>Guía de Configuración ({currentStepIndex + 1}/{steps.length})</span>
      </div>
    );
  }

  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <>
      {/* Dynamic CSS for highlighted elements */}
      <style>{`
        .myturn-tutorial-highlight {
          position: relative !important;
          z-index: 9998 !important;
          box-shadow: 0 0 0 4px #f59e0b, 0 0 30px rgba(245, 158, 11, 0.7) !important;
          animation: tutorialPulse 2s infinite !important;
          border-radius: var(--radius-md) !important;
          transition: all 0.3s ease !important;
        }
        @keyframes tutorialPulse {
          0% { box-shadow: 0 0 0 3px #f59e0b, 0 0 15px rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 0 0 6px #f59e0b, 0 0 35px rgba(245, 158, 11, 0.8); }
          100% { box-shadow: 0 0 0 3px #f59e0b, 0 0 15px rgba(245, 158, 11, 0.4); }
        }
      `}</style>

      {/* Floating Assistant Card */}
      <div 
        className="animate-fade-in"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: 'calc(100vw - 4rem)',
          maxWidth: '460px',
          zIndex: 9999,
          background: 'rgba(20, 20, 24, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.7), 0 0 20px rgba(245, 158, 11, 0.15)',
          color: 'var(--text)',
          overflow: 'hidden'
        }}
      >
        {/* Progress Bar Top */}
        <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)' }}>
          <div 
            style={{ 
              width: `${progressPercent}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, #f59e0b, #10b981)', 
              transition: 'width 0.4s ease' 
            }} 
          />
        </div>

        {/* Card Header */}
        <div style={{ padding: '1.25rem 1.25rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '42px', height: '42px', borderRadius: '12px', 
              background: 'rgba(245, 158, 11, 0.12)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(245, 158, 11, 0.25)'
            }}>
              {currentStep.icon}
            </div>
            <div>
              <div style={{ 
                fontSize: '0.7rem', 
                fontWeight: 900, 
                color: 'var(--primary)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}>
                {currentStep.badge}
              </div>
              <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.05rem', fontWeight: 900, lineHeight: 1.25 }}>
                {currentStep.title}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              onClick={() => setIsMinimized(true)}
              title="Minimizar guía"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                padding: '0.3rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              _
            </button>
            <button
              onClick={() => {
                localStorage.setItem('myturn_business_tour_completed', 'true');
                localStorage.removeItem('myturn_new_business_onboarding');
                onClose();
              }}
              title="Cerrar guía"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                padding: '0.3rem 0.5rem',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: '0.75rem 1.25rem 1.25rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: '0 0 1rem 0' }}>
            {currentStep.description}
          </p>

          {/* Checklist of what to fill in */}
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)', 
            padding: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem'
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Campos que debes completar:
            </div>
            {currentStep.fieldsToFill.map((field, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.8rem', lineHeight: 1.35 }}>
                  <strong style={{ color: 'var(--text)' }}>{field.label}:</strong>{' '}
                  <span style={{ color: 'var(--text-muted)' }}>{field.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Step Direct Action Button */}
          <button
            onClick={handleExecuteStepAction}
            className="btn btn-outline"
            style={{
              width: '100%',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderColor: 'var(--primary)',
              color: 'var(--primary)',
              fontWeight: 800,
              fontSize: '0.85rem',
              padding: '0.65rem'
            }}
          >
            <span>{currentStep.actionText}</span>
            <ArrowRight size={16} />
          </button>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              style={{
                background: 'transparent',
                border: 'none',
                color: currentStepIndex === 0 ? 'rgba(255,255,255,0.2)' : 'var(--text-muted)',
                cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              <ChevronLeft size={16} /> Anterior
            </button>

            {/* Step Dots */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {steps.map((_, i) => (
                <div 
                  key={i}
                  onClick={() => {
                    setCurrentStepIndex(i);
                    if (steps[i].tab) setActiveTab(steps[i].tab);
                  }}
                  style={{
                    width: i === currentStepIndex ? '18px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: i === currentStepIndex ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="btn btn-primary"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              {currentStepIndex === steps.length - 1 ? '¡Finalizar Guía!' : 'Siguiente'}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
