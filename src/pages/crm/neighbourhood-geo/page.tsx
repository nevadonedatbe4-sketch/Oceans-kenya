import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import { useAreaGeoAdmin, type AdminArea } from '@/hooks/useAreaGeoAdmin';
import AreaEditDrawer from './components/AreaEditDrawer';
import RadiusDiagnosticsPanel from './components/RadiusDiagnosticsPanel';

type Tab = 'areas' | 'diagnostics';
type SortKey = 'name' | 'listings' | 'updated';

const ACCURACY_LABEL: Record<string, string> = {
  exact: 'Exact',
  area_approximate: 'Approx.',
  unverified: 'Unverified',
};
const VERIFICATION_STYLE: Record<string, string> = {
  verified: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  needs_review: 'bg-stone-100 text-stone-600',
};
const VERIFICATION_LABEL: Record<string, string> = {
  verified: 'Verified',
  pending: 'Pending',
  needs_review: 'Needs review',
};

const PAGE_SIZE = 12;

export default function NeighbourhoodGeoMapping() {
  const api = useAreaGeoAdmin();
  const { areas, loading, error, fetchAreas } = api;

  const [tab, setTab] = useState<Tab>('areas');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminArea | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminArea | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => { fetchAreas(); }, [fetchAreas]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = areas;
    if (term) {
      list = list.filter((a) =>
        a.name.toLowerCase().includes(term) ||
        a.slug.toLowerCase().includes(term) ||
        a.city.toLowerCase().includes(term) ||
        a.aliases.some((al) => al.toLowerCase().includes(term)),
      );
    }
    return [...list].sort((a, b) => {
      if (sortKey === 'listings') return b.listings - a.listings;
      if (sortKey === 'updated') return (b.updated_at || '').localeCompare(a.updated_at || '');
      return a.name.localeCompare(b.name);
    });
  }, [areas, search, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const paged = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: areas.length,
    active: areas.filter((a) => a.is_active).length,
    verified: areas.filter((a) => a.verification_status === 'verified').length,
    needsCoords: areas.filter((a) => a.latitude == null || a.longitude == null).length,
  }), [areas]);

  const handleToggleActive = async (area: AdminArea) => {
    setTogglingId(area.id);
    try {
      await api.setActive(area.id, !area.is_active);
      addToast(area.is_active ? `${area.name} deactivated` : `${area.name} reactivated`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update area', 'error');
    }
    setTogglingId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteArea(deleteTarget);
      addToast(`${deleteTarget.name} deleted`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete area', 'error');
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div>
          <h1 className="text-xl font-jost font-semibold text-white">Neighbourhoods &amp; Geo-Mapping</h1>
          <p className="text-sm font-roboto text-white/70 mt-0.5">The single source of truth for area coordinates, landmarks and neighbour relationships.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAreas} className="inline-flex items-center gap-2 bg-white border border-[#f0f0f0] text-[#001731] px-3 py-2.5 rounded-lg text-sm font-roboto cursor-pointer whitespace-nowrap">
            <i className="ri-refresh-line" /> Refresh
          </button>
          <Link to="/admin/neighbourhoods/new" className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2.5 rounded-lg text-sm font-roboto cursor-pointer whitespace-nowrap">
            <i className="ri-add-line" /> Add Area
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {([['areas', 'Areas & Geo-Mapping'], ['diagnostics', 'Radius Diagnostics']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-roboto font-medium cursor-pointer whitespace-nowrap transition-colors ${
              tab === key ? 'bg-[#0d5959] text-white' : 'bg-white text-[#636363] border border-[#f0f0f0] hover:text-[#001731]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'diagnostics' ? (
        <RadiusDiagnosticsPanel areas={areas} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total areas', value: stats.total },
              { label: 'Active in search', value: stats.active },
              { label: 'Verified', value: stats.verified },
              { label: 'Missing coordinates', value: stats.needsCoords },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-[#f0f0f0] p-4">
                <p className="text-xs font-roboto text-[#636363]">{s.label}</p>
                <p className="text-2xl font-jost font-semibold text-[#001731]">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#636363]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search areas, slugs, aliases..."
                className="w-full pl-9 pr-4 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto bg-white focus:outline-none focus:border-[#0d5959]"
              />
            </div>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto bg-white focus:outline-none focus:border-[#0d5959]">
              <option value="name">Sort: Name (A-Z)</option>
              <option value="listings">Sort: Listings</option>
              <option value="updated">Sort: Last updated</option>
            </select>
          </div>

          {error && <p className="text-sm font-roboto text-red-500">{error}</p>}

          {/* Table */}
          <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-roboto min-w-[1000px]">
                <thead className="bg-[#f8fafc] text-[#636363] text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Area</th>
                    <th className="text-left px-4 py-3">Aliases</th>
                    <th className="text-left px-4 py-3">Primary landmark</th>
                    <th className="text-left px-4 py-3">Lat / Lng</th>
                    <th className="text-right px-4 py-3">Listings</th>
                    <th className="text-center px-4 py-3">Neighbours</th>
                    <th className="text-left px-4 py-3">Accuracy</th>
                    <th className="text-left px-4 py-3">Verification</th>
                    <th className="text-center px-4 py-3">Active</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && areas.length === 0 ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t border-[#f0f0f0]">
                        <td colSpan={10} className="px-4 py-4"><div className="h-4 bg-[#f7f8fa] rounded animate-pulse" /></td>
                      </tr>
                    ))
                  ) : paged.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-10 text-center text-[#9a9a9a]">No areas match your search.</td></tr>
                  ) : (
                    paged.map((area) => (
                      <tr key={area.id} className="border-t border-[#f0f0f0] hover:bg-[#fafafa]">
                        <td className="px-4 py-3">
                          <p className="text-[#001731] font-medium">{area.name}</p>
                          <p className="text-[11px] text-[#9a9a9a]">/{area.slug}</p>
                        </td>
                        <td className="px-4 py-3 text-[#636363] max-w-[160px]">
                          <span className="line-clamp-2">{area.aliases.length > 0 ? area.aliases.join(', ') : <span className="text-[#c0c0c0]">-</span>}</span>
                        </td>
                        <td className="px-4 py-3 text-[#636363] max-w-[160px]">
                          <span className="line-clamp-2">{area.primaryLandmarkName || <span className="text-[#c0c0c0]">-</span>}</span>
                        </td>
                        <td className="px-4 py-3 text-[#636363] whitespace-nowrap">
                          {area.latitude != null && area.longitude != null
                            ? `${area.latitude.toFixed(4)}, ${area.longitude.toFixed(4)}`
                            : <span className="text-amber-600">missing</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-[#001731]">{area.listings}</td>
                        <td className="px-4 py-3 text-center text-[#001731]">{area.neighbourCount}</td>
                        <td className="px-4 py-3 text-[#636363]">{ACCURACY_LABEL[area.location_accuracy] || area.location_accuracy}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${VERIFICATION_STYLE[area.verification_status]}`}>
                            {VERIFICATION_LABEL[area.verification_status] || area.verification_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleActive(area)}
                            disabled={togglingId === area.id}
                            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer align-middle ${area.is_active ? 'bg-[#0d5959]' : 'bg-stone-300'}`}
                            title={area.is_active ? 'Deactivate' : 'Reactivate'}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${area.is_active ? 'left-[18px]' : 'left-0.5'}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => setEditing(area)} className="text-[#0d5959] font-medium hover:underline cursor-pointer mr-3">Edit</button>
                          <button onClick={() => setDeleteTarget(area)} className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[#636363] hover:text-red-600 hover:bg-red-50 cursor-pointer align-middle">
                            <i className="ri-delete-bin-line" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageClamped === 1} className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#f0f0f0] bg-white text-[#636363] cursor-pointer disabled:opacity-40">
                <i className="ri-arrow-left-s-line" />
              </button>
              <span className="text-sm font-roboto text-[#636363]">Page {pageClamped} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageClamped === totalPages} className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#f0f0f0] bg-white text-[#636363] cursor-pointer disabled:opacity-40">
                <i className="ri-arrow-right-s-line" />
              </button>
            </div>
          )}
        </>
      )}

      {editing && (
        <AreaEditDrawer
          area={editing}
          allAreas={areas}
          api={api}
          onClose={() => setEditing(null)}
          onSaved={() => { fetchAreas(); }}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete area?"
        message={deleteTarget && deleteTarget.listings > 0
          ? `"${deleteTarget.name}" still has ${deleteTarget.listings} listing(s). Reassign them before deleting.`
          : `This permanently removes "${deleteTarget?.name}" and its landmarks/neighbour links. This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}