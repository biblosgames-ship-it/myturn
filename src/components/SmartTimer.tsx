import React, { useState, useEffect } from 'react';
import { Clock, Users } from 'lucide-react';

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

  // Sync state with prop if it changes (e.g. on load after fetch)
  useEffect(() => {
    setTimeLeft(initialMinutes * 60);
  }, [initialMinutes]);

  useEffect(() => {
    // If it's not today, the timer should not run
    if (!isToday || status === 'completed' || timeLeft <= 0 || isPaused || isStalled) return;
    
    // Note: We ignore !isOpen here because we want it to run during "receso" if it's today
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [status, timeLeft, isToday, isPaused, isStalled]);

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

      <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
        <span className="badge badge-warning" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
          Estado: {status === 'in_progress' ? 'En proceso' : status === 'next' ? 'Próximo' : 'En espera'}
        </span>
      </div>
    </div>
  );
};
