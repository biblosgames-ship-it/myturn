import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Key, BarChart3, Settings, Plus, Copy, CheckCircle, 
  Shield, Building2, CreditCard, LayoutDashboard, Search, 
  Filter, MoreVertical, ExternalLink, AlertCircle, TrendingUp, 
  Briefcase, Heart, Scissors, Stethoscope, ShieldAlert, Clock,
  CheckCircle2, Loader2, LifeBuoy, Send, MessageSquare,
  Download, Printer, Star, Megaphone, Trash2, Edit,
  Link2, UserPlus, Sparkles, MessageCircle, Upload, QrCode, X
} from 'lucide-react';
import { compressImage, formatBytes } from '../lib/imageCompression';
import { BusinessQrPosterModal } from './BusinessQrPosterModal';

interface SupportTicket {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  account_type: string;
  category: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
}

interface PlatformAd {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  image_url?: string;
  target_url?: string;
  type: 'cintillo' | 'banner' | 'popup';
  is_active: boolean;
  priority: number;
}

interface Tenant {
  id: string;
  name: string;
  owner: string;
  industry: 'Barbería' | 'Salón' | 'Salud' | 'Taller' | 'Otro';
  status: 'active' | 'pending' | 'suspended';
  plan: 'Free' | 'Professional' | 'Multi-Professional' | 'Multi-Negocios';
  appointmentsToday: number;
  revenue: number;
  logo: string;
  expiryDate: string;
  isFeatured?: boolean;
  featuredBadge?: string;
  claimToken?: string;
  ownerPhone?: string;
  slug?: string;
  professionalName?: string;
}

export interface SaasPlan {
  id: string; // Add an ID to help with uniquely identifying the plan
  name: string;
  price: string;
  priceAnnual: string;
  features: string[];
  capabilities: {
    advancedFinance: boolean;
    multipleStaff: boolean;
    whiteLabel: boolean;
    maxAppointments: number | 'Unlimited';
    maxStaff: number | 'Unlimited';
  };
}

const GLOBAL_STATS = {
  totalRevenue: 0,
  activeBusinesses: 0,
  totalUsers: 0,
  growthRate: 0
};


export interface InitialServiceItem {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export const INDUSTRY_SERVICE_PRESETS: Record<string, { name: string; price: number; duration_minutes: number }[]> = {
  'Barbería': [
    { name: 'Corte Clásico', price: 15, duration_minutes: 30 },
    { name: 'Corte y Barba', price: 25, duration_minutes: 45 },
    { name: 'Perfilado de Barba', price: 10, duration_minutes: 20 },
    { name: 'Corte Infantil', price: 12, duration_minutes: 25 },
  ],
  'Salón': [
    { name: 'Corte y Peinado', price: 30, duration_minutes: 45 },
    { name: 'Tinte Completo', price: 50, duration_minutes: 90 },
    { name: 'Manicura Spa', price: 20, duration_minutes: 40 },
    { name: 'Pedicura', price: 25, duration_minutes: 45 },
  ],
  'Salud': [
    { name: 'Consulta General', price: 40, duration_minutes: 30 },
    { name: 'Masaje Terapéutico', price: 50, duration_minutes: 60 },
    { name: 'Limpieza Facial', price: 35, duration_minutes: 45 },
  ],
  'Taller': [
    { name: 'Cambio de Aceite y Filtro', price: 45, duration_minutes: 40 },
    { name: 'Revisión General / Frenos', price: 60, duration_minutes: 60 },
    { name: 'Alineación y Balanceo', price: 35, duration_minutes: 45 },
  ],
  'Otro': [
    { name: 'Servicio Estándar', price: 25, duration_minutes: 30 },
    { name: 'Servicio Premium', price: 50, duration_minutes: 60 },
  ]
};

// No initial mock data anymore
const initialTenants: Tenant[] = [];

const initialSaasPlans: SaasPlan[] = [
  { id: 'Free', name: 'Free', price: '$0', priceAnnual: '$0', features: ['Hasta 100 turnos/mes', 'Soporte básico', '1 profesional', 'Panel básico'], capabilities: { advancedFinance: false, multipleStaff: false, whiteLabel: false, maxAppointments: 100, maxStaff: 1 } },
  { id: 'Professional', name: 'Professional', price: '$29', priceAnnual: '$290', features: ['Turnos ilimitados', 'Inventario y Finanzas', '1 profesional principal', 'Reportes básicos'], capabilities: { advancedFinance: true, multipleStaff: false, whiteLabel: false, maxAppointments: 'Unlimited', maxStaff: 1 } },
  { id: 'Multi-Professional', name: 'Multi-Professional', price: '$79', priceAnnual: '$790', features: ['Todo lo de Professional', 'Hasta 5 profesionales', 'Estaciones de trabajo', 'WhatsApp API'], capabilities: { advancedFinance: true, multipleStaff: true, whiteLabel: false, maxAppointments: 'Unlimited', maxStaff: 5 } },
  { id: 'Multi-Negocios', name: 'Multi-Negocios', price: '$149', priceAnnual: '$1490', features: ['Multi-sucursal', 'Panel Centralizado', 'Profesionales ilimitados', 'Account Manager'], capabilities: { advancedFinance: true, multipleStaff: true, whiteLabel: true, maxAppointments: 'Unlimited', maxStaff: 'Unlimited' } },
];

interface SuperAdminDashboardProps {
  onSwitchToBarber?: (tenantId?: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onSwitchToBarber }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'businesses' | 'plans' | 'tickets' | 'ads' | 'settings'>('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const handleEnterTenant = (t: Tenant) => {
    localStorage.setItem('myturn_superadmin_selected_tenant', t.id);
    if (t.slug) localStorage.setItem('myturn_active_business_slug', t.slug);
    if (onSwitchToBarber) {
      onSwitchToBarber(t.id);
    }
  };
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastInviteCode, setLastInviteCode] = useState<string | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [userTenantId, setUserTenantId] = useState<string | null>(null);

  // Platform Ads & Sponsorships state
  const [platformAds, setPlatformAds] = useState<PlatformAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [showNewAdModal, setShowNewAdModal] = useState(false);
  const [editingAd, setEditingAd] = useState<PlatformAd | null>(null);
  const [newAd, setNewAd] = useState({
    title: '',
    subtitle: '',
    badge: 'PROMO',
    target_url: '',
    image_url: '',
    type: 'cintillo' as 'cintillo' | 'banner' | 'popup',
    priority: 10
  });

  const handleOpenEditAd = (ad: PlatformAd) => {
    setEditingAd(ad);
    setNewAd({
      title: ad.title,
      subtitle: ad.subtitle || '',
      badge: ad.badge || 'PROMO',
      target_url: ad.target_url || '',
      image_url: ad.image_url || '',
      type: ad.type,
      priority: ad.priority
    });
    setShowNewAdModal(true);
  };

  // Proposal & Claim state
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [claimModalTenant, setClaimModalTenant] = useState<Tenant | null>(null);
  const [qrPosterTenant, setQrPosterTenant] = useState<Tenant | null>(null);
  const [copiedClaimLink, setCopiedClaimLink] = useState(false);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [newProposalTenant, setNewProposalTenant] = useState<{
    name: string;
    slug: string;
    industry: 'Barbería' | 'Salón' | 'Salud' | 'Taller' | 'Otro';
    plan_id: 'Free' | 'Professional' | 'Multi-Professional' | 'Multi-Negocios';
    professionalName: string;
    ownerEmail: string;
    ownerPhone: string;
    logoUrl: string;
    slogan: string;
    services: InitialServiceItem[];
  }>({
    name: '',
    slug: '',
    industry: 'Barbería',
    plan_id: 'Professional',
    professionalName: '',
    ownerEmail: '',
    ownerPhone: '',
    logoUrl: 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=200&h=200&fit=crop',
    slogan: 'Tu mejor experiencia en cada turno',
    services: INDUSTRY_SERVICE_PRESETS['Barbería'].map((s, idx) => ({ ...s, id: `svc_${idx + 1}` }))
  });

  const handleAddProposalService = () => {
    setNewProposalTenant(prev => ({
      ...prev,
      services: [
        ...prev.services,
        {
          id: `svc_${Date.now()}`,
          name: '',
          price: 15,
          duration_minutes: 30
        }
      ]
    }));
  };

  const handleRemoveProposalService = (id: string) => {
    setNewProposalTenant(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  const handleUpdateProposalService = (id: string, field: keyof InitialServiceItem, value: any) => {
    setNewProposalTenant(prev => ({
      ...prev,
      services: prev.services.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const handleSelectIndustryAndPresets = (industry: 'Barbería' | 'Salón' | 'Salud' | 'Taller' | 'Otro') => {
    const presets = INDUSTRY_SERVICE_PRESETS[industry] || INDUSTRY_SERVICE_PRESETS['Barbería'];
    setNewProposalTenant(prev => ({
      ...prev,
      industry,
      services: presets.map((s, idx) => ({ ...s, id: `svc_${Date.now()}_${idx}` }))
    }));
  };

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadCompressionStats, setUploadCompressionStats] = useState<{
    originalSize: string;
    compressedSize: string;
    savingsPercent: number;
  } | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      setUploadCompressionStats(null);

      // Client-side high performance compression to WebP (max 400x400)
      const compressed = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.82,
        mimeType: 'image/webp'
      });

      setUploadCompressionStats({
        originalSize: formatBytes(compressed.originalSize),
        compressedSize: formatBytes(compressed.compressedSize),
        savingsPercent: compressed.savingsPercent
      });

      // Upload directly to Supabase storage
      const fileName = `tenant_logo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;
      const { data, error: uploadErr } = await supabase.storage
        .from('logos')
        .upload(fileName, compressed.file, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadErr) {
        console.warn('Storage upload notice:', uploadErr);
        // Fallback: use previewUrl or throw
        throw uploadErr;
      }

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
      setNewProposalTenant(prev => ({ ...prev, logoUrl: publicUrl }));
    } catch (err: any) {
      console.error('Error al subir logo:', err);
      alert('Error al subir el logo: ' + (err.message || 'Verifica la conexión'));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCreateProposalTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProposalTenant.name) return;
    setCreatingTenant(true);
    try {
      const baseSlug = (newProposalTenant.slug || newProposalTenant.name)
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
      const token = `claim_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
      const cleanEmail = newProposalTenant.ownerEmail?.toLowerCase().trim() || null;

      // Base tenant payload without relying on unmigrated columns
      const basePayload: any = {
        name: newProposalTenant.name,
        slug: uniqueSlug,
        industry: newProposalTenant.industry,
        plan_id: newProposalTenant.plan_id,
        logo_url: newProposalTenant.logoUrl,
        logo: newProposalTenant.logoUrl,
        professional_name: newProposalTenant.professionalName || 'Personal Principal',
        slogan: newProposalTenant.slogan,
        owner_phone: newProposalTenant.ownerPhone || null,
        claim_token: token,
        status: 'active',
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      // Attempt 1: try including owner and owner_email (if migration v56 ran)
      let createdTenant: any = null;
      let insertErr: any = null;

      const attempt1 = await supabase.from('tenants').insert({
        ...basePayload,
        owner: cleanEmail || 'Pendiente de vinculación',
        owner_email: cleanEmail
      }).select().single();

      if (attempt1.error) {
        // If owner or owner_email doesn't exist in Supabase schema yet, fallback gracefully
        if (
          attempt1.error.message?.includes("'owner'") || 
          attempt1.error.message?.includes("'owner_email'") ||
          attempt1.error.code === 'PGRST204'
        ) {
          const attempt2 = await supabase.from('tenants').insert(basePayload).select().single();
          createdTenant = attempt2.data;
          insertErr = attempt2.error;
        } else {
          insertErr = attempt1.error;
        }
      } else {
        createdTenant = attempt1.data;
      }

      if (insertErr) throw insertErr;

      if (createdTenant) {
        // If owner email was provided, check if a user with that email already exists to link immediately!
        if (cleanEmail) {
          try {
            const { data: existingUser } = await supabase
              .from('users')
              .select('id, tenant_id')
              .eq('email', cleanEmail)
              .maybeSingle();

            if (existingUser?.id) {
              await supabase.from('users').update({
                tenant_id: createdTenant.id,
                role: 'owner',
                full_name: newProposalTenant.professionalName || createdTenant.name
              }).eq('id', existingUser.id);
            }
          } catch (preLinkErr) {
            console.warn('Pre-link attempt notice:', preLinkErr);
          }
        }

        // Create starter services and staff member so the proposal is ready
        const validServices = newProposalTenant.services.filter(s => s.name && s.name.trim().length > 0);
        const servicesPayload = validServices.length > 0
          ? validServices.map(s => ({
              tenant_id: createdTenant.id,
              name: s.name.trim(),
              price: Number(s.price) || 0,
              duration_minutes: Number(s.duration_minutes) || 30,
              icon: 'Scissors'
            }))
          : [
              {
                tenant_id: createdTenant.id,
                name: 'Servicio Principal',
                price: 15,
                duration_minutes: 30,
                icon: 'Star'
              }
            ];

        await supabase.from('services').insert(servicesPayload);

        await supabase.from('staff_members').insert({
          tenant_id: createdTenant.id,
          name: newProposalTenant.professionalName || 'Profesional Principal',
          role: 'Titular'
        });

        setShowCreateTenantModal(false);
        setNewProposalTenant({
          name: '',
          slug: '',
          industry: 'Barbería',
          plan_id: 'Professional',
          professionalName: '',
          ownerEmail: '',
          ownerPhone: '',
          logoUrl: 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=200&h=200&fit=crop',
          slogan: 'Tu mejor experiencia en cada turno',
          services: INDUSTRY_SERVICE_PRESETS['Barbería'].map((s, idx) => ({ ...s, id: `svc_${idx + 1}` }))
        });
        setUploadCompressionStats(null);

        await fetchTenants();

        // Immediately open claim modal with the newly generated link
        setClaimModalTenant({
          id: createdTenant.id,
          name: createdTenant.name,
          owner: cleanEmail || createdTenant.owner || createdTenant.professional_name || 'Pendiente de vinculación',
          industry: createdTenant.industry,
          status: 'active',
          plan: createdTenant.plan_id,
          appointmentsToday: 0,
          revenue: 0,
          logo: createdTenant.logo_url || createdTenant.logo,
          expiryDate: createdTenant.expiry_date,
          claimToken: token,
          slug: createdTenant.slug,
          ownerPhone: newProposalTenant.ownerPhone,
          professionalName: newProposalTenant.professionalName
        });
      }
    } catch (err: any) {
      console.error('Error creating proposal tenant:', err);
      alert('Error creando negocio: ' + (err.message || ''));
    } finally {
      setCreatingTenant(false);
    }
  };

  const handleRegenerateClaimToken = async (tenantId: string) => {
    const newToken = `claim_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const { error } = await supabase.from('tenants').update({ claim_token: newToken }).eq('id', tenantId);
    if (!error) {
      setClaimModalTenant(prev => prev ? { ...prev, claimToken: newToken } : null);
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, claimToken: newToken } : t));
    }
  };

  const fetchPlatformAds = async () => {
    setAdsLoading(true);
    try {
      const { data, error } = await supabase.from('platform_ads').select('*').order('priority', { ascending: false });
      if (data && !error) setPlatformAds(data);
    } catch (e) {
      console.warn("Could not fetch platform ads:", e);
    } finally {
      setAdsLoading(false);
    }
  };

  const handleToggleAdStatus = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from('platform_ads').update({ is_active: !currentActive }).eq('id', id);
    if (!error) {
      setPlatformAds(prev => prev.map(ad => ad.id === id ? { ...ad, is_active: !currentActive } : ad));
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este anuncio?")) return;
    const { error } = await supabase.from('platform_ads').delete().eq('id', id);
    if (!error) {
      setPlatformAds(prev => prev.filter(ad => ad.id !== id));
    }
  };

  const handleSubmitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAd.title) return;
    try {
      if (editingAd) {
        const { data, error } = await supabase.from('platform_ads').update({
          title: newAd.title,
          subtitle: newAd.subtitle || null,
          badge: newAd.badge || 'PROMO',
          target_url: newAd.target_url || '/',
          image_url: newAd.image_url || null,
          type: newAd.type,
          priority: Number(newAd.priority) || 10
        }).eq('id', editingAd.id).select().single();

        if (error) throw error;
        if (data) {
          setPlatformAds(prev => prev.map(a => a.id === editingAd.id ? data : a));
        }
      } else {
        const { data, error } = await supabase.from('platform_ads').insert({
          title: newAd.title,
          subtitle: newAd.subtitle || null,
          badge: newAd.badge || 'PROMO',
          target_url: newAd.target_url || '/',
          image_url: newAd.image_url || null,
          type: newAd.type,
          priority: Number(newAd.priority) || 10,
          is_active: true
        }).select().single();

        if (error) throw error;
        if (data) {
          setPlatformAds([data, ...platformAds]);
        }
      }

      setShowNewAdModal(false);
      setEditingAd(null);
      setNewAd({ title: '', subtitle: '', badge: 'PROMO', target_url: '', image_url: '', type: 'cintillo', priority: 10 });
    } catch (err: any) {
      alert("Error al guardar anuncio: " + (err?.message || 'Verifica la tabla platform_ads'));
    }
  };

  const handleToggleFeatured = async (tenantId: string, currentFeatured: boolean) => {
    try {
      const newFeatured = !currentFeatured;
      const { error } = await supabase.from('tenants').update({ is_featured: newFeatured }).eq('id', tenantId);
      if (error) throw error;
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, isFeatured: newFeatured } : t));
    } catch (err: any) {
      console.error('Error toggling featured:', err);
      alert('Error al actualizar estado destacado: ' + (err.message || ''));
    }
  };

  const fetchSupportTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          tenants (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupportTickets(data.map(t => ({
        ...t,
        tenant_name: t.tenants?.name || 'Desconocido'
      })));
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      fetchSupportTickets();
    } catch (err) {
      alert('Error al actualizar ticket');
    }
  };


  // Fetch real tenants from Supabase
  const fetchTenants = async () => {
    try {
      setLoading(true);
      
      // Fetch current user tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
        if (userData?.tenant_id) setUserTenantId(userData.tenant_id);
      }

      const { data: tData, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
      
      if (error) throw error;

      if (tData) {
        setTenants(tData.map(t => ({
          id: t.id || Math.random().toString(),
          name: t.name || 'Sin Nombre',
          owner: t.owner || 'SaaS Business',
          industry: (t.industry as any) || 'Otro',
          status: (t.plan_id === 'Suspended' ? 'suspended' : 'active'),
          plan: (t.plan_id as any) || 'Free',
          appointmentsToday: 0,
          revenue: 0,
          logo: t.logo || t.logo_url || 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=100&h=100&fit=crop',
          expiryDate: t.expiry_date || new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          isFeatured: Boolean(t.is_featured),
          featuredBadge: t.featured_badge || 'DESTACADO',
          claimToken: t.claim_token,
          ownerPhone: t.owner_phone,
          slug: t.slug,
          professionalName: t.professional_name
        })));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchSupportTickets();
    fetchPlatformAds();
  }, []);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [selectedTenantForPayment, setSelectedTenantForPayment] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  
  // New state for SaaS Plans with LocalStorage Persistence
  const [saasPlans, setSaasPlans] = useState<SaasPlan[]>(initialSaasPlans);
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);
  const [manualPaymentData, setManualPaymentData] = useState({
    amount: 29.00,
    method: 'Transferencia',
    expiryDate: '',
    plan: 'Professional' as 'Free' | 'Professional' | 'Multi-Professional' | 'Multi-Negocios',
    status: 'active' as 'active' | 'pending' | 'suspended',
  });
  // New state for password update in Advanced Settings
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isUploadingEditLogo, setIsUploadingEditLogo] = useState(false);
  const [editLogoCompressionStats, setEditLogoCompressionStats] = useState<{
    originalSize: string;
    compressedSize: string;
    savingsPercent: number;
  } | null>(null);

  const handleEditLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingTenant) return;

    try {
      setIsUploadingEditLogo(true);
      setEditLogoCompressionStats(null);

      // Client-side high performance compression to WebP (max 400x400)
      const compressed = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.82,
        mimeType: 'image/webp'
      });

      setEditLogoCompressionStats({
        originalSize: formatBytes(compressed.originalSize),
        compressedSize: formatBytes(compressed.compressedSize),
        savingsPercent: compressed.savingsPercent
      });

      // Upload directly to Supabase storage
      const fileName = `tenant_logo_${editingTenant.id || 'edit'}_${Date.now()}.webp`;
      const { data, error: uploadErr } = await supabase.storage
        .from('logos')
        .upload(fileName, compressed.file, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
      setEditingTenant({ ...editingTenant, logo: publicUrl });
    } catch (err: any) {
      console.error('Error al subir logo de negocio:', err);
      alert('Error al subir el logo: ' + (err.message || 'Verifica la conexión'));
    } finally {
      setIsUploadingEditLogo(false);
    }
  };

  const handleOpenPaymentModal = (tenant: Tenant) => {
    setSelectedTenantForPayment(tenant);
    const currentExpiry = new Date(tenant.expiryDate);
    const nextExpiry = new Date(currentExpiry > new Date() ? currentExpiry : new Date());
    nextExpiry.setDate(nextExpiry.getDate() + 30);
    
    // Calculate price based on plan name
    let price = 0;
    if (tenant.plan === 'Professional') price = 29;
    else if (tenant.plan === 'Multi-Professional') price = 79;
    else if (tenant.plan === 'Multi-Negocios') price = 149;

    setManualPaymentData({
      amount: price,
      method: 'Transferencia',
      expiryDate: nextExpiry.toISOString().split('T')[0],
      plan: tenant.plan as any,
      status: tenant.status
    });
  };

  const handleSaveManualPayment = async () => {
    if (!selectedTenantForPayment) return;
    
    try {
      const { error } = await supabase.from('tenants').update({
        expiry_date: manualPaymentData.expiryDate,
        plan_id: manualPaymentData.plan,
        status: (manualPaymentData.status === 'suspended' ? 'suspended' : 'active')
      }).eq('id', selectedTenantForPayment.id);

      if (error) throw error;

      await fetchTenants(); // Re-fetch to sync
      setSelectedTenantForPayment(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      console.error('Payment save error:', err);
      alert('Error al guardar pago: ' + err.message);
    }
  };


  const handleDeleteTenant = async () => {
    if (!deletingTenant) return;
    
    try {
      const { error } = await supabase.from('tenants').delete().eq('id', deletingTenant.id);
      if (error) throw error;

      await fetchTenants();
      setDeletingTenant(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Error al borrar: ' + err.message);
    }
  };

  const handleUpdateTenant = async (updatedTenant: Tenant) => {
    try {
      const basePayload: any = {
        name: updatedTenant.name,
        professional_name: updatedTenant.owner,
        industry: updatedTenant.industry,
        logo_url: updatedTenant.logo,
        logo: updatedTenant.logo
      };

      // Try with owner field, fallback without if column is missing
      let { error } = await supabase.from('tenants').update({
        ...basePayload,
        owner: updatedTenant.owner
      }).eq('id', updatedTenant.id);

      if (error && (error.message.includes("'owner'") || error.code === 'PGRST204')) {
        const retry = await supabase.from('tenants').update(basePayload).eq('id', updatedTenant.id);
        error = retry.error;
      }

      if (error) throw error;

      await fetchTenants();
      setEditingTenant(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      console.error('Update error:', err);
      alert('Error al actualizar: ' + err.message);
    }
  };

  const handleUpdatePlan = (updatedPlan: SaasPlan) => {
    const newPlans = saasPlans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
    setSaasPlans(newPlans);
    localStorage.setItem('myturn_saas_plans', JSON.stringify(newPlans));
    setEditingPlan(null);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const filteredTenants = tenants.filter(t => (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  const handleDownloadCSV = () => {
    const headers = ['Nombre', 'Dueño', 'Plan', 'Expiración', 'Ingresos'];
    const rows = filteredTenants.map(t => [
      `"${t.name}"`,
      `"${t.owner}"`,
      `"${t.plan}"`,
      `"${t.expiryDate}"`,
      t.revenue
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_cuentas_myturn_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };


  return (
    <div className="superadmin-layout animate-fade-in">
      {/* Sidebar Navigation */}
      <aside className="superadmin-sidebar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            background: 'var(--primary)', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'black'
          }}>
            <Shield size={24} />
          </div>
          <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>SUPERADMIN</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { id: 'overview', label: 'Resumen Global', icon: LayoutDashboard },
            { id: 'businesses', label: 'Gestión Negocios', icon: Building2 },
            { id: 'plans', label: 'Planes SaaS', icon: CreditCard },
            { id: 'ads', label: 'Publicidad & Promos', icon: Megaphone },
            { id: 'tickets', label: 'Soporte Técnico', icon: LifeBuoy },
            { id: 'settings', label: 'Configuración', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: activeTab === item.id ? 'rgba(245,158,11,0.1)' : 'transparent',
                color: activeTab === item.id ? 'var(--primary)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: activeTab === item.id ? 700 : 500,
                transition: 'all 0.2s'
              }}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}

          {onSwitchToBarber && (
            <button
              onClick={() => {
                const targetId = userTenantId || (tenants.length > 0 ? tenants[0].id : null);
                if (targetId) {
                  localStorage.setItem('myturn_superadmin_selected_tenant', targetId);
                  const matchingTenant = tenants.find(t => t.id === targetId);
                  if (matchingTenant?.slug) {
                    localStorage.setItem('myturn_active_business_slug', matchingTenant.slug);
                  }
                }
                onSwitchToBarber(targetId || undefined);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                marginTop: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59,130,246,0.1)',
                color: '#3b82f6',
                border: '1px solid rgba(59,130,246,0.2)',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: 700,
                transition: 'all 0.2s'
              }}
              title="Abrir el panel de gestión de barbería"
            >
              <Scissors size={20} />
              Ir a Panel Negocio
            </button>
          )}
        </nav>

        <div style={{ marginTop: 'auto', padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>SESIÓN SEGURA</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin Principal</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="superadmin-main">
        {loading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(9,9,11,0.8)', 
            zIndex: 50, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
          </div>
        )}
        
        {activeTab === 'overview' && (
          <div className="animate-fade-in">
            <header style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Impacto Global SaaS</h1>
              <p style={{ color: 'var(--text-muted)' }}>Bienvenido, aquí está el rendimiento de MyTurn hoy.</p>
            </header>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                  {[
                    { label: 'Ingresos Totales', val: `$${GLOBAL_STATS.totalRevenue.toLocaleString()}`, trend: '+12.5%', icon: CreditCard, color: 'var(--primary)' },
                    { label: 'Negocios Activos', val: GLOBAL_STATS.activeBusinesses, trend: '+4 esta semana', icon: Building2, color: '#3b82f6' },
                    { label: 'Usuarios Finales', val: GLOBAL_STATS.totalUsers.toLocaleString(), trend: '+150 hoy', icon: Users, color: '#10b981' },
                    { label: 'Cuentas en Prórroga', val: '12', trend: 'Revisión', icon: ShieldAlert, color: '#f43f5e' },
                  ].map((stat, i) => (
                <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ padding: '0.5rem', background: `rgba(255,255,255,0.05)`, borderRadius: '10px', color: stat.color }}>
                      <stat.icon size={24} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>{stat.trend}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, margin: 0 }}>{stat.label}</p>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>{stat.val}</h3>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1.5rem' }}>Actividad de Crecimiento (Mock)</h3>
                <div style={{ height: '240px', background: 'var(--background)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '1rem' }}>
                  {[40, 60, 45, 80, 55, 90, 75].map((h, i) => (
                    <div key={i} style={{ width: '40px', height: `${h}%`, background: 'var(--primary)', borderRadius: '6px 6px 0 0', opacity: 0.3 + (i * 0.1) }} />
                  ))}
                </div>
              </div>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem' }}>Alertas del Sistema</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, margin: 0 }}>3 Negocios Pendientes</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Requieren revisión manual.</p>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, margin: 0 }}>Actualización de Términos</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Programada para este domingo.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'businesses' && (
          <div className="animate-fade-in">
            <header className="no-print" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '1rem', 
              marginBottom: '1.5rem' 
            }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>Gestión de Negocios</h1>
                <p style={{ color: 'var(--text-muted)' }}>Supervisa y modera las cuentas profesionales.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar negocio..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: '1px solid var(--border)', width: '250px' }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
                  <button className="btn btn-outline" onClick={handleDownloadCSV} title="Descargar Excel/CSV" style={{ padding: '0.75rem' }}>
                    <Download size={18} />
                  </button>
                  <button className="btn btn-outline" onClick={handlePrint} title="Imprimir Listado" style={{ padding: '0.75rem' }}>
                    <Printer size={18} />
                  </button>
                </div>

                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreateTenantModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Building2 size={18} /> + Crear Negocio / Propuesta
                </button>

                <button 
                  className="btn btn-outline"
                  disabled={loading}
                  onClick={async () => {
                    try {
                      setInviteError(null);
                      setLastInviteCode(null);
                      const code = `MYTURN-${Math.random().toString(36).substring(7).toUpperCase()}-2026`;
                      const slug = `invite-${code.toLowerCase()}`;
                      
                      const invitePayload: any = {
                        name: `Invitación: ${code}`,
                        slug: slug,
                        industry: 'SaaS',
                        plan_id: 'Suspended',
                        professional_name: 'Pendiente',
                        logo: 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=100&h=100&fit=crop'
                      };
                      let { data, error } = await supabase.from('tenants').insert({
                        ...invitePayload,
                        owner: 'Pendiente'
                      }).select().single();

                      if (error && (error.message?.includes("'owner'") || error.code === 'PGRST204')) {
                        const retry = await supabase.from('tenants').insert(invitePayload).select().single();
                        data = retry.data;
                        error = retry.error;
                      }
                      
                      if (error) {
                        setInviteError(error.message);
                        console.error('Database Error:', error);
                        return;
                      }

                      if (data) {
                        setLastInviteCode(code);
                        try {
                           await navigator.clipboard.writeText(code);
                        } catch (clipErr) {
                           console.warn('Clipboard failed');
                        }
                        setShowSuccessToast(true);
                        setTimeout(() => setShowSuccessToast(false), 3000);
                        fetchTenants();
                      }
                    } catch (err: any) {
                      setInviteError(err.message || 'Error desconocido');
                      console.error('Runtime error:', err);
                    }
                  }}
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Invitación Rápida
                </button>
              </div>
            </header>

            {/* Print Header (Visible only when printing) */}
            <div className="print-only" style={{ display: 'none', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <img src="/logo-minurno-5.png" alt="Logo" style={{ height: '40px' }} />
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'black' }}>Reporte de Cuentas Vinculadas - MyTurn SaaS</h1>
              </div>
              <p style={{ color: '#666', fontSize: '0.875rem' }}>Fecha del reporte: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="saas-table-card">
              {inviteError && (
                <div className="animate-fade-in no-print" style={{ margin: '1rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldAlert size={18} /> Error de Sistema: {inviteError}
                </div>
              )}
              {lastInviteCode && (
                <div className="animate-fade-in no-print" style={{ margin: '1rem', padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--success)', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={18} /> ¡Invitación Generada!: <code style={{ background: 'var(--surface)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', marginLeft: '0.5rem' }}>{lastInviteCode}</code>
                </div>
              )}

              <div className="saas-table-scroll">
                <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'left', background: 'transparent' }}>
                  <thead style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', minWidth: '220px', whiteSpace: 'nowrap' }}>NEGOCIO</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', minWidth: '130px', whiteSpace: 'nowrap' }}>INDUSTRIA</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', minWidth: '150px', whiteSpace: 'nowrap' }}>PLAN / VIGENCIA</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', minWidth: '110px', whiteSpace: 'nowrap' }}>ESTADO</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', minWidth: '100px', whiteSpace: 'nowrap' }}>RECAUDO</th>
                      <th style={{ 
                        padding: '1rem 1.25rem', 
                        fontSize: '0.75rem', 
                        fontWeight: 800, 
                        color: 'var(--text-muted)', 
                        minWidth: '280px', 
                        whiteSpace: 'nowrap', 
                        textAlign: 'right', 
                        position: 'sticky', 
                        right: 0, 
                        background: 'var(--surface-hover)', 
                        zIndex: 3, 
                        boxShadow: '-6px 0 12px rgba(0,0,0,0.2)' 
                      }} className="no-print">ACCIONES</th>
                    </tr>
                  </thead>
                <tbody>
                  {filteredTenants.map(t => {
                    const isInvite = t.name && t.name.startsWith('Invitación:');
                    const inviteCode = isInvite ? t.name.replace('Invitación:', '').trim() : '';

                    return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {isInvite ? (
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <Key size={20} />
                            </div>
                          ) : (
                            <img src={t.logo || 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=100&h=100&fit=crop'} style={{ width: '40px', height: '40px', borderRadius: '10px' }} alt="" />
                          )}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <p style={{ fontWeight: 800, fontSize: '0.875rem', margin: 0 }}>{isInvite ? 'Invitación' : (t.name || 'Sin Nombre')}</p>
                              {t.isFeatured && (
                                <span style={{ 
                                  fontSize: '0.625rem', 
                                  fontWeight: 900, 
                                  background: 'rgba(245,158,11,0.2)', 
                                  color: '#f59e0b', 
                                  padding: '0.1rem 0.4rem', 
                                  borderRadius: '999px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.2rem'
                                }}>
                                  <Star size={10} fill="#f59e0b" /> {t.featuredBadge || 'TOP'}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text)', fontWeight: 600, margin: 0 }}>{isInvite ? inviteCode : (t.owner || 'Negocio Registrado')}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{isInvite ? 'Esperando Registro' : t.industry}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {isInvite ? (
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Pendiente de uso</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.plan === 'Multi-Negocios' ? 'var(--primary)' : 'var(--text-muted)' }} />
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{t.plan}</span>
                            </div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={10} /> Exp: {t.expiryDate}
                            </p>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {isInvite ? (
                          <span className="badge badge-warning">ESPERANDO</span>
                        ) : (() => {
                          if (t.status === 'suspended') return <span className="badge badge-danger">SUSPENDIDO</span>;
                          const today = new Date('2026-03-28');
                          const expiry = new Date(t.expiryDate);
                          const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          
                          if (diff <= -5) return <span className="badge badge-danger">SUSPENDIDO</span>;
                          if (diff <= 0) return <span className="badge badge-warning">PRÓRROGA</span>;
                          return <span className="badge badge-success">ACTIVO</span>;
                        })()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>${isInvite ? '0' : t.revenue.toLocaleString()}</span>
                      </td>
                      <td style={{ 
                        padding: '1rem 1.25rem', 
                        position: 'sticky', 
                        right: 0, 
                        background: 'var(--surface)', 
                        zIndex: 2, 
                        boxShadow: '-6px 0 12px rgba(0,0,0,0.2)' 
                      }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'nowrap' }}>
                          {isInvite ? (
                            <button className="btn btn-outline" style={{ padding: '0.4rem', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }} onClick={() => { navigator.clipboard.writeText(inviteCode); alert('Copiado'); }} title="Copiar Código">
                              <Copy size={16} />
                            </button>
                          ) : (
                            <>
                              <button 
                                className="btn btn-outline" 
                                onClick={() => handleOpenPaymentModal(t)}
                                style={{ 
                                  padding: '0.4rem', 
                                  border: t.id === '1' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                  background: t.id === '1' ? 'rgba(245,158,11,0.1)' : 'transparent'
                                }} 
                                title="Registrar Pago Manual"
                              >
                                <CreditCard size={14} color={t.id === '1' ? 'var(--primary)' : 'currentColor'} />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ 
                                  padding: '0.4rem', 
                                  color: t.isFeatured ? '#f59e0b' : 'var(--text-muted)',
                                  borderColor: t.isFeatured ? 'rgba(245,158,11,0.5)' : 'var(--border)',
                                  background: t.isFeatured ? 'rgba(245,158,11,0.1)' : 'transparent'
                                }} 
                                onClick={() => handleToggleFeatured(t.id, Boolean(t.isFeatured))}
                                title={t.isFeatured ? "Quitar de destacados en la app" : "Destacar negocio en App (Patrocinado)"}
                              >
                                <Star size={14} fill={t.isFeatured ? '#f59e0b' : 'none'} />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ 
                                  padding: '0.4rem', 
                                  color: '#3b82f6', 
                                  borderColor: 'rgba(59,130,246,0.4)',
                                  background: 'rgba(59,130,246,0.08)'
                                }} 
                                onClick={() => setClaimModalTenant(t)}
                                title="Generar Enlace de Vinculación / Traspaso al Dueño"
                              >
                                <Link2 size={14} />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ 
                                  padding: '0.4rem', 
                                  color: '#8b5cf6', 
                                  borderColor: 'rgba(139,92,246,0.4)',
                                  background: 'rgba(139,92,246,0.08)'
                                }} 
                                onClick={() => setQrPosterTenant(t)}
                                title="Generar e Imprimir Cartel con Código QR"
                              >
                                <QrCode size={14} />
                              </button>
                            </>
                          )}
                          <button 
                            className="btn btn-outline" 
                            style={{ 
                              padding: '0.4rem', 
                              color: '#10b981', 
                              borderColor: 'rgba(16,185,129,0.4)', 
                              background: 'rgba(16,185,129,0.08)' 
                            }} 
                            onClick={() => handleEnterTenant(t)}
                            title="Entrar al Panel Operativo de este Negocio"
                          >
                            <Scissors size={14} />
                          </button>
                          <button 
                            className="btn btn-outline" 
                            style={{ 
                              padding: '0.4rem', 
                              color: '#6366f1', 
                              borderColor: 'rgba(99,102,241,0.4)', 
                              background: 'rgba(99,102,241,0.08)' 
                            }} 
                            onClick={() => window.open(`/${t.slug || t.id}`, '_blank')}
                            title="Ver Portal Web Público del Negocio"
                          >
                            <ExternalLink size={14} />
                          </button>
                          {!isInvite && (
                            <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => setEditingTenant(t)} title="Configuración Avanzada">
                              <Settings size={14} />
                            </button>
                          )}
                          <button className="btn btn-outline" style={{ padding: '0.4rem', color: '#ef4444' }} onClick={() => setDeletingTenant(t)} title="Eliminar / Auditoría">
                            <AlertCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="animate-fade-in">
            <header style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Planes y Suscripciones SaaS</h1>
              <p style={{ color: 'var(--text-muted)' }}>Configura los niveles de servicio y precios para profesionales.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
              {saasPlans.map((plan, i) => (
                <div key={i} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: plan.name.includes('Professional') ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                  {plan.name.includes('Professional') && (
                    <span style={{ background: 'var(--primary)', color: 'black', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 900, alignSelf: 'flex-start' }}>MÁS POPULAR</span>
                  )}
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>{plan.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 900 }}>{plan.price}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>/ mensual</span>
                    </div>
                    {plan.priceAnnual !== '$0' && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 800, marginTop: '-0.2rem' }}>
                        o {plan.priceAnnual} / año
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {plan.features.map((f, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <CheckCircle size={14} color="var(--success)" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setEditingPlan(plan)}
                    className={`btn ${plan.name.includes('Professional') ? 'btn-primary' : 'btn-outline'}`} 
                    style={{ width: '100%', marginTop: 'auto' }}
                  >
                    Editar Beneficios
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Support Tickets View */}
        {activeTab === 'tickets' && (
          <div className="animate-fade-in">
            <header style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Centro de Soporte MyTurn</h1>
              <p style={{ color: 'var(--text-muted)' }}>Gestiona los reportes y averías de clientes Professional y Enterprise.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
              {[
                { label: 'Tickets Abiertos', val: supportTickets.filter(t => t.status === 'open').length, color: '#f59e0b' },
                { label: 'En Proceso', val: supportTickets.filter(t => t.status === 'in_progress').length, color: '#3b82f6' },
                { label: 'Resueltos', val: supportTickets.filter(t => t.status === 'resolved').length, color: '#10b981' },
                { label: 'Total Histórico', val: supportTickets.length, color: 'var(--text-muted)' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ padding: '1.5rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{s.label}</p>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color }}>{s.val}</h3>
                </div>
              ))}
            </div>

            <div className="saas-table-card">
              <div className="saas-table-scroll">
                <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>NEGOCIO / PLAN</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>CATEGORÍA</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>MENSAJE</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>FECHA</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ESTADO</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {supportTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay tickets de soporte registrados aún.
                      </td>
                    </tr>
                  ) : supportTickets.map(ticket => (
                    <tr key={ticket.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <p style={{ fontWeight: 800, fontSize: '0.875rem', margin: 0 }}>{ticket.tenant_name}</p>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 900, 
                          padding: '0.1rem 0.4rem', 
                          borderRadius: '4px', 
                          background: ticket.account_type === 'Enterprise' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)',
                          color: ticket.account_type === 'Enterprise' ? 'var(--primary)' : '#3b82f6'
                        }}>
                          {ticket.account_type ? ticket.account_type.toUpperCase() : 'FREE'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          color: ticket.category === 'Avería' ? '#ef4444' : ticket.category === 'Sugerencia' ? '#10b981' : 'inherit'
                        }}>
                          {ticket.category}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', maxWidth: '300px' }}>
                        <p style={{ fontSize: '0.8125rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ticket.message}>
                          {ticket.message}
                        </p>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(ticket.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 900, 
                          padding: '0.2rem 0.6rem', 
                          borderRadius: 'var(--radius-full)',
                          background: 
                            ticket.status === 'open' ? 'rgba(245,158,11,0.1)' : 
                            ticket.status === 'in_progress' ? 'rgba(59,130,246,0.1)' : 
                            ticket.status === 'resolved' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                          color: 
                            ticket.status === 'open' ? '#f59e0b' : 
                            ticket.status === 'in_progress' ? '#3b82f6' : 
                            ticket.status === 'resolved' ? '#10b981' : 'var(--text-muted)',
                          border: `1px solid ${
                            ticket.status === 'open' ? '#f59e0b' : 
                            ticket.status === 'in_progress' ? '#3b82f6' : 
                            ticket.status === 'resolved' ? '#10b981' : 'var(--border)'
                          }`
                        }}>
                          {ticket.status === 'open' ? 'ABIERTO' : 
                           ticket.status === 'in_progress' ? 'EN PROCESO' : 
                           ticket.status === 'resolved' ? 'RESUELTO' : 'CERRADO'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <select 
                          value={ticket.status}
                          onChange={(e) => handleUpdateTicketStatus(ticket.id, e.target.value)}
                          style={{ padding: '0.25rem 0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text)', cursor: 'pointer' }}
                        >
                          <option value="open">Abierto</option>
                          <option value="in_progress">En Proceso</option>
                          <option value="resolved">Resuelto</option>
                          <option value="closed">Cerrado</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="animate-fade-in">
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Megaphone size={28} color="var(--primary)" /> Publicidad & Cintillos Patrocinados
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>
                  Monetiza MyTurn gestionando cintillos de anuncios globales y posicionando negocios patrocinados en el directorio.
                </p>
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => setShowNewAdModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={18} />
                Nuevo Anuncio / Cintillo
              </button>
            </header>

            {/* Platform Ads Section */}
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Cintillos y Banners de Plataforma</h2>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {platformAds.length} anuncios registrados
                </span>
              </div>

              {adsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--primary)' }} />
                </div>
              ) : platformAds.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <Megaphone size={40} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>No hay anuncios activos</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    Crea un cintillo para promocionar eventos, ofertas de socios locales o funciones de MyTurn.
                  </p>
                  <button className="btn btn-primary" onClick={() => setShowNewAdModal(true)}>
                    <Plus size={16} /> Crear Primer Anuncio
                  </button>
                </div>
              ) : (
                <div className="saas-table-card">
                  <div className="saas-table-scroll">
                    <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ANUNCIO</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>TIPO & BADGE</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>PRIORIDAD</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ENLACE / DESTINO</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ESTADO</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformAds.map(ad => (
                        <tr key={ad.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {ad.image_url ? (
                                <img src={ad.image_url} alt="" style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Megaphone size={20} />
                                </div>
                              )}
                              <div>
                                <p style={{ fontWeight: 800, fontSize: '0.875rem', margin: 0 }}>{ad.title}</p>
                                {ad.subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{ad.subtitle}</p>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{ad.type}</span>
                              {ad.badge && (
                                <span style={{ fontSize: '0.625rem', fontWeight: 800, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', padding: '0.1rem 0.4rem', borderRadius: '4px', width: 'fit-content' }}>
                                  {ad.badge}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{ad.priority}</span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <a 
                              href={ad.target_url || '#'} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ fontSize: '0.8125rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                            >
                              <ExternalLink size={12} /> {ad.target_url ? (ad.target_url.length > 25 ? ad.target_url.slice(0, 25) + '...' : ad.target_url) : 'Sin enlace'}
                            </a>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <button
                              onClick={() => handleToggleAdStatus(ad.id, ad.is_active)}
                              style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                border: 'none',
                                cursor: 'pointer',
                                background: ad.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                                color: ad.is_active ? '#10b981' : 'var(--text-muted)'
                              }}
                            >
                              {ad.is_active ? '● ACTIVO' : 'PAUSADO'}
                            </button>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <button
                                className="btn btn-outline"
                                onClick={() => handleOpenEditAd(ad)}
                                style={{ padding: '0.4rem', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.06)' }}
                                title="Editar Anuncio / Banner"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                className="btn btn-outline"
                                onClick={() => handleDeleteAd(ad.id)}
                                style={{ padding: '0.4rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                                title="Eliminar Anuncio"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>

            {/* Sponsored Businesses Positioning Directory Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Star size={20} fill="#f59e0b" color="#f59e0b" /> Negocios con Posicionamiento Destacado (⭐ VIP)
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                    Los negocios destacados aparecen en el carrusel principal y en el tope del directorio público para los clientes.
                  </p>
                </div>
                <span className="badge badge-warning">
                  {tenants.filter(t => t.isFeatured).length} Destacados
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {tenants.map(t => {
                  const isFeatured = Boolean(t.isFeatured);
                  return (
                    <div 
                      key={t.id} 
                      className="card" 
                      style={{ 
                        padding: '1.25rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        border: isFeatured ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                        background: isFeatured ? 'rgba(245,158,11,0.03)' : 'var(--surface)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img 
                          src={t.logo || 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=100&h=100&fit=crop'} 
                          alt="" 
                          style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} 
                        />
                        <div>
                          <p style={{ fontWeight: 800, fontSize: '0.875rem', margin: 0 }}>{t.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{t.industry} • {t.plan}</p>
                        </div>
                      </div>
                      <button
                        className={`btn ${isFeatured ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleToggleFeatured(t.id, isFeatured)}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Star size={14} fill={isFeatured ? '#000' : 'none'} />
                        {isFeatured ? 'Destacado' : 'Destacar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-fade-in">
            <header style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>Configuración Global del Sistema</h1>
              <p style={{ color: 'var(--text-muted)' }}>Ajustes maestros para toda la infraestructura de MyTurn.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Mantenimiento y Alertas</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700, margin: 0 }}>Modo Mantenimiento</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Bloquea el acceso temporalmente a todos los negocios.</p>
                  </div>
                  <input type="checkbox" style={{ width: '20px', height: '20px' }} />
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>BANNER PROMOCIONAL GLOBAL</label>
                  <textarea 
                    placeholder="Escribe el mensaje que verán todos los profesionales..."
                    style={{ width: '100%', minHeight: '100px', padding: '1rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)' }}
                  />
                  <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Lanzar Notificación Global</button>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Seguridad y API</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>CLAVE SECRETA DE PLATAFORMA</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input 
                        type="password" 
                        value="••••••••••••••••" 
                        readOnly
                        style={{ flex: 1, padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }} 
                      />
                      <button className="btn btn-outline"><Copy size={18} /></button>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>CAMBIAR CONTRASEÑA DE ADMINISTRADOR</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input 
                        type="password" 
                        placeholder="Nueva Contraseña"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)' }} 
                      />
                      <input 
                        type="password" 
                        placeholder="Confirmar Nueva Contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)' }} 
                      />
                      <button 
                        className="btn btn-primary" 
                        style={{ width: '100%' }}
                        onClick={async () => {
                          if (!newPassword || newPassword !== confirmPassword) {
                            alert('Las contraseñas no coinciden o están vacías.');
                            return;
                          }
                          const { error } = await supabase.auth.updateUser({ password: newPassword });
                          if (error) {
                            alert('Error al actualizar: ' + error.message);
                          } else {
                            alert('¡Contraseña actualizada con éxito!');
                            setNewPassword('');
                            setConfirmPassword('');
                          }
                        }}
                      >
                        Actualizar Credenciales
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: '8px', border: '1px solid #3b82f6' }}>
                    <p style={{ fontSize: '0.8125rem', color: '#3b82f6', fontWeight: 700, margin: 0 }}>Modo Desarrollador Activo</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Logs de errores y auditoría activados.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Manual Payment Registration Modal */}
      {selectedTenantForPayment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000,
          backdropFilter: 'blur(8px)',
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            <header style={{ textAlign: 'center', position: 'relative' }}>
              <button
                type="button"
                onClick={() => setSelectedTenantForPayment(null)}
                className="btn btn-outline"
                style={{ position: 'absolute', top: 0, right: 0, padding: '0.45rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Cerrar modal"
              >
                <X size={18} />
              </button>
              <div style={{ width: '60px', height: '60px', background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CreditCard size={30} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>Gestión de Cuenta SaaS</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>Configuración para: <span style={{ fontWeight: 800, color: 'var(--text)' }}>{selectedTenantForPayment.name}</span></p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>PLAN ACTUAL</label>
                  <select 
                    value={manualPaymentData.plan}
                    onChange={(e) => {
                      const newPlan = e.target.value as any;
                      const newAmount = newPlan === 'Professional' ? 29.99 : (newPlan === 'Enterprise' ? 99.00 : 0);
                      setManualPaymentData({...manualPaymentData, plan: newPlan, amount: newAmount});
                    }}
                    style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontWeight: 700 }}
                  >
                    <option value="Free">Plan Free</option>
                    <option value="Professional">Plan Professional</option>
                    <option value="Multi-Professional">Plan Multi-Professional</option>
                    <option value="Multi-Negocios">Plan Multi-Negocios</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ESTADO DE CUENTA</label>
                  <select 
                    value={manualPaymentData.status}
                    onChange={(e) => setManualPaymentData({...manualPaymentData, status: e.target.value as any})}
                    style={{ 
                      padding: '0.75rem', 
                      background: manualPaymentData.status === 'suspended' ? 'rgba(239,68,68,0.1)' : 'var(--background)', 
                      border: manualPaymentData.status === 'suspended' ? '1px solid #ef4444' : '1px solid var(--border)', 
                      borderRadius: 'var(--radius-sm)', 
                      color: manualPaymentData.status === 'suspended' ? '#ef4444' : 'var(--text)',
                      fontWeight: 700
                    }}
                  >
                    <option value="active">ACTIVA</option>
                    <option value="suspended">SUSPENDIDA / CANCELADA</option>
                  </select>
                </div>
              </div>

              <div style={{ padding: '1.25rem', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', margin: 0 }}>REGISTRO DE PAGO (OPCIONAL)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>MONTO</label>
                    <input 
                      type="number" 
                      value={manualPaymentData.amount}
                      onChange={(e) => setManualPaymentData({...manualPaymentData, amount: parseFloat(e.target.value)})}
                      style={{ padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>MÉTODO</label>
                    <select 
                      value={manualPaymentData.method}
                      onChange={(e) => setManualPaymentData({...manualPaymentData, method: e.target.value})}
                      style={{ padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', fontSize: '0.875rem' }}
                    >
                      <option value="Transferencia">Transferencia</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Depósito">Depósito</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>VENCIMIENTO DEL SERVICIO</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    value={manualPaymentData.expiryDate}
                    onChange={(e) => setManualPaymentData({...manualPaymentData, expiryDate: e.target.value})}
                    style={{ width: '100%', padding: '0.875rem', background: 'var(--background)', border: manualPaymentData.status === 'suspended' ? '1px solid var(--border)' : '2.5px solid var(--primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontWeight: 800, fontSize: '1rem', opacity: manualPaymentData.status === 'suspended' ? 0.5 : 1 }}
                    disabled={manualPaymentData.status === 'suspended'}
                  />
                  {!manualPaymentData.status.includes('suspended') && <ShieldAlert size={18} color="var(--primary)" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {manualPaymentData.status === 'suspended' 
                    ? 'La fecha de vencimiento se ignora si la cuenta está suspendida.'
                    : 'Esta fecha activa el bloqueo automático tras el periodo de gracia.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={() => setSelectedTenantForPayment(null)} className="btn btn-outline" style={{ flex: 1, padding: '1rem' }}>Cancelar</button>
              <button onClick={handleSaveManualPayment} className="btn btn-primary" style={{ flex: 2, padding: '1rem' }}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings Modal (Gear) */}
      {editingTenant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000,
          backdropFilter: 'blur(8px)',
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div className="card animate-scale-in" style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            overflow: 'hidden',
            padding: 0
          }}>
            {/* Header: Always visible with Title and Close X */}
            <div style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface)',
              flexShrink: 0
            }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={20} color="var(--primary)" /> Configuración de Negocio (Maestra)
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0 0' }}>
                  Ajustes principales, identidad de marca y accesos de seguridad
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingTenant(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="btn btn-outline"
                style={{ padding: '0.45rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>NOMBRE DEL ESTABLECIMIENTO</label>
                <input 
                  type="text" 
                  value={editingTenant.name}
                  onChange={(e) => setEditingTenant({...editingTenant, name: e.target.value})}
                  style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>PROPIETARIO RESPONSABLE</label>
                <input 
                  type="text" 
                  value={editingTenant.owner}
                  onChange={(e) => setEditingTenant({...editingTenant, owner: e.target.value})}
                  style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                  LOGO DEL NEGOCIO (SUBIDA DIRECTA CON COMPRESIÓN)
                </label>
                
                <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <img
                    src={editingTenant.logo || 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=200&h=200&fit=crop'}
                    alt="Logo Preview"
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      objectFit: 'cover',
                      border: '2px solid var(--primary)',
                      background: '#0f172a',
                      flexShrink: 0
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=200&h=200&fit=crop';
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <label 
                        className={`btn ${isUploadingEditLogo ? 'btn-outline' : 'btn-primary'}`} 
                        style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.4rem 0.8rem', 
                          cursor: isUploadingEditLogo ? 'wait' : 'pointer', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.4rem' 
                        }}
                      >
                        {isUploadingEditLogo ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Comprimiendo y Subiendo...
                          </>
                        ) : (
                          <>
                            <Upload size={14} />
                            Subir Archivo de Logo
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingEditLogo}
                          onChange={handleEditLogoUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Auto WebP (Máx 400x400)
                      </span>
                    </div>

                    {editLogoCompressionStats && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                        <CheckCircle2 size={13} />
                        Optimizado: {editLogoCompressionStats.originalSize} ➔ {editLogoCompressionStats.compressedSize} ({editLogoCompressionStats.savingsPercent}% menos peso)
                      </div>
                    )}

                    <input 
                      type="url" 
                      placeholder="o pega URL de imagen..."
                      value={editingTenant.logo}
                      onChange={(e) => setEditingTenant({...editingTenant, logo: e.target.value})}
                      style={{ padding: '0.4rem 0.6rem', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.75rem', width: '100%' }}
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>SECTOR INDUSTRIAL</label>
                <select 
                  value={editingTenant.industry}
                  onChange={(e) => setEditingTenant({...editingTenant, industry: e.target.value as any})}
                  style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                >
                  <option value="Barbería">Barbería</option>
                  <option value="Salón">Salón de Belleza</option>
                  <option value="Salud">Consultorio Médico</option>
                  <option value="Taller">Taller Mecánico</option>
                  <option value="Otro">Otro Negocio</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)' }}>
                  <ShieldAlert size={20} />
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800, margin: 0 }}>Seguridad y Acceso</h4>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
                  Por seguridad, las contraseñas están encriptadas por Supabase. No se pueden cambiar directamente desde aquí, pero puedes enviar un enlace de recuperación al dueño.
                </p>
                <button 
                  type="button"
                  onClick={async () => {
                    if (!editingTenant.owner) return alert('No hay un correo de usuario vinculado.');
                    setLoading(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(editingTenant.owner, {
                      redirectTo: `${window.location.origin}/reset-password`
                    });
                    setLoading(false);
                    if (error) alert('Error: ' + error.message);
                    else alert('¡Enlace de recuperación enviado con éxito a: ' + editingTenant.owner);
                  }}
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.6rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                >
                  📩 Enviar Enlace de Recuperación
                </button>
              </div>
            </div>

            {/* Footer: Always visible with Cancel and Save buttons */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface)',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => {
                  setEditingTenant(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="btn btn-outline"
                style={{ minWidth: '100px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateTenant(editingTenant);
                }}
                className="btn btn-primary"
                style={{ minWidth: '160px', fontWeight: 800 }}
              >
                Guardar Datos Básicos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Critical Actions Modal (AlertCircle) */}
      {deletingTenant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Eliminar Negocio Permanente</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Estás a punto de **BORRAR DEFINITIVAMENTE** a <span style={{ fontWeight: 800, color: 'var(--text)' }}>{deletingTenant.name}</span>.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  onClick={() => handleDeleteTenant()}

                  className="btn" 
                  style={{ width: '100%', padding: '1rem', background: '#ef4444', color: 'white', border: 'none', fontWeight: 800 }}
                >
                  BORRAR DEFINITIVAMENTE
                </button>
                <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
                    ADVERTENCIA: Esta acción es irreversible. Se eliminarán todos los servicios, profesionales y citas asociados.
                </div>
            </div>

            <button onClick={() => setDeletingTenant(null)} className="btn btn-outline" style={{ width: '100%' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'var(--success)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 10px 25px rgba(16,185,129,0.3)',
          animation: 'fade-in-up 0.3s ease-out',
          zIndex: 5000
        }}>
          <CheckCircle2 size={20} />
          <span style={{ fontWeight: 700 }}>Acción realizada con éxito</span>
        </div>
      )}

      {/* Edit SaaS Plan Modal */}
      {editingPlan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Editar {editingPlan.name}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>NOMBRE DEL PLAN</label>
                <input 
                  type="text" 
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                  style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>PRECIO MENSUAL</label>
                  <input 
                    type="text" 
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({...editingPlan, price: e.target.value})}
                    style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>PRECIO ANUAL</label>
                  <input 
                    type="text" 
                    value={editingPlan.priceAnnual}
                    onChange={(e) => setEditingPlan({...editingPlan, priceAnnual: e.target.value})}
                    style={{ padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  CARACTERÍSTICAS / BENEFICIOS
                  <button 
                    onClick={() => setEditingPlan({...editingPlan, features: [...editingPlan.features, 'Nueva Característica']})}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                  >
                    <Plus size={12} /> Añadir
                  </button>
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {editingPlan.features.map((feature, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...editingPlan.features];
                          newFeatures[idx] = e.target.value;
                          setEditingPlan({...editingPlan, features: newFeatures});
                        }}
                        style={{ flex: 1, padding: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.875rem' }}
                      />
                      <button 
                        onClick={() => {
                          const newFeatures = editingPlan.features.filter((_, i) => i !== idx);
                          setEditingPlan({...editingPlan, features: newFeatures});
                        }}
                        style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', borderRadius: 'var(--radius-sm)', padding: '0 0.5rem', cursor: 'pointer' }}
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>PERMISOS Y CAPACIDADES (NÚCLEO)</label>
                
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Cuentas Claras y Finanzas Avanzadas</span>
                  <input type="checkbox" checked={editingPlan.capabilities.advancedFinance} onChange={(e) => setEditingPlan({...editingPlan, capabilities: {...editingPlan.capabilities, advancedFinance: e.target.checked}})} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Múltiples Profesionales (Personal / Equipo)</span>
                  <input type="checkbox" checked={editingPlan.capabilities.multipleStaff} onChange={(e) => setEditingPlan({...editingPlan, capabilities: {...editingPlan.capabilities, multipleStaff: e.target.checked}})} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                </label>

                 <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Marca, Logo y Directorio</span>
                  <input type="checkbox" checked={editingPlan.capabilities.whiteLabel} onChange={(e) => setEditingPlan({...editingPlan, capabilities: {...editingPlan.capabilities, whiteLabel: e.target.checked}})} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>LÍMITE DE CITAS / MES</label>
                  <input 
                    type="text" 
                    value={editingPlan.capabilities.maxAppointments}
                    onChange={(e) => {
                      const val = e.target.value === 'Unlimited' ? 'Unlimited' : (isNaN(Number(e.target.value)) ? editingPlan.capabilities.maxAppointments : Number(e.target.value));
                      setEditingPlan({...editingPlan, capabilities: {...editingPlan.capabilities, maxAppointments: val}});
                    }}
                    style={{ padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>LÍMITE DE PROFESIONALES</label>
                  <input 
                    type="text" 
                    value={editingPlan.capabilities.maxStaff}
                    onChange={(e) => {
                      const val = e.target.value === 'Unlimited' ? 'Unlimited' : (isNaN(Number(e.target.value)) ? editingPlan.capabilities.maxStaff : Number(e.target.value));
                      setEditingPlan({...editingPlan, capabilities: {...editingPlan.capabilities, maxStaff: val}});
                    }}
                    style={{ padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={() => setEditingPlan(null)} 
                className="btn btn-outline" 
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleUpdatePlan(editingPlan)} 
                className="btn btn-primary" 
                style={{ flex: 1 }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Platform Ad Modal */}
      {showNewAdModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000,
          backdropFilter: 'blur(8px)',
          padding: '1rem'
        }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <div style={{ width: '44px', height: '44px', background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {editingAd ? <Edit size={24} /> : <Megaphone size={24} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>
                    {editingAd ? 'Editar Anuncio o Cintillo' : 'Crear Anuncio o Cintillo'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>
                    {editingAd ? 'Modifica los textos, enlaces, imágenes o prioridad del anuncio.' : 'Se mostrará a clientes en la app y salas de espera.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewAdModal(false);
                  setEditingAd(null);
                }}
                className="btn btn-outline"
                style={{ padding: '0.45rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Cerrar modal"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSubmitAd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>TIPO DE ANUNCIO</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: 'cintillo', label: 'Cintillo Superior' },
                    { id: 'banner', label: 'Banner Tarjeta' },
                    { id: 'popup', label: 'Alerta / Modal' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewAd({ ...newAd, type: t.id as any })}
                      style={{
                        padding: '0.6rem 0.5rem',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        border: newAd.type === t.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: newAd.type === t.id ? 'rgba(245,158,11,0.1)' : 'var(--surface)',
                        color: newAd.type === t.id ? 'var(--primary)' : 'var(--text)',
                        cursor: 'pointer'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>TÍTULO DEL ANUNCIO *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 🔥 20% OFF en Café Central con tu turno MyTurn"
                  value={newAd.title}
                  onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>SUBTÍTULO / DETALLE (OPCIONAL)</label>
                <input
                  type="text"
                  placeholder="Ej: Muestra tu ticket activo al pagar para canjear la promo"
                  value={newAd.subtitle}
                  onChange={(e) => setNewAd({ ...newAd, subtitle: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>BADGE / ETIQUETA</label>
                  <input
                    type="text"
                    placeholder="PROMO, SPONSOR, NUEVO..."
                    value={newAd.badge}
                    onChange={(e) => setNewAd({ ...newAd, badge: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>PRIORIDAD (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newAd.priority}
                    onChange={(e) => setNewAd({ ...newAd, priority: Number(e.target.value) || 10 })}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>ENLACE DE DESTINO / WHATSAPP</label>
                <input
                  type="url"
                  placeholder="https://... o https://wa.me/..."
                  value={newAd.target_url}
                  onChange={(e) => setNewAd({ ...newAd, target_url: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>URL IMAGEN / BANNER (OPCIONAL)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newAd.image_url}
                  onChange={(e) => setNewAd({ ...newAd, image_url: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                />
              </div>

              {/* Live Preview */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  VISTA PREVIA EN VIVO
                </label>
                {newAd.type === 'cintillo' && (
                  <div style={{
                    padding: '0.625rem 0.875rem',
                    background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
                    borderRadius: '10px',
                    border: '1px solid rgba(129, 140, 248, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                  }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                      color: '#ffffff',
                      letterSpacing: '0.05em'
                    }}>
                      {newAd.badge || 'PROMO'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f8fafc' }}>
                        {newAd.title || 'Título del anuncio aquí...'}
                      </span>
                      {newAd.subtitle && (
                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1', marginLeft: '0.5rem' }}>
                          — {newAd.subtitle}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24', flexShrink: 0 }}>
                      Ver más ↗
                    </span>
                  </div>
                )}

                {newAd.type === 'banner' && (
                  <div className="card-ad-animated" style={{
                    padding: '0.875rem 1rem',
                    background: 'linear-gradient(145deg, #111827 0%, #1e1b4b 60%, #0f172a 100%)',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(245, 158, 11, 0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.625rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.08em', color: '#fbbf24', textTransform: 'uppercase' }}>
                          ✨ ANUNCIO PATROCINADO
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                        color: '#ffffff'
                      }}>
                        {newAd.badge || 'PROMO'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {newAd.image_url ? (
                        <img
                          src={newAd.image_url}
                          alt="Preview"
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '10px',
                            objectFit: 'cover',
                            border: '1.5px solid rgba(255,255,255,0.15)',
                            flexShrink: 0
                          }}
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(99,102,241,0.2))',
                          border: '1px solid rgba(245,158,11,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: '#fbbf24'
                        }}>
                          <Megaphone size={20} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.25 }}>
                          {newAd.title || 'Título llamativo del anuncio...'}
                        </div>
                        {newAd.subtitle && (
                          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.2rem', lineHeight: 1.3 }}>
                            {newAd.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      alignSelf: 'flex-end',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#111827',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      Aprovechar Oferta ↗
                    </div>
                  </div>
                )}

                {newAd.type === 'popup' && (
                  <div style={{
                    padding: '0.875rem 1rem',
                    background: 'var(--surface)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '2px 8px', borderRadius: '999px', background: 'var(--primary)', color: '#000' }}>
                        {newAd.badge || 'MODAL'}
                      </span>
                      <strong style={{ fontSize: '0.875rem' }}>{newAd.title || 'Título de la Alerta/Modal'}</strong>
                    </div>
                    {newAd.subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{newAd.subtitle}</p>}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewAdModal(false);
                    setEditingAd(null);
                  }}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {editingAd ? 'Guardar Cambios' : 'Publicar Anuncio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Proposal / New Business Modal */}
      {showCreateTenantModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000,
          backdropFilter: 'blur(8px)',
          padding: '1rem'
        }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '540px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <div style={{ width: '48px', height: '48px', background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={26} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>Crear Negocio / Propuesta</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>Configura la marca del cliente para enviarle el enlace de traspaso.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTenantModal(false)}
                className="btn btn-outline"
                style={{ padding: '0.45rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Cerrar modal"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleCreateProposalTenant} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>NOMBRE DEL NEGOCIO *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Barbería Don Pedro"
                    value={newProposalTenant.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const autoSlug = name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
                      setNewProposalTenant({ ...newProposalTenant, name, slug: autoSlug });
                    }}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>URL / SLUG AMIGABLE</label>
                  <input
                    type="text"
                    placeholder="ej: barberia-don-pedro"
                    value={newProposalTenant.slug}
                    onChange={(e) => setNewProposalTenant({ ...newProposalTenant, slug: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>RUBRO / INDUSTRIA</label>
                  <select
                    value={newProposalTenant.industry}
                    onChange={(e) => handleSelectIndustryAndPresets(e.target.value as any)}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  >
                    <option value="Barbería">Barbería</option>
                    <option value="Salón">Salón de Belleza / Spa</option>
                    <option value="Salud">Salud / Bienestar</option>
                    <option value="Taller">Taller / Mecánica</option>
                    <option value="Otro">Otro / Servicios</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>PLAN SAAS INICIAL</label>
                  <select
                    value={newProposalTenant.plan_id}
                    onChange={(e) => setNewProposalTenant({ ...newProposalTenant, plan_id: e.target.value as any })}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  >
                    <option value="Free">Free ($0)</option>
                    <option value="Professional">Professional ($29/m)</option>
                    <option value="Multi-Professional">Multi-Professional ($79/m)</option>
                    <option value="Multi-Negocios">Multi-Negocios ($149/m)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  CORREO DEL DUEÑO (VINCULACIÓN AUTOMÁTICA)
                </label>
                <input
                  type="email"
                  placeholder="ej: dueño@gmail.com"
                  value={newProposalTenant.ownerEmail}
                  onChange={(e) => setNewProposalTenant({ ...newProposalTenant, ownerEmail: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem', display: 'block', fontWeight: 600 }}>
                  ✨ Al iniciar sesión o registrarse con este correo, el negocio quedará vinculado automáticamente.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>PROFESIONAL PRINCIPAL</label>
                  <input
                    type="text"
                    placeholder="Ej: Pedro Martínez"
                    value={newProposalTenant.professionalName}
                    onChange={(e) => setNewProposalTenant({ ...newProposalTenant, professionalName: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>WHATSAPP DEL DUEÑO (OPCIONAL)</label>
                  <input
                    type="tel"
                    placeholder="Ej: +34 600 000 000"
                    value={newProposalTenant.ownerPhone}
                    onChange={(e) => setNewProposalTenant({ ...newProposalTenant, ownerPhone: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              {/* LOGO UPLOAD AREA */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.03)',
                border: '1.5px dashed var(--primary)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <Upload size={16} /> LOGO DEL NEGOCIO (SUBIDA DIRECTA)
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Compresión auto WebP (Máx 400x400)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={newProposalTenant.logoUrl || 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=200&h=200&fit=crop'}
                      alt="Logo Preview"
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '14px',
                        objectFit: 'cover',
                        border: '2px solid var(--primary)',
                        background: '#0f172a',
                        flexShrink: 0
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=200&h=200&fit=crop';
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label 
                      className={`btn ${isUploadingLogo ? 'btn-outline' : 'btn-primary'}`} 
                      style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 800,
                        padding: '0.65rem 1.25rem', 
                        cursor: isUploadingLogo ? 'wait' : 'pointer', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
                      }}
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Comprimiendo y subiendo imagen...
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          Seleccionar Archivo de Logo
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingLogo}
                        onChange={handleLogoUpload}
                        style={{ display: 'none' }}
                      />
                    </label>

                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                      ⚡ No carga la base de datos: se comprime en el navegador y se aloja en almacenamiento CDN.
                    </p>
                  </div>
                </div>

                {uploadCompressionStats && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--success)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    fontWeight: 800,
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <CheckCircle2 size={15} />
                    ¡Comprimido con éxito! De {uploadCompressionStats.originalSize} a solo {uploadCompressionStats.compressedSize} (-{uploadCompressionStats.savingsPercent}% de peso).
                  </div>
                )}

                <div style={{ marginTop: '0.25rem' }}>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                    O si prefieres, pega un enlace directo de internet:
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={newProposalTenant.logoUrl}
                    onChange={(e) => setNewProposalTenant({ ...newProposalTenant, logoUrl: e.target.value })}
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.5rem 0.75rem', 
                      background: 'var(--background)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-sm)', 
                      color: 'var(--text)',
                      width: '100%'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>ESLOGAN / DESCRIPCIÓN CORTA</label>
                <input
                  type="text"
                  placeholder="Ej: Tu mejor estilo en cada turno"
                  value={newProposalTenant.slogan}
                  onChange={(e) => setNewProposalTenant({ ...newProposalTenant, slogan: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}
                />
              </div>

              {/* SERVICIOS INICIALES / PROPUESTA */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                      <Scissors size={15} style={{ color: 'var(--primary)' }} /> CATÁLOGO DE SERVICIOS INICIALES ({newProposalTenant.services.length})
                    </label>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Configura los servicios y precios para la propuesta del cliente.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProposalService}
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Plus size={14} /> Agregar Servicio
                  </button>
                </div>

                {/* Preajustes rápidos según tipo de negocio */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--background)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>Cargar preset:</span>
                  {(['Barbería', 'Salón', 'Salud', 'Taller', 'Otro'] as const).map(ind => (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => handleSelectIndustryAndPresets(ind)}
                      style={{
                        fontSize: '0.68rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '999px',
                        border: '1px solid',
                        borderColor: newProposalTenant.industry === ind ? 'var(--primary)' : 'var(--border)',
                        background: newProposalTenant.industry === ind ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                        color: newProposalTenant.industry === ind ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: newProposalTenant.industry === ind ? 700 : 500
                      }}
                    >
                      {ind}
                    </button>
                  ))}
                </div>

                {/* Lista de servicios */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {newProposalTenant.services.map((svc, idx) => (
                    <div 
                      key={svc.id || idx} 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 90px 85px 32px', 
                        gap: '0.5rem', 
                        alignItems: 'center',
                        background: 'var(--background)',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Nombre del servicio"
                          value={svc.name}
                          onChange={(e) => handleUpdateProposalService(svc.id, 'name', e.target.value)}
                          style={{
                            width: '100%',
                            fontSize: '0.78rem',
                            padding: '0.4rem 0.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text)'
                          }}
                        />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '0.4rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="Precio"
                          value={svc.price}
                          onChange={(e) => handleUpdateProposalService(svc.id, 'price', parseFloat(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            fontSize: '0.78rem',
                            padding: '0.4rem 0.5rem 0.4rem 1rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text)'
                          }}
                        />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          min="5"
                          step="5"
                          placeholder="Min"
                          value={svc.duration_minutes}
                          onChange={(e) => handleUpdateProposalService(svc.id, 'duration_minutes', parseInt(e.target.value, 10) || 15)}
                          style={{
                            width: '100%',
                            fontSize: '0.78rem',
                            padding: '0.4rem 0.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text)'
                          }}
                        />
                        <span style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>m</span>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProposalService(svc.id)}
                          disabled={newProposalTenant.services.length <= 1}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: newProposalTenant.services.length <= 1 ? 'var(--text-muted)' : '#ef4444',
                            cursor: newProposalTenant.services.length <= 1 ? 'not-allowed' : 'pointer',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: newProposalTenant.services.length <= 1 ? 0.4 : 1
                          }}
                          title="Eliminar servicio"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateTenantModal(false)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingTenant}
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {creatingTenant ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Creando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Crear y Generar Enlace
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim / Owner Onboarding Modal */}
      {claimModalTenant && (() => {
        const claimUrl = `${window.location.origin}/?claim=${claimModalTenant.claimToken || claimModalTenant.id}`;
        const previewUrl = `${window.location.origin}/${claimModalTenant.slug || claimModalTenant.id}`;
        const isAlreadyClaimed = Boolean(
          claimModalTenant.owner && 
          claimModalTenant.owner !== 'Pendiente de vinculación' && 
          claimModalTenant.owner !== 'Pendiente' && 
          !claimModalTenant.owner.startsWith('Invitación')
        );

        const cleanPhone = (claimModalTenant.ownerPhone || '').replace(/[^\d+]/g, '');
        const whatsappMsg = `¡Hola! 👋 Te he preparado una propuesta personalizada para *${claimModalTenant.name}* en MyTurn.

Puedes ver cómo luce la página de tu negocio aquí:
${previewUrl}

Para tomar el control como dueño y empezar a gestionar tus turnos y agenda en vivo, ingresa a este enlace para vincular tu correo:
${claimUrl}`;

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4000,
            backdropFilter: 'blur(8px)',
            padding: '1rem',
            overflowY: 'auto'
          }}>
            <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                  <img 
                    src={claimModalTenant.logo || 'https://images.unsplash.com/photo-1512690196162-7c97262c5a95?w=100&h=100&fit=crop'} 
                    alt="" 
                    style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', border: '1.5px solid var(--primary)', flexShrink: 0 }} 
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {claimModalTenant.name}
                      </h3>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                        {claimModalTenant.plan}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>
                      {isAlreadyClaimed ? `Vinculado con: ${claimModalTenant.owner}` : 'Propuesta lista para vincular al propietario'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClaimModalTenant(null)}
                  className="btn btn-outline"
                  style={{ padding: '0.45rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  title="Cerrar modal"
                >
                  <X size={18} />
                </button>
              </header>

              {/* Status Banner */}
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: isAlreadyClaimed ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                border: `1px solid ${isAlreadyClaimed ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                {isAlreadyClaimed ? (
                  <>
                    <CheckCircle2 size={18} color="#10b981" />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>Propietario Activo</p>
                      <p style={{ margin: 0, fontSize: '0.725rem', color: 'var(--text-muted)' }}>{claimModalTenant.owner}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} color="var(--primary)" />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>Esperando Vinculación</p>
                      <p style={{ margin: 0, fontSize: '0.725rem', color: 'var(--text-muted)' }}>El cliente aún no se ha vinculado con su correo.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Claim Link Input */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  ENLACE DIRECTO DE VINCULACIÓN
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    readOnly
                    value={claimUrl}
                    style={{ flex: 1, padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.825rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(claimUrl);
                        setCopiedClaimLink(true);
                        setTimeout(() => setCopiedClaimLink(false), 2500);
                      } catch (e) {
                        alert('Copia el texto del campo directamente.');
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 1rem' }}
                  >
                    {copiedClaimLink ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    {copiedClaimLink ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Action Buttons: WhatsApp & Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <a
                  href={`https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(whatsappMsg)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn"
                  style={{
                    background: '#25D366',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <MessageCircle size={18} /> Enviar Propuesta por WhatsApp
                </a>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.6rem',
                      fontSize: '0.8rem',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={14} /> Ver Propuesta Pública
                  </a>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleRegenerateClaimToken(claimModalTenant.id)}
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.6rem 0.8rem'
                    }}
                    title="Generar un nuevo token si el anterior fue compartido por error"
                  >
                    Regenerar Token
                  </button>
                </div>

                {/* Open QR Poster for Physical Handout / Print */}
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setQrPosterTenant(claimModalTenant)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    background: 'rgba(139, 92, 246, 0.1)',
                    color: '#c4b5fd',
                    borderColor: 'rgba(139, 92, 246, 0.4)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <QrCode size={18} /> 🖨️ Imprimir Cartel con Código QR del Local
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setClaimModalTenant(null)}
                  className="btn btn-outline"
                  style={{ minWidth: '100px' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Printable QR Code Poster Modal */}
      {qrPosterTenant && (
        <BusinessQrPosterModal
          tenant={qrPosterTenant}
          onClose={() => setQrPosterTenant(null)}
        />
      )}
    </div>
  );
};
