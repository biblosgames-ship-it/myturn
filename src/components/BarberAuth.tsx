import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, Mail, CheckCircle2, Building2, Chrome } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const BarberAuth: React.FC<{ onSuccess: () => void, isSuperAdmin?: boolean }> = ({ onSuccess, isSuperAdmin }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'admin'>(isSuperAdmin ? 'admin' : 'login');
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteTenantId, setInviteTenantId] = useState<string | null>(null);
  
  // Real Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleInviteValidate = async () => {
    setLoading(true);
    if (inviteCode.toUpperCase() === 'MYTURN-99X-2026') {
      setInviteValid(true);
      setErrorMsg('');
      setInviteTenantId(null);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.from('tenants').select('id').eq('name', `Invitación: ${inviteCode.toUpperCase()}`).single();
      if (data) {
        setInviteValid(true);
        setErrorMsg('');
        setInviteTenantId(data.id);
      } else {
        setErrorMsg('Código no encontrado o ya utilizado.');
      }
    } catch (err: any) {
      setErrorMsg('Error al verificar el código.');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (mode === 'admin') {
        const adminEmails = ['admin@myturn.app', 'alexpalacio29@gmail.com'];
        const isAdmin = adminEmails.includes(email.toLowerCase().trim()) && password === 'admin123';
        if (isAdmin) onSuccess();
        else setErrorMsg('Credenciales de Super Admin inválidas.');
        setLoading(false);
        return;
      }

      if (mode === 'register') {
        // 1. Sign up the user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const slug = slugify(businessName || 'Mi Negocio');
          // 2. Create or Update the Tenant (Business)
          let tenantId;
          if (inviteTenantId) {
            // Update the existing invitation record
            const { data: tenantData, error: tenantError } = await supabase.from('tenants').update({
              name: businessName || 'Mi Negocio',
              slug: slug,
              owner: email 
            }).eq('id', inviteTenantId).select().single();
            
            if (tenantError) {
              // Fallback if slug is taken
              const uniqueSlug = `${slug}-${Math.random().toString(36).substring(7)}`;
              const { data: retryData, error: retryError } = await supabase.from('tenants').update({
                name: businessName || 'Mi Negocio',
                slug: uniqueSlug,
                owner: email 
              }).eq('id', inviteTenantId).select().single();
              if (retryError) throw retryError;
              tenantId = retryData.id;
            } else {
              tenantId = tenantData.id;
            }
          } else {
            const { data: tenantData, error: tenantError } = await supabase.from('tenants').insert({
              name: businessName || 'Mi Negocio',
              slug: slug,
              industry: 'General',
              plan_id: 'Free',
              owner: email
            }).select().single();

            if (tenantError) {
              // Fallback if slug is taken
              const uniqueSlug = `${slug}-${Math.random().toString(36).substring(7)}`;
              const { data: retryData, error: retryError } = await supabase.from('tenants').insert({
                name: businessName || 'Mi Negocio',
                slug: uniqueSlug,
                industry: 'General',
                plan_id: 'Free',
                owner: email
              }).select().single();
              if (retryError) throw retryError;
              tenantId = retryData.id;
            } else {
              tenantId = tenantData.id;
            }
          }

          // 3. Link the User to the Tenant
          if (tenantId) {
            const { error: userError } = await supabase.from('users').insert({
              id: authData.user.id,
              tenant_id: tenantId,
              full_name: 'Propietario',
              role: 'owner'
            });
            if (userError) throw userError;
          }
          onSuccess();
        } else {
           setErrorMsg('Es posible que necesites confirmar tu correo (Verifica tu bandeja de entrada).');
        }
      } else {
        // Login Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        if (data.user) onSuccess();
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setErrorMsg(err.message || 'Error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            {mode === 'admin' ? <ShieldCheck size={56} color="var(--primary)" /> : <img src="/logo-myturn.png" alt="Logo" style={{ width: '84px', height: '84px', objectFit: 'contain' }} />}
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {mode === 'admin' ? 'Super Admin' : (mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu Negocio')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {mode === 'admin' ? 'Acceso reservado para el administrador de la red.' : (mode === 'login' ? 'Ingresa tus credenciales para continuar.' : 'Necesitas un código de invitación para unirte.')}
          </p>
        </div>

        {/* Tab Toggle */}
        {!isSuperAdmin && (
          <div style={{ display: 'flex', background: 'var(--background)', padding: '0.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <button 
              onClick={() => { setMode('login'); setInviteValid(false); setErrorMsg(''); }}
              style={{ 
                flex: 1, 
                padding: '0.5rem', 
                borderRadius: 'calc(var(--radius-md) - 2px)', 
                border: 'none', 
                background: mode === 'login' ? 'var(--surface)' : 'transparent',
                color: mode === 'login' ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Ya tengo cuenta
            </button>
            <button 
              onClick={() => { setMode('register'); setErrorMsg(''); }}
              style={{ 
                flex: 1, 
                padding: '0.5rem', 
                borderRadius: 'calc(var(--radius-md) - 2px)', 
                border: 'none', 
                background: mode === 'register' ? 'var(--surface)' : 'transparent',
                color: mode === 'register' ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Soy Nuevo
            </button>
          </div>
        )}

        <form style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={handleSubmit}>
          {errorMsg && (
            <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}

          {mode === 'register' && !inviteValid ? (
            <>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Código de Invitación (Ej: MYTURN-99X-2026)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '0.875rem 1rem 0.875rem 2.75rem', 
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleInviteValidate}>
                Validar Código <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              {mode === 'register' && (
                <>
                  <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <CheckCircle2 size={14} /> Código Valido! Ahora crea tu perfil.
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Nombre de tu Negocio"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem 1rem 0.875rem 2.75rem', 
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </>
              )}

              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  placeholder="Email corporativo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '0.875rem 1rem 0.875rem 2.75rem', 
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  placeholder="Contraseña (mínimo 6 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '0.875rem 1rem 0.875rem 2.75rem', 
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <button disabled={loading} type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '0.5rem', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Redirigiendo...' : (mode === 'admin' ? 'Entrar como Admin' : (mode === 'login' ? 'Iniciar Sesión' : 'Registrar Negocio'))}
              </button>

              {/* Guest/Bypass Login for quick testing */}
              {!isSuperAdmin && mode === 'login' && (
                <button 
                  type="button" 
                  onClick={() => onSuccess()}
                  style={{ 
                    width: '100%', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px dashed var(--border)', 
                    color: 'var(--text-muted)', 
                    padding: '0.75rem', 
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Entrar como Invitado (Modo Demo)
                </button>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
};

