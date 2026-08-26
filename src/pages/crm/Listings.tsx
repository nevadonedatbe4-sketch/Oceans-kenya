import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
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
  property_category: string;
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
  navy: '#001731',
  navyLight: '#002349',
  yellow: '#C9A84C',
  snowBlue: '#cce4f0',
  green: '#088135',
  gray: '#88929e',
  border: '#e5e7eb',
  bg: '#f7f8fa',
  white: '#ffffff',
};

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#6b7280] lg:text-[#88929e]">{label}</label>
      {children}
    </div>
  );
}

export default function Listings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agentId } = useAgentProfile();
  const isAgent = user?.role === 'agent';
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ListingStats>({ total: 0, published: 0, draft: 0, pending: 0 });
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all');
  const [filterPurpose, setFilterPurpose] = useState(searchParams.get('purpose') || 'all');
  const [filterType, setFilterType] = useState(searchParams.get('type') || 'all');
  const [filterCategory, setFilterCategory] = useState(searchParams.get('category') || 'all');
  const [filterBedrooms, setFilterBedrooms] = useState(searchParams.get('bedrooms') || 'all');
  const [filterBathrooms, setFilterBathrooms] = useState(searchParams.get('bathrooms') || 'all');
  const [priceMin, setPriceMin] = useState(searchParams.get('price_min') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('price_max') || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'date');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const actionButtonRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const bulkDropdownRef = useRef<HTMLDivElement>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let countQuery = supabase.from('listings').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('listings')
      .select('id, title, location, neighbourhood, property_type, sub_type, property_category, status, purpose, price, currency, bedrooms, bathrooms, is_published, is_pending, is_featured, is_homepage, created_at, main_image, cover_image, slug, agent_id, images')
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Agent filter — agents only see their own listings
    if (isAgent && agentId) {
      countQuery = countQuery.eq('agent_id', agentId);
      dataQuery = dataQuery.eq('agent_id', agentId);
    }

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
    if (filterCategory === 'residential') {
      countQuery = countQuery.eq('property_category', 'residential').neq('property_type', 'land');
      dataQuery = dataQuery.eq('property_category', 'residential').neq('property_type', 'land');
    } else if (filterCategory === 'commercial') {
      countQuery = countQuery.eq('property_category', 'commercial');
      dataQuery = dataQuery.eq('property_category', 'commercial');
    } else if (filterCategory === 'land') {
      countQuery = countQuery.eq('property_type', 'land');
      dataQuery = dataQuery.eq('property_type', 'land');
    } else if (filterCategory === 'joint-ventures') {
      countQuery = countQuery.eq('sub_type', 'joint_venture');
      dataQuery = dataQuery.eq('sub_type', 'joint_venture');
    } else if (filterCategory === 'new-developments') {
      countQuery = countQuery.eq('featured_new_development', true);
      dataQuery = dataQuery.eq('featured_new_development', true);
    }
    if (filterBedrooms !== 'all') {
      countQuery = countQuery.gte('bedrooms', Number(filterBedrooms));
      dataQuery = dataQuery.gte('bedrooms', Number(filterBedrooms));
    }
    if (filterBathrooms !== 'all') {
      countQuery = countQuery.gte('bathrooms', Number(filterBathrooms));
      dataQuery = dataQuery.gte('bathrooms', Number(filterBathrooms));
    }
    if (priceMin) {
      countQuery = countQuery.gte('price', Number(priceMin));
      dataQuery = dataQuery.gte('price', Number(priceMin));
    }
    if (priceMax) {
      countQuery = countQuery.lte('price', Number(priceMax));
      dataQuery = dataQuery.lte('price', Number(priceMax));
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
    const { data: statsData } = agentId && isAgent
      ? await supabase.from('listings').select('is_published, is_pending, is_featured').eq('agent_id', agentId)
      : await supabase.from('listings').select('is_published, is_pending, is_featured');

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
  }, [page, pageSize, filterStatus, filterPurpose, filterType, filterCategory, filterBedrooms, filterBathrooms, priceMin, priceMax, search, sortBy, isAgent, agentId]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        // Don't close if clicking the same button that opened the menu
        if (actionButtonRef.current && actionButtonRef.current.contains(target)) {
          return;
        }
        setActionMenu(null);
      }
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(target)) {
        setBulkActionOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActionMenu(null);
        setBulkActionOpen(false);
      }
    };
    const handleScroll = () => {
      setActionMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll);
    };
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

  const handleToggleHomepage = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error } = await supabase.from('listings').update({ is_homepage: !current }).eq('id', id);
    if (error) {
      addToast('Failed to update homepage status', 'error');
    } else {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_homepage: !current } : l)));
      addToast(current ? 'Removed from homepage' : 'Featured on homepage', 'success');
      broadcastSync();
    }
    setTogglingId(null);
    setActionMenu(null);
  };

  const handleMarkAsSold = async (id: string) => {
    setTogglingId(id);
    const { error } = await supabase.from('listings').update({ status: 'sold', is_published: false, is_pending: false }).eq('id', id);
    if (error) {
      addToast('Failed to mark as sold', 'error');
    } else {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'sold', is_published: false, is_pending: false } : l)));
      addToast('Property marked as sold', 'success');
      broadcastSync();
      fetchListings();
    }
    setTogglingId(null);
    setActionMenu(null);
  };

  const handleMarkAsUnderOffer = async (id: string) => {
    setTogglingId(id);
    const { error } = await supabase.from('listings').update({ status: 'under_offer' }).eq('id', id);
    if (error) {
      addToast('Failed to mark as under offer', 'error');
    } else {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'under_offer' } : l)));
      addToast('Property marked as under offer', 'success');
      broadcastSync();
    }
    setTogglingId(null);
    setActionMenu(null);
  };

  const handleReactivate = async (id: string) => {
    setTogglingId(id);
    const { error } = await supabase.from('listings').update({ status: 'available', is_published: true, is_pending: false }).eq('id', id);
    if (error) {
      addToast('Failed to reactivate listing', 'error');
    } else {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'available', is_published: true, is_pending: false } : l)));
      addToast('Listing reactivated', 'success');
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
    try {
      const { error } = await supabase.from('listings').delete().eq('id', id);
      if (error) {
        addToast('Failed to delete listing', 'error');
        setDeleteConfirm(null);
        return;
      }
      setListings((prev) => prev.filter((l) => l.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      addToast('Listing deleted', 'success');
      broadcastSync();
      fetchListings();
    } catch (err) {
      console.error('Delete listing error:', err);
      addToast('Failed to delete listing', 'error');
    }
    setDeleteConfirm(null);
    setActionMenu(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      addToast('No properties selected', 'error');
      setDeleteConfirm(null);
      setBulkAction('');
      return;
    }
    try {
      const { error } = await supabase.from('listings').delete().in('id', ids);
      if (error) {
        addToast('Failed to delete listings', 'error');
        setDeleteConfirm(null);
        return;
      }
      setListings((prev) => prev.filter((l) => !ids.includes(l.id)));
      setTotal((prev) => Math.max(0, prev - ids.length));
      addToast(`${ids.length} listings deleted`, 'success');
      broadcastSync();
      fetchListings();
    } catch (err) {
      console.error('Bulk delete error:', err);
      addToast('Failed to delete listings', 'error');
    }
    setDeleteConfirm(null);
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
    if (selectedIds.size === 0) {
      addToast('No properties selected', 'error');
      setBulkAction('');
      return;
    }
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
    const btn = e.currentTarget as HTMLElement;
    actionButtonRef.current = btn;
    if (actionMenu === id) {
      setActionMenu(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    setActionMenuPos({ top: rect.bottom + 4, left: Math.max(8, rect.left - 200) });
    setActionMenu(id);
  };

  const getPublishStatus = (l: Listing) => {
    if (l.is_featured && l.is_published) return { label: 'Featured', class: 'bg-[#088135] text-white' };
    if (l.is_published) return { label: 'Published', class: 'bg-[#088135] text-white' };
    if (l.is_pending) return { label: 'Pending', class: 'bg-[#F5C518] text-[#001731]' };
    return { label: 'Draft', class: 'bg-[#dc2626] text-white' };
  };

  const syncUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterPurpose !== 'all') params.set('purpose', filterPurpose);
    if (filterType !== 'all') params.set('type', filterType);
    if (filterCategory !== 'all') params.set('category', filterCategory);
    if (filterBedrooms !== 'all') params.set('bedrooms', filterBedrooms);
    if (filterBathrooms !== 'all') params.set('bathrooms', filterBathrooms);
    if (priceMin) params.set('price_min', priceMin);
    if (priceMax) params.set('price_max', priceMax);
    if (sortBy !== 'date') params.set('sort', sortBy);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [search, filterStatus, filterPurpose, filterType, filterCategory, filterBedrooms, filterBathrooms, priceMin, priceMax, sortBy, page, setSearchParams]);

  useEffect(() => {
    syncUrlParams();
  }, [syncUrlParams]);

  const formatPrice = (price: number, currency: string) => {
    if (!price || price === 0) return '—';
    const sym = currency === 'USD' ? '$' : currency === 'KES' ? 'KES ' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : 'KES ';
    return `${sym}${price.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const CATEGORY_TYPES: Record<string, string[]> = {
    residential: ['apartment', 'house', 'villa', 'townhouse', 'studio_flat', 'maisonette', 'detached', 'penthouse'],
    commercial: ['office', 'guest_house', 'commercial'],
    land: ['land'],
    'new-developments': [],
  };

  const TYPE_LABELS: Record<string, string> = {
    apartment: 'Apartment',
    house: 'House',
    villa: 'Villa',
    townhouse: 'Townhouse',
    studio_flat: 'Studio Flat',
    maisonette: 'Maisonette',
    detached: 'Detached House',
    penthouse: 'Penthouse',
    office: 'Office',
    guest_house: 'Guest House',
    commercial: 'Commercial',
    land: 'Land',
    single_family_home: 'Single Family Home',
    condo: 'Condo',
  };

  const selectCls = 'w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] cursor-pointer';

  const typeOptions = (() => {
    if (filterCategory === 'land' || filterCategory === 'joint-ventures' || filterCategory === 'new-developments') return [];
    const list = filterCategory === 'all'
      ? ['apartment', 'house', 'villa', 'townhouse', 'studio_flat', 'maisonette', 'detached', 'penthouse', 'office', 'guest_house', 'commercial', 'land', 'single_family_home', 'condo']
      : CATEGORY_TYPES[filterCategory] || [];
    return [{ value: 'all', label: 'All Types' }, ...list.map((t) => ({ value: t, label: TYPE_LABELS[t] || t }))];
  })();

  const activeFilterCount = [
    filterType !== 'all',
    filterPurpose !== 'all',
    filterBedrooms !== 'all',
    filterBathrooms !== 'all',
    priceMin !== '',
    priceMax !== '',
    filterStatus !== 'all',
    sortBy !== 'date',
  ].filter(Boolean).length;

  const handleCategoryChange = (val: string) => {
    setFilterCategory(val);
    setFilterType('all');
    setPage(1);
  };

  const clearFilters = () => {
    setFilterType('all');
    setFilterPurpose('all');
    setFilterBedrooms('all');
    setFilterBathrooms('all');
    setPriceMin('');
    setPriceMax('');
    setFilterStatus('all');
    setPage(1);
  };

  const statCards = [
    { label: 'Total Properties', value: stats.total, icon: 'ri-bar-chart-line', color: 'text-[#9ca3af]', bg: 'bg-[#f7f8fa]', border: 'border-[#e5e7eb]' },
    { label: 'Published', value: stats.published, icon: 'ri-check-double-line', color: 'text-[#088135]', bg: 'bg-[#e6f4ea]', border: 'border-[#088135]/20' },
    { label: 'Draft', value: stats.draft, icon: 'ri-draft-line', color: 'text-[#9ca3af]', bg: 'bg-[#f7f8fa]', border: 'border-[#e5e7eb]' },
    { label: 'Pending Review', value: stats.pending, icon: 'ri-time-line', color: 'text-[#f58300]', bg: 'bg-[#fff5e6]', border: 'border-[#f58300]/20' },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white lg:text-[#001731]">All Properties</h1>
          <p className="text-sm mt-0.5 text-[#6b7280] lg:text-[#88929e]">Manage every property on the Oceans Kenya platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/crm/listings/new')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            style={{ backgroundColor: '#0d5959', color: '#ffffff' }}
          >
            <i className="ri-add-line text-sm" />
            Add Property
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-lg p-4 flex items-center gap-3 bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent">
            <div className="w-10 h-10 rounded-lg bg-[#001731] lg:bg-white flex items-center justify-center lg:border" style={{ borderColor: stat.border }}>
              <i className={`${stat.icon} ${stat.color} text-lg`} />
            </div>
            <div>
              <p className="text-xl font-bold text-white lg:text-[#001731]">{stat.value}</p>
              <p className="text-xs font-medium text-[#6b7280] lg:text-[#88929e]">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-lg p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6b7280] lg:text-[#88929e]" />
            <input
              type="text"
              placeholder="Search title or location..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] placeholder:text-[#6b7280] lg:placeholder:text-[#88929e]"
            />
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
            <select
              value={filterCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="land">Land</option>
              <option value="joint-ventures">Joint Ventures</option>
              <option value="new-developments">New Developments</option>
            </select>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 border rounded-lg text-sm font-medium cursor-pointer transition-colors whitespace-nowrap bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] hover:bg-[#012a52] lg:hover:bg-[#f7f8fa]"
            >
              <i className="ri-equalizer-line text-sm" />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold bg-[#0d5959] text-white">
                  {activeFilterCount}
                </span>
              )}
              <i className={`${showAdvanced ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-sm`} />
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div className="pt-3 border-t border-[#1c3a5e] lg:border-[#e5e7eb]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {typeOptions.length > 0 && (
                <FilterField label="Property Type">
                  <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} className={selectCls}>
                    {typeOptions.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </FilterField>
              )}
              <FilterField label="Purpose">
                <select value={filterPurpose} onChange={(e) => { setFilterPurpose(e.target.value); setPage(1); }} className={selectCls}>
                  <option value="all">All Purposes</option>
                  <option value="sale">For Sale</option>
                  <option value="rent">For Rent</option>
                </select>
              </FilterField>
              <FilterField label="Bedrooms">
                <select value={filterBedrooms} onChange={(e) => { setFilterBedrooms(e.target.value); setPage(1); }} className={selectCls}>
                  <option value="all">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </FilterField>
              <FilterField label="Bathrooms">
                <select value={filterBathrooms} onChange={(e) => { setFilterBathrooms(e.target.value); setPage(1); }} className={selectCls}>
                  <option value="all">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </FilterField>
              <FilterField label="Price Range">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] placeholder:text-[#6b7280] lg:placeholder:text-[#88929e]"
                  />
                  <span className="text-xs text-[#6b7280] lg:text-[#88929e]">—</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-[#001731] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] placeholder:text-[#6b7280] lg:placeholder:text-[#88929e]"
                  />
                </div>
              </FilterField>
              <FilterField label="Status">
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className={selectCls}>
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending Review</option>
                  <option value="featured">Featured</option>
                </select>
              </FilterField>
              <FilterField label="Sort">
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className={selectCls}>
                  <option value="date">Sort by Date</option>
                  <option value="price">Sort by Price</option>
                  <option value="title">Sort by Title</option>
                  <option value="featured">Sort by Featured</option>
                </select>
              </FilterField>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold cursor-pointer hover:underline"
                style={{ color: COLORS.gray }}
              >
                <i className="ri-close-circle-line" />
                Clear all filters
              </button>
            )}
          </div>
        )}
        <div className="flex items-center justify-between text-xs font-medium text-[#6b7280] lg:text-[#88929e]">
          <span>{total} listings</span>
          <span>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium text-white lg:text-[#001731]">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-[#1c3a5e] lg:bg-[#e5e7eb]" />
          <div className="relative" ref={bulkDropdownRef}>
            <button
              onClick={() => setBulkActionOpen(!bulkActionOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium cursor-pointer hover:bg-[#0d5959]/10 lg:hover:bg-[#f7f8fa] whitespace-nowrap border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731]"
            >
              <i className="ri-arrow-down-s-line" />
              {bulkAction ? bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1) : 'Bulk Actions'}
            </button>
            {bulkActionOpen && (
              <div
                className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden min-w-[180px] py-2 animate-dropdown-enter"
                style={{
                  backgroundColor: '#001731',
                  border: '1px solid rgba(13,89,89,0.35)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(13,89,89,0.15)',
                }}
              >
                <button
                  onClick={() => { setBulkAction('publish'); setBulkActionOpen(false); }}
                  className="w-full text-left px-3 py-2.5 text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#0d5959]/25"
                  style={{ color: '#e2e8f0' }}
                >
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(8,129,53,0.15)' }}>
                    <i className="ri-eye-line text-[#4ade80] text-[11px]" />
                  </span>
                  Publish
                </button>
                <button
                  onClick={() => { setBulkAction('unpublish'); setBulkActionOpen(false); }}
                  className="w-full text-left px-3 py-2.5 text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#0d5959]/25"
                  style={{ color: '#e2e8f0' }}
                >
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(156,163,175,0.15)' }}>
                    <i className="ri-eye-off-line text-[#94a3b8] text-[11px]" />
                  </span>
                  Unpublish
                </button>
                <button
                  onClick={() => { setBulkAction('feature'); setBulkActionOpen(false); }}
                  className="w-full text-left px-3 py-2.5 text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#C9A84C]/15"
                  style={{ color: '#e2e8f0' }}
                >
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(201,168,76,0.15)' }}>
                    <i className="ri-star-fill text-[#fbbf24] text-[11px]" />
                  </span>
                  Mark Featured
                </button>
                <button
                  onClick={() => { setBulkAction('unfeature'); setBulkActionOpen(false); }}
                  className="w-full text-left px-3 py-2.5 text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#C9A84C]/15"
                  style={{ color: '#e2e8f0' }}
                >
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(156,163,175,0.15)' }}>
                    <i className="ri-star-line text-[#94a3b8] text-[11px]" />
                  </span>
                  Remove Featured
                </button>
                <div className="mx-3 my-1" style={{ height: 1, backgroundColor: 'rgba(220,38,38,0.2)' }} />
                <button
                  onClick={() => { setBulkAction('delete'); setBulkActionOpen(false); }}
                  className="w-full text-left px-3 py-2.5 text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#dc2626]/15"
                  style={{ color: '#f87171' }}
                >
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(220,38,38,0.15)' }}>
                    <i className="ri-delete-bin-line text-[#f87171] text-[11px]" />
                  </span>
                  Delete
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
      <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-lg overflow-hidden" style={{ borderColor: COLORS.border }}>
        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#001731] border border-[#1c3a5e] rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-10 rounded bg-[#012a52] animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-full bg-[#012a52] rounded animate-pulse" />
                    <div className="h-3 w-20 bg-[#012a52] rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))
          ) : listings.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-[#0d5959]/20 flex items-center justify-center mx-auto mb-3">
                <i className="ri-building-line text-[#5eead4] text-xl" />
              </div>
              <p className="text-sm font-medium text-[#6b7280]">
                {total === 0 ? 'No properties yet. Add your first property.' : 'No properties match your filters.'}
              </p>
              {total === 0 && (
                <button onClick={() => navigate('/crm/listings/new')} className="text-sm text-[#5eead4] mt-2 cursor-pointer">
                  Create a property
                </button>
              )}
            </div>
          ) : (
            listings.map((listing) => {
              const status = getPublishStatus(listing);
              return (
                <div
                  key={listing.id}
                  onClick={() => navigate(`/crm/listings/edit/${listing.id}`)}
                  className="bg-[#001731] border border-[#1c3a5e] rounded-xl p-4 space-y-2.5 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {listing.main_image ? (
                      <img src={listing.main_image} alt="" className="w-14 h-10 rounded object-cover flex-shrink-0" />
                    ) : listing.images && listing.images.length > 0 ? (
                      <img src={listing.images[0]} alt="" className="w-14 h-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-10 rounded flex items-center justify-center flex-shrink-0 bg-[#0d5959]/20">
                        <i className="ri-building-line text-[#5eead4] text-sm" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white leading-snug truncate">
                        {(() => {
                          const words = (listing.title || 'Untitled Draft').split(/\s+/);
                          return words.length > 6 ? words.slice(0, 6).join(' ') + '...' : listing.title || 'Untitled Draft';
                        })()}
                      </p>
                      <p className="text-[11px] font-semibold text-[#6b7280] truncate flex items-center gap-1">
                        <i className="ri-map-pin-line text-[10px]" />
                        {listing.neighbourhood || '—'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => openActionMenu(listing.id, e)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{ backgroundColor: 'rgba(13,89,89,0.15)', color: '#5eead4' }}
                    >
                      <i className="ri-more-fill text-sm" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{formatPrice(Number(listing.price), listing.currency)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold capitalize" style={{ color: listing.purpose === 'rent' ? '#4ade80' : '#ffffff' }}>
                        {listing.purpose === 'sale' ? 'For Sale' : listing.purpose === 'rent' ? 'For Rent' : '—'}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${status.class}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden lg:block">
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
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.gray }}>Property</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: COLORS.gray }}>Property Type</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.gray }}>Price</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.gray }}>Purpose</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: COLORS.gray }}>Status</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: COLORS.gray }}>Date</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.gray }}>Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#f0f0f0' }}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 md:px-5 py-4"><div className="w-5 h-5 bg-[#f7f8fa] rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-[72px] h-[52px] rounded bg-[#f7f8fa] animate-pulse" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-full bg-[#f7f8fa] rounded animate-pulse" />
                          <div className="h-3.5 w-3/4 bg-[#f7f8fa] rounded animate-pulse" />
                          <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                          <div className="h-2.5 w-32 bg-[#f7f8fa] rounded animate-pulse" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-5 py-4 hidden sm:table-cell"><div className="h-3 w-16 bg-[#f7f8fa] rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-4"><div className="h-3.5 w-20 bg-[#f7f8fa] rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-4"><div className="h-5 w-16 bg-[#f7f8fa] rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-4 hidden md:table-cell"><div className="h-5 w-10 bg-[#f7f8fa] rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-4 hidden md:table-cell"><div className="h-3 w-16 bg-[#f7f8fa] rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-4"><div className="h-8 w-20 bg-[#f7f8fa] rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 md:px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e6f4ea' }}>
                        <i className="ri-building-line text-[#088135] text-xl" />
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
                    <tr key={listing.id} onClick={() => navigate(`/crm/listings/edit/${listing.id}`)} className="hover:bg-[#f7f8fa]/80 transition-colors group cursor-pointer">
                      <td className="px-3 md:px-5 py-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelect(listing.id); }}
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
                      <td className="px-4 md:px-5 py-4 max-w-[260px]">
                        <div className="flex items-start gap-3">
                          {listing.main_image ? (
                            <img src={listing.main_image} alt="" className="w-[72px] h-[52px] rounded object-cover flex-shrink-0 mt-0.5" />
                          ) : listing.images && listing.images.length > 0 ? (
                            <img src={listing.images[0]} alt="" className="w-[72px] h-[52px] rounded object-cover flex-shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-[72px] h-[52px] rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(0,23,49,0.08)' }}>
                              <i className="ri-building-line text-[#001731] text-sm" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/crm/listings/edit/${listing.id}`); }}
                              className="text-[13px] font-semibold block w-full text-left hover:underline cursor-pointer transition-colors leading-snug"
                              style={{ color: '#001731' }}
                            >
                              {(() => {
                                const base = listing.title || 'Untitled Draft';
                                const words = base.split(/\s+/);
                                return words.length > 6 ? words.slice(0, 6).join(' ') + '...' : base;
                              })()}
                            </button>
                            <p className="text-[11px] font-semibold truncate leading-snug flex items-center gap-1" style={{ color: '#1a1a1a' }}>
                              <i className="ri-map-pin-line text-[10px]" style={{ color: '#636363' }} />
                              {listing.neighbourhood || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-4 hidden sm:table-cell">
                        <span className="text-xs capitalize" style={{ color: COLORS.gray }}>{listing.property_type?.replace(/_/g, ' ')}</span>
                        {listing.sub_type && <p className="text-xs capitalize opacity-70" style={{ color: COLORS.gray }}>{listing.sub_type}</p>}
                      </td>
                      <td className="px-4 md:px-5 py-4">
                        <p className="text-sm font-semibold" style={{ color: COLORS.navy }}>{formatPrice(Number(listing.price), listing.currency)}</p>
                      </td>
                      <td className="px-4 md:px-5 py-4">
                        <span className="text-xs font-bold capitalize whitespace-nowrap" style={{ color: listing.purpose === 'rent' ? COLORS.green : COLORS.navy }}>
                          {listing.purpose === 'sale' ? 'For Sale' : listing.purpose === 'rent' ? 'For Rent' : listing.purpose || '—'}
                        </span>
                      </td>
                      <td className="px-4 md:px-5 py-4 hidden md:table-cell">
                        <span className={`inline-flex px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 md:px-5 py-4 hidden md:table-cell">
                        <span className="text-xs" style={{ color: COLORS.gray }}>{formatDate(listing.created_at)}</span>
                      </td>
                      <td className="px-4 md:px-5 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <button
                            onClick={(e) => openActionMenu(listing.id, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold border transition-colors cursor-pointer hover:bg-[#001731]/5 whitespace-nowrap"
                            style={{ borderColor: 'rgba(13,89,89,0.3)', color: '#0d5959', backgroundColor: 'rgba(13,89,89,0.06)' }}
                            title="More actions"
                          >
                            <i className="ri-more-fill text-xs" />
                            Actions
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/crm/listings/edit/${listing.id}?tab=contact`); }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer hover:underline whitespace-nowrap transition-colors"
                            style={{ color: '#088135' }}
                            title="Open Source & Contact (team only)"
                          >
                            <i className="ri-shield-keyhole-line text-[11px]" />
                            Source &amp; Contact
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

      {actionMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 rounded-xl overflow-hidden animate-dropdown-enter"
          style={{
            top: actionMenuPos.top,
            left: Math.min(actionMenuPos.left, window.innerWidth - 260),
            width: 240,
            backgroundColor: '#001731',
            border: '1px solid rgba(13,89,89,0.35)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(13,89,89,0.15)',
          }}
        >
          {(() => {
            const listing = listings.find((l) => l.id === actionMenu);
            if (!listing) return null;
            return (
              <div className="flex flex-col">
                {/* Property Header */}
                <div
                  className="px-4 py-3 flex items-start gap-3"
                  style={{ borderBottom: '1px solid rgba(13,89,89,0.25)' }}
                >
                  {listing.main_image ? (
                    <img src={listing.main_image} alt="" className="w-12 h-9 rounded-lg object-cover flex-shrink-0" />
                  ) : listing.images && listing.images.length > 0 ? (
                    <img src={listing.images[0]} alt="" className="w-12 h-9 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(13,89,89,0.2)' }}>
                      <i className="ri-building-line text-[#5eead4] text-sm" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-white leading-snug truncate">
                      {(() => {
                        const base = listing.title || 'Untitled Draft';
                        const words = base.split(/\s+/);
                        return words.length > 6 ? words.slice(0, 6).join(' ') + '...' : base;
                      })()}
                    </p>
                    <p className="text-[10px] text-[#6b8fa8] mt-0.5 truncate">{listing.neighbourhood || '—'}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="px-2 pt-2 pb-1">
                  <p className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: '#5eead4' }}>
                    Quick Actions
                  </p>
                  <button
                    onClick={() => { navigate(`/crm/listings/edit/${listing.id}`); setActionMenu(null); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#0d5959]/25"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(13,89,89,0.2)' }}>
                      <i className="ri-edit-box-line text-[#5eead4] text-xs" />
                    </span>
                    Edit Property
                  </button>
                  <button
                    onClick={() => { navigate(`/crm/listings/edit/${listing.id}?tab=media`); setActionMenu(null); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#0d5959]/25"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(13,89,89,0.2)' }}>
                      <i className="ri-image-add-line text-[#5eead4] text-xs" />
                    </span>
                    Update Media
                  </button>
                  <button
                    onClick={() => { navigate(`/crm/listings/edit/${listing.id}?tab=details`); setActionMenu(null); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#0d5959]/25"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(13,89,89,0.2)' }}>
                      <i className="ri-price-tag-3-line text-[#5eead4] text-xs" />
                    </span>
                    Update Price &amp; Details
                  </button>
                </div>

                {/* Divider */}
                <div className="mx-3 my-1" style={{ height: 1, backgroundColor: 'rgba(13,89,89,0.2)' }} />

                {/* Status & Publishing */}
                <div className="px-2 pt-1 pb-1">
                  <p className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: '#C9A84C' }}>
                    Status &amp; Publishing
                  </p>
                  <button
                    onClick={() => { handleTogglePublish(listing.id, listing.is_published); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#C9A84C]/15"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: listing.is_published ? 'rgba(220,38,38,0.15)' : 'rgba(8,129,53,0.15)' }}>
                      <i className={`${listing.is_published ? 'ri-eye-off-line' : 'ri-eye-line'} text-xs`} style={{ color: listing.is_published ? '#f87171' : '#4ade80' }} />
                    </span>
                    {listing.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => { handleToggleFeature(listing.id, listing.is_featured); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#C9A84C]/15"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: listing.is_featured ? 'rgba(245,131,0,0.15)' : 'rgba(201,168,76,0.15)' }}>
                      <i className={`${listing.is_featured ? 'ri-star-fill' : 'ri-star-line'} text-xs`} style={{ color: listing.is_featured ? '#fbbf24' : '#C9A84C' }} />
                    </span>
                    {listing.is_featured ? 'Remove Featured' : 'Mark Featured'}
                  </button>
                  <button
                    onClick={() => { handleToggleHomepage(listing.id, listing.is_homepage); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#C9A84C]/15"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: listing.is_homepage ? 'rgba(8,129,53,0.15)' : 'rgba(201,168,76,0.15)' }}>
                      <i className={`${listing.is_homepage ? 'ri-home-2-fill' : 'ri-home-2-line'} text-xs`} style={{ color: listing.is_homepage ? '#4ade80' : '#C9A84C' }} />
                    </span>
                    {listing.is_homepage ? 'Remove Homepage' : 'Homepage'}
                  </button>
                  <button
                    onClick={() => { handleTogglePending(listing.id, listing.is_pending); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#C9A84C]/15"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: listing.is_pending ? 'rgba(220,38,38,0.15)' : 'rgba(245,131,0,0.15)' }}>
                      <i className={`${listing.is_pending ? 'ri-close-circle-line' : 'ri-time-line'} text-xs`} style={{ color: listing.is_pending ? '#f87171' : '#fbbf24' }} />
                    </span>
                    {listing.is_pending ? 'Remove Pending' : 'Pending Review'}
                  </button>
                </div>

                {/* Divider */}
                <div className="mx-3 my-1" style={{ height: 1, backgroundColor: 'rgba(13,89,89,0.2)' }} />

                {/* Transaction Status */}
                <div className="px-2 pt-1 pb-1">
                  <p className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: '#6b8fa8' }}>
                    Transaction
                  </p>
                  <button
                    onClick={() => { handleMarkAsSold(listing.id); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#088135]/15"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(8,129,53,0.15)' }}>
                      <i className="ri-check-double-line text-[#4ade80] text-xs" />
                    </span>
                    Mark as Sold
                  </button>
                  <button
                    onClick={() => { handleMarkAsUnderOffer(listing.id); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#f58300]/15"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245,131,0,0.15)' }}>
                      <i className="ri-hand-coin-line text-[#fbbf24] text-xs" />
                    </span>
                    Under Offer
                  </button>
                  <button
                    onClick={() => { handleReactivate(listing.id); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#0d5959]/25"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(13,89,89,0.2)' }}>
                      <i className="ri-refresh-line text-[#5eead4] text-xs" />
                    </span>
                    Reactivate
                  </button>
                </div>

                {/* Divider */}
                <div className="mx-3 my-1" style={{ height: 1, backgroundColor: 'rgba(13,89,89,0.2)' }} />

                {/* View & Share */}
                <div className="px-2 pt-1 pb-1">
                  <p className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: '#6b8fa8' }}>
                    View &amp; Share
                  </p>
                  <button
                    onClick={() => { window.open(`/property/${listing.slug || listing.id}`, '_blank'); setActionMenu(null); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#0d5959]/25"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(13,89,89,0.2)' }}>
                      <i className="ri-eye-line text-[#94a3b8] text-xs" />
                    </span>
                    Public Page
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/property/${listing.slug || listing.id}`); addToast('Link copied to clipboard', 'success'); setActionMenu(null); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#0d5959]/25"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(13,89,89,0.2)' }}>
                      <i className="ri-link text-[#94a3b8] text-xs" />
                    </span>
                    Copy Link
                  </button>
                  <button
                    onClick={() => { navigate(`/crm/leads?listing=${listing.id}`); setActionMenu(null); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#0d5959]/25"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(13,89,89,0.2)' }}>
                      <i className="ri-mail-line text-[#94a3b8] text-xs" />
                    </span>
                    View Inquiries
                  </button>
                </div>

                {/* Divider */}
                <div className="mx-3 my-1" style={{ height: 1, backgroundColor: 'rgba(13,89,89,0.2)' }} />

                {/* Utility */}
                <div className="px-2 pt-1 pb-1">
                  <button
                    onClick={() => handleDuplicate(listing.id)}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#0d5959]/25"
                    style={{ color: '#e2e8f0' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(13,89,89,0.2)' }}>
                      <i className="ri-file-copy-line text-[#94a3b8] text-xs" />
                    </span>
                    Duplicate
                  </button>
                </div>

                {/* Divider */}
                <div className="mx-3 my-1" style={{ height: 1, backgroundColor: 'rgba(220,38,38,0.2)' }} />

                {/* Danger Zone */}
                <div className="px-2 pt-1 pb-2">
                  <button
                    onClick={() => { setDeleteConfirm(listing.id); setActionMenu(null); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2.5 hover:bg-[#dc2626]/15"
                    style={{ color: '#f87171' }}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(220,38,38,0.15)' }}>
                      <i className="ri-delete-bin-line text-[#f87171] text-xs" />
                    </span>
                    Delete Property
                  </button>
                </div>
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