import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, ZapOff, Zap, Building, ChevronRight, Calendar, Layers } from 'lucide-react';

interface WorkStation {
  id: string;
  name: string;
  capacity: number;
  is_active: boolean;
  notes: string;
  servicesCount?: number;
}

interface WorkStationsProps {
  tenantId: string;
}

const emptyStation = { name: '', capacity: 1, is_active: true, notes: '' };

export const WorkStations: React.FC<WorkStationsProps> = ({ tenantId }) => {
  const [stations, setStations] = useState<WorkStation[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStation, setEditingStation] = useState<WorkStation | null>(null);
  const [form, setForm] = useState(emptyStation);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStation, setSelectedStation] = useState<WorkStation | null>(null);
  const [stationCalendarMonth, setStationCalendarMonth] = useState(new Date());

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: stData }, { data: svData }, { data: apData }] = await Promise.all([
      supabase.from('work_stations').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true }),
      supabase.from('services').select('id, name, station_id').eq('tenant_id', tenantId),
      supabase.from('appointments').select('id, date_time, station_id, status, client_name').eq('tenant_id', tenantId)
        .in('status', ['pending', 'waiting', 'attending', 'arrived']),
    ]);
    const svcMap: Record<string, number> = {};
    (svData || []).forEach((s: any) => {
      if (s.station_id) svcMap[s.station_id] = (svcMap[s.station_id] || 0) + 1;
    });
    setStations((stData || []).map((s: any) => ({ ...s, servicesCount: svcMap[s.id] || 0 })));
    setServices(svData || []);
    setAppointments(apData || []);
    setLoading(false);
  };

  useEffect(() => { if (tenantId) fetchAll(); }, [tenantId]);

  const handleSave = async () => {
    if (!form.name.trim()) { alert('El nombre es obligatorio.'); return; }
    if (form.capacity < 1) { alert('La capacidad debe ser al menos 1.'); return; }
    setSaving(true);
    if (editingStation) {
      await supabase.from('work_stations').update({
        name: form.name,
        capacity: form.capacity,
        is_active: form.is_active,
        notes: form.notes,
      }).eq('id', editingStation.id);
    } else {
      await supabase.from('work_stations').insert({
        tenant_id: tenantId,
        name: form.name,
        capacity: form.capacity,
        is_active: form.is_active,
        notes: form.notes,
      });
    }
    setSaving(false);
    setShowForm(false);
    setEditingStation(null);
    setForm(emptyStation);
    fetchAll();
  };

  const handleEdit = (s: WorkStation) => {
    setEditingStation(s);
    setForm({ name: s.name, capacity: s.capacity, is_active: s.is_active, notes: s.notes });
    setShowForm(true);
  };

  const handleDelete = async (s: WorkStation) => {
    if (!confirm(`¿Eliminar la estación "${s.name}"? Los servicios vinculados quedarán sin estación.`)) return;
    await supabase.from('work_stations').delete().eq('id', s.id);
    fetchAll();
  };

  const handleToggle = async (s: WorkStation) => {
    await supabase.from('work_stations').update({ is_active: !s.is_active }).eq('id', s.id);
    fetchAll();
  };

  // Calendar helpers for station view
  const year = stationCalendarMonth.getFullYear();
  const month = stationCalendarMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1;
  const monthName = stationCalendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const getAptsForStationOnDay = (stationId: string, d: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return appointments.filter(a => a.station_id === stationId && a.date_time?.startsWith(dStr));
  };

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  if (loading) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      <Layers size={32} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
      <p>Cargando estaciones...</p>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', background: 'rgba(139,92,246,0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #8b5cf6' }}>
        <Layers size={24} color="#8b5cf6" />
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#8b5cf6' }}>Work Stations — Enterprise</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Crea y gestiona estaciones de trabajo con capacidad limitada para controlar el flujo de citas.</p>
        </div>
        <button
          className="btn btn-primary"
          style={{ background: '#8b5cf6', borderColor: '#8b5cf6', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          onClick={() => { setEditingStation(null); setForm(emptyStation); setShowForm(true); }}
        >
          <Plus size={16} /> Nueva Estación
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card animate-scale-in" style={{ marginBottom: '1.5rem', border: '1px dashed #8b5cf6', background: 'rgba(139,92,246,0.05)' }}>
          <h4 style={{ fontWeight: 900, marginBottom: '1rem', color: '#8b5cf6' }}>
            {editingStation ? `Editando: ${editingStation.name}` : '➕ Nueva Estación de Trabajo'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>NOMBRE DE LA ESTACIÓN *</label>
              <input
                className="input"
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Cambio de Aceite, Masajes, Frenos..."
                autoFocus
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>CAPACIDAD SIMULTÁNEA *</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={99}
                  value={form.capacity}
                  onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Máx. de citas al mismo tiempo</p>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>ESTADO</label>
                <select className="input" value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm({ ...form, is_active: e.target.value === 'active' })}>
                  <option value="active">✅ Activa</option>
                  <option value="inactive">⛔ Inactiva</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>NOTAS INTERNAS (Opcional)</label>
              <textarea
                className="input"
                rows={2}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Ej: Solo usar para vehículos compactos..."
                style={{ resize: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowForm(false); setEditingStation(null); }}>Cancelar</button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: '#8b5cf6', borderColor: '#8b5cf6' }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Guardando...' : (editingStation ? 'Actualizar' : 'Crear Estación')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Station list */}
      {stations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Layers size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Sin estaciones configuradas</h4>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Crea tu primera estación de trabajo para gestionar la capacidad de tu negocio.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {stations.map(s => {
            const todayApts = appointments.filter(a => {
              const d = a.date_time?.split('T')[0];
              return a.station_id === s.id && d === getTodayStr();
            });
            const occupancyPct = Math.min(100, (todayApts.length / s.capacity) * 100);

            return (
              <div
                key={s.id}
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  borderLeft: `4px solid ${s.is_active ? '#8b5cf6' : 'var(--border)'}`,
                  opacity: s.is_active ? 1 : 0.6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontWeight: 900, color: s.is_active ? 'var(--text)' : 'var(--text-muted)' }}>{s.name}</h4>
                      {!s.is_active && <span style={{ fontSize: '0.6rem', background: 'var(--border)', color: 'var(--text-muted)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>INACTIVA</span>}
                    </div>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Capacidad: <strong style={{ color: '#8b5cf6' }}>{s.capacity} simultánea{s.capacity > 1 ? 's' : ''}</strong>
                      {' · '}{s.servicesCount} servicio{s.servicesCount !== 1 ? 's' : ''} vinculado{s.servicesCount !== 1 ? 's' : ''}
                    </p>
                    {s.notes && <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{s.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn btn-outline"
                      title={s.is_active ? 'Desactivar' : 'Activar'}
                      onClick={() => handleToggle(s)}
                      style={{ padding: '0.4rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.is_active ? 'var(--success)' : 'var(--text-muted)' }}
                    >
                      {s.is_active ? <Zap size={15} /> : <ZapOff size={15} />}
                    </button>
                    <button
                      className="btn btn-outline"
                      title="Ver calendario"
                      onClick={() => setSelectedStation(selectedStation?.id === s.id ? null : s)}
                      style={{ padding: '0.4rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedStation?.id === s.id ? '#8b5cf6' : 'var(--text-muted)' }}
                    >
                      <Calendar size={15} />
                    </button>
                    <button
                      className="btn btn-outline"
                      title="Editar"
                      onClick={() => handleEdit(s)}
                      style={{ padding: '0.4rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      className="btn btn-outline"
                      title="Eliminar"
                      onClick={() => handleDelete(s)}
                      style={{ padding: '0.4rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Occupancy bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Ocupación Hoy</span>
                    <span style={{ fontSize: '0.65rem', color: '#8b5cf6', fontWeight: 800 }}>{todayApts.length}/{s.capacity} slots</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${occupancyPct}%`,
                      background: occupancyPct >= 100 ? 'var(--accent)' : occupancyPct >= 70 ? 'var(--primary)' : '#8b5cf6',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>

                {/* Inline calendar for selected station */}
                {selectedStation?.id === s.id && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <button onClick={() => setStationCalendarMonth(new Date(year, month - 1, 1))} className="btn btn-outline" style={{ padding: '0.3rem 0.8rem' }}>‹</button>
                      <h4 style={{ margin: 0, fontWeight: 900, textTransform: 'capitalize', fontSize: '0.95rem' }}>{monthName}</h4>
                      <button onClick={() => setStationCalendarMonth(new Date(year, month + 1, 1))} className="btn btn-outline" style={{ padding: '0.3rem 0.8rem' }}>›</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', textAlign: 'center', marginBottom: '0.25rem' }}>
                      {['L','M','X','J','V','S','D'].map(d => (
                        <div key={d} style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0.2rem 0' }}>{d}</div>
                      ))}
                      {Array.from({ length: firstDay }, (_, i) => <div key={`b-${i}`} />)}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                        const dayApts = getAptsForStationOnDay(s.id, d);
                        const pct = Math.min(100, (dayApts.length / s.capacity) * 100);
                        const full = dayApts.length >= s.capacity;
                        return (
                          <div key={d} style={{
                            padding: '0.4rem 0.1rem',
                            borderRadius: 'var(--radius-sm)',
                            background: dayApts.length > 0 ? (full ? 'rgba(239,68,68,0.15)' : 'rgba(139,92,246,0.12)') : 'var(--background)',
                            border: `1px solid ${dayApts.length > 0 ? (full ? '#ef4444' : '#8b5cf6') : 'var(--border)'}`,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: full ? '#ef4444' : 'var(--text)',
                            cursor: 'default',
                            position: 'relative'
                          }}>
                            {d}
                            {dayApts.length > 0 && (
                              <div style={{ fontSize: '0.5rem', color: full ? '#ef4444' : '#8b5cf6', fontWeight: 900, marginTop: '0.1rem' }}>
                                {dayApts.length}/{s.capacity}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(139,92,246,0.3)', display: 'inline-block' }} /> Con citas</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(239,68,68,0.3)', display: 'inline-block' }} /> Capacidad llena</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
