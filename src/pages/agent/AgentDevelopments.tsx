import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import usePortalBase from '@/hooks/usePortalBase';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useAgentDevelopments, type AgentDevelopmentRow } from '@/hooks/useAgentDevelopments';
import { displayLocation, bedroomTypeRange } from '@/lib/crmDisplay';
import { Landmark, PlusCircle, Pencil, Trash2, Eye, EyeOff, MapPin, Star } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  off_plan: 'Off-Plan',
  under_construction: 'Under Construction',
  completed: 'Completed',
};

function formatPrice(price: number, currency: string) {
  if (!price) return 'On request';
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : 'KES ';
  return `${sym}${price.toLocaleString()}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

type StatusFilter = 'all' | 'published' | 'draft';

/**
 * AGENT — My New Developments.
 *
 * This is the agent-portal equivalent of the admin New Developments CRM, but it
 * is OWN-ONLY: the list is scoped to the authenticated agent at the query level
 * (`agent_id = ?`), so another agent's developments — published or not — never
 * reach this screen. Admin-only actions (cross-agent assignment, Source &
 * Contact review, global publish) are not present here.
 */
export default function AgentDevelopments() {
  const navigate = useNavigate();
  const portalBase = usePortalBase();
  const { agentId } = useAgentProfile();
  const { developments, stats, loading, error, refetch } = useAgentDevelopments();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AgentDevelopmentRow | null>(null);

  const filtered = useMemo(() => {
    let rows = developments;
    if (statusFilter === 'published') rows = rows.filter((r) => r.is_published);
    else if (statusFilter === 'draft') rows = rows.filter((r) => !r.is_published);
    if (search.trim()) {
      const t = search.trim().toLowerCase();
      rows = rows.filter((r) => (r.title || '').toLowerCase().includes(t) || (r.location || '').toLowerCase().includes(t));
    }
    return rows;
  }, [developments, statusFilter, search]);

  const togglePublish = async (row: AgentDevelopmentRow) => {
    if (!agentId) return;
    setBusyId(row.id);
    const next = !row.is_published;
    const { error: err } = await supabase
      .from('developments')
      .update({ is_published: next })
      .eq('id', row.id)
      .eq('agent_id', agentId);
    if (err) window.alert(err.message || 'Failed to update status');
    else refetch();
    setBusyId(null);
  };

  const toggleFeature = async (row: AgentDevelopmentRow) => {
    if (!agentId) return;
    setBusyId(row.id);
    const { error: err } = await supabase
      .from('developments')
      .update({ is_featured: !row.is_featured })
      .eq('id', row.id)
      .eq('agent_id', agentId);
    if (err) window.alert(err.message || 'Failed to update featured status');
    else refetch();
    setBusyId(null);
  };

  const handleDelete = async (row: AgentDevelopmentRow) => {
    if (!agentId) return;
    const { error: err } = await supabase
      .from('developments')
      .delete()
      .eq('id', row.id)
      .eq('agent_id', agentId);
    if (err) window.alert(err.message || 'Failed to delete development');
    else {
      setConfirmDelete(null);
      refetch();
    }
  };

  const statCards = [
    { label: 'Total', value: stats.total, icon: 'ri-building-2-line', color: '#0d5959' },
    { label: 'Published', value: stats.published, icon: 'ri-check-double-line', color: '#088135' },
    { label: 'Draft', value: stats.draft, icon: 'ri-draft-line', color: '#6b7280' },
    { label: 'Featured', value: stats.featured, icon: 'ri-star-line', color: '#b08d2a' },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-roboto text-xl md:text-2xl font-bold text-white">New Developments</h2>
          <p className="text-sm font-roboto text-[#8b98ab] mt-0.5">Only developments you own — no other agents&apos; projects.</p>
        </div>
        <Link
          to={`${portalBase}/developments/new`}
          className="inline-flex items-center gap-2 bg-[#0d5959] text-white px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold transition-all hover:bg-[#0a4a4a] cursor-pointer whitespace-nowrap"
        >
          <PlusCircle size={16} />
          New Development
        </Link>
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
            placeholder="Search your developments..."
            className="w-full pl-9 pr-4 py-2.5 border border-[#e4e9e6] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0d5959] focus:ring-2 focus:ring-[#0d5959]/10 placeholder:text-[#9ca3af]"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-[#f6f8f7] p-1 rounded-full">
          {(['all', 'published', 'draft'] as StatusFilter[]).map((k) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === k ? 'bg-[#0d5959] text-white' : 'text-[#6b7280] hover:text-[#1a1a2e]'
              }`}
            >
              {k === 'all' ? 'All' : k === 'published' ? 'Published' : 'Draft'}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <i className="ri-error-warning-line text-red-500" />
          <p className="text-sm font-roboto text-red-700 flex-1">{error}</p>
          <button onClick={refetch} className="text-sm font-roboto font-semibold text-red-700 hover:underline cursor-pointer whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
            <Landmark className="text-[#0d5959]" size={26} />
          </div>
          <h3 className="font-roboto font-semibold text-[#1a1a2e] text-lg">
            {developments.length === 0 ? 'You have no developments yet' : 'No developments match your filter'}
          </h3>
          <p className="text-sm font-roboto text-[#6b7280] mt-1">
            {developments.length === 0 ? 'Create your first project to get started.' : 'Try adjusting your search or filter.'}
          </p>
          {developments.length === 0 && (
            <Link to={`${portalBase}/developments/new`} className="inline-flex items-center gap-2 mt-5 bg-[#0d5959] text-white px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold hover:bg-[#0a4a4a] transition-all cursor-pointer whitespace-nowrap">
              <PlusCircle size={16} />
              New Development
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => {
            const img = d.main_image || d.cover_image || '';
            return (
              <div key={d.id} className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden flex flex-col">
                <button
                  onClick={() => navigate(`${portalBase}/developments/edit/${d.id}`)}
                  className="relative h-40 bg-[#f0f2f1] w-full cursor-pointer overflow-hidden"
                >
                  {img ? (
                    <img src={img} alt={d.title || 'Development'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#0d5959]/10">
                      <Landmark className="text-[#0d5959]/40" size={32} />
                    </div>
                  )}
                  <span className={`absolute top-3 left-3 inline-flex px-2.5 py-1 rounded-full text-[11px] font-roboto font-bold whitespace-nowrap ${d.is_published ? 'bg-[#e6f4ea] text-[#088135]' : 'bg-[#fff5e6] text-[#f58300]'}`}>
                    {d.is_published ? 'Published' : 'Draft'}
                  </span>
                  {d.is_featured && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-roboto font-bold bg-[#fff8e6] text-[#b08d2a] whitespace-nowrap">
                      <Star size={11} className="fill-[#b08d2a]" /> Featured
                    </span>
                  )}
                </button>

                <div className="p-4 flex flex-col flex-1">
                  <button
                    onClick={() => navigate(`${portalBase}/developments/edit/${d.id}`)}
                    className="text-left font-roboto font-semibold text-[#1a1a2e] text-sm hover:text-[#0d5959] transition-colors cursor-pointer"
                  >
                    {d.title || 'Untitled Development'}
                  </button>
                  <p className="flex items-center gap-1 text-xs font-roboto text-[#6b7280] mt-1.5">
                    <MapPin size={12} className="text-[#9ca3af]" />
                    {d.location ? displayLocation(d.location, null, { upper: true }) : 'Location not set'}
                  </p>
                  {d.developer_name && <p className="text-xs font-roboto text-[#9ca3af] mt-1 truncate">{d.developer_name}</p>}

                  <div className="flex items-center justify-between mt-3">
                    <span className="font-roboto font-bold text-[#0d5959]">{formatPrice(d.price, d.currency)}</span>
                    <span className="text-xs font-roboto text-[#6b7280]">{STATUS_LABELS[d.development_status] || '—'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#f0f2f1] text-[11px] font-roboto text-[#6b7280] flex-wrap">
                    <span>{bedroomTypeRange(d.unitTypes) || 'No unit types'}</span>
                    <span className="text-[#d1d5db]">•</span>
                    <span>{d.total_units || 0} units</span>
                    <span className="text-[#d1d5db]">•</span>
                    <span>{formatDate(d.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-4">
                    <button
                      onClick={() => navigate(`${portalBase}/developments/edit/${d.id}`)}
                      title="Edit"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-roboto font-semibold bg-[#f6f8f7] text-[#374151] hover:bg-[#eef2f0] transition-all cursor-pointer"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => togglePublish(d)}
                      disabled={busyId === d.id}
                      title={d.is_published ? 'Unpublish' : 'Publish'}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-roboto font-semibold bg-[#e6f4ea] text-[#088135] hover:bg-[#d8eee0] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {d.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                      {d.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => toggleFeature(d)}
                      disabled={busyId === d.id}
                      title={d.is_featured ? 'Remove featured' : 'Mark featured'}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-md text-xs font-roboto font-semibold bg-[#fff8e6] text-[#b08d2a] hover:bg-[#fdefce] transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Star size={14} className={d.is_featured ? 'fill-[#b08d2a]' : ''} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(d)}
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
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <i className="ri-delete-bin-line text-red-500" />
              </div>
              <h3 className="font-roboto font-bold text-[#1a1a2e]">Delete this development?</h3>
            </div>
            <p className="text-sm font-roboto text-[#6b7280]">
              This permanently removes the project, its unit types and data. This action cannot be undone.
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