import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, Mail, CheckCircle2, Building2, Chrome, Sparkles } from 'lucide-react';
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

  const registrationStep = (() => {
    if (!inviteValid) return 1;
    if (!businessName.trim()) return 2;
    if (!email.trim()) return 3;
    if (!password.trim() || password.length < 6) return 4;
    return 5;
  })();

  const handleGoogleLogin = async () => {
    setLoading(true);
    if (mode === 'register') {
      localStorage.setItem('myturn_pending_barber_setup', 'true');
      localStorage.setItem('myturn_new_business_onboarding', 'true');
      localStorage.removeItem('myturn_business_tour_completed');
      localStorage.setItem('myturn_last_view', 'barber');
    } else if (mode === 'admin' || isSuperAdmin) {
      localStorage.setItem('myturn_last_view', 'superadmin');
    } else {
      localStorage.setItem('myturn_last_view', 'barber');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.hostname === 'localhost' ? window.location.origin : 'https://miturno.me/'
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
        const adminEmails = ['admin@myturn.app', 'miturno.me@gmail.com'];
        if (!adminEmails.includes(email.toLowerCase().trim())) {
          setErrorMsg('Este correo no tiene permisos de Administrador Global.');
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        if (data.user) onSuccess();
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
              plan_id: 'Professional',
              expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              owner: email
            }).select().single();

            if (tenantError) {
              // Fallback if slug is taken
              const uniqueSlug = `${slug}-${Math.random().toString(36).substring(7)}`;
              const { data: retryData, error: retryError } = await supabase.from('tenants').insert({
                name: businessName || 'Mi Negocio',
                slug: uniqueSlug,
                industry: 'General',
                plan_id: 'Professional',
                expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
            const { error: userError } = await supabase.from('users').upsert({
              id: authData.user.id,
              tenant_id: tenantId,
              full_name: businessName || 'Propietario',
              role: 'owner'
            });
            if (userError) throw userError;
          }

          localStorage.setItem('myturn_new_business_onboarding', 'true');
          localStorage.removeItem('myturn_business_tour_completed');

          if (authData.session) {
            onSuccess();
          } else {
            setErrorMsg('¡Cuenta creada! Revisa tu bandeja de entrada para confirmar tu correo antes de iniciar sesión.');
            setMode('login');
          }
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
            {mode === 'admin' ? <ShieldCheck size={56} color="var(--primary)" /> : <img src="/logo-minurno-5.png" alt="Logo" style={{ width: '84px', height: '84px', objectFit: 'contain' }} />}
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {mode === 'admin' ? 'Super Admin' : (mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu Negocio')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {mode === 'admin' ? 'Acceso reservado para el administrador de la red.' : (mode === 'login' ? 'Ingresa tus credenciales para continuar.' : 'Regístrate gratis o usa un código promocional.')}
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

        {mode === 'register' && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.07)',
            border: '1.5px solid var(--primary)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.25rem',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <Sparkles size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Asistente de Registro • Paso {registrationStep} de 5
              </span>
            </div>
            
            {registrationStep === 1 && (
              <div>
                <p style={{ fontSize: '0.82rem', fontWeight: 800, margin: '0 0 0.3rem 0', color: 'var(--text)' }}>
                  ¿Tienes código de invitación o quieres empezar Gratis?
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.6rem 0', lineHeight: 1.4 }}>
                  Si tienes un código de patrocinio escríbelo abajo. Si eres un negocio nuevo y no tienes código, pulsa el botón para comenzar en el <strong>Plan Free 100% gratis</strong>.
                </p>
                <button 
                  type="button"
                  onClick={() => {
                    setInviteValid(true);
                    setInviteCode('FREE-PLAN');
                    setInviteTenantId(null);
                  }}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <span>👉 Continuar con Plan Free (Gratis)</span>
                </button>
              </div>
            )}

            {registrationStep === 2 && (
              <div>
                <p style={{ fontSize: '0.82rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text)' }}>
                  ¿Cómo se llama tu Negocio o Barbería?
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Escribe el nombre comercial con el que te identifican tus clientes. Lo usaremos para tu enlace de citas en línea.
                </p>
              </div>
            )}

            {registrationStep === 3 && (
              <div>
                <p style={{ fontSize: '0.82rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text)' }}>
                  Tu Correo Electrónico Principal
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Ingresa tu correo. Será tu usuario de acceso como administrador para gestionar citas, horarios y finanzas.
                </p>
              </div>
            )}

            {registrationStep === 4 && (
              <div>
                <p style={{ fontSize: '0.82rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text)' }}>
                  Crea una Contraseña Segura
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Define una contraseña de mínimo 6 caracteres para proteger la administración de tu negocio.
                </p>
              </div>
            )}

            {registrationStep === 5 && (
              <div>
                <p style={{ fontSize: '0.82rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--success)' }}>
                  ✓ ¡Todo completo! Pulsa 'Registrar Negocio'
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Haz clic abajo para crear tu local. Enseguida se abrirá la <strong>Guía Interactiva</strong> para configurar tus servicios, horarios y equipo paso a paso.
                </p>
              </div>
            )}
          </div>
        )}

        <form style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={handleSubmit}>
          {errorMsg && (
            <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}

          {/* Google Login for Business and SuperAdmin */}
          {(mode === 'login' || mode === 'admin') && (
            <>
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="btn btn-outline"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'white', color: '#000', border: '1px solid #ddd' }}
              >
                <Chrome size={20} /> Entrar con Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>O CON EMAIL</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
            </>
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
                    border: (mode === 'register' && registrationStep === 1) ? '2px solid #f59e0b' : '1px solid var(--border)',
                    boxShadow: (mode === 'register' && registrationStep === 1) ? '0 0 0 3px rgba(245, 158, 11, 0.3), 0 0 15px rgba(245, 158, 11, 0.2)' : 'none',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text)',
                    fontSize: '0.875rem',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>
              <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleInviteValidate}>
                Validar Código <ArrowRight size={18} />
              </button>
              <div style={{ textAlign: 'center' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setInviteValid(true);
                    setInviteCode('FREE-PLAN');
                    setInviteTenantId(null);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8125rem', textDecoration: 'underline' }}
                >
                  Continuar sin código (Plan Free)
                </button>
              </div>
            </>
          ) : (
            <>
              {mode === 'register' && (
                <>
                  <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <CheckCircle2 size={14} /> Código Valido! Ahora crea tu perfil.
                  </div>

                  <button 
                    type="button"
                    onClick={handleGoogleLogin}
                    className="btn btn-outline"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'white', color: '#000', border: '1px solid #ddd', marginBottom: '0.5rem' }}
                  >
                    <Chrome size={20} /> Registrar con Google
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.6rem', fontWeight: 800 }}>O USA EMAIL</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
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
                        border: (mode === 'register' && registrationStep === 2) ? '2px solid #f59e0b' : '1px solid var(--border)',
                        boxShadow: (mode === 'register' && registrationStep === 2) ? '0 0 0 3px rgba(245, 158, 11, 0.3), 0 0 15px rgba(245, 158, 11, 0.2)' : 'none',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text)',
                        fontSize: '0.875rem',
                        transition: 'all 0.3s ease'
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
                    border: (mode === 'register' && registrationStep === 3) ? '2px solid #f59e0b' : '1px solid var(--border)',
                    boxShadow: (mode === 'register' && registrationStep === 3) ? '0 0 0 3px rgba(245, 158, 11, 0.3), 0 0 15px rgba(245, 158, 11, 0.2)' : 'none',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text)',
                    fontSize: '0.875rem',
                    transition: 'all 0.3s ease'
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
                    border: (mode === 'register' && registrationStep === 4) ? '2px solid #f59e0b' : '1px solid var(--border)',
                    boxShadow: (mode === 'register' && registrationStep === 4) ? '0 0 0 3px rgba(245, 158, 11, 0.3), 0 0 15px rgba(245, 158, 11, 0.2)' : 'none',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text)',
                    fontSize: '0.875rem',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>
              <button disabled={loading} type="submit" className="btn btn-primary" style={{ 
                width: '100%', 
                marginBottom: '0.5rem', 
                opacity: loading ? 0.7 : 1,
                border: (mode === 'register' && registrationStep === 5) ? '2px solid #10b981' : undefined,
                boxShadow: (mode === 'register' && registrationStep === 5) ? '0 0 0 3px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.4)' : undefined,
                fontWeight: 900
              }}>
                {loading ? 'Redirigiendo...' : (mode === 'admin' ? 'Entrar como Admin' : (mode === 'login' ? 'Iniciar Sesión' : 'Registrar Negocio'))}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

