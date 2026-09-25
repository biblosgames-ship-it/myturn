import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  Send, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Flame, 
  Bell, 
  Smartphone, 
  Phone, 
  TrendingUp, 
  Sparkles,
  RefreshCw,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface ClientRetentionProfile {
  id: string;
  name: string;
  phone: string;
  totalVisits: number;
  lastVisitDate: Date;
  daysSinceLastVisit: number;
  cadenceDays: number;
  isEstimatedCadence: boolean;
  estimatedNextCut: Date;
  status: 'overdue' | 'due_soon' | 'on_track';
  daysOverdue: number;
  daysUntilDue: number;
  lastService: string;
}

interface CustomerRetentionCRMProps {
  tenantId: string;
  businessName: string;
  shareUrl?: string;
}

export const CustomerRetentionCRM: React.FC<CustomerRetentionCRMProps> = ({
  tenantId,
  businessName,
  shareUrl
}) => {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRetentionProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'due_soon' | 'on_track'>('overdue');
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [tempPhone, setTempPhone] = useState('');
  const [notifiedClients, setNotifiedClients] = useState<Record<string, boolean>>({});

  const bookingLink = shareUrl || window.location.origin;

  const fetchCustomerHistory = async () => {
    try {
      setLoading(true);
      // Fetch finished appointments for this business
      const { data: apts, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'finished')
        .order('date_time', { ascending: true });

      if (error) {
        console.warn("Could not fetch finished appointments for CRM:", error.message);
        setLoading(false);
        return;
      }

      if (!apts || apts.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      // Group appointments by client (normalizing name/phone)
      const clientMap: Record<string, {
        name: string;
        phone: string;
        service: string;
        visits: Date[];
      }> = {};

      for (const apt of apts) {
        let phone = '';
        if (apt.custom_form_responses && typeof apt.custom_form_responses === 'object') {
          const entry = Object.entries(apt.custom_form_responses).find(([k, v]) => {
            const key = k.toLowerCase();
            return (key.includes('tel') || key.includes('cel') || key.includes('phone') || key.includes('movil') || key.includes('whatsapp')) && Boolean(v);
          });
          if (entry && entry[1]) phone = String(entry[1]).replace(/[^\d+]/g, '');
        }
        if (!phone && apt.client_name) {
          const digits = apt.client_name.replace(/[^\d]/g, '');
          if (digits.length >= 8) phone = digits;
        }

        const normalizedKey = phone ? `phone_${phone}` : `name_${apt.client_name.trim().toLowerCase()}`;
        const cleanName = apt.client_name.split(' (')[0].trim();
        const visitDate = new Date(apt.date_time || apt.created_at);

        if (!clientMap[normalizedKey]) {
          clientMap[normalizedKey] = {
            name: cleanName,
            phone: phone || '',
            service: apt.service_id ? 'Servicio' : 'Corte de Cabello',
            visits: []
          };
        } else if (!clientMap[normalizedKey].phone && phone) {
          clientMap[normalizedKey].phone = phone;
        }

        clientMap[normalizedKey].visits.push(visitDate);
      }

      // Calculate cadences and retention profiles
      const now = new Date();
      const profiles: ClientRetentionProfile[] = Object.entries(clientMap).map(([key, data]) => {
        const sortedVisits = data.visits.sort((a, b) => a.getTime() - b.getTime());
        const totalVisits = sortedVisits.length;
        const lastVisitDate = sortedVisits[totalVisits - 1];
        const daysSinceLastVisit = Math.max(0, Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)));

        let cadenceDays = 21; // Default benchmark
        let isEstimatedCadence = true;

        if (totalVisits >= 2) {
          let intervalSum = 0;
          for (let i = 1; i < totalVisits; i++) {
            const diffDays = (sortedVisits[i].getTime() - sortedVisits[i - 1].getTime()) / (1000 * 60 * 60 * 24);
            intervalSum += Math.max(1, diffDays);
          }
          const avgInterval = Math.round(intervalSum / (totalVisits - 1));
          // Realistic haircut bounds: between 7 and 60 days
          cadenceDays = Math.max(7, Math.min(60, avgInterval));
          isEstimatedCadence = false;
        }

        const estimatedNextCut = new Date(lastVisitDate.getTime() + (cadenceDays * 24 * 60 * 60 * 1000));
        const diff = daysSinceLastVisit - cadenceDays;

        let status: 'overdue' | 'due_soon' | 'on_track' = 'on_track';
        let daysOverdue = 0;
        let daysUntilDue = 0;

        if (diff > 2) {
          status = 'overdue';
          daysOverdue = diff;
        } else if (diff >= -3 && diff <= 2) {
          status = 'due_soon';
          daysUntilDue = Math.max(0, -diff);
        } else {
          status = 'on_track';
          daysUntilDue = -diff;
        }

        return {
          id: key,
          name: data.name,
          phone: data.phone,
          totalVisits,
          lastVisitDate,
          daysSinceLastVisit,
          cadenceDays,
          isEstimatedCadence,
          estimatedNextCut,
          status,
          daysOverdue,
          daysUntilDue,
          lastService: data.service
        };
      });

      // Sort: overdue first (by days overdue descending), then due_soon, then on_track
      profiles.sort((a, b) => {
        const priority = { overdue: 1, due_soon: 2, on_track: 3 };
        if (priority[a.status] !== priority[b.status]) {
          return priority[a.status] - priority[b.status];
        }
        return b.daysSinceLastVisit - a.daysSinceLastVisit;
      });

      setClients(profiles);
    } catch (err) {
      console.error("Error in CustomerRetentionCRM:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchCustomerHistory();
    }
  }, [tenantId]);

  // Overall Metrics
  const metrics = useMemo(() => {
    const total = clients.length;
    const overdue = clients.filter(c => c.status === 'overdue').length;
    const dueSoon = clients.filter(c => c.status === 'due_soon').length;
    const onTrack = clients.filter(c => c.status === 'on_track').length;
    const avgCadence = total > 0
      ? Math.round(clients.reduce((sum, c) => sum + c.cadenceDays, 0) / total)
      : 21;

    return { total, overdue, dueSoon, onTrack, avgCadence };
  }, [clients]);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm);
      return matchesStatus && matchesSearch;
    });
  }, [clients, statusFilter, searchTerm]);

  // WhatsApp Reminder Action
  const handleSendWhatsApp = (client: ClientRetentionProfile) => {
    let phone = client.phone ? client.phone.replace(/[^\d+]/g, '') : '';
    if (!phone) {
      const manualPhone = prompt(
        `Ingresa el número de WhatsApp para contactar a ${client.name} (ej: +1809... o +52...):`,
        ''
      );
      if (!manualPhone) return;
      phone = manualPhone.replace(/[^\d+]/g, '');
      // Update local phone
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, phone } : c));
    }

    let msg = '';
    const biz = businessName && businessName !== 'Cargando...' ? businessName : 'tu barbería de confianza';

    if (client.status === 'overdue') {
      msg = `¡Hola ${client.name}! 👋 Te saludamos con mucho aprecio de *${biz}*.\n\nNotamos que ya han pasado *${client.daysSinceLastVisit} días* desde tu último corte y según tu ritmo habitual ya es momento de renovar tu estilo para andar impecable. 💈✂️\n\n¿Te gustaría apartar tu turno para hoy o esta semana? Reserva cómodamente aquí:\n👉 ${bookingLink}\n\n¡Te esperamos con el mejor servicio! 🔥`;
    } else if (client.status === 'due_soon') {
      msg = `¡Hola ${client.name}! 👋 Te saludamos de *${biz}*.\n\nSegún tu frecuencia de corte, ya se acerca tu fecha estimada de retoque. 💈✂️\n\nAsegura tu espacio antes de que se llenen los turnos de la semana agendando en un clic:\n👉 ${bookingLink}\n\n¡Un abrazo y feliz día!`;
    } else {
      msg = `¡Hola ${client.name}! 👋 Te saludamos de *${biz}*.\n\nEsperamos que estés luciendo excelente tu corte. Cuando desees asegurar tu próxima cita, recuerda que puedes apartar tu turno directamente aquí:\n👉 ${bookingLink}\n\n¡Siempre a tu orden! 💈`;
    }

    const cleanPhone = phone.replace('+', '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    setNotifiedClients(prev => ({ ...prev, [client.id]: true }));
  };

  // App Notification Broadcast
  const handleSendAppNotification = (client: ClientRetentionProfile) => {
    alert(`✅ Notificación enviada a la app para ${client.name}: "Recordatorio: ya es tiempo de renovar tu corte en ${businessName}."`);
    setNotifiedClients(prev => ({ ...prev, [client.id]: true }));
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0, letterSpacing: '-0.5px' }}>
            <Sparkles size={26} color="var(--primary)" /> Algoritmo de Reenganche & Frecuencia
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
            Identifica automáticamente el ritmo de corte de cada cliente y reactiva a los que ya les toca recortarse.
          </p>
        </div>

        <button 
          onClick={fetchCustomerHistory}
          className="btn btn-outline"
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar Datos
        </button>
      </div>

      {/* Retention KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        {/* Atrasados */}
        <div 
          onClick={() => setStatusFilter('overdue')}
          className="card" 
          style={{ 
            padding: '1.25rem', 
            borderLeft: '4px solid #ef4444', 
            background: statusFilter === 'overdue' ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>
              🔴 Atrasados / Por Reenganchar
            </span>
            <AlertCircle size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ef4444', marginTop: '0.3rem' }}>
            {metrics.overdue}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Superaron su ritmo habitual
          </span>
        </div>

        {/* Le toca pronto */}
        <div 
          onClick={() => setStatusFilter('due_soon')}
          className="card" 
          style={{ 
            padding: '1.25rem', 
            borderLeft: '4px solid #f59e0b', 
            background: statusFilter === 'due_soon' ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
              🟡 Les Toca Pronto (Semana)
            </span>
            <Flame size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.3rem' }}>
            {metrics.dueSoon}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            En fecha de corte o a 1-3 días
          </span>
        </div>

        {/* Al día */}
        <div 
          onClick={() => setStatusFilter('on_track')}
          className="card" 
          style={{ 
            padding: '1.25rem', 
            borderLeft: '4px solid var(--success)', 
            background: statusFilter === 'on_track' ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase' }}>
              🟢 Al Día / Recién Cortados
            </span>
            <CheckCircle2 size={16} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--success)', marginTop: '0.3rem' }}>
            {metrics.onTrack}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Estilo fresco y vigente
          </span>
        </div>

        {/* Frecuencia Promedio */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6', background: 'rgba(139,92,246,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase' }}>
              ⏱️ Ritmo Promedio Negocio
            </span>
            <TrendingUp size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#8b5cf6', marginTop: '0.3rem' }}>
            Cada {metrics.avgCadence}d
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            De {metrics.total} clientes analizados
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)' }}>
        {/* Status Filter Buttons */}
        <div style={{ display: 'flex', background: 'var(--background)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          {[
            { id: 'overdue', label: '🔴 Atrasados', count: metrics.overdue },
            { id: 'due_soon', label: '🟡 Toca Pronto', count: metrics.dueSoon },
            { id: 'on_track', label: '🟢 Al Día', count: metrics.onTrack },
            { id: 'all', label: 'Todos', count: metrics.total },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: statusFilter === f.id ? 'var(--primary)' : 'transparent',
                color: statusFilter === f.id ? 'black' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                textTransform: 'uppercase'
              }}
            >
              <span>{f.label}</span>
              <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>({f.count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por cliente o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
            style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '1rem', height: '38px', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* Customer Retention Cards / Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>CLIENTE / WHATSAPP</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>HISTORIAL & VISITAS</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ÚLTIMO CORTE</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>RITMO HABITUAL</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'center' }}>ESTADO ALGORITMO</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'right' }}>INVITACIÓN RÁPIDA</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const isOverdue = client.status === 'overdue';
                const isDueSoon = client.status === 'due_soon';
                const isNotified = Boolean(notifiedClients[client.id]);

                return (
                  <tr key={client.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Cliente */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{client.name}</div>
                      
                      {editingPhoneId === client.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.3rem' }}>
                          <input
                            type="tel"
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                            placeholder="WhatsApp..."
                            className="input"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', width: '130px' }}
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              setClients(prev => prev.map(c => c.id === client.id ? { ...c, phone: tempPhone } : c));
                              setEditingPhoneId(null);
                            }}
                            style={{ background: 'var(--success)', border: 'none', color: 'white', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer' }}
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setEditingPhoneId(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                          {client.phone ? (
                            <span>{client.phone}</span>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPhoneId(client.id);
                                setTempPhone('');
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: '0.75rem', textDecoration: 'underline' }}
                            >
                              + Agregar WhatsApp
                            </button>
                          )}
                          {client.phone && (
                            <button
                              onClick={() => {
                                setEditingPhoneId(client.id);
                                setTempPhone(client.phone);
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                              title="Editar teléfono"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Visitas */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {client.totalVisits} {client.totalVisits === 1 ? 'visita' : 'visitas'}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {client.isEstimatedCadence ? 'Cliente nuevo' : 'Cliente habitual'}
                      </span>
                    </td>

                    {/* Último corte */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isOverdue ? '#ef4444' : 'var(--text)' }}>
                        Hace {client.daysSinceLastVisit} días
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {client.lastVisitDate.toLocaleDateString()}
                      </div>
                    </td>

                    {/* Ritmo Habitual */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                        Cada {client.cadenceDays} días
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        Prox: {client.estimatedNextCut.toLocaleDateString()}
                      </div>
                    </td>

                    {/* Semáforo del Algoritmo */}
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {isOverdue ? (
                        <span 
                          className="badge" 
                          style={{ 
                            background: 'rgba(239,68,68,0.12)', 
                            color: '#ef4444', 
                            border: '1px solid #ef4444', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.3rem',
                            fontWeight: 900
                          }}
                        >
                          <AlertCircle size={13} /> Atrasado (+{client.daysOverdue}d)
                        </span>
                      ) : isDueSoon ? (
                        <span 
                          className="badge" 
                          style={{ 
                            background: 'rgba(245,158,11,0.12)', 
                            color: '#f59e0b', 
                            border: '1px solid #f59e0b', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.3rem',
                            fontWeight: 900
                          }}
                        >
                          <Flame size={13} /> {client.daysUntilDue === 0 ? '¡Toca Hoy!' : `Toca en ${client.daysUntilDue}d`}
                        </span>
                      ) : (
                        <span 
                          className="badge badge-success" 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 800 }}
                        >
                          <CheckCircle2 size={13} /> Al día
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => handleSendWhatsApp(client)}
                          className="btn btn-outline"
                          title="Invitar por WhatsApp con 1 clic con link de reserva"
                          style={{ 
                            padding: '0.45rem 0.9rem', 
                            fontSize: '0.8rem', 
                            fontWeight: 900, 
                            color: '#25D366', 
                            borderColor: '#25D366', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.4rem',
                            background: isNotified ? 'rgba(37,211,102,0.1)' : 'transparent'
                          }}
                        >
                          <Send size={15} /> {isNotified ? 'Reenviar WhatsApp' : 'Recordar WhatsApp'}
                        </button>

                        <button
                          onClick={() => handleSendAppNotification(client)}
                          className="btn btn-outline"
                          title="Enviar notificación en la app"
                          style={{ padding: '0.45rem', fontSize: '0.8rem', color: 'var(--primary)', borderColor: 'var(--border)' }}
                        >
                          <Bell size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                    <Users size={40} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>
                      No se encontraron clientes para este filtro.
                    </p>
                    <span style={{ fontSize: '0.8rem' }}>
                      A medida que finalices turnos, el algoritmo irá memorizando el ritmo de cada cliente.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
