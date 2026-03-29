import React, { useState } from 'react';
import { Key, ArrowRight, CheckCircle2 } from 'lucide-react';

interface InviteScreenProps {
  onSuccess: (code: string) => void;
}

export const InviteScreen: React.FC<InviteScreenProps> = ({ onSuccess }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleVerify = () => {
    if (code.toLowerCase() === 'myturn-99x-2026') {
      onSuccess(code);
    } else {
      setError('Código de invitación inválido o expirado.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ 
      maxWidth: '400px', 
      margin: '6rem auto', 
      padding: '2rem', 
      background: 'var(--surface)', 
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      textAlign: 'center'
    }}>
      <div style={{ 
        width: '64px', 
        height: '64px', 
        borderRadius: 'var(--radius-full)', 
        background: 'rgba(245,158,11,0.1)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        margin: '0 auto 1.5rem',
        color: 'var(--primary)'
      }}>
        <Key size={32} />
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Acceso Exclusivo</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
        MyTurn Barber es una plataforma SaaS privada. Por favor ingresa tu código de invitación para configurar tu barbería.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>
            Código de Invitación
          </label>
          <input 
            type="text" 
            placeholder="Ej: MYTURN-XXX-XXXX" 
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{ 
              width: '100%', 
              padding: '1rem', 
              background: 'var(--background)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius-md)',
              color: 'var(--text)',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
        </div>
        
        {error && <p style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>{error}</p>}

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '1rem' }}
          onClick={handleVerify}
        >
          Validar Código <ArrowRight size={18} />
        </button>
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2rem' }}>
        ¿No tienes un código? Contacta con el equipo de <span style={{ color: 'var(--primary)' }}>MyTurn SuperAdmin</span>.
      </p>
    </div>
  );
};
