import React, { useState } from 'react';
import { ChevronRight, Clock, Calendar, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const BookingFlow: React.FC<{ onClose: () => void, tenantId: string, queueInfo: { wait: number, clients: number, nextTurn: number } }> = ({ onClose, tenantId, queueInfo }) => {
  const [step, setStep] = useState(1);
  const [dbServices, setDbServices] = useState<Service[]>([]);
  const [dbStaff, setDbStaff] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedPro, setSelectedPro] = useState<{id: string, name: string} | null>(null);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [existingAppointments, setExistingAppointments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);

  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

  React.useEffect(() => {
    const loadCatalog = async () => {
      // 1. Fetch Services
      const { data: sData } = await supabase.from('services').select('*').eq('tenant_id', tenantId);
      if (sData) {
        setDbServices(sData.map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration: s.duration_minutes
        })));
      }

      // 2. Fetch Staff
      const { data: stData } = await supabase.from('staff_members').select('*').eq('tenant_id', tenantId);
      if (stData) {
        setDbStaff([
          { id: 'any', name: 'Alguien disponible', role: 'El primero que se desocupe' },
          ...stData.map(st => ({ id: st.id, name: st.name, role: st.role || 'Profesional' }))
        ]);
      }
      setIsCatalogLoading(false);
    };
    loadCatalog();
  }, [tenantId]);

  React.useEffect(() => {
    const fetchExisting = async () => {
      const { data } = await supabase
        .from('appointments')
        .select('date_time')
        .eq('tenant_id', tenantId)
        .eq('status', 'waiting')
        .gte('date_time', `${selectedDate}T00:00:00`)
        .lte('date_time', `${selectedDate}T23:59:59`);
      
      if (data) {
        setExistingAppointments(data.map(d => {
          const dt = new Date(d.date_time);
          return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }));
      }
    };
    fetchExisting();
  }, [tenantId, selectedDate]);

  React.useEffect(() => {
    const prefillUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('users').select('full_name').eq('id', session.user.id).single();
        if (profile?.full_name) {
          setClientName(profile.full_name);
        }
      }
    };
    prefillUser();
  }, []);

  const handleConfirm = async () => {
    if (!clientName.trim()) {
      alert("Por favor, ingresa tu nombre para reservar.");
      return;
    }
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // NEW: Guard against duplicate active appointments
      if (session?.user) {
        const { data: existing } = await supabase
          .from('appointments')
          .select('id')
          .eq('user_id', session.user.id)
          .in('status', ['waiting', 'attending', 'arrived'])
          .maybeSingle();
        
        if (existing) {
          alert("Ya tienes un turno activo vigente. Por favor, cancela el actual si deseas agendar uno nuevo.");
          setIsLoading(false);
          return;
        }
      }

      if (selectedService && selectedTime) {
        // Use local ISO format: YYYY-MM-DDTHH:mm:00
        const aptDate = new Date(`${selectedDate}T${selectedTime}:00`);

        // 2. Insert the appointment
        const { data, error } = await supabase.from('appointments').insert({
          tenant_id: tenantId,
          client_name: `${clientName} (${selectedService.name})`,
          service_id: selectedService.id,
          date_time: aptDate.toISOString(),
          status: 'waiting',
          staff_id: selectedPro?.id !== 'any' ? selectedPro?.id : null,
          client_id: session?.user?.id || null
        }).select('id').single();

        if (data?.id) {
          localStorage.setItem('myturn_active_appointment_id', data.id);
        }
      }
      setStep(5);
    } catch (err) {
      console.error(err);
      alert("Hubo un error al guardar tu cita.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'rgba(0,0,0,0.8)', 
      backdropFilter: 'blur(8px)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '480px', 
        background: 'var(--surface)', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Paso {step === 5 ? 4 : step} de 4</p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {step === 1 && 'Selecciona un Servicio'}
              {step === 2 && 'Elige tu Profesional'}
              {step === 3 && 'Elige Fecha y Horario'}
              {step === 4 && 'Confirmar Reserva'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {isCatalogLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando catálogo...</div>
          ) : step === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {dbServices.map((s: Service) => (
                <div 
                  key={s.id} 
                  onClick={() => { setSelectedService(s); setStep(2); }}
                  style={{ 
                    padding: '1rem', 
                    background: selectedService?.id === s.id ? 'rgba(245,158,11,0.1)' : 'var(--surface)',
                    border: `1px solid ${selectedService?.id === s.id ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600 }}>{s.name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{s.duration} min</p>
                  </div>
                  <p style={{ fontWeight: 700, color: 'var(--primary)' }}>${s.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : null}

          {step === 2 && !isCatalogLoading && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {dbStaff.map((p: any) => (
                <div 
                  key={p.id} 
                  onClick={() => { setSelectedPro(p); setStep(3); }}
                  style={{ 
                    padding: '1.25rem 1rem', 
                    background: selectedPro?.id === p.id ? 'rgba(245,158,11,0.1)' : 'var(--surface)',
                    border: `1px solid ${selectedPro?.id === p.id ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: p.id === 'any' ? 'var(--surface-hover)' : 'var(--primary)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.25rem' }}>
                    {p.id === 'any' ? '?' : p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 800, margin: 0 }}>{p.name}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.2rem' }}>{p.role}</p>
                  </div>
                </div>
              ))}
             </div>
          )}

          {step === 3 && !isCatalogLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Date Selector */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Selecciona el día</p>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '0.5rem' }}>
                  {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                    const date = new Date();
                    date.setDate(date.getDate() + offset);
                    const dateStr = date.toISOString().split('T')[0];
                    const isSelected = selectedDate === dateStr;
                    
                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        style={{
                          minWidth: '60px',
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'var(--primary)' : 'var(--background)',
                          color: isSelected ? 'black' : 'var(--text)',
                          border: isSelected ? 'none' : '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontSize: '0.6rem', fontWeight: 800 }}>{offset === 0 ? 'HOY' : date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800 }}>{date.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Horarios disponibles</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {timeSlots.map((t: string) => {
                    const isTaken = existingAppointments.includes(t);
                    
                    // NEW: check if time is in the past for today
                    const isPast = selectedDate === getTodayStr() && (() => {
                      const [h, m] = t.split(':').map(Number);
                      const now = new Date();
                      const slotTime = new Date();
                      slotTime.setHours(h, m, 0, 0);
                      return slotTime < now;
                    })();

                    const isDisabled = isTaken || isPast;

                    return (
                      <button 
                        key={t}
                        onClick={() => { if (!isDisabled) { setSelectedTime(t); setStep(4); } }}
                        disabled={isDisabled}
                        style={{ 
                          padding: '0.5rem', 
                          background: selectedTime === t ? 'var(--primary)' : isDisabled ? 'var(--surface-hover)' : 'var(--background)',
                          color: selectedTime === t ? 'var(--background-alt)' : isDisabled ? 'var(--text-muted)' : 'var(--text)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.5 : 1
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 4 && selectedService && selectedPro && selectedTime && (
            <div style={{ textAlign: 'center' }} className="animate-fade-in">
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: 'var(--radius-full)', 
                background: 'rgba(16,185,129,0.1)', 
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem'
              }}>
                <Clock size={32} />
              </div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Resumen de la Cita</h4>
              <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Servicio</span>
                  <span style={{ fontWeight: 600 }}>{selectedService.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Profesional</span>
                  <span style={{ fontWeight: 600 }}>{selectedPro.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Fecha</span>
                  <span style={{ fontWeight: 600 }}>{(() => {
                    const [y, m, d] = selectedDate.split('-').map(Number);
                    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                  })()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Hora</span>
                  <span style={{ fontWeight: 600 }}>{selectedTime}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>TU NOMBRE</label>
                <input 
                  type="text" 
                  placeholder="Ej: Laura Pérez"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '1rem' }}
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ textAlign: 'center' }} className="animate-bounce-in">
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: 'var(--radius-full)', 
                background: 'var(--success)', 
                color: 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 0 20px rgba(16,185,129,0.4)'
              }}>
                <CheckCircle2 size={40} />
              </div>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>¡Turno Confirmado!</h4>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Tu cita ha sido registrada exitosamente.</p>
              
              <div style={{ padding: '1.5rem', background: 'var(--background)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--success)', display: 'inline-block', width: '100%' }}>
                {selectedDate === getTodayStr() ? (
                  <>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tu Posición en Cola</p>
                    <p style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text)', margin: 0 }}>#{queueInfo.nextTurn}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Tiempo estimado: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{queueInfo.wait} min</span></p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Cita Programada para</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                      {new Date(selectedDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase()}
                    </p>
                    <p style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 800, marginTop: '0.25rem', marginBottom: 0 }}>{selectedTime}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          {step === 4 ? (
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', opacity: isLoading ? 0.7 : 1 }}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Confirmando...' : 'Confirmar Reservación'}
            </button>
          ) : step === 5 ? (
            <button 
              className="btn btn-success" 
              style={{ width: '100%', padding: '1rem', fontWeight: 800 }}
              onClick={onClose}
            >
              {selectedDate === getTodayStr() ? 'Ver mi Turno en Vivo' : 'Ir a mis Reservas'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
