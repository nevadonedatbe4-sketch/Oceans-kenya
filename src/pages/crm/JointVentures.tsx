import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import { broadcastSync } from '@/lib/syncEngine';
import JVProjects from '@/pages/crm/JVProjects';
import JVFaqs from '@/pages/crm/JVFaqs';

interface LandListing {
  id: string;
  title: string;
  slug: string;
  location: string;
  state_region: string;
  sub_type: string;
  land_size: number | null;
  land_unit: string | null;
  size: number | null;
  size_unit: string | null;
  price: number;
  currency: string;
  is_published: boolean;
  is_pending: boolean;
  is_featured: boolean;
  main_image: string | null;
  images: string[] | null;
  description: string | null;
  property_id: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
}

interface JVStats {
  total: number;
  published: number;
  jointVenture: number;
  outright: number;
  pending: number;
}

interface JVSubmission {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  submission_type: 'landowner' | 'jv_proposal' | 'investor';
  land_location: string | null;
  land_size: string | null;
  title_status: string | null;
  preferred_structure: string | null;
  budget_range: string | null;
  preferred_location: string | null;
  preferred_use: string | null;
  timeline: string | null;
  message: string | null;
  status: 'new' | 'reviewed' | 'contacted' | 'archived';
  created_at: string;
}

type ActiveTab = 'listings' | 'submissions' | 'projects' | 'faqs';

const STATUS_OPTIONS = ['new', 'reviewed', 'contacted', 'archived'] as const;

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  contacted: 'Contacted',
  archived: 'Archived',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  reviewed: 'bg-[#fff5e6] text-[#f58300]',
  contacted: 'bg-[#e6f4ea] text-[#088135]',
  archived: 'bg-[#f7f8fa] text-[#9ca3af]',
};

const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  landowner: 'Land Listing',
  jv_proposal: 'JV Submission',
  investor: 'Capital Venture',
};

const TITLE_STATUS_LABELS: Record<string, string> = {
  freehold: 'Freehold',
  leasehold: 'Leasehold',
  mailo: 'Mailo',
  kibanja: 'Kibanja / Customary',
  in_process: 'In Process',
};

const STRUCTURE_LABELS: Record<string, string> = {
  revenue_share: 'JV — Revenue Share',
  equity_split: 'JV — Equity Split',
  lease_to_jv: 'Lease-to-JV',
  outright_sale: 'Outright Sale',
  advise: 'Not Sure — Advise',
};

const BUDGET_LABELS: Record<string, string> = {
  below_100m: 'Below 100M',
  '100m_500m': '100M – 500M',
  '500m_1b': '500M – 1B',
  '1b_5b': '1B – 5B',
  above_5b: 'Above 5B',
};

const USE_LABELS: Record<string, string> = {
  agriculture: 'Agriculture / Agri-processing',
  residential: 'Residential Estate',
  commercial: 'Commercial',
  mixed_use: 'Mixed-use',
  outright_purchase: 'Outright Purchase Only',
};

const TIMELINE_LABELS: Record<string, string> = {
  within_30_days: 'Within 30 Days',
  '1_3_months': '1–3 Months',
  '3_6_months': '3–6 Months',
  exploring: 'Exploring Options',
};

export default function JointVenturesCRM() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const tab = searchParams.get('tab');
    return tab === 'submissions' || tab === 'projects' || tab === 'faqs' ? tab : 'listings';
  });

  // Land listings state
  const [listings, setListings] = useState<LandListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubType, setFilterSubType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(9);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<JVStats>({ total: 0, published: 0, jointVenture: 0, outright: 0, pending: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Submissions state
  const [submissions, setSubmissions] = useState<JVSubmission[]>([]);
  const [subLoading, setSubLoading] = useState(true);
  const [subError, setSubError] = useState('');
  const [subFilterType, setSubFilterType] = useState('all');
  const [subFilterStatus, setSubFilterStatus] = useState('all');
  const [subSearch, setSubSearch] = useState('');
  const [subPage, setSubPage] = useState(1);
  const [subPageSize] = useState(10);
  const [subTotal, setSubTotal] = useState(0);
  const [subStats, setSubStats] = useState({ total: 0, newCount: 0, landowner: 0, jvProposal: 0, investor: 0 });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ---- Land Listings Fetch ----
  const fetchListings = useCallback(async () => {
    setLoading(true);

    let countQuery = supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('property_type', 'land');

    let dataQuery = supabase
      .from('listings')
      .select('id, title, slug, location, state_region, sub_type, land_size, land_unit, size, size_unit, price, currency, is_published, is_pending, is_featured, main_image, images, description, property_id, custom_fields, created_at')
      .eq('property_type', 'land')
      .order('created_at', { ascending: false })
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

    if (filterSubType !== 'all') {
      countQuery = countQuery.eq('sub_type', filterSubType);
      dataQuery = dataQuery.eq('sub_type', filterSubType);
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
      setListings((data || []) as LandListing[]);
      setTotal(count ?? 0);
    }

    const { data: allLand } = await supabase
      .from('listings')
      .select('is_published, is_pending, sub_type')
      .eq('property_type', 'land');

    const all = allLand || [];
    const published = all.filter((l) => l.is_published).length;
    const pending = all.filter((l) => !l.is_published && l.is_pending).length;
    const jv = all.filter((l) => l.sub_type === 'joint_venture').length;
    const outright = all.filter((l) => l.sub_type !== 'joint_venture').length;

    setStats({ total: all.length, published, jointVenture: jv, outright, pending });
    setLoading(false);
  }, [page, pageSize, filterStatus, filterSubType, search]);

  useEffect(() => {
    if (activeTab === 'listings') fetchListings();
  }, [fetchListings, activeTab]);

  // ---- Submissions Fetch ----
  const fetchSubmissions = useCallback(async () => {
    setSubLoading(true);
    setSubError('');

    try {
      let countQuery = supabase
        .from('jv_submissions')
        .select('*', { count: 'exact', head: true });

      let dataQuery = supabase
        .from('jv_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .range((subPage - 1) * subPageSize, subPage * subPageSize - 1);

      if (subFilterType !== 'all') {
        countQuery = countQuery.eq('submission_type', subFilterType);
        dataQuery = dataQuery.eq('submission_type', subFilterType);
      }

      if (subFilterStatus !== 'all') {
        countQuery = countQuery.eq('status', subFilterStatus);
        dataQuery = dataQuery.eq('status', subFilterStatus);
      }

      if (subSearch.trim()) {
        const term = subSearch.trim();
        countQuery = countQuery.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
        dataQuery = dataQuery.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);

      if (error) throw error;

      setSubmissions((data || []) as JVSubmission[]);
      setSubTotal(count ?? 0);

      // Sub-stats
      const { data: allSubs } = await supabase
        .from('jv_submissions')
        .select('submission_type, status');

      const subs = allSubs || [];
      setSubStats({
        total: subs.length,
        newCount: subs.filter((s) => s.status === 'new').length,
        landowner: subs.filter((s) => s.submission_type === 'landowner').length,
        jvProposal: subs.filter((s) => s.submission_type === 'jv_proposal').length,
        investor: subs.filter((s) => s.submission_type === 'investor').length,
      });
    } catch (err: unknown) {
      setSubError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setSubLoading(false);
    }
  }, [subPage, subPageSize, subFilterType, subFilterStatus, subSearch]);

  useEffect(() => {
    if (activeTab === 'submissions') fetchSubmissions();
  }, [fetchSubmissions, activeTab]);

  // ---- Status update ----
  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from('jv_submissions')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      addToast('Failed to update status', 'error');
    } else {
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status: newStatus as JVSubmission['status'] } : s)));
      setSubStats((prev) => {
        const oldSub = submissions.find((s) => s.id === id);
        const oldStatus = oldSub?.status;
        let newCount = prev.newCount;
        if (oldStatus === 'new' && newStatus !== 'new') newCount = Math.max(0, newCount - 1);
        if (oldStatus !== 'new' && newStatus === 'new') newCount += 1;
        return { ...prev, newCount };
      });
      addToast(`Submission marked as ${STATUS_LABELS[newStatus] || newStatus}`, 'success');
    }
    setUpdatingId(null);
  };

  // ---- Land listing actions ----
  const handleTogglePublish = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error } = await supabase.from('listings').update({ is_published: !current, is_pending: false }).eq('id', id);
    if (error) {
      addToast('Failed to update status', 'error');
    } else {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_published: !current, is_pending: false } : l)));
      addToast(current ? 'Land listing unpublished' : 'Land listing published', 'success');
      broadcastSync();
      fetchListings();
    }
    setTogglingId(null);
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error } = await supabase.from('listings').update({ is_featured: !current }).eq('id', id);
    if (error) {
      addToast('Failed to update feature status', 'error');
    } else {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_featured: !current } : l)));
      addToast(current ? 'Land unfeatured' : 'Land featured', 'success');
      broadcastSync();
    }
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) {
      addToast('Failed to delete land listing', 'error');
    } else {
      setListings((prev) => prev.filter((l) => l.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      addToast('Land listing deleted', 'success');
      broadcastSync();
      fetchListings();
    }
    setDeleteConfirm(null);
  };

  // ---- Formatting helpers ----
  const formatPrice = (price: number, currency: string) => {
    if (!price || price === 0) return 'On request';
    const sym = currency?.toUpperCase() === 'USD' ? '$' : currency?.toUpperCase() === 'EUR' ? '€' : currency?.toUpperCase() === 'GBP' ? '£' : 'KSh ';
    if (price >= 1000000000) return `${sym}${(price / 1000000000).toFixed(1)}B`;
    if (price >= 1000000) return `${sym}${(price / 1000000).toFixed(price % 1000000 === 0 ? 0 : 1)}M`;
    if (price >= 1000) return `${sym}${(price / 1000).toFixed(0)}K`;
    return `${sym}${price.toLocaleString()}`;
  };

  const formatSize = (listing: LandListing) => {
    if (listing.land_size) return `${listing.land_size} ${listing.land_unit || 'acres'}`;
    if (listing.size) return `${listing.size} ${listing.size_unit || 'sqm'}`;
    return '—';
  };

  const getTitleType = (listing: LandListing) => {
    if (listing.custom_fields && typeof listing.custom_fields === 'object' && listing.custom_fields !== null) {
      return (listing.custom_fields as Record<string, unknown>).title_type as string || '—';
    }
    return '—';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statCards = [
    { label: 'Total Land', value: stats.total, icon: 'ri-landscape-line', color: 'text-[#9ca3af]', bg: 'bg-[#f7f8fa]' },
    { label: 'Published', value: stats.published, icon: 'ri-check-double-line', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Joint Venture', value: stats.jointVenture, icon: 'ri-group-line', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Outright Sale', value: stats.outright, icon: 'ri-price-tag-3-line', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ];

  const subStatCards = [
    { label: 'Total Briefs', value: subStats.total, icon: 'ri-file-list-3-line', color: 'text-[#9ca3af]', bg: 'bg-[#f7f8fa]' },
    { label: 'New', value: subStats.newCount, icon: 'ri-mail-unread-line', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Land Listings', value: subStats.landowner, icon: 'ri-landscape-line', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'JV Submissions', value: subStats.jvProposal, icon: 'ri-building-2-line', color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Capital Ventures', value: subStats.investor, icon: 'ri-funds-line', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div>
          <h1 className="font-jost text-xl font-semibold text-[#001731]">Joint Ventures Desk</h1>
          <p className="text-sm font-roboto text-[#636363] mt-0.5">Manage land listings, JV opportunities, and submissions from landowners &amp; investors</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/crm/joint-ventures/new')}
            className="inline-flex items-center gap-2 bg-[#001731] hover:bg-[#001731]/90 text-white px-4 py-2.5 rounded-lg text-sm font-roboto transition-all whitespace-nowrap cursor-pointer"
          >
            <i className="ri-file-add-line" />
            Add Submission
          </button>
          <button
            onClick={() => navigate('/crm/listings/new')}
            className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2.5 rounded-lg text-sm font-roboto transition-all whitespace-nowrap cursor-pointer"
          >
            <i className="ri-add-line" />
            Add Land Listing
          </button>
          <button
            onClick={() => { navigate('/crm/listings'); }}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto text-[#636363] hover:text-[#0d5959] hover:border-[#0d5959]/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-building-line" />
            All Properties
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-[#e8edf2] rounded-full px-1 py-1 w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-5 py-2 rounded-full text-sm font-roboto whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'projects'
              ? 'bg-white text-[#001731] font-semibold shadow-sm'
              : 'text-[#636363] hover:text-[#001731]'
          }`}
        >
          <i className="ri-building-2-line mr-1.5 text-xs" />
          Projects Seeking Partners
        </button>
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-5 py-2 rounded-full text-sm font-roboto whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'listings'
              ? 'bg-white text-[#001731] font-semibold shadow-sm'
              : 'text-[#636363] hover:text-[#001731]'
          }`}
        >
          <i className="ri-landscape-line mr-1.5 text-xs" />
          Land Listings
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-5 py-2 rounded-full text-sm font-roboto whitespace-nowrap cursor-pointer transition-all relative ${
            activeTab === 'submissions'
              ? 'bg-white text-[#001731] font-semibold shadow-sm'
              : 'text-[#636363] hover:text-[#001731]'
          }`}
        >
          <i className="ri-file-list-3-line mr-1.5 text-xs" />
          JV Submissions
          {subStats.newCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
              {subStats.newCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-5 py-2 rounded-full text-sm font-roboto whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'faqs'
              ? 'bg-white text-[#001731] font-semibold shadow-sm'
              : 'text-[#636363] hover:text-[#001731]'
          }`}
        >
          <i className="ri-question-answer-line mr-1.5 text-xs" />
          FAQs
        </button>
      </div>

      {/* ==================== LAND LISTINGS TAB ==================== */}
      {activeTab === 'listings' && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((stat) => (
              <div key={stat.label} className={`rounded-lg p-4 flex items-center gap-3 ${stat.bg}`}>
                <div className="w-10 h-10 rounded-lg bg-white border border-[#f0f0f0] flex items-center justify-center">
                  <i className={`${stat.icon} ${stat.color} text-lg`} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-[#001731]">{stat.value}</p>
                  <p className="text-xs text-[#636363] font-roboto">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-lg p-4 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
              <div className="relative flex-1 max-w-md w-full">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#636363] text-sm" />
                <input
                  type="text"
                  placeholder="Search title, location or district..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white"
                />
              </div>
              <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
                <select
                  value={filterSubType}
                  onChange={(e) => { setFilterSubType(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]"
                >
                  <option value="all">All Types</option>
                  <option value="joint_venture">Joint Venture</option>
                  <option value="outright">Outright Purchase</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]"
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending Review</option>
                  <option value="featured">Featured</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[#636363] font-roboto">
              <span>{total} land listings</span>
              <span>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#f0f0f0] p-5 space-y-3 animate-pulse">
                  <div className="h-32 bg-[#f7f8fa] rounded-lg" />
                  <div className="h-4 w-3/4 bg-[#f7f8fa] rounded" />
                  <div className="h-3 w-1/2 bg-[#f7f8fa] rounded" />
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="h-5 bg-[#f7f8fa] rounded" />
                    <div className="h-5 bg-[#f7f8fa] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="bg-white rounded-xl py-14 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-[#0d5959]/8 flex items-center justify-center">
                  <i className="ri-landscape-line text-[#0d5959] text-2xl" />
                </div>
                <p className="text-sm font-roboto text-[#636363]">
                  {total === 0 ? 'No land listings yet. Create your first one.' : 'No land listings match your filters.'}
                </p>
                {total === 0 && (
                  <button
                    onClick={() => navigate('/crm/listings/new')}
                    className="inline-flex items-center gap-2 text-sm font-roboto text-[#0d5959] hover:text-[#001731] cursor-pointer mt-1"
                  >
                    <i className="ri-add-line" /> Create a land listing
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => {
                const isJV = listing.sub_type === 'joint_venture';
                return (
                  <div key={listing.id} onClick={() => navigate(`/crm/listings/edit/${listing.id}`)} className="bg-white rounded-xl overflow-hidden hover:border-[#0d5959]/20 transition-all group cursor-pointer">
                    <div className="relative h-40">
                      {listing.main_image ? (
                        <img src={listing.main_image} alt={listing.title} className="w-full h-full object-cover" />
                      ) : listing.images && listing.images.length > 0 ? (
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#f7f8fa] flex items-center justify-center">
                          <i className="ri-landscape-line text-[#636363] text-3xl" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                        {isJV ? (
                          <span className="text-[10px] font-roboto font-semibold text-[#001731] bg-amber-400 px-2 py-0.5 rounded-full">JV Opportunity</span>
                        ) : (
                          <span className="text-[10px] font-roboto font-semibold text-white bg-[#0d5959] px-2 py-0.5 rounded-full">For Sale</span>
                        )}
                        {listing.is_featured && (
                          <span className="text-[10px] font-roboto text-white bg-amber-500 px-2 py-0.5 rounded-full"><i className="ri-star-fill mr-0.5" /> Featured</span>
                        )}
                        {listing.is_published ? (
                          <span className="text-[10px] font-roboto text-white bg-emerald-500 px-2 py-0.5 rounded-full">Published</span>
                        ) : listing.is_pending ? (
                          <span className="text-[10px] font-roboto text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>
                        ) : (
                          <span className="text-[10px] font-roboto text-[#636363] bg-gray-200 px-2 py-0.5 rounded-full">Draft</span>
                        )}
                      </div>
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/crm/listings/edit/${listing.id}`); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 text-[#636363] hover:text-[#0d5959] cursor-pointer transition-colors" title="Edit listing">
                            <i className="ri-edit-line text-sm" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(listing.id); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 text-[#636363] hover:text-[#dc2626] cursor-pointer transition-colors" title="Delete listing">
                            <i className="ri-delete-bin-line text-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        {listing.property_id && (
                          <span className="text-[10px] font-mono text-[#636363] tracking-wider font-semibold uppercase">{listing.property_id}</span>
                        )}
                      </div>
                      <h3 className="font-jost text-sm font-medium text-[#001731] leading-snug line-clamp-2">{listing.title || 'Untitled Land'}</h3>
                      <p className="text-xs font-roboto text-[#636363] mt-1">
                        <i className="ri-map-pin-2-line mr-1 text-[#c0c8d0]" />
                        {listing.state_region ? `${listing.state_region}, ` : ''}{listing.location || 'No location'}
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-[#f0f0f0]/60">
                        <div>
                          <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider">{isJV ? 'Acreage' : 'Size'}</p>
                          <p className="text-sm font-semibold text-[#001731]">{formatSize(listing)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider">Title</p>
                          <p className="text-sm font-semibold text-[#001731]">{getTitleType(listing)}</p>
                        </div>
                        <div className="col-span-2 mt-1">
                          <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider">{isJV ? 'Ask' : 'Price'}</p>
                          <p className={`text-sm font-semibold ${isJV ? 'text-amber-600' : 'text-[#0d5959]'}`}>{formatPrice(listing.price, listing.currency)}</p>
                        </div>
                      </div>
                      {listing.description && (
                        <p className="text-xs font-roboto text-[#636363] mt-2 line-clamp-2 leading-relaxed">{listing.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#f0f0f0]/60">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTogglePublish(listing.id, listing.is_published); }}
                          disabled={togglingId === listing.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-roboto transition-all cursor-pointer whitespace-nowrap ${listing.is_published ? 'bg-[#e6f4ea] text-[#088135]' : 'bg-[#f7f8fa] text-[#636363]'}`}
                        >
                          {listing.is_published ? <i className="ri-eye-line" /> : <i className="ri-eye-off-line" />}
                          {listing.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleFeatured(listing.id, listing.is_featured); }}
                          disabled={togglingId === listing.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-roboto transition-all cursor-pointer whitespace-nowrap ${listing.is_featured ? 'bg-[#fff5e6] text-[#f58300]' : 'bg-[#f7f8fa] text-[#636363]'}`}
                        >
                          <i className="ri-star-line" />
                          {listing.is_featured ? 'Unfeature' : 'Feature'}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/crm/listings/edit/${listing.id}`); }} className="ml-auto text-[10px] font-roboto text-[#0d5959] hover:text-[#001731] cursor-pointer">Edit <i className="ri-arrow-right-line" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && listings.length > 0 && (
            <CRMPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          )}

          <ConfirmModal
            open={!!deleteConfirm}
            title="Delete Land Listing?"
            message="This will permanently remove this land listing and all associated data. This action cannot be undone."
            confirmLabel="Delete"
            confirmVariant="danger"
            onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
            onCancel={() => setDeleteConfirm(null)}
          />
        </>
      )}

      {/* ==================== JV SUBMISSIONS TAB ==================== */}
      {activeTab === 'submissions' && (
        <>
          {/* Sub-Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {subStatCards.map((stat) => (
              <div key={stat.label} className={`rounded-lg p-4 flex items-center gap-3 ${stat.bg}`}>
                <div className="w-10 h-10 rounded-lg bg-white border border-[#f0f0f0] flex items-center justify-center">
                  <i className={`${stat.icon} ${stat.color} text-lg`} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-[#001731]">{stat.value}</p>
                  <p className="text-xs text-[#636363] font-roboto">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-lg p-4 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
              <div className="relative flex-1 max-w-md w-full">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#636363] text-sm" />
                <input
                  type="text"
                  placeholder="Search name, email or phone..."
                  value={subSearch}
                  onChange={(e) => { setSubSearch(e.target.value); setSubPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white"
                />
              </div>
              <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
                <select
                  value={subFilterType}
                  onChange={(e) => { setSubFilterType(e.target.value); setSubPage(1); }}
                  className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]"
                >
                  <option value="all">All Types</option>
                  <option value="landowner">Land Listings</option>
                  <option value="jv_proposal">JV Submissions</option>
                  <option value="investor">Capital Ventures</option>
                </select>
                <select
                  value={subFilterStatus}
                  onChange={(e) => { setSubFilterStatus(e.target.value); setSubPage(1); }}
                  className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="contacted">Contacted</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[#636363] font-roboto">
              <span>{subTotal} submissions</span>
              <span>Page {subPage} of {Math.max(1, Math.ceil(subTotal / subPageSize))}</span>
            </div>
          </div>

          {/* Submissions loading */}
          {subLoading && (
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-8 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-start gap-4 pb-4 border-b border-[#f0f0f0]/60 last:border-0 last:pb-0">
                  <div className="w-10 h-10 rounded-full bg-[#f7f8fa]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-[#f7f8fa] rounded" />
                    <div className="h-3 w-64 bg-[#f7f8fa] rounded" />
                    <div className="grid grid-cols-3 gap-3">
                      <div className="h-6 bg-[#f7f8fa] rounded" />
                      <div className="h-6 bg-[#f7f8fa] rounded" />
                      <div className="h-6 bg-[#f7f8fa] rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Submissions error */}
          {!subLoading && subError && (
            <div className="bg-white rounded-xl py-14 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-red-50 flex items-center justify-center">
                  <i className="ri-error-warning-line text-red-400 text-2xl" />
                </div>
                <p className="text-sm font-roboto text-[#636363]">{subError}</p>
                <button onClick={fetchSubmissions} className="inline-flex items-center gap-2 text-sm font-roboto text-[#0d5959] hover:text-[#001731] cursor-pointer mt-1">
                  <i className="ri-refresh-line" /> Try Again
                </button>
              </div>
            </div>
          )}

          {/* Submissions empty */}
          {!subLoading && !subError && submissions.length === 0 && (
            <div className="bg-white rounded-xl py-14 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-[#0d5959]/8 flex items-center justify-center">
                  <i className="ri-file-list-3-line text-[#0d5959] text-2xl" />
                </div>
                <p className="text-sm font-roboto text-[#636363]">
                  {subTotal === 0
                    ? 'No submissions yet. They\'ll appear here once land, JV and capital briefs come in — or add one manually.'
                    : 'No submissions match your filters.'}
                </p>
              </div>
            </div>
          )}

          {/* Submissions list */}
          {!subLoading && !subError && submissions.length > 0 && (
            <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
              <div className="divide-y divide-[#e8edf2]/60">
                {submissions.map((sub) => {
                  const isExpanded = expandedId === sub.id;
                  const isLandowner = sub.submission_type === 'landowner';
                  const isJV = sub.submission_type === 'jv_proposal';
                  return (
                    <div key={sub.id} className="hover:bg-[#f7f8fa]/50 transition-colors">
                      {/* Row header — always visible */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                        className="flex items-start gap-4 p-4 cursor-pointer"
                      >
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isLandowner ? 'bg-amber-100 text-amber-600' : isJV ? 'bg-cyan-100 text-cyan-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          <i className={isLandowner ? 'ri-landscape-line text-lg' : isJV ? 'ri-building-2-line text-lg' : 'ri-funds-line text-lg'} />
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-jost text-sm font-semibold text-[#001731]">{sub.full_name || 'Unnamed'}</h4>
                            <span className={`text-[10px] font-roboto px-2 py-0.5 rounded-full ${isLandowner ? 'bg-[#fff5e6] text-[#f58300]' : isJV ? 'bg-[#e6f7fb] text-[#0e7490]' : 'bg-[#e6f4ea] text-[#088135]'}`}>
                              {SUBMISSION_TYPE_LABELS[sub.submission_type]}
                            </span>
                            <span className={`text-[10px] font-roboto px-2 py-0.5 rounded-full ${STATUS_COLORS[sub.status]}`}>
                              {STATUS_LABELS[sub.status]}
                            </span>
                          </div>
                          <p className="text-xs font-roboto text-[#636363] mt-1">
                            {sub.email && <><i className="ri-mail-line mr-1" />{sub.email}</>}
                            {sub.email && sub.phone && <span className="mx-1.5">·</span>}
                            {sub.phone && <><i className="ri-phone-line mr-1" />{sub.phone}</>}
                          </p>
                          {/* Quick details */}
                          {!isExpanded && (
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {isLandowner && (
                                <>
                                  {sub.land_location && <span className="text-[10px] font-roboto text-[#636363] bg-[#f7f8fa] px-2 py-0.5 rounded"><i className="ri-map-pin-line mr-0.5" />{sub.land_location}</span>}
                                  {sub.land_size && <span className="text-[10px] font-roboto text-[#636363] bg-[#f7f8fa] px-2 py-0.5 rounded"><i className="ri-ruler-line mr-0.5" />{sub.land_size}</span>}
                                  {sub.title_status && <span className="text-[10px] font-roboto text-[#636363] bg-[#f7f8fa] px-2 py-0.5 rounded">{TITLE_STATUS_LABELS[sub.title_status] || sub.title_status}</span>}
                                </>
                              )}
                              {isJV && (
                                <>
                                  {sub.land_location && <span className="text-[10px] font-roboto text-[#636363] bg-[#f7f8fa] px-2 py-0.5 rounded"><i className="ri-map-pin-line mr-0.5" />{sub.land_location}</span>}
                                  {sub.budget_range && <span className="text-[10px] font-roboto text-[#636363] bg-[#f7f8fa] px-2 py-0.5 rounded"><i className="ri-money-dollar-circle-line mr-0.5" />{BUDGET_LABELS[sub.budget_range] || sub.budget_range}</span>}
                                  {sub.preferred_use && <span className="text-[10px] font-roboto text-[#636363] bg-[#f7f8fa] px-2 py-0.5 rounded">{sub.preferred_use}</span>}
                                </>
                              )}
                              {!isLandowner && !isJV && (
                                <>
                                  {sub.budget_range && <span className="text-[10px] font-roboto text-[#636363] bg-[#f7f8fa] px-2 py-0.5 rounded"><i className="ri-money-dollar-circle-line mr-0.5" />{BUDGET_LABELS[sub.budget_range] || sub.budget_range}</span>}
                                  {sub.preferred_use && <span className="text-[10px] font-roboto text-[#636363] bg-[#f7f8fa] px-2 py-0.5 rounded">{USE_LABELS[sub.preferred_use] || sub.preferred_use}</span>}
                                  {sub.timeline && <span className="text-[10px] font-roboto text-[#636363] bg-[#f7f8fa] px-2 py-0.5 rounded"><i className="ri-timer-line mr-0.5" />{TIMELINE_LABELS[sub.timeline] || sub.timeline}</span>}
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right side — date & expand */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] font-roboto text-[#636363]">{formatDate(sub.created_at)}</span>
                          <i className={`text-[#636363] transition-transform ${isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`} />
                        </div>
                      </div>

                      {/* Expanded detail panel */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pl-[72px]">
                          <div className="bg-[#f7f8fa] rounded-lg border border-[#f0f0f0] p-4 space-y-4">
                            {/* Detail grid */}
                            {isLandowner ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Land Location</p>
                                  <p className="text-[#001731] font-roboto text-sm">{sub.land_location || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Acreage</p>
                                  <p className="text-[#001731] font-roboto text-sm">{sub.land_size || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Title Status</p>
                                  <p className="text-[#001731] font-roboto text-sm">{TITLE_STATUS_LABELS[sub.title_status || ''] || sub.title_status || '—'}</p>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Preferred Structure</p>
                                  <p className="text-[#001731] font-roboto text-sm">{STRUCTURE_LABELS[sub.preferred_structure || ''] || sub.preferred_structure || '—'}</p>
                                </div>
                              </div>
                            ) : isJV ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Project Location</p>
                                  <p className="text-[#001731] font-roboto text-sm">{sub.land_location || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Project Size</p>
                                  <p className="text-[#001731] font-roboto text-sm">{sub.land_size || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Capital Required</p>
                                  <p className="text-[#001731] font-roboto text-sm">{BUDGET_LABELS[sub.budget_range || ''] || sub.budget_range || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Project Type</p>
                                  <p className="text-[#001731] font-roboto text-sm">{sub.preferred_use || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">JV Structure</p>
                                  <p className="text-[#001731] font-roboto text-sm">{STRUCTURE_LABELS[sub.preferred_structure || ''] || sub.preferred_structure || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Timeline</p>
                                  <p className="text-[#001731] font-roboto text-sm">{TIMELINE_LABELS[sub.timeline || ''] || sub.timeline || '—'}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Budget Range</p>
                                  <p className="text-[#001731] font-roboto text-sm">{BUDGET_LABELS[sub.budget_range || ''] || sub.budget_range || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Preferred Location</p>
                                  <p className="text-[#001731] font-roboto text-sm">{sub.preferred_location || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Preferred Use</p>
                                  <p className="text-[#001731] font-roboto text-sm">{USE_LABELS[sub.preferred_use || ''] || sub.preferred_use || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-0.5">Timeline</p>
                                  <p className="text-[#001731] font-roboto text-sm">{TIMELINE_LABELS[sub.timeline || ''] || sub.timeline || '—'}</p>
                                </div>
                              </div>
                            )}

                            {/* Message */}
                            {sub.message && (
                              <div>
                                <p className="text-[10px] text-[#636363] font-roboto uppercase tracking-wider mb-1">
                                  {isLandowner ? 'About the Land' : isJV ? 'Project Description' : 'What They\'re Looking For'}
                                </p>
                                <p className="text-[#001731] font-roboto text-sm leading-relaxed whitespace-pre-wrap">{sub.message}</p>
                              </div>
                            )}

                            {/* Divider */}
                            <div className="border-t border-[#f0f0f0]" />

                            {/* Actions row */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-[#636363] font-roboto mr-1">Status:</span>
                                {STATUS_OPTIONS.map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() => handleStatusUpdate(sub.id, opt)}
                                    disabled={updatingId === sub.id || sub.status === opt}
                                    className={`text-[10px] font-roboto px-2.5 py-1 rounded-full cursor-pointer transition-all whitespace-nowrap border ${
                                      sub.status === opt
                                        ? STATUS_COLORS[opt] + ' font-semibold'
                                        : 'border-[#f0f0f0] text-[#636363] hover:border-[#c0c8d0] hover:text-[#001731]'
                                    }`}
                                  >
                                    {STATUS_LABELS[opt]}
                                  </button>
                                ))}
                              </div>
                              <span className="text-[10px] text-[#636363] font-roboto">
                                Submitted {formatDateTime(sub.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!subLoading && !subError && submissions.length > 0 && (
            <CRMPagination page={subPage} pageSize={subPageSize} total={subTotal} onPageChange={setSubPage} />
          )}
        </>
      )}

      {/* ==================== PROJECTS SEEKING PARTNERS TAB ==================== */}
      {activeTab === 'projects' && <JVProjects />}

      {/* ==================== FAQS TAB ==================== */}
      {activeTab === 'faqs' && <JVFaqs />}
    </div>
  );
}