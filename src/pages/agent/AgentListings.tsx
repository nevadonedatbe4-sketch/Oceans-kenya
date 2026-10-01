import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import usePortalBase from '@/hooks/usePortalBase';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useAgentListingsData, type AgentListing } from '@/hooks/useAgentListingsData';
import { PlusCircle, Building2, Pencil, Trash2, Eye, EyeOff, MapPin } from 'lucide-react';
import { displayTitle, displayLocation } from '@/lib/crmDisplay';

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
};

function formatPrice(price: number | null, currency: string) {
  if (!price || price === 0) return '—';
  const sym = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : 'KES ';
  return `${sym}${price.toLocaleString()}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

type StatusFilter = 'all' | 'published' | 'pending' | 'draft';

export default function AgentListings() {
  const { listings, stats, loading, error, refetch } = useAgentListingsData();
  const { agentId } = useAgentProfile();
  const navigate = useNavigate();
  const portalBase = usePortalBase();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let rows = listings;
    if (statusFilter === 'published') rows = rows.filter((l) => l.is_published);
    else if (statusFilter === 'pending') rows = rows.filter((l) => !l.is_published && l.is_pending);
    else if (statusFilter === 'draft') rows = rows.filter((l) => !l.is_published && !l.is_pending);
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      rows = rows.filter((l) => (l.title || '').toLowerCase().includes(term) || (l.neighbourhood || '').toLowerCase().includes(term));
    }
    return rows;
  }, [listings, statusFilter, search]);

  const statusOf = (l: AgentListing) => {
    if (l.is_published) return { label: 'Published', cls: 'bg-[#e6f4ea] text-[#088135]' };
    if (l.is_pending) return { label: 'Pending review', cls: 'bg-[#fff5e6] text-[#f58300]' };
    return { label: 'Draft', cls: 'bg-[#f1f3f5] text-[#6b7280]' };
  };

  const handleTogglePublish = async (l: AgentListing) => {
    if (!agentId) return;
    setBusyId(l.id);
    const next = !l.is_published;
    const { error } = await supabase
      .from('listings')
      .update({ is_published: next, is_pending: false })
      .eq('id', l.id)
      .eq('agent_id', agentId);
    if (error) {
      window.alert(error.message || 'Failed to update listing');
    } else {
      refetch();
    }
    setBusyId(null);
  };

  const handleTogglePending = async (l: AgentListing) => {
    if (!agentId) return;
    setBusyId(l.id);
    const next = !l.is_pending;
    const { error } = await supabase
      .from('listings')
      .update({ is_pending: next, is_published: false })
      .eq('id', l.id)
      .eq('agent_id', agentId);
    if (error) {
      window.alert(error.message || 'Failed to update listing');
    } else {
      refetch();
    }
    setBusyId(null);
  };

  const handleDelete = async (id: string) => {
    if (!agentId) return;
    const { error } = await supabase.from('listings').delete().eq('id', id).eq('agent_id', agentId);
    if (error) {
      window.alert(error.message || 'Failed to delete listing');
    } else {
      setConfirmDelete(null);
      refetch();
    }
  };

  const statCards = [
    { label: 'Total', value: stats.total, icon: 'ri-building-line', color: '#0d5959' },
    { label: 'Published', value: stats.published, icon: 'ri-check-double-line', color: '#088135' },
    { label: 'Pending review', value: stats.pending, icon: 'ri-time-line', color: '#f58300' },
    { label: 'Draft', value: stats.draft, icon: 'ri-draft-line', color: '#6b7280' },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-roboto text-xl md:text-2xl font-bold text-white">My Listings</h2>
          <p className="text-sm font-roboto text-[#8b98ab] mt-0.5">Only properties you own — no other agents&apos; listings.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-[#e4e9e6]">
            <div className="flex items-center justify-between mb-3">
              <span className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: s.color }}>
                <i className={`${s.icon} text-lg`} />
              </span>
            </div>
            <p className="text-2xl font-roboto font-bold text-[#1a1a2e]">{loading ? '—' : s.value}</p>
            <p className="text-xs font-roboto font-medium text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-[#e4e9e6] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6b7280]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your listings..."
            className="w-full pl-9 pr-4 py-2.5 border border-[#e4e9e6] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0d5959] focus:ring-2 focus:ring-[#0d5959]/10 placeholder:text-[#9ca3af]"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-[#f6f8f7] p-1 rounded-full">
          {(['all', 'published', 'pending', 'draft'] as StatusFilter[]).map((k) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === k ? 'bg-[#0d5959] text-white' : 'text-[#6b7280] hover:text-[#1a1a2e]'
              }`}
            >
              {k === 'all' ? 'All' : k === 'published' ? 'Published' : k === 'pending' ? 'Pending' : 'Draft'}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <i className="ri-error-warning-line text-red-500" />
          <p className="text-sm font-roboto text-red-700 flex-1">{error}</p>
          <button onClick={refetch} className="text-sm font-roboto font-semibold text-red-700 hover:underline cursor-pointer whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* Listings grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden">
              <div className="h-40 bg-[#f0f2f1] animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 bg-[#f0f2f1] rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-[#f0f2f1] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e4e9e6] p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-[#0d5959]/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="text-[#0d5959]" size={26} />
          </div>
          <h3 className="font-roboto font-semibold text-[#1a1a2e] text-lg">
            {listings.length === 0 ? 'You have no listings yet' : 'No listings match your filter'}
          </h3>
          <p className="text-sm font-roboto text-[#6b7280] mt-1">
            {listings.length === 0 ? 'Add your first property to get started.' : 'Try adjusting your search or filter.'}
          </p>
          {listings.length === 0 && (
            <Link to={`${portalBase}/listings/new`} className="inline-flex items-center gap-2 mt-5 bg-[#0d5959] text-white px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold hover:bg-[#0a4a4a] transition-all cursor-pointer whitespace-nowrap">
              <PlusCircle size={16} />
              Add a listing
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l) => {
            const st = statusOf(l);
            const img = l.main_image || (l.images && l.images[0]) || null;
            return (
              <div key={l.id} className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden flex flex-col hover:shadow-sm transition-all">
                <button
                  onClick={() => navigate(`${portalBase}/listings/edit/${l.id}`)}
                  className="relative h-40 bg-[#f0f2f1] w-full cursor-pointer overflow-hidden"
                >
                  {img ? (
                    <img src={img} alt={l.title || 'Listing'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#0d5959]/10">
                      <Building2 className="text-[#0d5959]/40" size={32} />
                    </div>
                  )}
                  <span className={`absolute top-3 left-3 inline-flex px-2.5 py-1 rounded-full text-[11px] font-roboto font-bold whitespace-nowrap ${st.cls}`}>
                    {st.label}
                  </span>
                </button>

                <div className="p-4 flex flex-col flex-1">
                  <button
                    onClick={() => navigate(`${portalBase}/listings/edit/${l.id}`)}
                    className="text-left font-roboto font-semibold text-[#1a1a2e] text-sm hover:text-[#0d5959] transition-colors cursor-pointer"
                  >
                    {displayTitle(l.title) || 'Untitled Draft'}
                  </button>
                  <p className="flex items-center gap-1 text-xs font-roboto text-[#6b7280] mt-1.5">
                    <MapPin size={12} className="text-[#9ca3af]" />
                    {l.neighbourhood ? displayLocation(l.neighbourhood, null, { upper: true }) : 'Location not set'}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <span className="font-roboto font-bold text-[#0d5959]">{formatPrice(l.price, l.currency)}</span>
                    <span className="text-xs font-roboto text-[#6b7280] capitalize">
                      {l.property_type ? (TYPE_LABELS[l.property_type] || l.property_type.replace(/_/g, ' ')) : '—'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#f0f2f1] text-[11px] font-roboto text-[#6b7280]">
                    <span>{l.bedrooms ?? 0} bed</span>
                    <span className="text-[#d1d5db]">•</span>
                    <span>{l.bathrooms ?? 0} bath</span>
                    <span className="text-[#d1d5db]">•</span>
                    <span>{formatDate(l.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-4">
                    <button
                      onClick={() => navigate(`${portalBase}/listings/edit/${l.id}`)}
                      title="Edit"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-roboto font-semibold bg-[#f6f8f7] text-[#374151] hover:bg-[#eef2f0] transition-all cursor-pointer"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleTogglePublish(l)}
                      disabled={busyId === l.id}
                      title={l.is_published ? 'Unpublish' : 'Publish'}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-roboto font-semibold bg-[#e6f4ea] text-[#088135] hover:bg-[#d8eee0] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {l.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                      {l.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(l.id)}
                      title="Delete"
                      className="inline-flex items-center justify-center px-3 py-2 rounded-md text-xs font-roboto font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <i className="ri-delete-bin-line text-red-500" />
              </div>
              <h3 className="font-roboto font-bold text-[#1a1a2e]">Delete this listing?</h3>
            </div>
            <p className="text-sm font-roboto text-[#6b7280]">
              This permanently removes the property and its data. This action cannot be undone.
            </p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-3 py-2.5 rounded-md text-sm font-roboto font-semibold bg-[#f6f8f7] text-[#374151] hover:bg-[#eef2f0] transition-all cursor-pointer">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 px-3 py-2.5 rounded-md text-sm font-roboto font-semibold bg-red-600 text-white hover:bg-red-700 transition-all cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}