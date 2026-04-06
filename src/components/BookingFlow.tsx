import React, { useState } from 'react';
import { ChevronRight, Clock, Calendar, CheckCircle2, X, Scissors, Stethoscope, Palette, Brush, User, Heart, Activity, Coffee, Car, Smartphone, Zap, Star, Smile, Wind, Droplets, Briefcase, ShoppingBag, Sparkles, Cross, Wrench, Shield, Calculator, Building, Book, GraduationCap, PenTool, Home, Hammer, Key, Music, Mic, Ticket, MonitorPlay, Dumbbell, Flame, Timer } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  capacity: number;
  icon?: string;
}

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const BookingFlow: React.FC<{ 
  onClose: () => void, 
  onSuccess: () => void,
  tenantId: string, 
  sessionId: string,
  queueInfo: { wait: number, clients: number, nextTurn: number } 
}> = ({ onClose, onSuccess, tenantId, sessionId, queueInfo }) => {
  const [step, setStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const handleStepChange = (newStep: number) => {
    setIsTransitioning(true);
    setStep(newStep);
    setTimeout(() => setIsTransitioning(false), 400);
  };
  const [dbServices, setDbServices] = useState<Service[]>([]);
  const [dbStaff, setDbStaff] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedPro, setSelectedPro] = useState<{id: string, name: string} | null>(null);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [existingSlotsCount, setExistingSlotsCount] = useState<{[time: string]: number}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [businessSchedule, setBusinessSchedule] = useState<any[]>([]);
  const [lunchBreak, setLunchBreak] = useState<any>(null);
  const [requireConfirmation, setRequireConfirmation] = useState(false);

  // Compute slot interval dynamically from average service duration.
  // Falls back to 30 min if no services loaded yet.

  // We compute the slot interval dynamically in Step 3 based on selected service or average.


  const generateTimeSlots = (intervalMinutes: number, dateStr: string, schedule: any[], lunch: any) => {
    if (!schedule || schedule.length === 0) return [];
    
    const date = new Date(dateStr + 'T00:00:00');
    const dayNameRaw = date.toLocaleDateString('es-ES', { weekday: 'long' });
    const dayName = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1);
    const daySched = schedule.find(s => s.day === dayName);
    
    if (!daySched || !daySched.isOpen || !daySched.hours) return [];

    const [startHStr, endHStr] = daySched.hours.split('-').map((s: string) => s.trim());
    const [startH, startM] = startHStr.split(':').map(Number);
    const [endH, endM] = endHStr.split(':').map(Number);

    const slots = [];
    let currentTotalMinutes = startH * 60 + startM;
    
    // 3. BOOKING CUTOFF LOGIC
    // Use booking_end_time if defined per day, otherwise fallback to working_end_time.
    let endTotalMinutes = endH * 60 + endM;
    if (daySched.booking_end_time) {
      const [limitH, limitM] = daySched.booking_end_time.split(':').map(Number);
      const cutoffTotalMinutes = limitH * 60 + limitM;
      endTotalMinutes = Math.min(endTotalMinutes, cutoffTotalMinutes);
    }

    // Parse lunch break
    let lunchStart = -1;
    let lunchEnd = -1;
    if (lunch && lunch.isOpen) {
      const [lsH, lsM] = lunch.start.split(':').map(Number);
      const [leH, leM] = lunch.end.split(':').map(Number);
      lunchStart = lsH * 60 + lsM;
      lunchEnd = leH * 60 + leM;
    }

    while (currentTotalMinutes + intervalMinutes <= endTotalMinutes) {
      // Check if slot falls within lunch break
      const isLunch = currentTotalMinutes >= lunchStart && currentTotalMinutes < lunchEnd;
      
      if (!isLunch) {
        const h = String(Math.floor(currentTotalMinutes / 60)).padStart(2, '0');
        const m = String(currentTotalMinutes % 60).padStart(2, '0');
        slots.push(`${h}:${m}`);
      }
      currentTotalMinutes += intervalMinutes;
    }
    return slots;
  };

  const effectiveIntervalMinutes = React.useMemo(() => {
    if (selectedService?.duration) return selectedService.duration;
    if (dbServices.length === 0) return 30;
    
    const avg = dbServices.reduce((sum, s) => sum + (s.duration || 30), 0) / dbServices.length;
    const sensible = [10, 15, 20, 25, 30, 45, 60];
    return sensible.reduce((prev, curr) => Math.abs(curr - avg) < Math.abs(prev - avg) ? curr : prev);
  }, [selectedService, dbServices]);

  const timeSlots = React.useMemo(() => 
    generateTimeSlots(effectiveIntervalMinutes, selectedDate, businessSchedule, lunchBreak),
  [effectiveIntervalMinutes, selectedDate, businessSchedule, lunchBreak]);

  const currentDayCutoff = React.useMemo(() => {
    if (!businessSchedule || !selectedDate) return null;
    const date = new Date(selectedDate + 'T00:00:00');
    // Normalize day name for comparison
    const normalize = (s: string) => (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const todayInSpanish = dayNames[date.getDay()];
    const todayNormalized = normalize(todayInSpanish);
    
    const dayNamesEng = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayNormalizedEng = dayNamesEng[date.getDay()];

    const daySched = businessSchedule.find((s: any) => {
      const schedDay = normalize(s.day);
      return schedDay === todayNormalized || schedDay === todayNormalizedEng;
    });
    return (daySched?.isOpen && daySched?.booking_end_time) ? daySched.booking_end_time : null;
  }, [businessSchedule, selectedDate]);

  React.useEffect(() => {
    const loadCatalog = async () => {
      // 1. Fetch Services
      const { data: sData } = await supabase.from('services').select('*').eq('tenant_id', tenantId);
      if (sData) {
        setDbServices(sData.map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration: s.duration_minutes,
          capacity: s.capacity || 1
        })));
      }

      // 1b. Fetch Schedule & Lunch Break
      const { data: tData } = await supabase.from('tenants').select('schedule, lunch_break, require_confirmation').eq('id', tenantId).single();
      if (tData) {
        if (tData.schedule) setBusinessSchedule(tData.schedule);
        if (tData.lunch_break) setLunchBreak(tData.lunch_break);
        if (tData.require_confirmation) setRequireConfirmation(tData.require_confirmation);
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
      // Create explicit 00:00:00 and 23:59:59 local dates to extract their true UTC bounds
      const [year, month, day] = selectedDate.split('-').map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59);

      const { data } = await supabase
        .from('appointments')
        .select('date_time')
        .eq('tenant_id', tenantId)
        .in('status', ['waiting', 'attending', 'arrived'])
        .gte('date_time', startOfDay.toISOString())
        .lte('date_time', endOfDay.toISOString());
      
      if (data) {
        const counts: {[time: string]: number} = {};
        data.forEach(d => {
          const dt = new Date(d.date_time);
          const h = String(dt.getHours()).padStart(2, '0');
          const m = String(dt.getMinutes()).padStart(2, '0');
          const t = `${h}:${m}`;
          counts[t] = (counts[t] || 0) + 1;
        });
        setExistingSlotsCount(counts);
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
    console.log("INTENTO DE CONFIRMACIÓN - Step:", step, "Time:", selectedTime, "IsTransitioning:", isTransitioning);
    if (isTransitioning || step !== 4) {
      console.warn("BLOQUEADO: Intento de confirmación fuera de paso o durante transición.");
      return;
    }
    if (!clientName.trim()) {
      alert("Por favor, ingresa tu nombre para reservar.");
      return;
    }
    if (!selectedTime) {
      alert("Por favor, selecciona un horario válido.");
      setStep(3);
      return;
    }
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: existingApps } = await supabase
          .from('appointments')
          .select('id, date_time')
          .eq('tenant_id', tenantId)
          .eq('client_user_id', session.user.id)
          .in('status', ['pending', 'waiting', 'attending', 'arrived']);
        
        if (existingApps && existingApps.length > 0) {
          const aptDateObj = new Date(`${selectedDate}T${selectedTime}:00`);
          const now = new Date();
          const msIn7Days = 7 * 24 * 60 * 60 * 1000;
          
          const isAttemptingShortTerm = (aptDateObj.getTime() - now.getTime()) <= msIn7Days;
          
          let hasShortTerm = false;
          let hasLongTerm = false;
          
          for (const a of existingApps) {
            const exDate = new Date(a.date_time);
            if ((exDate.getTime() - now.getTime()) <= msIn7Days) {
              hasShortTerm = true;
            } else {
              hasLongTerm = true;
            }
          }
          
          if (isAttemptingShortTerm && hasShortTerm) {
            alert("Ya tienes un turno programado para esta semana. No puedes agendar múltiples citas de corto plazo bajo el mismo perfil de usuario.");
            setIsLoading(false);
            return;
          }
          
          if (!isAttemptingShortTerm && hasLongTerm) {
            alert("Ya tienes una cita programada a futuro (más de 1 semana). No puedes agendar múltiples reservas de larga distancia simultáneamente.");
            setIsLoading(false);
            return;
          }
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
          status: requireConfirmation ? 'pending' : 'waiting',
          staff_id: selectedPro?.id !== 'any' ? selectedPro?.id : null,
          client_user_id: session?.user?.id || null,
          session_id: sessionId
        }).select('id').single();

        if (data?.id) {
          console.log("CITA CREADA EXITOSAMENTE - ID:", data.id);
          localStorage.setItem(`myturn_active_appointment_id_${tenantId}`, data.id);
          onSuccess(); // Mark as success in parent
          setStep(5);
        } else {
          throw new Error("No se pudo generar el turno.");
        }
      } else {
        alert("Faltan datos para confirmar la reserva.");
        setStep(3);
      }
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
                  onClick={() => { if (!isTransitioning) { setSelectedService(s); setSelectedTime(null); handleStepChange(2); } }}
                  style={{ 
                    padding: '1rem', 
                    background: selectedService?.id === s.id ? 'rgba(245,158,11,0.1)' : 'var(--surface)',
                    border: `1px solid ${selectedService?.id === s.id ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: isTransitioning ? 'wait' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                    opacity: isTransitioning ? 0.6 : 1,
                    pointerEvents: isTransitioning ? 'none' : 'auto'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(() => {
                        if (s.icon?.startsWith('http')) {
                          return <img src={s.icon} alt={s.name} style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: '4px' }} />;
                        } else {
                          const IconMap: Record<string, any> = { Scissors, Stethoscope, Palette, Brush, User, Heart, Activity, Coffee, Car, Smartphone, Zap, Star, Smile, Wind, Droplets, Briefcase, ShoppingBag, Sparkles, Cross, Wrench, Shield, Calculator, Building, Book, GraduationCap, PenTool, Home, Hammer, Key, Music, Mic, Ticket, MonitorPlay, Dumbbell, Flame, Timer };
                          const FoundIcon = IconMap[s.icon || 'Scissors'] || Scissors;
                          return <FoundIcon size={24} style={{ color: 'var(--text-muted)' }} />;
                        }
                      })()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600 }}>{s.name}</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {s.duration >= 60 ? `${Math.floor(s.duration / 60)} h ${s.duration % 60 > 0 ? `${s.duration % 60} min` : ''}` : `${s.duration} min`}
                      </p>
                    </div>
                  </div>
                  <p style={{ fontWeight: 700, color: 'var(--primary)' }}>${(s.price || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : null}

          {step === 2 && !isCatalogLoading && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {dbStaff.map((p: any) => (
                <div 
                  key={p.id} 
                  onClick={() => { if (!isTransitioning) { setSelectedPro(p); setSelectedTime(null); handleStepChange(3); } }}
                  style={{ 
                    padding: '1.25rem 1rem', 
                    background: selectedPro?.id === p.id ? 'rgba(245,158,11,0.1)' : 'var(--surface)',
                    border: `1px solid ${selectedPro?.id === p.id ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: isTransitioning ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'all 0.2s',
                    opacity: isTransitioning ? 0.6 : 1,
                    pointerEvents: isTransitioning ? 'none' : 'auto'
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: p.id === 'any' ? 'var(--surface-hover)' : 'var(--primary)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.25rem' }}>
                    {p.id === 'any' ? '?' : (p.name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 800, margin: 0 }}>{p.name || 'Profesional'}</p>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>Selecciona el día</p>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="date" 
                      min={getTodayStr()} 
                      value={selectedDate}
                      onChange={(e) => { if (e.target.value) { setSelectedDate(e.target.value); setSelectedTime(null); } }}
                      style={{ opacity: 0, position: 'absolute', right: 0, top: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                    />
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={14} /> Ver Todo el Año
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '0.5rem' }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((offset) => {
                    const date = new Date();
                    date.setDate(date.getDate() + offset);
                    const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const dStr = String(date.getDate()).padStart(2, '0');
                    const dateStr = `${y}-${m}-${dStr}`;
                    const isSelected = selectedDate === dateStr;
                    
                    // CHECK IF DAY IS CLOSED IN SCHEDULE
                    const dayNameRaw = date.toLocaleDateString('es-ES', { weekday: 'long' });
                    const dayName = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1);
                    const scheduleDay = businessSchedule.find(s => s.day === dayName);
                    const isClosed = scheduleDay && !scheduleDay.isOpen;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => { if (!isClosed) { setSelectedDate(dateStr); setSelectedTime(null); } }}
                        disabled={isClosed}
                        style={{
                          minWidth: '60px',
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'var(--primary)' : isClosed ? 'rgba(239,68,68,0.05)' : 'var(--background)',
                          color: isSelected ? 'black' : isClosed ? '#ef4444' : 'var(--text)',
                          border: isSelected ? 'none' : `1px solid ${isClosed ? '#ef4444' : 'var(--border)'}`,
                          cursor: isClosed ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          transition: 'all 0.2s',
                          opacity: isClosed ? 0.6 : 1
                        }}
                      >
                        <span style={{ fontSize: '0.6rem', fontWeight: 800 }}>{isClosed ? 'CERRADO' : offset === 0 ? 'HOY' : date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800 }}>{date.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Horarios disponibles</p>
                <div style={{ display: 'grid', gridTemplateColumns: timeSlots.length > 0 ? 'repeat(4, 1fr)' : '1fr', gap: '0.5rem' }}>
                  {timeSlots.length === 0 && currentDayCutoff ? (
                    <div className="animate-scale-in" style={{ 
                      padding: '1.5rem', 
                      background: 'rgba(239,68,68,0.05)', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid rgba(239,68,68,0.2)',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: '#ef4444', marginBottom: '0.75rem' }}>
                        <Clock size={32} style={{ margin: '0 auto' }} />
                      </div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.4rem' }}>
                        ¡Límite de Agenda Alcanzado!
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        Lo sentimos, el horario máximo para agendar hoy finalizó a las <span style={{ fontWeight: 800, color: 'var(--text)' }}>{currentDayCutoff}</span>. 
                        <br /><br />
                        Te invitamos a seleccionar el <strong style={{ color: 'var(--primary)' }}>día de mañana</strong> para ver nuevos turnos disponibles.
                      </p>
                    </div>
                  ) : timeSlots.map((t: string) => {
                    const currentCount = existingSlotsCount[t] || 0;
                    const maxCapacity = selectedService?.capacity || 1;
                    const isFull = currentCount >= maxCapacity;
                    
                    // NEW: check if time is in the past for today
                    const isPast = selectedDate === getTodayStr() && (() => {
                      const [h, m] = t.split(':').map(Number);
                      const now = new Date();
                      const slotTime = new Date();
                      slotTime.setHours(h, m, 0, 0);
                      return slotTime < now;
                    })();

                    const isDisabled = isFull || isPast;

                    return (
                      <button 
                        key={t}
                        onClick={() => { if (!isDisabled && !isTransitioning) { setSelectedTime(t); handleStepChange(4); } }}
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
                        {maxCapacity > 1 && (
                          <div style={{ fontSize: '0.6rem', marginTop: '0.1rem', opacity: 0.8 }}>
                            {isFull ? 'Lleno' : `${maxCapacity - currentCount} cupos`}
                          </div>
                        )}
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
                      {(() => {
                        const [y, m, d] = selectedDate.split('-').map(Number);
                        return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase();
                      })()}
                    </p>
                    <p style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 800, marginTop: '0.25rem', marginBottom: 0 }}>{selectedTime}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 4 && selectedTime && requireConfirmation && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: 'var(--primary)' }}>⚠️ Este negocio requiere confirmación de cita.</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tu cita pasará a un estado de revisión. Te notificaremos una vez que sea aprobada.</p>
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          {step === 4 && selectedTime ? (
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', opacity: isLoading ? 0.7 : 1 }}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Confirmando...' : 'Confirmar Reservación'}
            </button>
          ) : step === 3 && selectedTime ? (
             <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', opacity: isTransitioning ? 0.5 : 1, pointerEvents: isTransitioning ? 'none' : 'auto' }}
              onClick={() => { if (!isTransitioning) handleStepChange(4); }}
              disabled={isTransitioning}
            >
              Continuar a Confirmación
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
