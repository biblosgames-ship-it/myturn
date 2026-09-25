import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, CheckCircle2, ShieldCheck, ArrowRight, Loader2, AlertCircle, Sparkles, Lock, Mail, User, KeyRound } from 'lucide-react';

interface BusinessClaimModalProps {
  claimToken: string;
  onSuccess: (tenantId: string) => void;
  onClose: () => void;
}

export const BusinessClaimModal: React.FC<BusinessClaimModalProps> = ({ claimToken, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenantToClaim = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from('tenants')
          .select('id, name, slug, logo, logo_url, industry, plan_id, owner, professional_name, claim_token, status')
          .or(`claim_token.eq.${claimToken},id.eq.${claimToken}`)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (!data) {
          setError('El enlace de vinculación no es válido, ha caducado o el negocio ya fue reclamado.');
        } else {
          setTenant(data);
          if (data.professional_name) {
            setFullName(data.professional_name);
          }
        }
      } catch (err: any) {
        console.error('Error fetching tenant for claim:', err);
        setError('Ocurrió un error al verificar el enlace de vinculación: ' + (err.message || ''));
      } finally {
        setLoading(false);
      }
    };

    if (claimToken) {
      fetchTenantToClaim();
    }
  }, [claimToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSubmitting(true);
    setSubmitError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      let userId: string | null = null;

      if (authMode === 'register') {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: { full_name: fullName || 'Propietario' }
          }
        });

        if (authErr) {
          if (authErr.message.includes('already registered') || authErr.message.includes('User already registered')) {
            setSubmitError('Este correo ya está registrado en MyTurn. Cambia a "Iniciar Sesión" para vincular tu negocio.');
            setAuthMode('login');
            setSubmitting(false);
            return;
          }
          throw authErr;
        }

        userId = authData.user?.id || null;
      } else {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (authErr) throw authErr;
        userId = authData.user?.id || null;
      }

      if (!userId) {
        throw new Error('No se pudo verificar la sesión de usuario.');
      }

      // 1. Link Tenant to Owner email and clear claim_token
      const { error: updateTenantErr } = await supabase
        .from('tenants')
        .update({
          owner: cleanEmail,
          status: 'active',
          claim_token: null
        })
        .eq('id', tenant.id);

      if (updateTenantErr) {
        console.warn('Tenant update warning:', updateTenantErr);
      }

      // 2. Link user to tenant with owner role in users table
      const { error: upsertUserErr } = await supabase
        .from('users')
        .upsert({
          id: userId,
          tenant_id: tenant.id,
          role: 'owner',
          full_name: fullName || 'Propietario'
        });

      if (upsertUserErr) {
        console.warn('User upsert warning:', upsertUserErr);
      }

      // 3. Set persistent view to barber dashboard
      localStorage.setItem('myturn_last_view', 'barber');

      // 4. Clean query params from URL
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('claim');
        window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
      } catch (e) {
        // Fallback
      }

      onSuccess(tenant.id);
    } catch (err: any) {
      console.error('Claim submit error:', err);
      setSubmitError(err.message || 'Error al vincular el negocio.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div className="card animate-scale-in" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '2rem 1.75rem',
        borderRadius: '24px',
        border: '1.5px solid rgba(245,158,11,0.3)',
        background: 'linear-gradient(180deg, rgba(24,24,27,0.98) 0%, rgba(10,10,10,0.98) 100%)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(245,158,11,0.1)'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <Loader2 className="animate-spin" size={36} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Verificando propuesta comercial...</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '0.5rem' }}>
              Cargando la configuración personalizada de tu negocio.
            </p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <AlertCircle size={28} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Enlace no disponible</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              {error}
            </p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              style={{ width: '100%' }}
            >
              Cerrar e ir al inicio
            </button>
          </div>
        ) : tenant ? (
          <div>
            {/* Header: Business Identity */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
                <img
                  src={tenant.logo_url || tenant.logo || '/logo-myturn.png'}
                  alt={tenant.name}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '20px',
                    objectFit: 'cover',
                    border: '2px solid var(--primary)',
                    boxShadow: '0 8px 24px rgba(245,158,11,0.2)'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  background: 'var(--primary)',
                  color: '#000',
                  borderRadius: '50%',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #000'
                }}>
                  <Sparkles size={14} />
                </div>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(245,158,11,0.15)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                <ShieldCheck size={12} /> PROPUESTA PREPARADA
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: 'var(--text)' }}>
                {tenant.name}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '0.35rem', lineHeight: 1.4 }}>
                {tenant.industry || 'Servicios'} • Plan {tenant.plan_id || 'Professional'}
              </p>
            </div>

            {/* Explanatory Message */}
            <div style={{
              padding: '0.875rem 1rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text)', fontWeight: 600 }}>
                👋 ¡Tu negocio ya está configurado en MyTurn!
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Vincula tu correo electrónico para tomar el control como propietario y gestionar tu agenda y turnos.
              </p>
            </div>

            {/* Auth Mode Toggle */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.35rem',
              padding: '0.25rem',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              border: '1px solid var(--border)'
            }}>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.775rem',
                  fontWeight: 800,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  background: authMode === 'register' ? 'var(--primary)' : 'transparent',
                  color: authMode === 'register' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                Crear Mi Cuenta
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.775rem',
                  fontWeight: 800,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  background: authMode === 'login' ? 'var(--primary)' : 'transparent',
                  color: authMode === 'login' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                Ya Tengo Cuenta
              </button>
            </div>

            {submitError && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {authMode === 'register' && (
                <div>
                  <label style={{ fontSize: '0.725rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                    TU NOMBRE COMPLETO
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      required
                      placeholder="Ej: Pedro Martínez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  CORREO ELECTRÓNICO *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    required
                    placeholder="propietario@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  CONTRASEÑA *
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Vinculando Negocio...
                  </>
                ) : (
                  <>
                    Tomar Control de Mi Negocio <ArrowRight size={18} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.775rem',
                  cursor: 'pointer',
                  marginTop: '0.25rem',
                  textAlign: 'center'
                }}
              >
                Cancelar y salir
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
};
