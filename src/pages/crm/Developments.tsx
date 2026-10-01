import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import usePortalBase from '@/hooks/usePortalBase';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import { broadcastSync } from '@/lib/syncEngine';
import { displayLocation, bedroomTypeRange } from '@/lib/crmDisplay';
import CrmTitle from '@/pages/crm/components/CrmTitle';
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
  const [rows, setRows] = useState<DevRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
    setLoading(true);
    let q = supabase
      .from('developments')
      .select('id, title, slug, location, developer_name, development_status, price, currency, total_units, is_published, is_featured, main_image, cover_image, created_at, unit_types(name, bedrooms)', { count: 'exact' })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (statusFilter !== 'all') q = q.eq('development_status', statusFilter);
    if (search.trim()) q = q.or(`title.ilike.%${search.trim()}%,location.ilike.%${search.trim()}%`);

    const { data, error, count } = await q.order('created_at', { ascending: false });
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
  }, [page, pageSize, statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white lg:text-[#001731]">New Developments</h1>
          <p className="text-sm mt-0.5 text-[#6b7280] lg:text-[#88929e]">Manage developments with structured unit types</p>
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

      {/* Filters */}
      <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-lg p-4 flex flex-col lg:flex-row gap-3 items-start lg:items-center">
        <div className="relative flex-1 max-w-md w-full">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6b7280] lg:text-[#88929e]" />
          <input
            type="text"
            placeholder="Search name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] placeholder:text-[#6b7280] lg:placeholder:text-[#88929e]"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] cursor-pointer">
          <option value="all">All Statuses</option>
          <option value="off_plan">Off-Plan</option>
          <option value="under_construction">Under Construction</option>
          <option value="completed">Completed</option>
        </select>
        <span className="text-xs font-medium text-[#6b7280] lg:text-[#88929e] ml-auto">{total} developments</span>
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