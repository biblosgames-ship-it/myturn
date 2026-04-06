import React, { useState } from 'react';
import { Users, Plus, X, Briefcase, Trash2, Lock, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StaffMember } from './FinanceManagement';

interface StaffProps {
  staff: StaffMember[];
  setStaff: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  plan: string;
  tenantId: string;
}

const getPlanCapabilities = (planName: string) => {
  if (planName === 'Enterprise') return { maxStaff: 'Unlimited' };
  return { maxStaff: 1 };
};

export const StaffManagement: React.FC<StaffProps> = ({ staff, setStaff, plan, tenantId }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newStaff, setNewStaff] = useState<Partial<StaffMember>>({ name: '', role: 'Barbero', commission: 50, imageUrl: '' });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    if (file.size > 500 * 1024) {
      alert('❌ Imagen demasiado pesada. El límite es de 500 KB para asegurar una carga rápida.');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${tenantId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('staff-avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('staff-avatars')
        .getPublicUrl(filePath);

      setNewStaff({ ...newStaff, imageUrl: publicUrl });
    } catch (err) {
      console.error(err);
      alert('Error al subir la imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name) return;

    const caps = getPlanCapabilities(plan);
    const maxStaff = caps.maxStaff === 'Unlimited' ? Infinity : Number(caps.maxStaff);
    
    if (staff.length >= maxStaff) {
      alert(`⚠️ Límite de Equipo Alcanzado\n\nTu plan ${plan} permite un máximo de ${caps.maxStaff} profesional(es). Mejora tu plan para crecer tu equipo.`);
      setShowAddModal(false);
      return;
    }
    
    const dbPayload = {
      name: newStaff.name,
      role: newStaff.role || 'Barbero',
      commission_rate: newStaff.commission || 50,
      image_url: newStaff.imageUrl || ''
    };

    const { data, error } = await supabase.from('staff_members').insert(dbPayload).select().single();

    if (data && !error) {
      const s: StaffMember = {
        id: data.id,
        name: data.name,
        role: data.role,
        commission: data.commission_rate,
        imageUrl: data.image_url
      };
      setStaff([...staff, s]);
    } else {
      console.error(error);
      alert('Error al añadir personal. Revisa tu consola.');
    }

    setShowAddModal(false);
    setNewStaff({ name: '', role: 'Barbero', commission: 50, imageUrl: '' });
  };

  const updateStaffPhoto = async (staffId: string, file: File) => {
    if (file.size > 500 * 1024) {
      alert('❌ Imagen demasiado pesada. El límite es de 500 KB.');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${tenantId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('staff-avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('staff-avatars')
        .getPublicUrl(filePath);

      // Update DB
      const { error: upError } = await supabase.from('staff_members').update({ image_url: publicUrl }).eq('id', staffId);
      if (upError) throw upError;

      // Update state
      setStaff(staff.map(s => s.id === staffId ? { ...s, imageUrl: publicUrl } : s));
      alert('✅ Foto actualizada correctamente.');
    } catch (err) {
      console.error(err);
      alert('Error al actualizar la foto.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeStaff = async (id: string) => {
    if (window.confirm('¿Eliminar este profesional? (Se conservarán sus registros en Supabase si están atados a transacciones pasadas, pero se ocultará la vista)')) {
      const { error } = await supabase.from('staff_members').delete().eq('id', id);
      if (!error) {
        setStaff(staff.filter(s => s.id !== id));
      } else {
        console.error(error);
        alert('Error al intentar eliminar de la nube. Contacta a soporte.');
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={24} color="var(--primary)" /> Equipo de Trabajo
        </h3>
        {plan !== 'Enterprise' && staff.length >= 1 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245,158,11,0.1)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary)' }}>
            <Lock size={14} color="var(--primary)" />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)' }}>LIMITADO (Enterprise)</span>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', gap: '0.5rem', fontWeight: 800 }}>
            <Plus size={18} /> Añadir Profesional
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {staff.map(s => (
          <div key={s.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div 
                  style={{ 
                    position: 'relative', 
                    width: '56px', 
                    height: '56px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <label htmlFor={`edit-photo-${s.id}`} style={{ cursor: 'pointer' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--primary)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.25rem', overflow: 'hidden', border: '2px solid var(--border)' }}>
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : s.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="avatar-hover">
                      <Camera size={20} color="white" />
                    </div>
                    <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--primary)', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>
                      <Camera size={10} color="black" />
                    </div>
                    <input 
                      id={`edit-photo-${s.id}`}
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) updateStaffPhoto(s.id, file);
                      }} 
                    />
                  </label>
                </div>
                <div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>{s.name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{s.role}</p>
                  <label htmlFor={`edit-photo-${s.id}`} style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', marginTop: '0.2rem', display: 'inline-block' }}>
                    Cambiar Foto
                  </label>
                </div>
              </div>
              <button onClick={() => removeStaff(s.id)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', padding: '0.25rem' }} title="Eliminar">
                <Trash2 size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ flex: 1, background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>COMISIÓN</span>
                <p style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--success)' }}>{s.commission}%</p>
              </div>
              <div style={{ flex: 1, background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>ACTIVO</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleAddStaff} className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Nuevo Profesional</h3>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>NOMBRE COMPLETO</label>
                <input 
                  type="text" 
                  required
                  value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="Ej: David Ruiz"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>ROL O ESPECIALIDAD</label>
                <input 
                  type="text" 
                  value={newStaff.role}
                  onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="Ej: Barbero Senior"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>FOTO DEL PROFESIONAL</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--background)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {newStaff.imageUrl ? (
                      <img src={newStaff.imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                       <Briefcase size={24} color="var(--text-muted)" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="staff-photo-upload"
                    />
                    <label 
                      htmlFor="staff-photo-upload" 
                      className="btn btn-outline" 
                      style={{ width: '100%', fontSize: '0.75rem', padding: '0.5rem', cursor: isUploading ? 'wait' : 'pointer' }}
                    >
                      {isUploading ? 'Subiendo...' : 'Subir desde Dispositivo'}
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>COMISIÓN (%)</label>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={newStaff.commission}
                  onChange={e => setNewStaff({ ...newStaff, commission: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', padding: '1rem' }}>Registrar en Equipo</button>
          </form>
        </div>
      )}
    </div>
  );
};
