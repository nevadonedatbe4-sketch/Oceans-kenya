import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import usePortalBase from '@/hooks/usePortalBase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import { broadcastSync } from '@/lib/syncEngine';
import { displayLocation, bedroomTypeRange } from '@/lib/crmDisplay';
import CrmTitle from '@/pages/crm/components/CrmTitle';
import CrmSearchBar from '@/components/base/CrmSearchBar';
import LocationMultiSelect from '@/components/base/LocationMultiSelect';
import CrmFilterField from '@/components/base/CrmFilterField';
import { useCanonicalAreas } from '@/lib/locationRegistry';
import { buildCrmFilterString, tokenizeKeywords, parseCrmQuery } from '@/lib/crmSearch';
import ShareLinkModal from '@/pages/crm/components/ShareLinkModal';
import { propertyPublicUrl } from '@/lib/shareLinks';

interface DevRow {
  id: string;
  title: string;
  slug: string;
  location: string;
  developer_name: string;
  development_status: string;
  price: number;
  currency: string;
  total_units: number;
  is_published: boolean;
  is_featured: boolean;
  main_image: string;
  cover_image: string;
  created_at: string;
  unitTypes: { bedrooms: number; name: string }[];
}

const COLORS = {
  navy: '#001731',
  navyLight: '#002349',
  yellow: '#f5c842',
  green: '#088135',
  gray: '#88929e',
  border: '#e5e7eb',
};

const STATUS_LABELS: Record<string, string> = {
  off_plan: 'Off-Plan',
  under_construction: 'Under Construction',
  completed: 'Completed',
};

function formatPrice(price: number, currency: string) {
  if (!price) return '—';
  const sym = currency === 'USD' ? '$' : currency === 'KES' ? 'KES ' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
  return `${sym}${price.toLocaleString()}`;
}

export default function Developments() {
  const navigate = useNavigate();
  const portalBase = usePortalBase();
  const { user } = useAuth();
  const { agentId, loading: agentLoading } = useAgentProfile();
  const isAgent = user?.role === 'agent';
  const [rows, setRows] = useState<DevRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('date');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { areas: canonicalAreas } = useCanonicalAreas();
  const areaOptions = canonicalAreas.map((a) => a.name).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [shareRow, setShareRow] = useState<DevRow | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const actionButtonRef = useRef<HTMLElement | null>(null);

  const fetchData = useCallback(async () => {
    // Agents must NEVER see other agents' developments. Hold until their agent
    // id is resolved, and show nothing if no agent record exists rather than
    // falling back to an unfiltered (all-developments) query.
    setLoading(true);
    if (isAgent && agentLoading) return;
    if (isAgent && !agentId) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    let q = supabase
      .from('developments')
      .select('id, title, slug, location, developer_name, development_status, price, currency, total_units, is_published, is_featured, main_image, cover_image, created_at, unit_types(name, bedrooms)', { count: 'exact' })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Agents only ever see their own developments — scoped at the query level.
    if (isAgent && agentId) q = q.eq('agent_id', agentId);
    if (statusFilter !== 'all') q = q.eq('development_status', statusFilter);
    if (priceMin) q = q.gte('price', Number(priceMin));
    if (priceMax) q = q.lte('price', Number(priceMax));
    // Keyword + multi-location search through the shared CRM engine — same
    // semantics as My Properties (keywords AND-ed, locations OR-ed).
    const filterString = buildCrmFilterString({
      terms: tokenizeKeywords(search),
      fields: ['title', 'location', 'developer_name', 'slug'],
      locations: selectedLocations,
      locationFields: ['location'],
    });
    if (filterString) q = q.or(filterString);

    // Sort
    if (sortBy === 'price') q = q.order('price', { ascending: false });
    else if (sortBy === 'title') q = q.order('title', { ascending: true });
    else if (sortBy === 'featured') q = q.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
    else q = q.order('created_at', { ascending: false });

    const { data, error, count } = await q;
    if (error) {
      addToast('Failed to load developments', 'error');
    } else {
      const list = (data || []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        title: String(r.title || ''),
        slug: String(r.slug || ''),
        location: String(r.location || ''),
        developer_name: String(r.developer_name || ''),
        development_status: String(r.development_status || ''),
        price: Number(r.price) || 0,
        currency: String(r.currency || 'KES'),
        total_units: Number(r.total_units) || 0,
        is_published: Boolean(r.is_published),
        is_featured: Boolean(r.is_featured),
        main_image: String(r.main_image || ''),
        cover_image: String(r.cover_image || ''),
        created_at: String(r.created_at || ''),
        unitTypes: Array.isArray(r.unit_types)
          ? (r.unit_types as { name?: unknown; bedrooms?: unknown }[]).map((u) => ({
              name: String(u.name || ''),
              bedrooms: Number(u.bedrooms) || 0,
            }))
          : [],
      }));
      setRows(list);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, statusFilter, search, priceMin, priceMax, selectedLocations, sortBy, isAgent, agentId, agentLoading]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, statusFilter, priceMin, priceMax, selectedLocations, sortBy]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && !(actionButtonRef.current && actionButtonRef.current.contains(target))) setActionMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActionMenu(null); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, []);

  const togglePublish = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error } = await supabase.from('developments').update({ is_published: !current }).eq('id', id);
    if (error) addToast('Failed to update status', 'error');
    else {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_published: !current } : r)));
      addToast(current ? 'Development un-published' : 'Development published', 'success');
      broadcastSync();
    }
    setTogglingId(null);
    setActionMenu(null);
  };

  const toggleFeature = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error } = await supabase.from('developments').update({ is_featured: !current }).eq('id', id);
    if (error) addToast('Failed to update feature status', 'error');
    else {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_featured: !current } : r)));
      addToast(current ? 'Removed from featured' : 'Marked as featured', 'success');
      broadcastSync();
    }
    setTogglingId(null);
    setActionMenu(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('developments').delete().eq('id', id);
    if (error) addToast('Failed to delete development', 'error');
    else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      addToast('Development deleted', 'success');
      broadcastSync();
    }
    setDeleteConfirm(null);
    setActionMenu(null);
  };

  const openActionMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    actionButtonRef.current = btn;
    if (actionMenu === id) { setActionMenu(null); return; }
    const rect = btn.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 340;
    // Open on the OPPOSITE side (left of the button, since it sits on the right edge),
    // vertically anchored to the button's top.
    let left = rect.left - menuWidth - 6;
    if (left < 8) left = Math.min(rect.right + 6, window.innerWidth - menuWidth - 8);
    let top = rect.top;
    if (top + menuHeight > window.innerHeight - 8) top = Math.max(8, window.innerHeight - menuHeight - 8);
    setActionMenuPos({ top, left });
    setActionMenu(id);
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      off_plan: 'bg-[#f58300] text-white border-[#f58300]',
      under_construction: 'bg-amber-50 text-amber-700 border-amber-300',
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return <span className={`inline-flex px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap border ${colors[s] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{STATUS_LABELS[s] || s || '—'}</span>;
  };

  const pubBadge = (p: boolean) => (
    <span className={`inline-flex px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap ${p ? 'bg-[#088135] text-white' : 'bg-[#dc2626] text-white'}`}>{p ? 'Published' : 'Draft'}</span>
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const selectCls = 'w-full px-3 py-2.5 border-2 rounded-lg text-sm font-semibold focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#94a3b8] text-white lg:text-[#001731] cursor-pointer';
  const inputCls = 'w-full px-3 py-2.5 border-2 rounded-lg text-sm font-semibold focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#94a3b8] text-white lg:text-[#001731] placeholder:text-white/60 lg:placeholder:text-[#5b6b7a]';

  const activeFilterCount = [
    statusFilter !== 'all',
    priceMin !== '',
    priceMax !== '',
    selectedLocations.length > 0,
    sortBy !== 'date',
  ].filter(Boolean).length;

  const handleSearch = () => {
    const parsed = parseCrmQuery(search);
    if (parsed.locations.length > 0) {
      setSelectedLocations((prev) => {
        const merged = [...prev];
        for (const loc of parsed.locations) {
          if (!merged.some((m) => m.toLowerCase() === loc.toLowerCase())) merged.push(loc);
        }
        return merged;
      });
    }
    if (parsed.priceMin) setPriceMin(String(parsed.priceMin));
    if (parsed.priceMax) setPriceMax(String(parsed.priceMax));
    setSearch(parsed.terms.join(' '));
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPriceMin('');
    setPriceMax('');
    setSelectedLocations([]);
    setSortBy('date');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white lg:text-[#001731]">{isAgent ? 'My Developments' : 'New Developments'}</h1>
          <p className="text-sm mt-0.5 text-[#6b7280] lg:text-[#88929e]">{isAgent ? 'Only developments you own — no other agents\u2019 projects.' : 'Manage developments with structured unit types'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`${portalBase}/developments/new`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            style={{ backgroundColor: '#0d5959', color: '#ffffff' }}
          >
            <i className="ri-add-line text-sm" /> New Development
          </button>
          <button
            onClick={() => navigate(`${portalBase}/listings`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors whitespace-nowrap cursor-pointer text-[#001731] border-[#e5e7eb] bg-white hover:bg-[#f7f8fa]"
          >
            <i className="ri-building-line text-sm" /> Property Listings
          </button>
        </div>
      </div>

      {/* Search & Filters — mirrors My Properties (full-width search + Filters panel) */}
      <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-lg p-4 space-y-3">
        {/* Row 1 — full-width keyword search field + Search button */}
        <CrmSearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          onSubmit={handleSearch}
          loading={loading}
          showClear={false}
          placeholder="Search development, location or developer…"
          className="w-full"
          iconClassName="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-[#5b6b7a]"
          inputClassName="w-full pl-10 pr-4 py-2.5 border-2 rounded-lg text-sm font-semibold focus:outline-none bg-white border-[#94a3b8] text-[#001731] placeholder:text-[#5b6b7a] placeholder:font-medium focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/25"
          buttonClassName="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap cursor-pointer transition-colors bg-[#0d5959] text-white hover:bg-[#084545] disabled:opacity-60 disabled:cursor-not-allowed"
        />

        {/* Row 2 — multi-location · filters */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <LocationMultiSelect
            options={areaOptions}
            selected={selectedLocations}
            onChange={(v) => { setSelectedLocations(v); setPage(1); }}
            placeholder="Multiple areas, e.g. Karen, Runda…"
            className="w-full lg:flex-1 lg:min-w-0"
            chipClassName="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-semibold bg-[#0d5959]/15 text-[#5eead4] lg:bg-secondary-100 lg:text-secondary-900"
            controlClassName="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border-2 rounded-lg min-h-[44px] bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#94a3b8]"
            inputClassName="flex-1 min-w-[130px] px-2 py-1 text-sm font-semibold focus:outline-none bg-transparent text-white lg:text-[#001731] placeholder:text-white/60 lg:placeholder:text-[#5b6b7a]"
            dropdownClassName="absolute z-40 left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#1c3a5e] lg:border-[#e5e7eb] bg-white shadow-lg"
          />
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center justify-center gap-1.5 w-full lg:w-auto lg:flex-shrink-0 px-4 py-2.5 border-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors whitespace-nowrap bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#94a3b8] text-white lg:text-[#001731] hover:bg-[#012a52] lg:hover:bg-[#f7f8fa]"
          >
            <i className="ri-equalizer-line text-sm" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold bg-[#0d5959] text-white">{activeFilterCount}</span>
            )}
            <i className={`${showAdvanced ? 'ri-arrow-up-wide-fill' : 'ri-arrow-down-wide-fill'} text-sm`} />
          </button>
        </div>

        {showAdvanced && (
          <div className="pt-3 border-t-2 border-[#1c3a5e] lg:border-[#cbd5e1]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white lg:text-[#001731]">
                Refine Results
                {activeFilterCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold bg-[#0d5959] text-white">{activeFilterCount}</span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setShowAdvanced(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border-2 whitespace-nowrap border-[#1c3a5e] text-white hover:bg-white/10 lg:border-[#cbd5e1] lg:text-[#001731] lg:hover:bg-[#f7f8fa]"
              >
                <i className="ri-close-line text-sm" />
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <CrmFilterField label="Status" tone="contrast">
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selectCls}>
                  <option value="all">All Statuses</option>
                  <option value="off_plan">Off-Plan</option>
                  <option value="under_construction">Under Construction</option>
                  <option value="completed">Completed</option>
                </select>
              </CrmFilterField>
              <CrmFilterField label="Price Range" tone="contrast">
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Min" value={priceMin} onChange={(e) => { setPriceMin(e.target.value); setPage(1); }} className={inputCls} />
                  <span className="text-xs text-white/70 lg:text-[#88929e]">—</span>
                  <input type="number" placeholder="Max" value={priceMax} onChange={(e) => { setPriceMax(e.target.value); setPage(1); }} className={inputCls} />
                </div>
              </CrmFilterField>
              <CrmFilterField label="Sort" tone="contrast">
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className={selectCls}>
                  <option value="date">Sort by Date</option>
                  <option value="price">Sort by Price</option>
                  <option value="title">Sort by Title</option>
                  <option value="featured">Sort by Featured</option>
                </select>
              </CrmFilterField>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold cursor-pointer hover:underline text-white/80 lg:text-[#88929e]"
              >
                <i className="ri-close-circle-line" />
                Clear all filters
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-white lg:text-[#88929e]">
          <span>{total} {total === 1 ? 'development' : 'developments'}</span>
          {selectedLocations.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <i className="ri-map-pin-2-line" />
              in {selectedLocations.join(', ')}
            </span>
          )}
          <span className="ml-auto whitespace-nowrap">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
        </div>
      </div>

      {/* Table / cards */}
      <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-lg overflow-hidden -mb-2 lg:mb-0" style={{ borderColor: COLORS.border }}>
        <div className="lg:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-[#001731] border border-[#1c3a5e] rounded-xl p-4 space-y-2"><div className="h-3.5 w-full bg-[#012a52] rounded animate-pulse" /><div className="h-3 w-20 bg-[#012a52] rounded animate-pulse" /></div>)
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#6b7280]">No developments found.</div>
          ) : rows.map((r) => (
            <div key={r.id} onClick={() => navigate(`${portalBase}/developments/edit/${r.id}`)} className="bg-[#001731] border border-[#1c3a5e] rounded-xl p-4 space-y-2.5 cursor-pointer">
              <div className="flex items-start gap-3">
                {r.main_image ? <img src={r.main_image} alt="" className="w-14 h-10 rounded object-cover flex-shrink-0" /> : <div className="w-14 h-10 rounded flex items-center justify-center flex-shrink-0 bg-[#0d5959]/20"><i className="ri-building-line text-[#5eead4] text-sm" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-white leading-snug break-words"><CrmTitle title={r.title} fallback="Untitled" /></p>
                  <p className="text-[12px] text-[#8b98ab] flex items-center gap-1"><i className="ri-map-pin-line text-[11px]" />{displayLocation(r.location, null, { upper: true }) || '—'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{formatPrice(r.price, r.currency)}</span>
                <div className="flex items-center gap-2">{pubBadge(r.is_published)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: COLORS.border }}>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Development</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Status</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>From Price</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Units</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Publish</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Date</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#f0f0f0' }}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{[1, 2, 3, 4, 5, 6, 7].map((c) => <td key={c} className="px-4 md:px-5 py-4"><div className="h-3 w-16 bg-[#f7f8fa] rounded animate-pulse" /></td>)}</tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 md:px-5 py-12 text-center text-sm text-[#88929e]">No developments yet — create your first one.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`${portalBase}/developments/edit/${r.id}`)} className="hover:bg-[#f7f8fa]/80 transition-colors group cursor-pointer">
                    <td className="px-4 md:px-5 py-4">
                      <div className="flex items-start gap-3">
                        {r.main_image ? <img src={r.main_image} alt="" className="w-[72px] h-[52px] rounded object-cover flex-shrink-0 mt-0.5" /> : <div className="w-[72px] h-[52px] rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(0,23,49,0.08)' }}><i className="ri-building-line text-[#001731] text-sm" /></div>}
                        <div className="flex-1 flex flex-col gap-0.5">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`${portalBase}/developments/edit/${r.id}`); }} className="text-[14px] font-semibold block text-left hover:underline cursor-pointer leading-snug break-words w-full" style={{ color: '#001731' }}>
                            <CrmTitle title={r.title} fallback="Untitled" />
                          </button>
                          <p className="text-[12px] font-semibold flex items-center gap-1 whitespace-nowrap" style={{ color: '#1a1a1a' }}><i className="ri-map-pin-line text-[11px]" />{displayLocation(r.location, null, { upper: true }) || '—'}</p>
                          {r.developer_name && <p className="text-[11px] text-[#88929e] whitespace-nowrap">{r.developer_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-5 py-4 whitespace-nowrap">{statusBadge(r.development_status)}</td>
                    <td className="px-4 md:px-5 py-4 whitespace-nowrap"><span className="text-sm font-semibold whitespace-nowrap" style={{ color: COLORS.navy }}>{formatPrice(r.price, r.currency)}</span></td>
                    <td className="px-4 md:px-5 py-4">
                      <p className="text-sm font-semibold whitespace-nowrap" style={{ color: COLORS.navy }}>{bedroomTypeRange(r.unitTypes) || '—'}</p>
                    </td>
                    <td className="px-4 md:px-5 py-4 whitespace-nowrap">{pubBadge(r.is_published)}</td>
                    <td className="px-4 md:px-5 py-4 text-xs whitespace-nowrap" style={{ color: COLORS.gray }}>{formatDate(r.created_at)}</td>
                    <td className="px-4 md:px-5 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`${portalBase}/developments/edit/${r.id}?step=internal`); }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer hover:underline whitespace-nowrap transition-colors"
                        title="Open Source & Contact (team only)"
                        style={{ color: 'rgb(8, 129, 53)' }}
                      >
                        <i className="ri-shield-keyhole-line text-[11px]" />Source & Contact
                      </button>
                      <button
                        onClick={(e) => openActionMenu(r.id, e)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold border transition-colors cursor-pointer hover:bg-[#001731]/5 whitespace-nowrap ml-2"
                        style={{ borderColor: 'rgba(0,23,49,0.3)', color: '#001731', backgroundColor: 'rgba(0,23,49,0.06)' }}
                      >
                        <i className="ri-more-fill text-xs" /> Actions
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && rows.length > 0 && (
          <CRMPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} mobileLight />
        )}
      </div>

      {/* Actions menu */}
      {actionMenu && (
        <div ref={menuRef} className="fixed z-50 rounded-xl overflow-hidden animate-dropdown-enter" style={{ top: actionMenuPos.top, left: actionMenuPos.left, width: 240, backgroundColor: '#001731', border: '1px solid rgba(13,89,89,0.35)', boxShadow: '0 16px 48px rgba(0,0,0,0.45)' }}>
          {(() => {
            const row = rows.find((r) => r.id === actionMenu);
            if (!row) return null;
            return (
              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(13,89,89,0.25)' }}>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white leading-snug break-words"><CrmTitle title={row.title} fallback="Untitled" /></p>
                    <p className="text-[10px] text-[#6b8fa8] mt-0.5 leading-snug">{displayLocation(row.location, null, { upper: true }) || '—'}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActionMenu(null); }}
                    aria-label="Close menu"
                    className="w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0 cursor-pointer text-[#8b98ab] hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <i className="ri-close-line text-sm" />
                  </button>
                </div>
                <div className="p-2">
                  <button onClick={() => { navigate(`${portalBase}/developments/edit/${row.id}`); setActionMenu(null); }} className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold hover:bg-[#0d5959]/25 cursor-pointer flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
                    <i className="ri-edit-box-line text-[#5eead4] text-xs" /> Edit Development
                  </button>
                  <button onClick={() => { togglePublish(row.id, row.is_published); }} className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold hover:bg-[#0d5959]/25 cursor-pointer flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
                    <i className={`${row.is_published ? 'ri-eye-off-line' : 'ri-eye-line'} text-[#5eead4] text-xs`} /> {row.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => { toggleFeature(row.id, row.is_featured); }} className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold hover:bg-[#C9A84C]/15 cursor-pointer flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
                    <i className={`${row.is_featured ? 'ri-star-fill' : 'ri-star-line'} text-[#fbbf24] text-xs`} /> {row.is_featured ? 'Remove Featured' : 'Mark Featured'}
                  </button>
                  <button onClick={() => { window.open(propertyPublicUrl(row.slug, row.id), '_blank'); setActionMenu(null); }} className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold hover:bg-[#0d5959]/25 cursor-pointer flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
                    <i className="ri-eye-line text-[#94a3b8] text-xs" /> Public Page
                  </button>
                  <button onClick={() => { setShareRow(row); setActionMenu(null); }} className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold hover:bg-[#0d5959]/25 cursor-pointer flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
                    <i className="ri-share-line text-[#94a3b8] text-xs" /> Share Property
                  </button>
                  <div className="mx-2 my-1" style={{ height: 1, backgroundColor: 'rgba(220,38,38,0.2)' }} />
                  <button onClick={() => { setDeleteConfirm(row.id); setActionMenu(null); }} className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold hover:bg-[#dc2626]/15 cursor-pointer flex items-center gap-2.5" style={{ color: '#f87171' }}>
                    <i className="ri-delete-bin-line text-[#f87171] text-xs" /> Delete Development
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Development?"
        message="This will permanently remove the development and all its unit types. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ShareLinkModal
        open={!!shareRow}
        title={shareRow?.title || 'Development'}
        subtitle={displayLocation(shareRow?.location, null, { upper: true }) || 'New Development'}
        url={propertyPublicUrl(shareRow?.slug, shareRow?.id)}
        icon="ri-building-2-line"
        onClose={() => setShareRow(null)}
      />
    </div>
  );
}