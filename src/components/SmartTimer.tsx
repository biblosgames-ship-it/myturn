import React, { useState, useEffect } from 'react';
import { Clock, Users } from 'lucide-react';

interface SmartTimerProps {
  remainingMinutes: number;
  remainingClients: number;
  turnNumber: number;
  status: 'waiting' | 'next' | 'in_progress' | 'completed';
  isPaused?: boolean;
  isOpen?: boolean;
  isToday?: boolean;
}

export const SmartTimer: React.FC<SmartTimerProps> = ({ 
  remainingMinutes: initialMinutes, 
  remainingClients, 
  turnNumber,
  status,
  isPaused = false,
  isOpen = true,
  isToday = true
}) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);

  useEffect(() => {
    // If it's not today, the timer should not run
    if (!isToday || status === 'completed' || timeLeft <= 0 || isPaused) return;
    
    // Note: We ignore !isOpen here because we want it to run during "receso" if it's today
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [status, timeLeft, isToday, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'in_progress': return 'var(--success)';
      case 'next': return 'var(--primary)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="card animate-fade-in" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
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
      
      <div style={{ 
        fontSize: '4rem', 
        fontWeight: 800, 
        margin: '1rem 0', 
        color: (isPaused || (!isToday)) ? 'var(--text-muted)' : getStatusColor() 
      }}>
        {(isPaused || !isToday) ? '--:--' : formatTime(timeLeft)}
      </div>
      
      {isPaused && (
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
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.875rem' }}>{Math.ceil(timeLeft / 60)} min restantes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.875rem' }}>{remainingClients} clientes antes</span>
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
        <span className="badge badge-warning" style={{ textTransform: 'uppercase' }}>
          Estado: {status === 'in_progress' ? 'En proceso' : status === 'next' ? 'Próximo' : 'En espera'}
        </span>
      </div>
    </div>
  );
};
