import React from 'react';
import { Check, Zap, Crown, Rocket, ShieldCheck, Star, Building2 } from 'lucide-react';

interface PricingPlansProps {
  currentPlan?: string;
  isMobile?: boolean;
  onUpgrade?: (plan: string) => void;
}

export const PricingPlans: React.FC<PricingPlansProps> = ({ currentPlan = 'Free', isMobile = false, onUpgrade }) => {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Esencial para barberos con pocos clientes.',
      icon: <Zap size={24} />,
      color: '#a1a1aa',
      features: [
        'Hasta 100 citas por mes',
        'Panel de control básico',
        'Chat con clientes',
        '1 Profesional'
      ]
    },
    {
      name: 'Professional',
      price: '$29',
      description: 'Ideal para el barbero estrella que quiere control total.',
      icon: <Crown size={24} />,
      color: 'var(--primary)',
      features: [
        'Citas ilimitadas',
        'Gestión de Inventario',
        'Reportes Financieros',
        'Difusión de promociones',
        '1 Profesional principal'
      ]
    },
    {
      name: 'Multi-Professional',
      price: '$79',
      popular: true,
      description: 'Para barberías con varios profesionales y estaciones.',
      icon: <Rocket size={24} />,
      color: '#8b5cf6',
      features: [
        'Todo lo de Professional',
        'Hasta 5 Profesionales',
        'Multi-Estaciones de trabajo',
        'API de WhatsApp oficial',
        'Soporte prioritario'
      ]
    },
    {
      name: 'Multi-Negocios',
      price: '$149',
      description: 'Control total de múltiples sucursales y locales.',
      icon: <Building2 size={24} />,
      color: '#ec4899',
      features: [
        'Múltiples Sucursales',
        'Panel Centralizado',
        'Reportes Consolidados',
        'Profesionales ilimitados',
        'Account Manager dedicado'
      ]
    }
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-1px' }}>Planes y Membresías</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Escale su negocio con el plan adecuado para su equipo.</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', 
        gap: isMobile ? '2rem' : '1rem',
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '0 1rem'
      }}>
        {plans.map((plan) => (
          <div 
            key={plan.name}
            className="card"
            style={{ 
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              padding: '2.5rem',
              border: plan.popular ? `2px solid ${plan.color}` : '1px solid var(--border)',
              background: plan.popular ? 'rgba(245,158,11,0.02)' : 'var(--surface)',
              transform: plan.popular ? 'scale(1.05)' : 'none',
              zIndex: plan.popular ? 1 : 0,
              boxShadow: plan.popular ? '0 20px 40px rgba(0,0,0,0.3)' : 'none'
            }}
          >
            {plan.popular && (
              <div style={{ 
                position: 'absolute', 
                top: '-15px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                background: plan.color, 
                color: 'black', 
                padding: '0.25rem 1rem', 
                borderRadius: 'var(--radius-full)', 
                fontSize: '0.75rem', 
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Star size={12} fill="black" /> EL MÁS ELEGIDO
              </div>
            )}

            <div style={{ color: plan.color, marginBottom: '1.5rem' }}>
              {plan.icon}
            </div>
            
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>{plan.name}</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', margin: '1rem 0' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{plan.price}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/ mes</span>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5, height: '3rem' }}>
              {plan.description}
            </p>

            <div style={{ flex: 1, marginBottom: '2.5rem' }}>
              {plan.features.map((feature, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '0.2rem', borderRadius: '50%' }}>
                    <Check size={14} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => onUpgrade?.(plan.name)}
              className="btn"
              style={{ 
                width: '100%', 
                padding: '1rem', 
                fontWeight: 800,
                fontSize: '1rem',
                background: plan.name === currentPlan ? 'var(--surface-hover)' : plan.popular ? plan.color : 'white',
                color: plan.name === currentPlan ? 'var(--text-muted)' : 'black',
                cursor: plan.name === currentPlan ? 'default' : 'pointer'
              }}
              disabled={plan.name === currentPlan}
            >
              {plan.name === currentPlan ? 'TU PLAN ACTUAL' : 'EMPEZAR AHORA'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '4rem', textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
        <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>
          <ShieldCheck size={24} color="var(--success)" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> 
          Transacciones Seguras y Garantizadas
        </h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '600px', margin: '0 auto' }}>
          Próximamente integraremos pasarelas de pago locales (Azul, Carnet) y PayPal/Stripe para mayor comodidad de tu negocio en la República Dominicana.
        </p>
      </div>
    </div>
  );
};
