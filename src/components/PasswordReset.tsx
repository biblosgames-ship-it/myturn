import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const PasswordReset: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(onComplete, 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card animate-scale-in" style={{ maxWidth: '400px', margin: '4rem auto', padding: '3rem', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <CheckCircle2 size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem' }}>¡Contraseña Actualizada!</h2>
        <p style={{ color: 'var(--text-muted)' }}>Tu contraseña ha sido cambiada con éxito. Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="card animate-scale-in" style={{ maxWidth: '400px', margin: '4rem auto', padding: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ width: '64px', height: '64px', background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>Ingresa Nueva Contraseña</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Asegúrate de que sea una contraseña segura.</p>
      </div>

      <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ position: 'relative' }}>
          <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nueva contraseña"
            required
            style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input 
            type="password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmar contraseña"
            required
            style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        {errorMsg && (
          <p style={{ color: 'var(--accent)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>{errorMsg}</p>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="btn btn-primary" 
          style={{ width: '100%', padding: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          {loading ? 'Actualizando...' : 'Cambiar Contraseña'} 
          {!loading && <ArrowRight size={20} />}
        </button>
      </form>
    </div>
  );
};
