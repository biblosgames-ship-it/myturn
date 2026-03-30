import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, User, Phone, CheckCircle2, X, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ClientAuthProps {
  onSuccess: () => void;
  onClose?: () => void;
}

export const ClientAuth: React.FC<ClientAuthProps> = ({ onSuccess, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccessMsg('Se ha enviado un enlace a tu correo para restablecer la contraseña.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'forgot') return handleResetPassword(e);

    setLoading(true);
    setErrorMsg('');

    try {
      if (mode === 'register') {
        const isEmail = email.includes('@');
        const signUpData = isEmail 
          ? { email, password } 
          : { phone: email.replace(/\D/g, ''), password };

        const { data: authData, error: authError } = await supabase.auth.signUp(signUpData);

        if (authError) throw authError;

        if (authData.user) {
          // Link to users table
          const { error: userError } = await supabase.from('users').insert({
            id: authData.user.id,
            role: 'client',
            full_name: fullName || 'Cliente',
            phone: isEmail ? phone : email
          });
          if (userError) throw userError;
          onSuccess();
        }
      } else {
        const isEmail = email.includes('@');
        const loginData = isEmail 
          ? { email, password } 
          : { phone: email.replace(/\D/g, ''), password };

        const { error } = await supabase.auth.signInWithPassword(loginData);
        if (error) throw error;
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {onClose && (
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
      )}

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ width: '64px', height: '64px', background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <User size={32} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>
          {mode === 'login' ? 'Bienvenido de nuevo' : mode === 'register' ? 'Crea tu cuenta' : 'Recuperar Cuenta'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {mode === 'login' ? 'Accede a tus citas y negocios favoritos.' : mode === 'register' ? 'Únete a MyTurn para agendar en segundos.' : 'Ingresa tu correo para enviarte un enlace.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {(mode === 'login' || mode === 'register') && (
          <button 
            onClick={handleGoogleLogin}
            className="btn btn-outline"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.8rem', fontWeight: 800, borderColor: 'var(--border)' }}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" width="18" alt="Google" />
            Continuar con Google
          </button>
        )}

        {(mode === 'login' || mode === 'register') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800 }}>O CON EMAIL</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <div style={{ position: 'relative' }}>
              <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu Nombre Completo"
                required
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <LogIn style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === 'forgot' ? 'Tu Correo Electrónico' : 'Email o Teléfono'}
              required
              style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {mode !== 'forgot' && (
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
          )}

          {mode === 'login' && (
            <button 
              type="button"
              onClick={() => setMode('forgot')}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', textAlign: 'right', padding: 0 }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {errorMsg && (
            <p style={{ color: 'var(--accent)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>{errorMsg}</p>
          )}
          
          {successMsg && (
            <p style={{ color: 'var(--success)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>{successMsg}</p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: mode === 'forgot' ? '1rem' : 0 }}
          >
            {loading ? 'Procesando...' : mode === 'login' ? 'Iniciar Sesión' : mode === 'register' ? 'Registrarme' : 'Enviar Enlace'} 
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          {mode === 'forgot' ? (
            <button 
              onClick={() => { setMode('login'); setSuccessMsg(''); setErrorMsg(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer' }}
            >
              Volver al inicio de sesión
            </button>
          ) : (
            <>
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              <button 
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setSuccessMsg(''); setErrorMsg(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer', marginLeft: '0.5rem' }}
              >
                {mode === 'login' ? 'Regístrate' : 'Inicia Sesión'}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
