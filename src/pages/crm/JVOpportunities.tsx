import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import JVOpportunityCard, { type JvOpportunityRow } from '@/pages/crm/components/jv/JVOpportunityCard';
import JVOpportunityListView from '@/pages/crm/components/jv/JVOpportunityListView';
import ShareLinkModal from '@/pages/crm/components/ShareLinkModal';
import { jvOpportunityPublicUrl } from '@/lib/shareLinks';
import { displayLocation } from '@/lib/crmDisplay';
import {
  JV_STATUS_OPTIONS,
  DEAL_STRUCTURE_LABELS, parseJvStatus,
} from '@/pages/crm/jvOpportunityConstants';

type ViewMode = 'cards' | 'list';

export default function JVOpportunities() {
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [rows, setRows] = useState<JvOpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStructure, setFilterStructure] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [shareRow, setShareRow] = useState<JvOpportunityRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const sweptRef = useRef(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let countQuery = supabase.from('jv_opportunities').select('*', { count: 'exact', head: true });
      let dataQuery = supabase
        .from('jv_opportunities')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filterStatus !== 'all') {
        if (filterStatus === 'scheduled') {
          countQuery = countQuery.like('status', 'scheduled%');
          dataQuery = dataQuery.like('status', 'scheduled%');
        } else {
          countQuery = countQuery.eq('status', filterStatus);
          dataQuery = dataQuery.eq('status', filterStatus);
        }
      }
      if (filterStructure !== 'all') {
        countQuery = countQuery.eq('deal_structure', filterStructure);
        dataQuery = dataQuery.eq('deal_structure', filterStructure);
      }
      if (search.trim()) {
        const term = search.trim();
        countQuery = countQuery.or(`title.ilike.%${term}%,owner_name.ilike.%${term}%,land_location.ilike.%${term}%`);
        dataQuery = dataQuery.or(`title.ilike.%${term}%,owner_name.ilike.%${term}%,land_location.ilike.%${term}%`);
      }

      const [{ count }, { data, error: err }] = await Promise.all([countQuery, dataQuery]);
      if (err) throw err;

      setRows((data || []) as JvOpportunityRow[]);
      setTotal(count ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load JV land listings');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterStatus, filterStructure, search]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  /* Best-effort auto-publish: any scheduled listing whose publish time has
     passed is flipped live the next time the JV Desk loads. No server
     scheduler required. */
  useEffect(() => {
    if (sweptRef.current) return;
    sweptRef.current = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('jv_opportunities')
          .select('id, status')
          .like('status', 'scheduled%')
          .eq('is_published', false);
        const due = (data || []).filter((r) => {
          const { scheduledAt } = parseJvStatus((r as { status: string | null }).status);
          return scheduledAt ? new Date(scheduledAt).getTime() <= Date.now() : false;
        });
        if (due.length === 0) return;
        await Promise.all(due.map((r) => supabase
          .from('jv_opportunities')
          .update({ status: 'published', is_published: true, is_public_listing: true, updated_at: new Date().toISOString() })
          .eq('id', (r as { id: string }).id)));
        broadcastSync();
        fetchRows();
      } catch {
        /* best-effort — ignore transient errors */
      }
    })();
  }, [fetchRows]);

  const handleToggleFeatured = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error: err } = await supabase.from('jv_opportunities').update({ is_featured: !current, updated_at: new Date().toISOString() }).eq('id', id);
    if (err) {
      addToast('Failed to update feature status', 'error');
    } else {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_featured: !current } : r)));
      addToast(current ? 'Listing unfeatured' : 'Listing featured', 'success');
      broadcastSync();
    }
    setTogglingId(null);
  };

  /* Publish / Unpublish directly from the desk — replaces the pipeline status
     dropdown that used to live inside the JV form. Publishing flips the record
     live on the desk; unpublishing pulls it back to an internal draft. */
  const handleTogglePublish = async (id: string, currentlyPublic: boolean) => {
    setTogglingId(id);
    const next = !currentlyPublic;
    const { error: err } = await supabase
      .from('jv_opportunities')
      .update({
        status: next ? 'published' : 'draft',
        is_published: next,
        is_public_listing: next,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (err) {
      addToast(next ? 'Failed to publish listing' : 'Failed to unpublish listing', 'error');
    } else {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next ? 'published' : 'draft', is_featured: r.is_featured, is_public_listing: next } : r)));
      addToast(next ? 'JV land listing published to the desk' : 'JV land listing unpublished', 'success');
      broadcastSync();
      fetchRows();
    }
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from('jv_opportunities').delete().eq('id', id);
    if (err) {
      addToast('Failed to delete JV land listing', 'error');
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      addToast('JV land listing deleted', 'success');
      broadcastSync();
      fetchRows();
    }
    setDeleteConfirm(null);
  };

  const handleShare = (id: string) => {
    setShareRow(rows.find((r) => r.id === id) || null);
  };

  return (
    <div className="space-y-5">
      {/* Search & filters */}
      <div className="bg-white border border-[#e2e7ec] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7684] text-[16px]" />
            <input
              type="text"
              placeholder="Search title, owner or location..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-[#cdd5de] rounded-md text-[16px] font-roboto focus:outline-none focus:border-[#001731] focus:ring-1 focus:ring-[#001731]/20 bg-white"
            />
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
            <div className="inline-flex items-center gap-1 p-1 bg-[#f2f4f6] rounded-md" role="group" aria-label="View mode">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                title="Card view"
                className={`inline-flex items-center justify-center w-9 h-9 rounded-md text-[16px] transition-all cursor-pointer whitespace-nowrap ${viewMode === 'cards' ? 'bg-[#001731] text-white' : 'bg-transparent text-[#6b7684] hover:text-[#001731]'}`}
              >
                <i className="ri-layout-grid-line" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                title="List view"
                className={`inline-flex items-center justify-center w-9 h-9 rounded-md text-[16px] transition-all cursor-pointer whitespace-nowrap ${viewMode === 'list' ? 'bg-[#001731] text-white' : 'bg-transparent text-[#6b7684] hover:text-[#001731]'}`}
              >
                <i className="ri-list-check-2" />
              </button>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border border-[#cdd5de] rounded-md text-[16px] font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]"
            >
              <option value="all">All Statuses</option>
              {JV_STATUS_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={filterStructure}
              onChange={(e) => { setFilterStructure(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border border-[#cdd5de] rounded-md text-[16px] font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]"
            >
              <option value="all">All Structures</option>
              {Object.entries(DEAL_STRUCTURE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button
              onClick={() => navigate('/admin/jv-opportunities/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-none bg-[#001731] hover:bg-white hover:shadow-[inset_0_0_0_1px_#001731] hover:text-[#001731] text-white text-[16px] font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line" />
              Add JV Land Listing
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-[14px] text-[#6b7684] font-roboto">
          <span>{total} JV land listings</span>
          <span>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#e2e7ec] p-5 space-y-3 animate-pulse">
              <div className="h-4 w-3/4 bg-[#f2f4f6] rounded" />
              <div className="h-3 w-1/2 bg-[#f2f4f6] rounded" />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="h-5 bg-[#f2f4f6] rounded" />
                <div className="h-5 bg-[#f2f4f6] rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-white border border-[#e2e7ec] py-14 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-md bg-red-50 flex items-center justify-center">
              <i className="ri-error-warning-line text-red-400 text-2xl" />
            </div>
            <p className="text-[16px] font-roboto text-[#6b7684]">{error}</p>
            <button onClick={fetchRows} className="inline-flex items-center gap-2 text-[16px] font-roboto text-[#001731] hover:underline cursor-pointer mt-1">
              <i className="ri-refresh-line" /> Try Again
            </button>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && rows.length === 0 && (
        <div className="bg-white border border-[#e2e7ec] py-14 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-md bg-[#001731]/5 flex items-center justify-center">
              <i className="ri-group-line text-[#001731] text-2xl" />
            </div>
            <p className="text-[16px] font-roboto text-[#6b7684]">
              {total === 0 ? 'No JV land listings yet. Add your first one.' : 'No JV land listings match your filters.'}
            </p>
            {total === 0 && (
              <button
                onClick={() => navigate('/admin/jv-opportunities/new')}
                className="inline-flex items-center gap-2 text-[16px] font-roboto font-semibold text-[#001731] hover:underline cursor-pointer mt-1"
              >
                <i className="ri-add-line" /> Add a JV land listing
              </button>
            )}
          </div>
        </div>
      )}

      {/* List view */}
      {!loading && !error && rows.length > 0 && viewMode === 'list' && (
        <JVOpportunityListView
          rows={rows}
          togglingId={togglingId}
          onOpen={(id) => navigate(`/admin/jv-opportunities/edit/${id}`)}
          onTogglePublish={handleTogglePublish}
          onToggleFeatured={handleToggleFeatured}
          onShare={handleShare}
          onDelete={(id) => setDeleteConfirm(id)}
        />
      )}

      {/* Cards view */}
      {!loading && !error && rows.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <JVOpportunityCard
              key={row.id}
              row={row}
              toggling={togglingId === row.id}
              onOpen={() => navigate(`/admin/jv-opportunities/edit/${row.id}`)}
              onTogglePublish={() => handleTogglePublish(row.id, row.is_public_listing)}
              onToggleFeatured={() => handleToggleFeatured(row.id, row.is_featured)}
              onShare={() => handleShare(row.id)}
              onDelete={() => setDeleteConfirm(row.id)}
            />
          ))}
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <CRMPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} tone="light" />
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete JV Land Listing?"
        message="This permanently removes this JV land listing from the pipeline. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ShareLinkModal
        open={!!shareRow}
        title={shareRow?.title || 'JV Land Listing'}
        subtitle={displayLocation(shareRow?.land_location, null, { upper: true }) || 'JV Land Listing'}
        url={jvOpportunityPublicUrl(shareRow?.slug)}
        icon="ri-group-line"
        onClose={() => setShareRow(null)}
      />
    </div>
  );
}