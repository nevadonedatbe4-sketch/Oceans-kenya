import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import usePortalBase from '@/hooks/usePortalBase';
import JVImageManager, { JvImageDraft } from '@/pages/crm/components/JVImageManager';
import { displayTitle, displayLocation } from '@/lib/crmDisplay';

interface JvBrief {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  submission_type: 'landowner' | 'jv_proposal' | 'investor';
  land_location: string | null;
  land_size: string | null;
  budget_range: string | null;
  preferred_use: string | null;
  timeline: string | null;
  message: string | null;
  status: 'new' | 'reviewed' | 'contacted' | 'archived';
  source: string | null;
  images: string[] | null;
  created_at: string;
}

interface AgentLand {
  id: string;
  title: string;
  location: string | null;
  size: number | null;
  land_size: number | null;
  price: number | null;
  currency: string | null;
  sub_type: string | null;
  is_published: boolean;
  is_pending: boolean;
  main_image: string | null;
}

interface JvProject {
  id: string;
  title: string;
  slug: string | null;
  location: string | null;
  type: string | null;
  units: number | null;
  status: string | null;
  price_range: string | null;
  is_published: boolean;
}

type Tab = 'briefs' | 'land' | 'projects';

const TYPE_LABELS: Record<string, string> = {
  landowner: 'Land Brief',
  jv_proposal: 'JV Submission',
  investor: 'Capital Venture',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  contacted: 'Contacted',
  archived: 'Archived',
};

const STATUS_CLS: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  reviewed: 'bg-[#fff5e6] text-[#f58300]',
  contacted: 'bg-[#e6f4ea] text-[#088135]',
  archived: 'bg-[#f1f3f5] text-[#6b7280]',
};

const TITLE_STATUS_OPTIONS = [
  { value: 'freehold', label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'mailo', label: 'Mailo' },
  { value: 'kibanja', label: 'Kibanja / Customary' },
  { value: 'in_process', label: 'In Process' },
];

const STRUCTURE_OPTIONS = [
  { value: 'revenue_share', label: 'JV — Revenue Share' },
  { value: 'equity_split', label: 'JV — Equity Split' },
  { value: 'lease_to_jv', label: 'Lease-to-JV' },
  { value: 'outright_sale', label: 'Outright Sale' },
  { value: 'advise', label: 'Not Sure — Advise' },
];

const BUDGET_OPTIONS = [
  { value: 'below_100m', label: 'Below 100M' },
  { value: '100m_500m', label: '100M – 500M' },
  { value: '500m_1b', label: '500M – 1B' },
  { value: '1b_5b', label: '1B – 5B' },
  { value: 'above_5b', label: 'Above 5B' },
];

const USE_OPTIONS = [
  { value: 'agriculture', label: 'Agriculture / Agri-processing' },
  { value: 'residential', label: 'Residential Estate' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed-use' },
];

const inputCls =
  'w-full border border-[#e4e9e6] px-3.5 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0d5959] ring-1 ring-transparent focus:ring-[#0d5959]/20 rounded-lg bg-white placeholder:text-[#9ca3af]';

function formatPrice(price: number | null, currency: string | null) {
  if (!price || price === 0) return 'On request';
  const sym = (currency || 'KES').toUpperCase() === 'USD' ? '$' : 'KSh ';
  if (price >= 1000000) return `${sym}${(price / 1000000).toFixed(1)}M`;
  if (price >= 1000) return `${sym}${(price / 1000).toFixed(0)}K`;
  return `${sym}${price.toLocaleString()}`;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Extract a real message from anything Supabase returns. PostgrestError is NOT
 * an `instanceof Error`, which is why a scoped query used to surface a generic
 * "Failed to load ..." string. This keeps the true reason when there is one, and
 * falls back to the caller's copy otherwise.
 */
function errMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    const details = (err as { details?: unknown }).details;
    if (typeof details === 'string' && details.trim()) return details;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export default function AgentJvDesk() {
  const navigate = useNavigate();
  const portalBase = usePortalBase();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { agentId, loading: agentLoading } = useAgentProfile();

  const initialTab = useMemo<Tab>(() => {
    const fromQuery = searchParams.get('tab') as Tab | null;
    if (fromQuery === 'briefs' || fromQuery === 'land' || fromQuery === 'projects') return fromQuery;
    if (location.pathname.endsWith('/land-listings')) return 'land';
    return 'briefs';
  }, [searchParams, location.pathname]);
  const [tab, setTab] = useState<Tab>(initialTab);

  // Briefs (agent-scoped)
  const [briefs, setBriefs] = useState<JvBrief[]>([]);
  const [briefsLoading, setBriefsLoading] = useState(true);
  const [briefsError, setBriefsError] = useState('');

  // Land listings (agent-scoped)
  const [land, setLand] = useState<AgentLand[]>([]);
  const [landLoading, setLandLoading] = useState(true);
  const [landError, setLandError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Projects (published, global — read-only)
  const [projects, setProjects] = useState<JvProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Add-brief modal
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<'landowner' | 'jv_proposal' | 'investor'>('landowner');
  const [addSaving, setAddSaving] = useState(false);
  const [addImages, setAddImages] = useState<JvImageDraft[]>([]);

  const openAddBrief = () => {
    setAddType('landowner');
    setAddImages([]);
    setShowAdd(true);
  };

  const closeAddBrief = () => {
    setShowAdd(false);
    setAddImages([]);
  };

  const setTabAndQuery = (t: Tab) => {
    setTab(t);
    setSearchParams(t === 'briefs' ? {} : { tab: t }, { replace: true });
  };

  const fetchBriefs = useCallback(async () => {
    if (!agentId) {
      setBriefs([]);
      setBriefsLoading(false);
      return;
    }
    setBriefsLoading(true);
    setBriefsError('');
    try {
      const { data, error } = await supabase
        .from('jv_submissions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBriefs((data || []) as JvBrief[]);
    } catch (err: unknown) {
      setBriefsError(errMessage(err, 'Failed to load briefs'));
    } finally {
      setBriefsLoading(false);
    }
  }, [agentId]);

  const fetchLand = useCallback(async () => {
    if (!agentId) {
      setLand([]);
      setLandLoading(false);
      return;
    }
    setLandLoading(true);
    setLandError('');
    try {
      // Select REAL column names (no aliases) and map locally — this keeps the
      // query unambiguous and guarantees that a legitimately empty result set
      // resolves to an empty state, never a load error.
      const { data, error } = await supabase
        .from('land_listings')
        .select('id,title,location,plot_size,acreage,asking_price,currency,sub_type,is_published,is_pending,main_image')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows: AgentLand[] = (data || []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        title: String(r.title || ''),
        location: (r.location as string | null) ?? null,
        size: (r.plot_size as number | null) ?? null,
        land_size: (r.acreage as number | null) ?? null,
        price: (r.asking_price as number | null) ?? null,
        currency: (r.currency as string | null) ?? null,
        sub_type: (r.sub_type as string | null) ?? null,
        is_published: Boolean(r.is_published),
        is_pending: Boolean(r.is_pending),
        main_image: (r.main_image as string | null) ?? null,
      }));
      setLand(rows);
    } catch (err: unknown) {
      setLandError(errMessage(err, 'Failed to load land listings'));
    } finally {
      setLandLoading(false);
    }
  }, [agentId]);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    const { data } = await supabase
      .from('jv_projects')
      .select('id,title,slug,location,type,units,status,price_range,is_published')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    setProjects((data || []) as JvProject[]);
    setProjectsLoading(false);
  }, []);

  useEffect(() => {
    if (!agentLoading && agentId) {
      fetchBriefs();
      fetchLand();
      fetchProjects();
    }
  }, [agentLoading, agentId, fetchBriefs, fetchLand, fetchProjects]);

  const updateBriefStatus = async (id: string, status: string) => {
    setBusyId(id);
    const { error } = await supabase
      .from('jv_submissions')
      .update({ status })
      .eq('id', id)
      .eq('agent_id', agentId);
    if (!error) {
      setBriefs((prev) => prev.map((b) => (b.id === id ? { ...b, status: status as JvBrief['status'] } : b)));
    }
    setBusyId(null);
  };

  const togglePublishLand = async (l: AgentLand) => {
    if (!agentId) return;
    setBusyId(l.id);
    const next = !l.is_published;
    const { error } = await supabase
      .from('land_listings')
      .update({ is_published: next, is_pending: false })
      .eq('id', l.id)
      .eq('agent_id', agentId);
    if (!error) fetchLand();
    setBusyId(null);
  };

  const createBrief = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const hp = (fd.get('website_alt') as string || '').trim();
    if (hp) { setShowAdd(false); return; }

    const payload: Record<string, unknown> = {
      full_name: (fd.get('full_name') as string || '').trim(),
      phone: (fd.get('phone') as string || '').trim() || null,
      email: (fd.get('email') as string || '').trim() || null,
      submission_type: addType,
      status: 'new',
      source: 'agent',
      agent_id: agentId,
      message: (fd.get('message') as string || '').trim() || null,
      images: addImages.map((img) => img.url),
    };

    if (addType !== 'investor') {
      payload.land_location = (fd.get('land_location') as string || '').trim() || null;
      payload.land_size = (fd.get('land_size') as string || '').trim() || null;
      payload.title_status = (fd.get('title_status') as string || '') || null;
      payload.preferred_structure = (fd.get('preferred_structure') as string || '') || null;
    }
    if (addType !== 'landowner') {
      payload.budget_range = (fd.get('budget_range') as string || '') || null;
      payload.preferred_use = (fd.get('preferred_use') as string || '') || null;
      payload.timeline = (fd.get('timeline') as string || '') || null;
    }
    if (addType === 'investor') {
      payload.preferred_location = (fd.get('preferred_location') as string || '').trim() || null;
    }

    setAddSaving(true);
    const { error } = await supabase.from('jv_submissions').insert(payload);
    setAddSaving(false);
    if (error) {
      window.alert(error.message || 'Failed to save brief');
      return;
    }
    setShowAdd(false);
    fetchBriefs();
    setTabAndQuery('briefs');
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'briefs', label: 'My JV Briefs', icon: 'ri-file-list-3-line' },
    { key: 'land', label: 'Land Listings', icon: 'ri-landscape-line' },
    { key: 'projects', label: 'Projects Seeking Partners', icon: 'ri-building-2-line' },
  ];

  const briefStats = useMemo(() => {
    return {
      total: briefs.length,
      newCount: briefs.filter((b) => b.status === 'new').length,
      landowner: briefs.filter((b) => b.submission_type === 'landowner').length,
      jv: briefs.filter((b) => b.submission_type === 'jv_proposal').length,
      investor: briefs.filter((b) => b.submission_type === 'investor').length,
    };
  }, [briefs]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-roboto text-xl md:text-2xl font-bold text-white">JV Desk</h2>
          <p className="text-sm font-roboto text-[#8b98ab] mt-0.5">
            Only briefs and land brought in by you — no other agent&apos;s records.
          </p>
        </div>
        <button
          onClick={openAddBrief}
          className="inline-flex items-center gap-2 bg-[#0d5959] text-white px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold transition-all hover:bg-[#0a4a4a] cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" />
          Add Brief
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#0a1f3c] p-1 rounded-full w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTabAndQuery(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-roboto font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
              tab === t.key ? 'bg-[#5eead4] text-[#081228]' : 'text-white/60 hover:text-white'
            }`}
          >
            <i className={`${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Briefs ── */}
      {tab === 'briefs' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'My Briefs', value: briefStats.total, icon: 'ri-file-list-3-line', color: '#0d5959' },
              { label: 'New', value: briefStats.newCount, icon: 'ri-mail-unread-line', color: '#2563eb' },
              { label: 'Land Briefs', value: briefStats.landowner, icon: 'ri-landscape-line', color: '#f58300' },
              { label: 'JV + Capital', value: briefStats.jv + briefStats.investor, icon: 'ri-funds-line', color: '#0e7490' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-5 border border-[#e4e9e6]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: s.color }}>
                    <i className={`${s.icon} text-lg`} />
                  </span>
                </div>
                <p className="text-2xl font-roboto font-bold text-[#1a1a2e]">{briefsLoading ? '—' : s.value}</p>
                <p className="text-xs font-roboto font-medium text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {briefsError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <i className="ri-error-warning-line text-red-500" />
              <p className="text-sm font-roboto text-red-700 flex-1">{briefsError}</p>
              <button onClick={fetchBriefs} className="text-sm font-roboto font-semibold text-red-700 hover:underline cursor-pointer whitespace-nowrap">Retry</button>
            </div>
          )}

          {briefsLoading ? (
            <div className="bg-white rounded-xl border border-[#e4e9e6] p-6 space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-[#f0f2f1] rounded-lg" />)}
            </div>
          ) : briefs.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e4e9e6] p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-[#0d5959]/10 flex items-center justify-center mx-auto mb-4">
                <i className="ri-file-list-3-line text-[#0d5959] text-2xl" />
              </div>
              <h3 className="font-roboto font-semibold text-[#1a1a2e] text-lg">No JV briefs brought in by you yet</h3>
              <p className="text-sm font-roboto text-[#6b7280] mt-1">Log a land, JV or capital brief to start tracking it here.</p>
              <button onClick={openAddBrief} className="inline-flex items-center gap-2 mt-5 bg-[#0d5959] text-white px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold hover:bg-[#0a4a4a] transition-all cursor-pointer whitespace-nowrap">
                <i className="ri-add-line" /> Add Brief
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#e4e9e6] divide-y divide-[#f0f2f1] overflow-hidden">
              {briefs.map((b) => (
                <div key={b.id} className="p-4 hover:bg-[#f8faf9]/60 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#0d5959]/10 text-[#0d5959]">
                      <i className="ri-user-star-line text-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-roboto font-semibold text-[#1a1a2e] text-sm">{b.full_name || 'Unnamed'}</h4>
                        <span className="text-[11px] font-roboto px-2 py-0.5 rounded-full bg-[#0d5959]/10 text-[#0d5959] font-semibold">
                          {TYPE_LABELS[b.submission_type]}
                        </span>
                        <span className={`text-[11px] font-roboto px-2 py-0.5 rounded-full font-semibold ${STATUS_CLS[b.status]}`}>
                          {STATUS_LABELS[b.status]}
                        </span>
                      </div>
                      <p className="text-xs font-roboto text-[#6b7280] mt-1">
                        <i className="ri-mail-line mr-1" />{b.email || '—'}
                        {b.phone && <span className="ml-2"><i className="ri-phone-line mr-1" />{b.phone}</span>}
                      </p>
                      {(b.land_location || b.budget_range) && (
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {b.land_location && (
                            <span className="text-[11px] font-roboto text-[#6b7280] bg-[#f6f8f7] px-2 py-0.5 rounded"><i className="ri-map-pin-line mr-0.5" />{displayLocation(b.land_location, null) || b.land_location}</span>
                          )}
                          {b.budget_range && (
                            <span className="text-[11px] font-roboto text-[#6b7280] bg-[#f6f8f7] px-2 py-0.5 rounded"><i className="ri-money-dollar-circle-line mr-0.5" />{BUDGET_OPTIONS.find((o) => o.value === b.budget_range)?.label || b.budget_range}</span>
                          )}
                        </div>
                      )}
                      {b.message && (
                        <p className="text-xs font-roboto text-[#4b5563] mt-2 leading-relaxed line-clamp-2">{b.message}</p>
                      )}
                      {Array.isArray(b.images) && b.images.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          {b.images.slice(0, 6).map((src, i) => (
                            <div key={i} className="w-12 h-12 rounded-md overflow-hidden border border-[#f0f2f1] bg-[#f6f8f7]">
                              <img src={src} alt={`${b.full_name || 'brief'} image ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {b.images.length > 6 && (
                            <span className="text-[11px] font-roboto text-[#6b7280]">+{b.images.length - 6}</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                        {['new', 'reviewed', 'contacted', 'archived'].map((s) => (
                          <button
                            key={s}
                            onClick={() => updateBriefStatus(b.id, s)}
                            disabled={busyId === b.id || b.status === s}
                            className={`text-[11px] font-roboto px-2.5 py-1 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                              b.status === s
                                ? `${STATUS_CLS[s]} font-semibold`
                                : 'border-[#e4e9e6] text-[#6b7280] hover:border-[#cbd5cf] hover:text-[#1a1a2e]'
                            }`}
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                        <span className="ml-auto text-[11px] font-roboto text-gray-400">{formatDate(b.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Land Listings ── */}
      {tab === 'land' && (
        <>
          <div className="bg-white rounded-xl p-4 border border-[#e4e9e6] flex items-center justify-between">
            <p className="text-sm font-roboto font-semibold text-[#1a1a2e]">{land.length} land listing{land.length === 1 ? '' : 's'}</p>
            <Link to={`${portalBase}/land-listings/new`} className="inline-flex items-center gap-2 bg-[#0d5959] text-white px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold hover:bg-[#0a4a4a] transition-all cursor-pointer whitespace-nowrap">
              <i className="ri-add-line" /> Add Listing
            </Link>
          </div>

          {landError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <i className="ri-error-warning-line text-red-500" />
              <p className="text-sm font-roboto text-red-700 flex-1">{landError}</p>
              <button onClick={fetchLand} className="text-sm font-roboto font-semibold text-red-700 hover:underline cursor-pointer whitespace-nowrap">Retry</button>
            </div>
          )}

          {landLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#e4e9e6] p-4 animate-pulse space-y-3">
                  <div className="h-32 bg-[#f0f2f1] rounded-lg" />
                  <div className="h-4 w-3/4 bg-[#f0f2f1] rounded" />
                </div>
              ))}
            </div>
          ) : land.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e4e9e6] p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-[#0d5959]/10 flex items-center justify-center mx-auto mb-4">
                <i className="ri-landscape-line text-[#0d5959] text-2xl" />
              </div>
              <h3 className="font-roboto font-semibold text-[#1a1a2e] text-lg">No land listings brought in by you</h3>
              <p className="text-sm font-roboto text-[#6b7280] mt-1">Add a land listing to start tracking it here.</p>
              <Link to={`${portalBase}/land-listings/new`} className="inline-flex items-center gap-2 mt-5 bg-[#0d5959] text-white px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold hover:bg-[#0a4a4a] transition-all cursor-pointer whitespace-nowrap">
                <i className="ri-add-line" /> Add Listing
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {land.map((l) => (
                <div key={l.id} className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden flex flex-col">
                  <Link to={`${portalBase}/land-listings/edit/${l.id}`} className="relative h-32 bg-[#f0f2f1]">
                    {l.main_image ? (
                      <img src={l.main_image} alt={l.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#0d5959]/10">
                        <i className="ri-landscape-line text-[#0d5959]/40 text-2xl" />
                      </div>
                    )}
                    <span className={`absolute top-2 left-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-roboto font-bold whitespace-nowrap ${l.is_published ? 'bg-[#e6f4ea] text-[#088135]' : 'bg-[#fff5e6] text-[#f58300]'}`}>
                      {l.is_published ? 'Published' : 'Draft'}
                    </span>
                  </Link>
                  <div className="p-4 flex flex-col flex-1">
                    <p className="font-roboto font-semibold text-[#1a1a2e] text-sm">{displayTitle(l.title) || 'Untitled Land'}</p>
                    <p className="text-xs font-roboto text-[#6b7280] mt-1"><i className="ri-map-pin-line mr-1" />{displayLocation(l.location, null, { upper: true }) || '—'}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-roboto font-bold text-[#0d5959]">{formatPrice(l.price, l.currency)}</span>
                      <span className="text-xs font-roboto text-[#6b7280] capitalize">{l.sub_type || 'land'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#f0f2f1]">
                      <button onClick={() => navigate(`${portalBase}/land-listings/edit/${l.id}`)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-roboto font-semibold bg-[#f6f8f7] text-[#374151] hover:bg-[#eef2f0] transition-all cursor-pointer">
                        <i className="ri-edit-line" /> Edit
                      </button>
                      <button
                        onClick={() => togglePublishLand(l)}
                        disabled={busyId === l.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-roboto font-semibold bg-[#e6f4ea] text-[#088135] hover:bg-[#d8eee0] transition-all cursor-pointer disabled:opacity-50"
                      >
                        <i className={l.is_published ? 'ri-eye-off-line' : 'ri-eye-line'} />
                        {l.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Projects ── */}
      {tab === 'projects' && (
        projectsLoading ? (
          <div className="bg-white rounded-xl border border-[#e4e9e6] p-6 space-y-3 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-[#f0f2f1] rounded-lg" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e4e9e6] p-12 text-center">
            <i className="ri-building-2-line text-[#0d5959]/40 text-3xl" />
            <h3 className="font-roboto font-semibold text-[#1a1a2e] text-lg mt-4">No projects seeking partners right now</h3>
            <p className="text-sm font-roboto text-[#6b7280] mt-1">Published JV opportunities will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p.id} to={`/joint-ventures/project/${p.slug || ''}`} className="bg-white rounded-xl border border-[#e4e9e6] p-5 hover:border-[#0d5959]/30 transition-all cursor-pointer">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {p.type && <span className="text-[11px] font-roboto font-bold text-[#0d5959] bg-[#0d5959]/10 px-2 py-0.5 rounded">{p.type}</span>}
                  {p.status && <span className="text-[11px] font-roboto font-bold text-[#b45309] bg-amber-50 px-2 py-0.5 rounded">{p.status}</span>}
                </div>
                <h3 className="font-roboto font-semibold text-[#1a1a2e] text-sm leading-snug">{displayTitle(p.title)}</h3>
                {p.location && <p className="text-xs font-roboto text-[#6b7280] mt-1"><i className="ri-map-pin-line mr-1" />{displayLocation(p.location, null, { upper: true })}</p>}
                <div className="flex items-center gap-2 mt-3 text-xs font-roboto text-[#6b7280]">
                  {p.units ? <span>{p.units} units</span> : null}
                  {p.units && p.price_range ? <span>·</span> : null}
                  {p.price_range ? <span>{p.price_range}</span> : null}
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* Add Brief modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeAddBrief} />
          <div className="relative bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-roboto font-bold text-[#1a1a2e] text-lg">Add JV Brief</h3>
              <button onClick={closeAddBrief} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f0f2f1] cursor-pointer">
                <i className="ri-close-line text-lg" />
              </button>
            </div>

            <form onSubmit={createBrief} className="space-y-4">
              <div className="hp-wrap" aria-hidden="true">
                <input type="text" name="website_alt" tabIndex={-1} autoComplete="off" readOnly />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'landowner', label: 'Land', icon: 'ri-landscape-line' },
                  { value: 'jv_proposal', label: 'JV', icon: 'ri-building-2-line' },
                  { value: 'investor', label: 'Capital', icon: 'ri-funds-line' },
                ] as const).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setAddType(o.value)}
                    className={`rounded-lg border-2 p-3 text-center cursor-pointer transition-all ${addType === o.value ? 'border-[#0d5959] bg-[#0d5959]/5' : 'border-[#e4e9e6] hover:border-[#cbd5cf]'}`}
                  >
                    <i className={`${o.icon} text-lg ${addType === o.value ? 'text-[#0d5959]' : 'text-[#6b7280]'}`} />
                    <p className="text-xs font-roboto font-semibold text-[#1a1a2e] mt-1">{o.label}</p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required name="full_name" placeholder="Full name" className={inputCls} />
                <input name="phone" placeholder="Phone / WhatsApp" className={inputCls} />
                <input name="email" type="email" placeholder="Email" className={inputCls} />
                {addType !== 'investor' ? (
                  <>
                    <input required name="land_location" placeholder="Location / district" className={inputCls} />
                    <input name="land_size" placeholder="Acreage (e.g. 12 acres)" className={inputCls} />
                    <select name="title_status" className={`${inputCls} cursor-pointer`}>
                      <option value="">Title status</option>
                      {TITLE_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select name="preferred_structure" className={`${inputCls} cursor-pointer`}>
                      <option value="">Structure</option>
                      {STRUCTURE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </>
                ) : (
                  <>
                    <select name="budget_range" className={`${inputCls} cursor-pointer`}>
                      <option value="">Budget range</option>
                      {BUDGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input name="preferred_location" placeholder="Preferred district(s)" className={inputCls} />
                    <select name="preferred_use" className={`${inputCls} cursor-pointer`}>
                      <option value="">Preferred use</option>
                      {USE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select name="timeline" className={`${inputCls} cursor-pointer`}>
                      <option value="">Timeline</option>
                      <option value="within_30_days">Within 30 days</option>
                      <option value="1_3_months">1–3 months</option>
                      <option value="3_6_months">3–6 months</option>
                      <option value="exploring">Exploring</option>
                    </select>
                  </>
                )}
              </div>
              {addType === 'jv_proposal' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select name="budget_range" className={`${inputCls} cursor-pointer`}>
                    <option value="">Capital required</option>
                    {BUDGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select name="preferred_use" className={`${inputCls} cursor-pointer`}>
                    <option value="">Project type</option>
                    {USE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
              <textarea name="message" rows={3} maxLength={500} placeholder="Notes..." className={`${inputCls} resize-none`} />

              <div>
                <p className="text-xs font-roboto font-semibold text-[#1a1a2e] mb-2">
                  <i className="ri-image-add-line mr-1" />Images (optional)
                </p>
                <JVImageManager images={addImages} onChange={setAddImages} storageBucket="jv-submissions" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#f0f2f1]">
                <button type="button" onClick={closeAddBrief} className="px-5 py-2.5 rounded-lg text-sm font-roboto text-[#6b7280] border border-[#e4e9e6] hover:text-[#1a1a2e] hover:border-[#cbd5cf] transition-all cursor-pointer whitespace-nowrap">Cancel</button>
                <button type="submit" disabled={addSaving} className="inline-flex items-center gap-2 px-7 py-2.5 rounded-lg text-sm font-roboto bg-[#0d5959] hover:bg-[#0a4a4a] text-white transition-all cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {addSaving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
                  {addSaving ? 'Saving...' : 'Save Brief'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}