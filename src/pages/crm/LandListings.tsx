import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import usePortalBase from '@/hooks/usePortalBase';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import { broadcastSync } from '@/lib/syncEngine';
import { useAuth } from '@/hooks/useAuth';
import { logLeadCreated } from '@/lib/activityLogger';
import { LAND_TYPE_OPTIONS, LAND_TYPE_LABELS } from '@/pages/crm/landConstants';
import { displayLocation } from '@/lib/crmDisplay';
import CrmTitle from '@/pages/crm/components/CrmTitle';
import BulkActionBar, { BulkActionButton } from '@/pages/crm/components/BulkActionBar';
import BulkEditModal, { type BulkEditOption } from '@/pages/crm/components/BulkEditModal';
import BulkShareModal from '@/pages/crm/components/BulkShareModal';
import BulkForwardModal from '@/pages/crm/components/BulkForwardModal';
import ShareLinkModal from '@/pages/crm/components/ShareLinkModal';
import { propertyPublicUrl } from '@/lib/shareLinks';

const FILTER_TYPES = [{ value: '', label: 'All Land Types' }, ...LAND_TYPE_OPTIONS.filter((o) => o.value !== '')];

const BULK_EDIT_OPTIONS: BulkEditOption[] = [
  { field: 'is_published', label: 'Publish status', choices: [{ value: 'true', label: 'Published' }, { value: 'false', label: 'Draft' }] },
  { field: 'is_featured', label: 'Featured', choices: [{ value: 'true', label: 'Featured' }, { value: 'false', label: 'Not featured' }] },
  {
    field: 'status',
    label: 'Workflow status',
    choices: [
      { value: 'draft', label: 'Draft' },
      { value: 'pending', label: 'Pending' },
      { value: 'under_review', label: 'Under Review' },
      { value: 'approved', label: 'Approved' },
      { value: 'published', label: 'Published' },
      { value: 'archived', label: 'Archived' },
    ],
  },
  { field: 'land_type', label: 'Land type', choices: LAND_TYPE_OPTIONS.filter((o) => o.value !== '') },
];

const KENYAN_COUNTIES = ['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa','Murang\'a','Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans-Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot'];

interface LandRow {
  county: string | null;
  id: string;
  title: string;
  slug: string;
  location: string;
  state_region: string;
  land_type: string;
  plot_size: number | null;
  plot_size_unit: string | null;
  acreage: number | null;
  tenure: string | null;
  asking_price: number | null;
  currency: string;
  sub_type: string | null;
  status: string;
  is_published: boolean;
  is_pending: boolean;
  is_featured: boolean;
  main_image: string | null;
  images: string[] | null;
  description: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  seller_type: string | null;
  created_at: string;
}


const COLORS = {
  navy: '#001731',
  gray: '#88929e',
  border: '#e5e7eb',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
  rejected: 'Rejected',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-300',
  under_review: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  published: 'bg-[#088135] text-white border-transparent',
  archived: 'bg-gray-100 text-gray-500 border-gray-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

function formatPrice(price: number | null, currency: string) {
  if (!price || price === 0) return 'On request';
  const sym = currency?.toUpperCase() === 'USD' ? '$' : currency?.toUpperCase() === 'EUR' ? '€' : currency?.toUpperCase() === 'GBP' ? '£' : 'KSh ';
  if (price >= 1000000000) return `${sym}${(price / 1000000000).toFixed(1)}B`;
  if (price >= 1000000) return `${sym}${(price / 1000000).toFixed(price % 1000000 === 0 ? 0 : 1)}M`;
  if (price >= 1000) return `${sym}${(price / 1000).toFixed(0)}K`;
  return `${sym}${price.toLocaleString()}`;
}

function formatSize(row: LandRow) {
  if (row.acreage) return `${row.acreage} ac`;
  if (row.plot_size) return `${row.plot_size} ${row.plot_size_unit || 'sqm'}`;
  return '—';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function LandListings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const portalBase = usePortalBase();
  const [rows, setRows] = useState<LandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [countyFilter, setCountyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [shareRow, setShareRow] = useState<LandRow | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState({ top: 0, left: 0, maxHeight: 360 });
  const menuRef = useRef<HTMLDivElement>(null);
  const actionButtonRef = useRef<HTMLElement | null>(null);
  const [sellerLeadLand, setSellerLeadLand] = useState<LandRow | null>(null);
  const [sellerLeadForm, setSellerLeadForm] = useState({ first_name: '', last_name: '', email: '', phone: '', source: 'manual', status: 'new', message: '', notes: '' });
  const [sellerLeadSaving, setSellerLeadSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkShareOpen, setBulkShareOpen] = useState(false);
  const [bulkForwardOpen, setBulkForwardOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let countQuery = supabase.from('land_listings').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('land_listings')
      .select('id, title, slug, location, state_region, county, land_type, plot_size, plot_size_unit, acreage, tenure, asking_price, currency, sub_type, status, is_published, is_pending, is_featured, main_image, images, description, owner_name, owner_phone, owner_email, seller_type, created_at')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (typeFilter) {
      countQuery = countQuery.eq('land_type', typeFilter);
      dataQuery = dataQuery.eq('land_type', typeFilter);
    }
    if (countyFilter) {
      countQuery = countQuery.eq('county', countyFilter);
      dataQuery = dataQuery.eq('county', countyFilter);
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'published') {
        countQuery = countQuery.eq('is_published', true);
        dataQuery = dataQuery.eq('is_published', true);
      } else if (statusFilter === 'draft') {
        countQuery = countQuery.eq('is_published', false).eq('status', 'draft');
        dataQuery = dataQuery.eq('is_published', false).eq('status', 'draft');
      } else {
        countQuery = countQuery.eq('status', statusFilter);
        dataQuery = dataQuery.eq('status', statusFilter);
      }
    }
    if (search.trim()) {
      const term = search.trim();
      countQuery = countQuery.or(`title.ilike.%${term}%,location.ilike.%${term}%,state_region.ilike.%${term}%`);
      dataQuery = dataQuery.or(`title.ilike.%${term}%,location.ilike.%${term}%,state_region.ilike.%${term}%`);
    }

    const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);
    if (error) {
      addToast('Failed to load land listings', 'error');
    } else {
      const nextRows = (data || []) as LandRow[];
      setRows(nextRows);
      setTotal(count ?? 0);
      // Drop any selection that is no longer in the current result set.
      setSelectedIds((prev) => {
        if (prev.size === 0) return prev;
        const visible = new Set(nextRows.map((r) => r.id));
        const pruned = new Set(Array.from(prev).filter((id) => visible.has(id)));
        return pruned.size === prev.size ? prev : pruned;
      });
    }
    setLoading(false);
  }, [page, pageSize, typeFilter, statusFilter, search, countyFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter, countyFilter]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && !(actionButtonRef.current && actionButtonRef.current.contains(target))) setActionMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActionMenu(null); };
    const handleScroll = () => setActionMenu(null);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const togglePublish = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error } = await supabase
      .from('land_listings')
      .update({ is_published: !current, is_pending: false, status: !current ? 'published' : 'draft', updated_at: new Date().toISOString() })
      .eq('id', id);
    setTogglingId(null);
    if (error) { addToast('Failed to update status', 'error'); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_published: !current, is_pending: false } : r)));
    addToast(current ? 'Land unpublished' : 'Land published', 'success');
    broadcastSync();
    fetchData();
  };

  const toggleFeature = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error } = await supabase.from('land_listings').update({ is_featured: !current, updated_at: new Date().toISOString() }).eq('id', id);
    setTogglingId(null);
    if (error) { addToast('Failed to update feature status', 'error'); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_featured: !current } : r)));
    addToast(current ? 'Land unfeatured' : 'Land featured', 'success');
    broadcastSync();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('land_listings').delete().eq('id', id);
    if (error) { addToast('Failed to delete land listing', 'error'); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    addToast('Land listing deleted', 'success');
    broadcastSync();
    setDeleteConfirm(null);
  };

  const openSellerLead = (row: LandRow) => {
    const parts = (row.owner_name || '').trim().split(/\s+/);
    setSellerLeadForm({
      first_name: parts[0] || '',
      last_name: parts.slice(1).join(' '),
      email: row.owner_email || '',
      phone: row.owner_phone || '',
      source: 'manual',
      status: 'new',
      message: '',
      notes: '',
    });
    setSellerLeadLand(row);
    setActionMenu(null);
  };

  const handleCreateSellerLead = async () => {
    if (!sellerLeadLand) return;
    if (!sellerLeadForm.first_name.trim() || !sellerLeadForm.email.trim()) {
      addToast('First name and email are required', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sellerLeadForm.email.trim())) {
      addToast('Please enter a valid email address', 'error');
      return;
    }
    setSellerLeadSaving(true);
    const payload = {
      first_name: sellerLeadForm.first_name.trim(),
      last_name: sellerLeadForm.last_name.trim() || null,
      email: sellerLeadForm.email.trim(),
      phone: sellerLeadForm.phone.trim() || null,
      source: sellerLeadForm.source,
      status: sellerLeadForm.status,
      client_type: 'seller',
      move_in_date: null,
      budget: null,
      notes: sellerLeadForm.notes.trim() || null,
      message: sellerLeadForm.message.trim() || null,
      agent_id: null,
      listing_id: sellerLeadLand.id,
      is_read: false,
      priority: 'normal',
      is_starred: false,
      is_important: false,
      is_archived: false,
      is_spam: false,
      labels: [],
      is_trashed: false,
    };
    const { data, error } = await supabase.from('leads').insert(payload).select().single();
    setSellerLeadSaving(false);
    if (error) {
      addToast(error.message || 'Unable to create seller lead. Please try again.', 'error');
      return;
    }
    if (user) {
      logLeadCreated(user.id, user.name || user.email, data.id, `${data.first_name} ${data.last_name}`);
    }
    addToast('Seller lead created and linked to this land listing', 'success');
    setSellerLeadLand(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;

  const selectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedRows = rows.filter((r) => selectedIds.has(r.id));

  const landUrl = (row: LandRow) => propertyPublicUrl(row.slug, row.id);

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { setDeleteConfirm(null); return; }
    const { error } = await supabase.from('land_listings').delete().in('id', ids);
    if (error) { addToast('Failed to delete selected land listings', 'error'); setDeleteConfirm(null); return; }
    setRows((prev) => prev.filter((r) => !ids.includes(r.id)));
    setTotal((prev) => Math.max(0, prev - ids.length));
    addToast(`${ids.length} land listing${ids.length === 1 ? '' : 's'} deleted`, 'success');
    broadcastSync();
    clearSelection();
    setDeleteConfirm(null);
    fetchData();
  };

  const handleBulkApplyEdit = async (field: string, value: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    let patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (field === 'is_published') {
      patch = { ...patch, is_published: value === 'true', is_pending: false };
    } else if (field === 'is_featured') {
      patch = { ...patch, is_featured: value === 'true' };
    } else {
      patch = { ...patch, [field]: value };
    }
    const { error } = await supabase.from('land_listings').update(patch).in('id', ids);
    if (error) { addToast('Failed to update selected land listings', 'error'); return; }
    addToast(`${ids.length} land listing${ids.length === 1 ? '' : 's'} updated`, 'success');
    broadcastSync();
    setBulkEditOpen(false);
    clearSelection();
    fetchData();
  };

  const openActionMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    actionButtonRef.current = btn;
    if (actionMenu === id) { setActionMenu(null); return; }
    const rect = btn.getBoundingClientRect();
    const menuWidth = 240;
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
    // Keep the whole menu inside the viewport: flip upward and cap the height with internal scroll.
    const maxHeight = Math.min(360, window.innerHeight - 24);
    let top = rect.bottom + 4;
    if (top + maxHeight > window.innerHeight - 8) {
      top = rect.top - maxHeight - 4;
      if (top < 8) top = 8;
    }
    setActionMenuPos({ top, left, maxHeight });
    setActionMenu(id);
  };

  const statusBadge = (s: string, published: boolean) => {
    const cls = published ? STATUS_BADGE.published : (STATUS_BADGE[s] || 'bg-gray-100 text-gray-600 border-gray-200');
    return <span className={`inline-flex px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap border ${cls}`}>{published ? 'Published' : (STATUS_LABELS[s] || s || 'Draft')}</span>;
  };

  const pubBadge = (p: boolean) => (
    <span className={`inline-flex px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap ${p ? 'bg-[#088135] text-white' : 'bg-[#dc2626] text-white'}`}>{p ? 'Published' : 'Draft'}</span>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white lg:text-[#001731]">Land Listings</h1>
          <p className="text-sm mt-0.5 text-[#6b7280] lg:text-[#88929e]">Dedicated CRM for plots, acreage &amp; development land</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate(`${portalBase}/land-listings/new`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            style={{ backgroundColor: '#0d5959', color: '#ffffff' }}
          >
            <i className="ri-add-line text-sm" /> Add Land Listing
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
            placeholder="Search title, location or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] placeholder:text-[#6b7280] lg:placeholder:text-[#88929e]"
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] cursor-pointer">
            {FILTER_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={countyFilter} onChange={(e) => setCountyFilter(e.target.value)} className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] cursor-pointer">
            <option value="">All Counties</option>
            {KENYAN_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] cursor-pointer">
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <span className="text-xs font-medium text-[#6b7280] lg:text-[#88929e] ml-auto">{total} land listings</span>
      </div>

      {/* Selection controls */}
      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={selectAll}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-colors whitespace-nowrap text-[#001731] bg-white hover:bg-[#f7f8fa]"
            style={{ borderColor: '#e5e7eb' }}
          >
            <span
              className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
              style={{ borderColor: allSelected ? '#0d5959' : '#cbd5e1', backgroundColor: allSelected ? '#0d5959' : 'transparent', color: '#ffffff' }}
            >
              {allSelected && <i className="ri-check-line text-[10px]" />}
            </span>
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select All'}
          </button>
        </div>
      )}

      <BulkActionBar count={selectedIds.size} onClear={clearSelection}>
        <BulkActionButton icon="ri-edit-box-line" label="Edit" onClick={() => setBulkEditOpen(true)} />
        <BulkActionButton icon="ri-share-line" label="Share" onClick={() => setBulkShareOpen(true)} />
        <BulkActionButton icon="ri-send-plane-line" label="Forward" onClick={() => setBulkForwardOpen(true)} />
        <BulkActionButton icon="ri-delete-bin-line" label="Delete" tone="danger" onClick={() => setDeleteConfirm('bulk')} />
      </BulkActionBar>

      {/* Table / cards */}
      <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-lg overflow-hidden" style={{ borderColor: COLORS.border }}>
        <div className="lg:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-[#001731] border border-[#1c3a5e] rounded-xl p-4 space-y-2"><div className="h-3.5 w-full bg-[#012a52] rounded animate-pulse" /><div className="h-3 w-20 bg-[#012a52] rounded animate-pulse" /></div>)
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#6b7280]">No land listings found.</div>
          ) : rows.map((r) => (
            <div key={r.id} onClick={() => navigate(`${portalBase}/land-listings/edit/${r.id}`)} className={`bg-[#001731] border rounded-xl p-4 space-y-2.5 cursor-pointer transition-colors ${selectedIds.has(r.id) ? 'border-[#5eead4]' : 'border-[#1c3a5e]'}`}>
              <div className="flex items-start gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(r.id); }}
                  className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer"
                  style={{ borderColor: selectedIds.has(r.id) ? '#0d5959' : '#3a5570', backgroundColor: selectedIds.has(r.id) ? '#0d5959' : 'transparent', color: '#ffffff' }}
                  aria-label="Select land listing"
                >
                  {selectedIds.has(r.id) && <i className="ri-check-line text-xs" />}
                </button>
                {r.main_image ? <img src={r.main_image} alt="" className="w-14 h-10 rounded object-cover flex-shrink-0" /> : <div className="w-14 h-10 rounded flex items-center justify-center flex-shrink-0 bg-[#0d5959]/20"><i className="ri-landscape-line text-[#5eead4] text-sm" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-white leading-snug break-words"><CrmTitle title={r.title} fallback="Untitled Land" /></p>
                  <p className="text-[12px] text-[#8b98ab] flex items-center gap-1 mt-1"><i className="ri-map-pin-line text-[11px]" />{displayLocation(r.location, r.state_region, { upper: true }) || '—'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{formatPrice(r.asking_price, r.currency)}</span>
                <div className="flex items-center gap-2">{pubBadge(r.is_published)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: COLORS.border }}>
                <th className="px-3 md:px-4 py-3.5 text-left w-10">
                  <button
                    onClick={selectAll}
                    className="w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors"
                    style={{ borderColor: allSelected ? COLORS.navy : COLORS.border, backgroundColor: allSelected ? COLORS.navy : 'transparent', color: allSelected ? 'white' : 'transparent' }}
                    aria-label="Select all land listings"
                  >
                    {allSelected && <i className="ri-check-line text-xs" />}
                  </button>
                </th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Land</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Type</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Size</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Asking Price</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Status</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Date</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: COLORS.gray }}>Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#f0f0f0' }}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{[1, 2, 3, 4, 5, 6, 7, 8].map((c) => <td key={c} className="px-4 md:px-5 py-4"><div className="h-3 w-16 bg-[#f7f8fa] rounded animate-pulse" /></td>)}</tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 md:px-5 py-12 text-center text-sm text-[#88929e]">No land listings yet — create your first one.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`${portalBase}/land-listings/edit/${r.id}`)} className={`transition-colors group cursor-pointer ${selectedIds.has(r.id) ? 'bg-[#0d5959]/5' : 'hover:bg-[#f7f8fa]/80'}`}>
                    <td className="px-3 md:px-4 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(r.id); }}
                        className="w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors"
                        style={{ borderColor: selectedIds.has(r.id) ? COLORS.navy : COLORS.border, backgroundColor: selectedIds.has(r.id) ? COLORS.navy : 'transparent', color: selectedIds.has(r.id) ? 'white' : 'transparent' }}
                        aria-label="Select land listing"
                      >
                        {selectedIds.has(r.id) && <i className="ri-check-line text-xs" />}
                      </button>
                    </td>
                    <td className="px-4 md:px-5 py-4">
                      <div className="flex items-start gap-3">
                        {r.main_image ? <img src={r.main_image} alt="" className="w-[72px] h-[52px] rounded object-cover flex-shrink-0 mt-0.5" /> : <div className="w-[72px] h-[52px] rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(0,23,49,0.08)' }}><i className="ri-landscape-line text-[#001731] text-sm" /></div>}
                        <div className="flex-1 flex flex-col gap-0.5">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`${portalBase}/land-listings/edit/${r.id}`); }} className="text-[14px] font-semibold block text-left hover:underline cursor-pointer leading-snug break-words w-full" style={{ color: '#001731' }}>
                            <CrmTitle title={r.title} fallback="Untitled Land" />
                          </button>
                          <p className="text-[12px] font-semibold flex items-center gap-1 whitespace-nowrap" style={{ color: '#1a1a1a' }}><i className="ri-map-pin-line text-[11px]" />{displayLocation(r.location, r.state_region, { upper: true }) || '—'}</p>
                          {Number(r.acreage) > 0 && <p className="text-[11px] text-[#88929e] whitespace-nowrap">{formatSize(r)}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-5 py-4 whitespace-nowrap">
                      <span className="text-[12px] font-semibold text-[#001731] bg-[#f7f8fa] px-2.5 py-1 rounded-full whitespace-nowrap">{LAND_TYPE_LABELS[r.land_type || ''] || r.land_type || '—'}</span>
                    </td>
                    <td className="px-4 md:px-5 py-4 text-sm whitespace-nowrap" style={{ color: COLORS.gray }}>{formatSize(r)}</td>
                    <td className="px-4 md:px-5 py-4 whitespace-nowrap"><span className="text-sm font-semibold whitespace-nowrap" style={{ color: COLORS.navy }}>{formatPrice(r.asking_price, r.currency)}</span></td>
                    <td className="px-4 md:px-5 py-4 whitespace-nowrap">{statusBadge(r.status, r.is_published)}</td>
                    <td className="px-4 md:px-5 py-4 text-xs whitespace-nowrap" style={{ color: COLORS.gray }}>{formatDate(r.created_at)}</td>
                    <td className="px-4 md:px-5 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`${portalBase}/land-listings/edit/${r.id}?step=review`); }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer hover:underline whitespace-nowrap transition-colors"
                        title="Open Source & Contact (team only)"
                        style={{ color: 'rgb(8, 129, 53)' }}
                      >
                        <i className="ri-shield-keyhole-line text-[11px]" />Source & Contact
                      </button>
                      <button
                        onClick={(e) => openActionMenu(r.id, e)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold border transition-colors cursor-pointer hover:bg-[#001731]/5 whitespace-nowrap ml-2"
                        style={{ borderColor: 'rgba(13,89,89,0.3)', color: '#0d5959', backgroundColor: 'rgba(13,89,89,0.06)' }}
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
        <div ref={menuRef} className="fixed z-[60] rounded-xl overflow-y-auto overflow-x-hidden animate-dropdown-enter" style={{ top: actionMenuPos.top, left: Math.min(actionMenuPos.left, window.innerWidth - 280), width: 240, maxHeight: actionMenuPos.maxHeight, backgroundColor: '#001731', border: '1px solid rgba(13,89,89,0.35)', boxShadow: '0 16px 48px rgba(0,0,0,0.45)' }}>
          {(() => {
            const row = rows.find((r) => r.id === actionMenu);
            if (!row) return null;
            return (
              <div className="flex flex-col">
                <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(13,89,89,0.25)' }}>
                  <p className="text-[12px] font-semibold text-white leading-snug break-words"><CrmTitle title={row.title} fallback="Untitled Land" /></p>
                  <p className="text-[10px] text-[#6b8fa8] mt-0.5 leading-snug">{displayLocation(row.location, row.state_region, { upper: true }) || '—'}</p>
                </div>
                <div className="p-2">
                  <button onClick={() => { navigate(`${portalBase}/land-listings/edit/${row.id}`); setActionMenu(null); }} className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold hover:bg-[#0d5959]/25 cursor-pointer flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
                    <i className="ri-edit-box-line text-[#5eead4] text-xs" /> Edit Land Listing
                  </button>
                  <button onClick={() => openSellerLead(row)} className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold hover:bg-[#0d5959]/25 cursor-pointer flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
                    <i className="ri-user-add-line text-[#5eead4] text-xs" /> Create Seller Lead
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
                  <button onClick={() => { navigator.clipboard.writeText(propertyPublicUrl(row.slug, row.id)); addToast('Link copied to clipboard', 'success'); setActionMenu(null); }} className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold hover:bg-[#0d5959]/25 cursor-pointer flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
                    <i className="ri-link text-[#94a3b8] text-xs" /> Copy Link
                  </button>
                  <button onClick={() => { setShareRow(row); setActionMenu(null); }} className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold hover:bg-[#0d5959]/25 cursor-pointer flex items-center gap-2.5" style={{ color: '#e2e8f0' }}>
                    <i className="ri-share-line text-[#94a3b8] text-xs" /> Share Link…
                  </button>
                  <div className="mx-2 my-1" style={{ height: 1, backgroundColor: 'rgba(220,38,38,0.2)' }} />
                  <button onClick={() => { setDeleteConfirm(row.id); setActionMenu(null); }} className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold hover:bg-[#dc2626]/15 cursor-pointer flex items-center gap-2.5" style={{ color: '#f87171' }}>
                    <i className="ri-delete-bin-line text-[#f87171] text-xs" /> Delete Land Listing
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {sellerLeadLand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setSellerLeadLand(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[#001731]">Create Seller Lead</h2>
                <p className="text-[11px] text-[#88929e] mt-0.5 truncate max-w-[320px]">From land: {sellerLeadLand.title || 'Untitled Land'}</p>
              </div>
              <button onClick={() => setSellerLeadLand(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f8fa] cursor-pointer">
                <i className="ri-close-line text-[#636363] text-lg" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">First Name *</label>
                  <input type="text" value={sellerLeadForm.first_name} onChange={(e) => setSellerLeadForm((p) => ({ ...p, first_name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0d5959] text-[#001731]" style={{ borderColor: '#e5e7eb' }} placeholder="John" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">Last Name</label>
                  <input type="text" value={sellerLeadForm.last_name} onChange={(e) => setSellerLeadForm((p) => ({ ...p, last_name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0d5959] text-[#001731]" style={{ borderColor: '#e5e7eb' }} placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">Email *</label>
                <input type="email" value={sellerLeadForm.email} onChange={(e) => setSellerLeadForm((p) => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0d5959] text-[#001731]" style={{ borderColor: '#e5e7eb' }} placeholder="seller@example.com" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">Phone</label>
                <input type="tel" value={sellerLeadForm.phone} onChange={(e) => setSellerLeadForm((p) => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0d5959] text-[#001731]" style={{ borderColor: '#e5e7eb' }} placeholder="+254 712 345 678" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">Source</label>
                  <select value={sellerLeadForm.source} onChange={(e) => setSellerLeadForm((p) => ({ ...p, source: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer text-[#001731]" style={{ borderColor: '#e5e7eb' }}>
                    <option value="manual">Manual</option>
                    <option value="referral">Referral</option>
                    <option value="phone">Phone</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="website">Website</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">Status</label>
                  <select value={sellerLeadForm.status} onChange={(e) => setSellerLeadForm((p) => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer text-[#001731]" style={{ borderColor: '#e5e7eb' }}>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="viewing">Viewing</option>
                    <option value="negotiating">Negotiating</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>
              <div className="rounded-lg p-3 flex items-center gap-2.5" style={{ backgroundColor: 'rgba(13,89,89,0.06)' }}>
                <i className="ri-building-4-line text-[#0d5959] text-base" />
                <p className="text-[11px] font-medium text-[#001731]">This will create a lead with client type <span className="font-bold">Seller</span>, linked back to this land listing.</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">Description / Inquiry</label>
                <textarea value={sellerLeadForm.message} onChange={(e) => setSellerLeadForm((p) => ({ ...p, message: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0d5959] min-h-[70px] resize-none text-[#001731]" style={{ borderColor: '#e5e7eb' }} placeholder="What is the seller looking for (optional)?" maxLength={500} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={sellerLeadForm.notes} onChange={(e) => setSellerLeadForm((p) => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0d5959] min-h-[70px] resize-none text-[#001731]" style={{ borderColor: '#e5e7eb' }} placeholder="Internal notes..." maxLength={500} />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={() => setSellerLeadLand(null)} className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium text-[#636363] hover:bg-[#f7f8fa] transition-all cursor-pointer" style={{ borderColor: '#e5e7eb' }}>Cancel</button>
                <button onClick={handleCreateSellerLead} disabled={sellerLeadSaving} className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-50" style={{ backgroundColor: '#0d5959' }}>
                  {sellerLeadSaving ? 'Creating...' : 'Create Seller Lead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BulkEditModal
        open={bulkEditOpen}
        count={selectedIds.size}
        entityLabel="land listing"
        options={BULK_EDIT_OPTIONS}
        onApply={handleBulkApplyEdit}
        onClose={() => setBulkEditOpen(false)}
      />

      <BulkShareModal
        open={bulkShareOpen}
        heading="land listings"
        items={selectedRows.map((r) => ({ id: r.id, title: r.title || 'Untitled Land', url: landUrl(r) }))}
        onClose={() => setBulkShareOpen(false)}
      />

      <BulkForwardModal
        open={bulkForwardOpen}
        heading="land listings"
        senderName={user?.name || user?.email || 'Agent'}
        items={selectedRows.map((r) => ({
          id: r.id,
          title: r.title || 'Untitled Land',
          location: displayLocation(r.location, r.state_region, { upper: true }) || undefined,
          priceLabel: formatPrice(r.asking_price, r.currency),
          url: landUrl(r),
        }))}
        onClose={() => setBulkForwardOpen(false)}
      />

      <ConfirmModal
        open={deleteConfirm === 'bulk'}
        title={`Delete ${selectedIds.size} Land Listing${selectedIds.size === 1 ? '' : 's'}?`}
        message="This action will permanently remove the selected land listings. This action cannot be undone."
        confirmLabel="Delete Listings"
        confirmVariant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmModal
        open={!!deleteConfirm && deleteConfirm !== 'bulk'}
        title="Delete Land Listing?"
        message="This will permanently remove this land listing and all associated data. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && deleteConfirm !== 'bulk' && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ShareLinkModal
        open={!!shareRow}
        title={shareRow?.title || 'Land Listing'}
        subtitle={displayLocation(shareRow?.location, shareRow?.state_region, { upper: true }) || 'Land Listing'}
        url={propertyPublicUrl(shareRow?.slug, shareRow?.id)}
        icon="ri-landscape-line"
        onClose={() => setShareRow(null)}
      />
    </div>
  );
}