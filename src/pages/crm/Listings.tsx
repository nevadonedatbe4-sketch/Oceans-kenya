import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import { broadcastSync } from '@/lib/syncEngine';

interface Agent {
  id: string;
  name: string;
}

interface Listing {
  id: string;
  title: string;
  location: string;
  neighbourhood: string;
  property_type: string;
  sub_type: string;
  status: string;
  purpose: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  is_published: boolean;
  is_pending: boolean;
  is_featured: boolean;
  is_homepage: boolean;
  created_at: string;
  main_image: string;
  cover_image: string;
  slug: string;
  agent_id: string;
  images: string[];
  agent_name?: string;
}

interface ListingStats {
  total: number;
  published: number;
  draft: number;
  pending: number;
}

const todayStr = new Date().toLocaleDateString('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const COLORS = {
  navy: '#0d1b2a',
  navyLight: '#1a2f45',
  yellow: '#f5c842',
  green: '#16a34a',
  gray: '#6b7280',
  border: '#e5e7eb',
  bg: '#f4f6f9',
  white: '#ffffff',
};

export default function Listings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ListingStats>({ total: 0, published: 0, draft: 0, pending: 0 });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPurpose, setFilterPurpose] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const bulkDropdownRef = useRef<HTMLDivElement>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let countQuery = supabase.from('listings').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('listings')
      .select('id, title, location, neighbourhood, property_type, sub_type, status, purpose, price, currency, bedrooms, bathrooms, is_published, is_pending, is_featured, is_homepage, created_at, main_image, cover_image, slug, agent_id, images')
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filterStatus !== 'all') {
      if (filterStatus === 'published') {
        countQuery = countQuery.eq('is_published', true);
        dataQuery = dataQuery.eq('is_published', true);
      } else if (filterStatus === 'draft') {
        countQuery = countQuery.eq('is_published', false).eq('is_pending', false);
        dataQuery = dataQuery.eq('is_published', false).eq('is_pending', false);
      } else if (filterStatus === 'pending') {
        countQuery = countQuery.eq('is_pending', true);
        dataQuery = dataQuery.eq('is_pending', true);
      } else if (filterStatus === 'featured') {
        countQuery = countQuery.eq('is_featured', true);
        dataQuery = dataQuery.eq('is_featured', true);
      }
    }
    if (filterPurpose !== 'all') {
      countQuery = countQuery.eq('purpose', filterPurpose);
      dataQuery = dataQuery.eq('purpose', filterPurpose);
    }
    if (filterType !== 'all') {
      countQuery = countQuery.eq('property_type', filterType);
      dataQuery = dataQuery.eq('property_type', filterType);
    }
    if (search.trim()) {
      const term = search.trim();
      countQuery = countQuery.or(`title.ilike.%${term}%,location.ilike.%${term}%`);
      dataQuery = dataQuery.or(`title.ilike.%${term}%,location.ilike.%${term}%`);
    }

    // Sort
    if (sortBy === 'date') {
      dataQuery = dataQuery.order('created_at', { ascending: false });
    } else if (sortBy === 'price') {
      dataQuery = dataQuery.order('price', { ascending: false });
    } else if (sortBy === 'title') {
      dataQuery = dataQuery.order('title', { ascending: true });
    } else if (sortBy === 'featured') {
      dataQuery = dataQuery.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
    }

    const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);

    if (error) {
      console.error('Error fetching listings:', error);
      addToast('Failed to load listings', 'error');
    } else {
      const listingsData = data || [];
      // Fetch agent names for the listings
      const agentIds = listingsData.map((l) => l.agent_id).filter(Boolean);
      let agentMap: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: agentsData } = await supabase
          .from('agents')
          .select('id, name')
          .in('id', agentIds);
        agentMap = (agentsData || []).reduce((acc, a) => {
          acc[a.id] = a.name;
          return acc;
        }, {} as Record<string, string>);
      }
      setListings(listingsData.map((l) => ({ ...l, agent_name: l.agent_id ? agentMap[l.agent_id] : undefined })));
      setTotal(count ?? 0);
      setSelectedIds(new Set());
    }

    // Fetch stats
    const { data: statsData } = await supabase
      .from('listings')
      .select('is_published, is_pending, is_featured');

    const s = statsData || [];
    const published = s.filter((x) => x.is_published).length;
    const pending = s.filter((x) => !x.is_published && x.is_pending).length;
    const draft = s.filter((x) => !x.is_published && !x.is_pending).length;
    setStats({
      total: s.length,
      published,
      draft,
      pending,
    });

    setLoading(false);
  }, [page, pageSize, filterStatus, filterPurpose, filterType, search, sortBy]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionMenu(null);
      }
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(e.target as Node)) {
        setBulkActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleTogglePublish = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error } = await supabase.from('listings').update({ is_published: !current, is_pending: false }).eq('id', id);
    if (error) {
      addToast('Failed to update status', 'error');
    } else {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_published: !current, is_pending: false } : l)));
      addToast(current ? 'Listing unpublished' : 'Listing published', 'success');
      broadcastSync();
      fetchListings();
    }
    setTogglingId(null);
    setActionMenu(null);
  };

  const handleToggleFeature = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error } = await supabase.from('listings').update({ is_featured: !current }).eq('id', id);
    if (error) {
      addToast('Failed to update feature status', 'error');
    } else {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_featured: !current } : l)));
      addToast(current ? 'Listing unfeatured' : 'Listing featured', 'success');
      broadcastSync();
    }
    setTogglingId(null);
    setActionMenu(null);
  };

  const handleTogglePending = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error } = await supabase.from('listings').update({ is_pending: !current, is_published: false }).eq('id', id);
    if (error) {
      addToast('Failed to update pending status', 'error');
    } else {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_pending: !current, is_published: false } : l)));
      addToast(current ? 'Listing removed from pending' : 'Listing marked as pending review', 'success');
      broadcastSync();
      fetchListings();
    }
    setTogglingId(null);
    setActionMenu(null);
  };

  const handleDuplicate = async (id: string) => {
    const listing = listings.find((l) => l.id === id);
    if (!listing) return;
    const { data: fullData, error: fetchError } = await supabase.from('listings').select('*').eq('id', id).maybeSingle();
    if (fetchError || !fullData) {
      addToast('Failed to fetch listing for duplication', 'error');
      return;
    }
    const { id: _, created_at, updated_at, ...rest } = fullData;
    const newListing = {
      ...rest,
      title: `${rest.title} (Copy)`,
      slug: `${rest.slug}-copy-${Date.now()}`,
      is_published: false,
      is_pending: false,
      is_featured: false,
      is_homepage: false,
    };
    const { data: insertData, error } = await supabase.from('listings').insert(newListing).select('id').single();
    if (error) {
      addToast('Failed to duplicate listing', 'error');
    } else {
      addToast('Listing duplicated', 'success');
      navigate(`/crm/listings/edit/${insertData.id}`);
    }
    setActionMenu(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) {
      addToast('Failed to delete listing', 'error');
    } else {
      setListings((prev) => prev.filter((l) => l.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      addToast('Listing deleted', 'success');
      broadcastSync();
      fetchListings();
    }
    setDeleteConfirm(null);
    setActionMenu(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('listings').delete().in('id', ids);
    if (error) {
      addToast('Failed to delete listings', 'error');
    } else {
      setListings((prev) => prev.filter((l) => !ids.includes(l.id)));
      setTotal((prev) => Math.max(0, prev - ids.length));
      addToast(`${ids.length} listings deleted`, 'success');
      broadcastSync();
      fetchListings();
    }
    setBulkAction('');
    setSelectedIds(new Set());
    setBulkActionOpen(false);
  };

  const handleBulkPublish = async (publish: boolean) => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('listings').update({ is_published: publish, is_pending: false }).in('id', ids);
    if (error) {
      addToast(`Failed to ${publish ? 'publish' : 'unpublish'} listings`, 'error');
    } else {
      setListings((prev) => prev.map((l) => (ids.includes(l.id) ? { ...l, is_published: publish, is_pending: false } : l)));
      addToast(`${ids.length} listings ${publish ? 'published' : 'unpublished'}`, 'success');
      broadcastSync();
      fetchListings();
    }
    setBulkAction('');
    setSelectedIds(new Set());
    setBulkActionOpen(false);
  };

  const handleBulkFeature = async (feature: boolean) => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('listings').update({ is_featured: feature }).in('id', ids);
    if (error) {
      addToast(`Failed to ${feature ? 'feature' : 'unfeature'} listings`, 'error');
    } else {
      setListings((prev) => prev.map((l) => (ids.includes(l.id) ? { ...l, is_featured: feature } : l)));
      addToast(`${ids.length} listings ${feature ? 'featured' : 'unfeatured'}`, 'success');
      broadcastSync();
      fetchListings();
    }
    setBulkAction('');
    setSelectedIds(new Set());
    setBulkActionOpen(false);
  };

  const applyBulkAction = () => {
    if (bulkAction === 'delete') setDeleteConfirm('bulk');
    else if (bulkAction === 'publish') handleBulkPublish(true);
    else if (bulkAction === 'unpublish') handleBulkPublish(false);
    else if (bulkAction === 'feature') handleBulkFeature(true);
    else if (bulkAction === 'unfeature') handleBulkFeature(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === listings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(listings.map((l) => l.id)));
    }
  };

  const openActionMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActionMenuPos({ top: rect.bottom + 4, left: Math.max(8, rect.left - 200) });
    setActionMenu(id);
  };

  const getPublishStatus = (l: Listing) => {
    if (l.is_featured && l.is_published) return { label: 'Featured', class: 'bg-amber-50 text-amber-700 border border-amber-200' };
    if (l.is_published) return { label: 'Published', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    if (l.is_pending) return { label: 'Pending Review', class: 'bg-amber-50 text-amber-700 border border-amber-200' };
    return { label: 'Draft', class: 'bg-gray-100 text-gray-600 border border-gray-200' };
  };

  const formatPrice = (price: number, currency: string) => {
    if (!price || price === 0) return '—';
    const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'UGX' ? 'UGX ' : currency === 'KES' ? 'KES ' : currency;
    if (price >= 1000000000) return `${sym}${(price / 1000000000).toFixed(1)}B`;
    if (price >= 1000000) return `${sym}${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${sym}${(price / 1000).toFixed(0)}K`;
    return `${sym}${price.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const propertyTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'villa', label: 'Villa' },
    { value: 'land', label: 'Land' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'single_family_home', label: 'Single Family Home' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'condo', label: 'Condo' },
    { value: 'penthouse', label: 'Penthouse' },
  ];

  const statCards = [
    { label: 'Total Properties', value: stats.total, icon: 'ri-bar-chart-line', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
    { label: 'Published', value: stats.published, icon: 'ri-check-double-line', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Draft', value: stats.draft, icon: 'ri-draft-line', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
    { label: 'Pending Review', value: stats.pending, icon: 'ri-time-line', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  ];

  return (
    <div className="space-y-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: COLORS.navy }}>All Properties</h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.gray }}>Manage every property on the Oceans Kenya platform</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs hidden sm:block" style={{ color: COLORS.gray }}>{todayStr}</span>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg border transition-colors hover:bg-gray-50 cursor-pointer" style={{ borderColor: COLORS.border, color: COLORS.gray }}>
            <i className="ri-notification-3-line text-sm" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg border transition-colors hover:bg-gray-50 cursor-pointer" style={{ borderColor: COLORS.border, color: COLORS.gray }}>
            <i className="ri-settings-3-line text-sm" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className={`rounded-lg border p-4 flex items-center gap-3 ${stat.bg}`} style={{ borderColor: stat.border, backgroundColor: stat.bg === 'bg-gray-50' ? '#f9fafb' : stat.bg === 'bg-emerald-50' ? '#ecfdf5' : '#fffbeb' }}>
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border" style={{ borderColor: stat.border }}>
              <i className={`${stat.icon} ${stat.color} text-lg`} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: COLORS.navy }}>{stat.value}</p>
              <p className="text-xs font-medium" style={{ color: COLORS.gray }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/crm/listings/new')}
            className="inline-flex items-center gap-2 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer hover:opacity-90"
            style={{ backgroundColor: COLORS.navy }}
          >
            <i className="ri-add-line" />
            Add Property
          </button>
          <button
            onClick={() => { setPage(1); fetchListings(); }}
            className="inline-flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors cursor-pointer hover:bg-gray-50 whitespace-nowrap"
            style={{ borderColor: COLORS.border, color: COLORS.gray }}
          >
            <i className="ri-refresh-line" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg border p-4 space-y-3" style={{ borderColor: COLORS.border }}>
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.gray }} />
            <input
              type="text"
              placeholder="Search title or location..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none bg-white"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            />
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending Review</option>
              <option value="featured">Featured</option>
            </select>
            <select
              value={filterPurpose}
              onChange={(e) => { setFilterPurpose(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="all">All Purposes</option>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              {propertyTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="date">Sort by Date</option>
              <option value="price">Sort by Price</option>
              <option value="title">Sort by Title</option>
              <option value="featured">Sort by Featured</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs font-medium" style={{ color: COLORS.gray }}>
          <span>{total} listings</span>
          <span>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-white rounded-lg border px-4 py-2.5" style={{ borderColor: COLORS.border }}>
          <span className="text-sm font-medium" style={{ color: COLORS.navy }}>{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-gray-200" />
          <div className="relative" ref={bulkDropdownRef}>
            <button
              onClick={() => setBulkActionOpen(!bulkActionOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium cursor-pointer hover:bg-gray-50 whitespace-nowrap"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <i className="ri-arrow-down-s-line" />
              {bulkAction ? bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1) : 'Bulk Actions'}
            </button>
            {bulkActionOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border shadow-lg min-w-[160px] py-1 z-20" style={{ borderColor: COLORS.border }}>
                <button onClick={() => { setBulkAction('publish'); setBulkActionOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 cursor-pointer" style={{ color: COLORS.navy }}>
                  <i className="ri-eye-line mr-1.5 text-emerald-600" /> Publish
                </button>
                <button onClick={() => { setBulkAction('unpublish'); setBulkActionOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 cursor-pointer" style={{ color: COLORS.navy }}>
                  <i className="ri-eye-off-line mr-1.5 text-gray-500" /> Unpublish
                </button>
                <button onClick={() => { setBulkAction('feature'); setBulkActionOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 cursor-pointer" style={{ color: COLORS.navy }}>
                  <i className="ri-star-fill mr-1.5 text-amber-500" /> Mark Featured
                </button>
                <button onClick={() => { setBulkAction('unfeature'); setBulkActionOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 cursor-pointer" style={{ color: COLORS.navy }}>
                  <i className="ri-star-line mr-1.5 text-gray-500" /> Remove Featured
                </button>
                <div className="my-1 border-t" style={{ borderColor: COLORS.border }} />
                <button onClick={() => { setBulkAction('delete'); setBulkActionOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-red-50 cursor-pointer text-red-600">
                  <i className="ri-delete-bin-line mr-1.5" /> Delete
                </button>
              </div>
            )}
          </div>
          {bulkAction && (
            <button
              onClick={applyBulkAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white cursor-pointer hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: COLORS.navy }}
            >
              <i className="ri-check-line" /> Apply
            </button>
          )}
          <button onClick={() => setSelectedIds(new Set())} className="text-xs font-medium ml-auto cursor-pointer hover:underline" style={{ color: COLORS.gray }}>
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: COLORS.border }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: COLORS.border }}>
                <th className="px-3 md:px-5 py-3 text-left w-10">
                  <button
                    onClick={selectAll}
                    className="w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors"
                    style={{
                      borderColor: selectedIds.size === listings.length && listings.length > 0 ? COLORS.navy : COLORS.border,
                      backgroundColor: selectedIds.size === listings.length && listings.length > 0 ? COLORS.navy : 'transparent',
                      color: selectedIds.size === listings.length && listings.length > 0 ? 'white' : 'transparent',
                    }}
                  >
                    {selectedIds.size === listings.length && listings.length > 0 && (
                      <i className="ri-check-line text-xs" />
                    )}
                  </button>
                </th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.gray }}>Property</th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: COLORS.gray }}>Type</th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.gray }}>Price</th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.gray }}>Status</th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: COLORS.gray }}>Featured</th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: COLORS.gray }}>Agent</th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: COLORS.gray }}>Listed</th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.gray }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#f3f4f6' }}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 md:px-5 py-3"><div className="w-5 h-5 bg-gray-100 rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 animate-pulse" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
                          <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-5 py-3 hidden sm:table-cell"><div className="h-3 w-16 bg-gray-100 rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-3"><div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-3"><div className="h-5 w-16 bg-gray-100 rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-3 hidden md:table-cell"><div className="h-5 w-10 bg-gray-100 rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-3 hidden md:table-cell"><div className="h-3 w-20 bg-gray-100 rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-3 hidden md:table-cell"><div className="h-3 w-16 bg-gray-100 rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-3"><div className="h-8 w-20 bg-gray-100 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 md:px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#ecfdf5' }}>
                        <i className="ri-building-line text-emerald-600 text-xl" />
                      </div>
                      <p className="text-sm font-medium" style={{ color: COLORS.gray }}>
                        {total === 0 ? 'No properties yet. Add your first property.' : 'No properties match your filters.'}
                      </p>
                      {total === 0 && (
                        <button onClick={() => navigate('/crm/listings/new')} className="text-sm font-medium hover:underline cursor-pointer" style={{ color: COLORS.navy }}>
                          Create a property
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                listings.map((listing) => {
                  const status = getPublishStatus(listing);
                  return (
                    <tr key={listing.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-3 md:px-5 py-3">
                        <button
                          onClick={() => toggleSelect(listing.id)}
                          className="w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors"
                          style={{
                            borderColor: selectedIds.has(listing.id) ? COLORS.navy : COLORS.border,
                            backgroundColor: selectedIds.has(listing.id) ? COLORS.navy : 'transparent',
                            color: selectedIds.has(listing.id) ? 'white' : 'transparent',
                          }}
                        >
                          {selectedIds.has(listing.id) && <i className="ri-check-line text-xs" />}
                        </button>
                      </td>
                      <td className="px-4 md:px-5 py-3">
                        <div className="flex items-center gap-3">
                          {listing.main_image ? (
                            <img src={listing.main_image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : listing.images && listing.images.length > 0 ? (
                            <img src={listing.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ecfdf5' }}>
                              <i className="ri-building-line text-emerald-600 text-sm" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <button
                              onClick={() => navigate(`/crm/listings/edit/${listing.id}`)}
                              className="text-sm font-semibold truncate text-left hover:underline cursor-pointer transition-colors"
                              style={{ color: COLORS.navy }}
                            >
                              {listing.title || 'Untitled Draft'}
                            </button>
                            <p className="text-xs" style={{ color: COLORS.gray }}>{listing.location || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                        <span className="text-xs capitalize" style={{ color: COLORS.gray }}>{listing.property_type?.replace(/_/g, ' ')}</span>
                        {listing.sub_type && <p className="text-xs capitalize opacity-70" style={{ color: COLORS.gray }}>{listing.sub_type}</p>}
                      </td>
                      <td className="px-4 md:px-5 py-3">
                        <p className="text-sm font-semibold" style={{ color: COLORS.navy }}>{formatPrice(Number(listing.price), listing.currency)}</p>
                      </td>
                      <td className="px-4 md:px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap border ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                        <button
                          onClick={() => handleToggleFeature(listing.id, listing.is_featured)}
                          disabled={togglingId === listing.id}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          <i className={`${listing.is_featured ? 'ri-star-fill text-amber-500' : 'ri-star-line text-gray-400'} text-sm`} />
                          {togglingId === listing.id && <i className="ri-loader-4-line animate-spin text-xs ml-0.5 text-gray-400" />}
                        </button>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                        <span className="text-xs font-medium" style={{ color: COLORS.gray }}>{listing.agent_name || '—'}</span>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                        <span className="text-xs" style={{ color: COLORS.gray }}>{formatDate(listing.created_at)}</span>
                      </td>
                      <td className="px-4 md:px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/crm/listings/edit/${listing.id}`)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            style={{ color: COLORS.gray }}
                            title="Edit Property"
                          >
                            <i className="ri-pencil-line text-sm" />
                          </button>
                          <button
                            onClick={(e) => openActionMenu(listing.id, e)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            style={{ color: COLORS.gray }}
                            title="More actions"
                          >
                            <i className="ri-more-2-line text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && listings.length > 0 && (
          <CRMPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Action Menu Dropdown */}
      {actionMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-lg border shadow-xl min-w-[210px] py-2"
          style={{ top: actionMenuPos.top, left: Math.min(actionMenuPos.left, window.innerWidth - 220), borderColor: COLORS.border }}
        >
          {(() => {
            const listing = listings.find((l) => l.id === actionMenu);
            if (!listing) return null;
            return (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: COLORS.gray }}>
                  View &amp; Performance
                </div>
                <button
                  onClick={() => { window.open(`/property/${listing.slug || listing.id}`, '_blank'); setActionMenu(null); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                  style={{ color: COLORS.navy }}
                >
                  <i className="ri-bar-chart-line text-gray-400" /> View Stats
                </button>
                <button
                  onClick={() => { window.open(`/property/${listing.slug || listing.id}`, '_blank'); setActionMenu(null); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                  style={{ color: COLORS.navy }}
                >
                  <i className="ri-global-line text-gray-400" /> View Public Page
                </button>
                <button
                  onClick={() => { window.open(`/property/${listing.slug || listing.id}`, '_blank'); setActionMenu(null); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                  style={{ color: COLORS.navy }}
                >
                  <i className="ri-eye-line text-gray-400" /> Preview Listing
                </button>
                <button
                  onClick={() => { navigate(`/crm/leads?listing=${listing.id}`); setActionMenu(null); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                  style={{ color: COLORS.navy }}
                >
                  <i className="ri-mail-line text-gray-400" /> View Inquiries
                </button>
                <div className="my-1 border-t" style={{ borderColor: COLORS.border }} />
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: COLORS.gray }}>
                  Edit &amp; Management
                </div>
                <button
                  onClick={() => { navigate(`/crm/listings/edit/${listing.id}`); setActionMenu(null); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                  style={{ color: COLORS.navy }}
                >
                  <i className="ri-edit-line text-gray-400" /> Edit Property
                </button>
                <button
                  onClick={() => { navigate(`/crm/listings/edit/${listing.id}`); setActionMenu(null); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                  style={{ color: COLORS.navy }}
                >
                  <i className="ri-pencil-ruler-line text-gray-400" /> Quick Edit
                </button>
                <button
                  onClick={() => handleDuplicate(listing.id)}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                  style={{ color: COLORS.navy }}
                >
                  <i className="ri-file-copy-line text-gray-400" /> Duplicate Listing
                </button>
                <button
                  onClick={() => { navigate(`/crm/listings/edit/${listing.id}?tab=media`); setActionMenu(null); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                  style={{ color: COLORS.navy }}
                >
                  <i className="ri-image-line text-gray-400" /> Edit Media Only
                </button>
                <div className="my-1 border-t" style={{ borderColor: COLORS.border }} />
                <button
                  onClick={() => { handleTogglePublish(listing.id, listing.is_published); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                  style={{ color: COLORS.navy }}
                >
                  <i className={`${listing.is_published ? 'ri-eye-off-line' : 'ri-eye-line'} text-gray-400`} />
                  {listing.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => { handleTogglePending(listing.id, listing.is_pending); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                  style={{ color: COLORS.navy }}
                >
                  <i className={`${listing.is_pending ? 'ri-close-circle-line' : 'ri-time-line'} text-gray-400`} />
                  {listing.is_pending ? 'Remove Pending Review' : 'Mark Pending Review'}
                </button>
                <div className="my-1 border-t" style={{ borderColor: COLORS.border }} />
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
                  Danger
                </div>
                <button
                  onClick={() => { setDeleteConfirm(listing.id); setActionMenu(null); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2 text-red-600"
                >
                  <i className="ri-delete-bin-line text-red-500" /> Delete Property
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteConfirm && deleteConfirm !== 'bulk'}
        title="Delete Property?"
        message="This will permanently remove the property and all associated data. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && deleteConfirm !== 'bulk' && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmModal
        open={deleteConfirm === 'bulk'}
        title={`Delete ${selectedIds.size} Properties?`}
        message="This will permanently remove all selected properties. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Bulk Publish/Unpublish Confirm */}
      <ConfirmModal
        open={!!bulkAction && bulkAction !== 'delete' && bulkAction !== 'feature' && bulkAction !== 'unfeature'}
        title={
          bulkAction === 'publish'
            ? `Publish ${selectedIds.size} Properties?`
            : `Unpublish ${selectedIds.size} Properties?`
        }
        message={
          bulkAction === 'publish'
            ? 'All selected properties will be published to the website.'
            : 'All selected properties will be hidden from the website.'
        }
        confirmLabel="Confirm"
        confirmVariant="primary"
        onConfirm={() => {
          if (bulkAction === 'publish') handleBulkPublish(true);
          else if (bulkAction === 'unpublish') handleBulkPublish(false);
        }}
        onCancel={() => { setBulkAction(''); setBulkActionOpen(false); }}
      />
    </div>
  );
}