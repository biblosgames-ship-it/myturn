import React, { useState, useEffect, useRef } from 'react';
import { Clock, Users, Bell, Volume2 } from 'lucide-react';

// Chime synthesizer using Web Audio API (native, zero external files)
const playTurnChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2: B5 (987.77 Hz) - brighter energetic bell tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.15);
    gain2.gain.setValueAtTime(0.3, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.7);
  } catch (e) {
    console.warn("Audio chime could not play:", e);
  }
};

const triggerTurnVibration = () => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  } catch (e) {
    console.warn("Vibration failed:", e);
  }
};

interface SmartTimerProps {
  remainingMinutes: number;
  remainingClients: number;
  turnNumber: number;
  status: 'waiting' | 'next' | 'in_progress' | 'completed';
  isPaused?: boolean;
  isStalled?: boolean;
  isOpen?: boolean;
  isToday?: boolean;
}

export const SmartTimer: React.FC<SmartTimerProps> = ({ 
  remainingMinutes: initialMinutes, 
  remainingClients, 
  turnNumber,
  status,
  isPaused = false,
  isStalled = false,
  isOpen = true,
  isToday = true
}) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const prevStatusRef = useRef(status);
  const [hasTestedAudio, setHasTestedAudio] = useState(false);

  // Sync state with prop if it changes (e.g. on load after fetch)
  useEffect(() => {
    setTimeLeft(initialMinutes * 60);
  }, [initialMinutes]);

  // Alert with Sound + Vibration + Notification when status becomes 'next' or 'in_progress'
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev !== status) {
      if ((status === 'next' || status === 'in_progress') && prev !== 'completed') {
        playTurnChime();
        triggerTurnVibration();

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(status === 'in_progress' ? '¡Tu Turno ha Comenzado!' : '¡Eres el Siguiente en la Fila!', {
            body: status === 'in_progress' 
              ? 'Por favor dirígete a la estación de atención.' 
              : 'Prepárate, tu turno está a punto de comenzar.',
            icon: '/logo-myturn.png'
          });
        }
      }
      prevStatusRef.current = status;
    }
  }, [status]);

  useEffect(() => {
    // If it's not today, the timer should not run
    if (!isToday || status === 'completed' || isPaused || isStalled) return;
    
    // Note: We ignore !isOpen here because we want it to run during "receso" if it's today
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, isToday, isPaused, isStalled]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (isStalled) return '#ef4444';
    switch (status) {
      case 'in_progress': return 'var(--success)';
      case 'next': return 'var(--primary)';
      default: return 'var(--text-muted)';
    }
  };

  const getLongFormatTimeText = (totalMinutes: number) => {
    if (totalMinutes <= 0) return "¡Es tu turno!";
    const m = Math.floor(totalMinutes);
    const hours = Math.floor(m / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    
    if (months > 0) return `Faltan ${months} mes${months > 1 ? 'es' : ''}`;
    if (weeks > 0) return `Faltan ${weeks} semana${weeks > 1 ? 's' : ''}`;
    if (days > 0) return `Faltan ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) {
       const remMins = m % 60;
       if (remMins === 0) return `En ${hours} h`;
       return `En ${hours}h ${remMins}m`;
    }
    return `En ${m} min`;
  };

  return (
    <div className="card animate-fade-in" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes blink-red {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .blinking-timer {
          animation: blink-red 1s infinite;
        }
      `}</style>
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: '4px', 
        background: getStatusColor(),
        opacity: 0.5 
      }} />
      
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        TURNO #{turnNumber}
      </p>
      
      <div 
        className={isStalled ? 'blinking-timer' : ''}
        style={{ 
          fontSize: '4rem', 
          fontWeight: 800, 
          margin: '1rem 0', 
          color: (isPaused || (!isToday)) ? 'var(--text-muted)' : getStatusColor() 
        }}
      >
        {(isPaused || !isToday) ? '--:--' : formatTime(timeLeft)}
      </div>
      
      {isStalled && (
        <div className="animate-pulse" style={{ color: '#ef4444', fontWeight: 900, fontSize: '1.25rem', marginBottom: '1.5rem', letterSpacing: '1px' }}>
          ⚠️ ESPERANDO SER ATENDIDO
        </div>
      )}

      {isPaused && !isStalled && (
        <div className="animate-pulse" style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.875rem', marginBottom: '1rem' }}>
          ⏸️ EL PROFESIONAL HIZO UNA PAUSA Y REINICIA EN BREVE
        </div>
      )}

      {!isToday && (
        <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.875rem', marginBottom: '1rem' }}>
          📅 TU CITA ESTÁ PROGRAMADA PARA OTRO DÍA
        </div>
      )}

      {isToday && !isOpen && !isPaused && (
        <div className="animate-pulse" style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.875rem', marginBottom: '1rem' }}>
          ☕ EL NEGOCIO ESTÁ EN RECESO, PERO TU ESPERA SIGUE ACTIVA
        </div>
      )}
      
      <div className="smart-timer-stats" style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{!isToday ? getLongFormatTimeText(initialMinutes) : `${Math.ceil(timeLeft / 60)} min restantes`}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Users size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{remainingClients} clientes antes</span>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span className="badge badge-warning" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
          Estado: {status === 'in_progress' ? 'En proceso' : status === 'next' ? 'Próximo' : 'En espera'}
        </span>
        <button
          type="button"
          onClick={() => {
            playTurnChime();
            triggerTurnVibration();
            setHasTestedAudio(true);
            setTimeout(() => setHasTestedAudio(false), 2000);
          }}
          className="btn btn-outline"
          style={{ padding: '0.3rem 0.65rem', fontSize: '0.7rem', gap: '0.35rem', borderRadius: 'var(--radius-full)', borderColor: hasTestedAudio ? 'var(--primary)' : 'var(--border)', color: hasTestedAudio ? 'var(--primary)' : 'var(--text-muted)' }}
          title="Probar sonido y vibración de aviso"
        >
          <Volume2 size={13} color={hasTestedAudio ? 'var(--primary)' : 'var(--text-muted)'} />
          <span>{hasTestedAudio ? '¡Alerta lista!' : 'Probar Alerta'}</span>
        </button>
      </div>
    </div>
  );
};
