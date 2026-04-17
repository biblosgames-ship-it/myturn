import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Image as ImageIcon, Eye, X, Bold, Italic, Underline, Type, 
  MessageCircle, Rocket, User, CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const RichTextEditor: React.FC<{ 
  value: string, 
  onChange: (val: string) => void,
  placeholder?: string 
}> = ({ value, onChange, placeholder }) => {
  const [isClient, setIsClient] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);
  const lastValueRef = React.useRef(value);

  React.useEffect(() => {
    setIsClient(true);
    if (editorRef.current) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  React.useEffect(() => {
    if (editorRef.current && value !== lastValueRef.current) {
      editorRef.current.innerHTML = value;
      lastValueRef.current = value;
    }
  }, [value]);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      lastValueRef.current = newContent;
      onChange(newContent);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      lastValueRef.current = newContent;
      onChange(newContent);
    }
  };

  if (!isClient) return null;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--background)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: '0.4rem', padding: '0.6rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={() => exec('bold')} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><Bold size={14} /></button>
        <button type="button" onClick={() => exec('italic')} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><Italic size={14} /></button>
        <button type="button" onClick={() => exec('underline')} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><Underline size={14} /></button>
        <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 0.2rem' }} />
        <select onChange={(e) => exec('fontSize', e.target.value)} style={{ fontSize: '11px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px' }}>
          <option value="3">Mediano</option>
          <option value="2">Pequeño</option>
          <option value="5">Grande</option>
          <option value="7">Gigante</option>
        </select>
        <input type="color" defaultValue="#ffffff" onChange={(e) => exec('foreColor', e.target.value)} style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
      </div>
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        style={{ padding: '1rem', minHeight: '120px', outline: 'none', fontSize: '0.95rem', color: 'var(--text)', lineHeight: '1.6', direction: 'ltr', textAlign: 'left' }}
      />
    </div>
  );
};

export const MessagingCenter: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [chatReply, setChatReply] = useState('');
  const [broadcastData, setBroadcastData] = useState({ content: '', imageUrl: '' });
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  useEffect(() => {
    if (!tenantId) return;

    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true });
      if (data) setChatMessages(data);
    };
    fetchMessages();

    const msgChan = supabase.channel('realtime:messaging_center').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `tenant_id=eq.${tenantId}`
    }, (res) => {
      if (res.eventType === 'INSERT') {
        setChatMessages(prev => [...prev, res.new]);
      } else if (res.eventType === 'UPDATE') {
        setChatMessages(prev => prev.map(m => m.id === res.new.id ? res.new : m));
      }
    }).subscribe();

    return () => { supabase.removeChannel(msgChan); };
  }, [tenantId]);

  const [sessionNames, setSessionNames] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (!tenantId || chatMessages.length === 0) return;
    
    const fetchNamesFromApps = async () => {
      const sids = Array.from(new Set(chatMessages.map(m => m.session_id).filter(Boolean)));
      if (sids.length === 0) return;
      
      const { data: apps } = await supabase
        .from('appointments')
        .select('session_id, client_name')
        .eq('tenant_id', tenantId)
        .in('session_id', sids)
        .order('created_at', { ascending: false });
        
      if (apps) {
        const nameMap: Record<string, string> = {};
        (apps as any[]).forEach(a => {
          if (!nameMap[a.session_id]) {
            // Remove service name suffix like " (Barba)" if present
            nameMap[a.session_id] = (a.client_name || 'Desconocido').split(' (')[0];
          }
        });
        setSessionNames(prev => ({ ...prev, ...nameMap }));
      }
    };
    
    fetchNamesFromApps();
  }, [tenantId, chatMessages]);
  
  // Mark messages as read when a session is selected
  useEffect(() => {
    if (!selectedSessionId || !tenantId) return;
    
    const markAsRead = async () => {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('tenant_id', tenantId)
        .eq('session_id', selectedSessionId)
        .eq('is_from_client', true)
        .eq('is_read', false);
    };
    markAsRead();
  }, [selectedSessionId, tenantId]);

  const handleSendReply = async () => {
    if (!chatReply.trim() || !selectedSessionId || !tenantId) return;
    const msg = chatReply;
    setChatReply('');
    try {
      const { error } = await supabase.from('messages').insert({
        tenant_id: tenantId,
        session_id: selectedSessionId,
        content: msg,
        is_from_client: false
      });
      if (error) throw error;
    } catch (err: any) {
      alert('Error: ' + err.message);
      setChatReply(msg);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastData.content.trim() || !tenantId) return;
    setIsSendingBroadcast(true);
    try {
      let finalImageUrl = broadcastData.imageUrl;
      if (broadcastFile) {
        const fileExt = broadcastFile.name.split('.').pop();
        const fileName = `broadcast_${Date.now()}.${fileExt}`;
        const filePath = `${tenantId}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, broadcastFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
          finalImageUrl = publicUrl;
        }
      }

      const { error } = await supabase.from('messages').insert({
        tenant_id: tenantId,
        session_id: 'broadcast',
        content: broadcastData.content,
        image_url: finalImageUrl || null,
        is_from_client: false,
        is_broadcast: true,
        customer_name: 'PROMOCIÓN'
      });
      if (error) throw error;

      alert('🚀 ¡Difusión enviada con éxito!');
      setBroadcastData({ content: '', imageUrl: '' });
      setBroadcastFile(null);
      setShowPreview(false);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const sessions = Array.from(new Set(chatMessages.filter(m => !m.is_broadcast).map(m => m.session_id)));

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Broadcast Section */}
      <div className="card" style={{ border: '2px solid var(--primary)', background: 'rgba(245,158,11,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--primary)', color: 'black', padding: '0.5rem', borderRadius: '0.75rem' }}>
              <Rocket size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>DIFUSIÓN PROMOCIONAL</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Envía ofertas o comunicados a todos tus clientes vinculados</p>
            </div>
          </div>
          <button 
            className="btn btn-outline" 
            onClick={() => setShowPreview(!showPreview)}
            style={{ fontSize: '0.75rem', fontWeight: 800 }}
          >
            {showPreview ? 'Cerrar Vista Previa' : 'Ver Vista Previa'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '2rem' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
            <RichTextEditor 
              value={broadcastData.content} 
              onChange={(val) => setBroadcastData({...broadcastData, content: val})} 
              placeholder="Escribe tu oferta o mensaje aquí..."
            />
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <ImageIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  value={broadcastData.imageUrl}
                  onChange={(e) => setBroadcastData({...broadcastData, imageUrl: e.target.value})}
                  placeholder="URL de la imagen (Opcional)"
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: '0.85rem' }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>O</span>
              <label className="btn btn-outline" style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                {broadcastFile ? '✓ Imagen Lista' : 'Subir Imagen'}
                <input type="file" hidden onChange={(e) => setBroadcastFile(e.target.files?.[0] || null)} />
              </label>
              <button 
                className="btn btn-primary" 
                onClick={handleSendBroadcast} 
                disabled={isSendingBroadcast || !broadcastData.content.trim()}
                style={{ padding: '0.75rem 2rem', fontWeight: 900 }}
              >
                {isSendingBroadcast ? 'Enviando...' : 'LANZAR DIFUSIÓN'}
              </button>
            </div>
          </div>

          {showPreview && (
            <div className="animate-scale-in" style={{ background: '#0a0a0a', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid var(--border)', height: 'fit-content' }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', textAlign: 'center' }}>VISTA DEL CLIENTE</p>
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid var(--primary)', borderRadius: '1rem 1rem 1rem 0', padding: '1rem' }}>
                {(broadcastFile || broadcastData.imageUrl) && (
                  <img 
                    src={broadcastFile ? URL.createObjectURL(broadcastFile) : broadcastData.imageUrl} 
                    style={{ width: '100%', borderRadius: '0.5rem', marginBottom: '0.75rem' }} 
                    alt="Preview"
                  />
                )}
                <div style={{ fontSize: '0.85rem', color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: broadcastData.content || 'Tu mensaje aparecerá aquí...' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Section */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : '650px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ 
          width: isMobile ? '100%' : '300px', 
          borderRight: isMobile ? 'none' : '1px solid var(--border)', 
          borderBottom: isMobile ? '1px solid var(--border)' : 'none',
          display: 'flex', 
          flexDirection: 'column',
          height: isMobile ? '250px' : 'auto'
        }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Clientes Activos
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sessions.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No hay chats activos todavía</div>
            ) : (
              sessions.map(sid => {
                const sessionMsgs = chatMessages.filter(m => m.session_id === sid);
                const lastMsg = sessionMsgs[sessionMsgs.length - 1];
                const unreadCount = sessionMsgs.filter(m => !m.is_read && m.is_from_client).length;
                const customerName = sessionNames[sid] || sessionMsgs.find(m => m.customer_name && m.customer_name !== 'Cliente')?.customer_name || 'Cliente Nuevo';
                
                return (
                  <div 
                    key={sid}
                    onClick={() => {
                      setSelectedSessionId(sid);
                      const unreadIds = sessionMsgs.filter(m => !m.is_read && m.is_from_client).map(m => m.id);
                      if (unreadIds.length > 0) {
                        supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
                      }
                    }}
                    style={{ 
                      padding: '1.25rem', 
                      cursor: 'pointer', 
                      borderBottom: '1px solid var(--border)',
                      background: selectedSessionId === sid ? 'rgba(245,158,11,0.05)' : 'transparent',
                      borderLeft: selectedSessionId === sid ? '4px solid var(--primary)' : '4px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{customerName}</span>
                      {unreadCount > 0 && <span style={{ background: 'red', color: 'white', borderRadius: 'var(--radius-full)', padding: '0.1rem 0.5rem', fontSize: '10px', fontWeight: 900 }}>{unreadCount}</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lastMsg?.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div style={{ background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
          {selectedSessionId ? (
            <>
              <div style={{ padding: '1rem 1.5rem', background: 'var(--background)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} />
                </div>
                <span style={{ fontWeight: 800 }}>{sessionNames[selectedSessionId] || chatMessages.find(m => m.session_id === selectedSessionId && m.customer_name !== 'Cliente')?.customer_name || 'Conversación'}</span>
              </div>
              <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#070707' }}>
                {chatMessages.filter(m => m.session_id === selectedSessionId).map(m => (
                  <div key={m.id} style={{ alignSelf: m.is_from_client ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
                    <div style={{ 
                      padding: '0.75rem 1rem', 
                      borderRadius: m.is_from_client ? '1rem 1rem 1rem 0' : '1rem 1rem 0 1rem',
                      background: m.is_from_client ? 'var(--background)' : 'var(--primary)',
                      color: m.is_from_client ? 'var(--text)' : 'black',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      border: m.is_from_client ? '1px solid var(--border)' : 'none',
                      direction: 'ltr',
                      textAlign: 'left'
                    }}>
                      {m.content}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: m.is_from_client ? 'left' : 'right' }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '1rem 1.5rem', background: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem' }}>
                <input 
                  type="text" 
                  value={chatReply}
                  onChange={(e) => setChatReply(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                  placeholder="Escribe tu respuesta..."
                  style={{ flex: 1, padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-full)', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                />
                <button 
                  onClick={handleSendReply} 
                  className="btn btn-primary" 
                  style={{ borderRadius: 'var(--radius-full)', padding: '0 1.5rem' }}
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '1rem' }}>
              <MessageCircle size={48} strokeWidth={1} />
              <p style={{ fontSize: '0.9rem' }}>Selecciona un cliente para iniciar la conversación</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
