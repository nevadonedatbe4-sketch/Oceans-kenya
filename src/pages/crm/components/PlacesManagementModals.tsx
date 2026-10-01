import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { addToast } from '@/pages/crm/components/CRMToast';
import {
  fetchFolders,
  createFolder,
  renameFolder,
  softDelete,
  bulkSoftDelete,
  restoreAmenity,
  bulkRestore,
  permanentDelete,
  bulkPermanentDelete,
  emptyRecycleBin,
  purgeExpiredAmenities,
  fetchDeletedAmenityIds,
  setReviewStatus,
  softDeleteReview,
  restoreReview,
  permanentDeleteReview,
  fetchReviews,
  fetchDeletedReviews,
  recomputeAmenityRating,
  fetchActivity,
  FLAG_REASONS,
  bulkFlag,
  type FlagReason,
  type AmenityReview,
  type ActivityEntry,
} from '@/lib/directory';
import { categoryLabel, type Amenity } from '@/lib/amenities';
import { supabase } from '@/lib/supabase';

const RECYCLE_AUTO_PURGE_DAYS = 30;

// ─────────────────────────────────────────────────────────────
// Shared modal shell
// ─────────────────────────────────────────────────────────────
function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8edf2]">
          <div>
            <h2 className="font-jost text-lg font-semibold text-[#001731]">{title}</h2>
            {subtitle && <p className="text-xs text-[#7a8a99] mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-[#7a8a99] hover:bg-[#f7f8fa] cursor-pointer">
            <i className="ri-close-line text-xl" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#e8edf2] flex-wrap">{footer}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Folder create / rename modal
// ─────────────────────────────────────────────────────────────
export function FolderModal({
  open,
  mode,
  folderId,
  initialName,
  onClose,
  onChanged,
}: {
  open: boolean;
  mode: 'create' | 'manage';
  folderId: string | null;
  initialName: string;
  onClose: () => void;
  onChanged: (newId?: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      addToast('Folder needs a name', 'error');
      return;
    }
    setBusy(true);
    let createdId: string | undefined;
    if (mode === 'create') {
      const res = await createFolder(name.trim());
      if (res) {
        addToast('Folder created', 'success');
        createdId = res.id;
      }
    } else if (folderId) {
      await renameFolder(folderId, name.trim());
      addToast('Folder renamed', 'success');
    }
    setBusy(false);
    onChanged(createdId);
    onClose();
  };

  return (
    <ModalShell
      title={mode === 'create' ? 'Create folder' : 'Rename folder'}
      subtitle={mode === 'create' ? 'A folder groups places together, like a Gmail label.' : 'Give this folder a clearer name.'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-[#4b5563] hover:bg-[#f7f8fa] rounded-lg cursor-pointer whitespace-nowrap">
            Cancel
          </button>
          <button onClick={handleSave} disabled={busy} className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer whitespace-nowrap">
            <i className={`${busy ? 'ri-loader-4-line animate-spin' : 'ri-folder-add-line'}`} />
            {mode === 'create' ? 'Create folder' : 'Save name'}
          </button>
        </>
      }
    >
      <label className="block text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider mb-2">Folder name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Nairobi Schools, Needs Verification…"
        className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm text-[#001731] focus:outline-none focus:border-[#0d5959]"
        autoFocus
      />
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Flag reason modal (ids passed in directly)
// ─────────────────────────────────────────────────────────────
export function FlagModal({
  open,
  ids,
  count,
  onClose,
  onDone,
}: {
  open: boolean;
  ids: string[];
  count: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState<FlagReason>('Needs verification');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('Needs verification');
      setNote('');
    }
  }, [open]);

  if (!open) return null;

  const handleFlag = async () => {
    setBusy(true);
    await bulkFlag(ids, reason, note.trim());
    addToast(`${ids.length} place(s) flagged · ${reason}`, 'success');
    setBusy(false);
    onDone();
    onClose();
  };

  return (
    <ModalShell
      title="Flag places"
      subtitle="Mark these places for attention. They stay public unless you unpublish them."
      onClose={onClose}
      footer={
        <button onClick={handleFlag} disabled={busy || !ids.length} className="inline-flex items-center gap-2 bg-[#c2410c] hover:bg-[#c2410c]/90 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer whitespace-nowrap">
          <i className={`${busy ? 'ri-loader-4-line animate-spin' : 'ri-flag-fill'}`} />
          Flag {count} place{count === 1 ? '' : 's'}
        </button>
      }
    >
      <p className="text-sm text-[#4b5563] mb-4">Why are you flagging {count} place{count === 1 ? '' : 's'}?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {FLAG_REASONS.map((r) => (
          <button
            key={r}
            onClick={() => setReason(r)}
            className={`text-left px-3 py-2.5 rounded-lg border text-sm font-roboto transition-all cursor-pointer ${
              reason === r ? 'border-[#c2410c] bg-[#fff7ed] ring-1 ring-[#c2410c]/30 text-[#9a3412]' : 'border-[#e8edf2] text-[#33414f] hover:border-[#c7d3dc]'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <label className="block text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider mb-2">Optional note</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Add context for the team (optional)…"
        className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm text-[#001731] focus:outline-none focus:border-[#0d5959] resize-none"
      />
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Recycle bin modal
//   • Paginated, so a bin with thousands of items stays fast
//   • "Select all" spans EVERY page (not just the visible one)
//   • Restore + permanent delete always available on a selection
//   • "Empty Bin" purges everything at once
//   • Auto-purge: items older than 30 days are cleared on open
// ─────────────────────────────────────────────────────────────
export function RecycleBinModal({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<Amenity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmPerm, setConfirmPerm] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [purgedNotice, setPurgedNotice] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const from = (safePage - 1) * pageSize;
    const { data, error, count } = await supabase
      .from('amenities')
      .select('*', { count: 'exact' })
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) {
      // Never masquerade a failed read as "the bin is empty".
      setLoadError(error.message || 'Could not load the Recycle Bin');
      setItems([]);
      setTotal(0);
    } else {
      const list = (data || []) as Amenity[];
      setItems(list);
      setTotal(typeof count === 'number' ? count : list.length);
    }
    setConfirmPerm(false);
    setLoading(false);
  }, [safePage, pageSize]);

  // On open: clear any previous selection, auto-purge expired items, load page 1.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setSelected([]);
    setConfirmPerm(false);
    setConfirmEmpty(false);
    setPage(1);
    (async () => {
      const purged = await purgeExpiredAmenities(RECYCLE_AUTO_PURGE_DAYS);
      if (!active) return;
      setPurgedNotice(purged);
      if (purged > 0) onChanged();
      setReloadKey((k) => k + 1);
    })();
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (open) load();
  }, [open, reloadKey, page, pageSize]);

  if (!open) return null;

  const refresh = () => {
    setReloadKey((k) => k + 1);
    onChanged();
  };

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((s) => s !== id) : [...p, id]));
  const allSelected = total > 0 && selected.length >= total;

  const selectAllAcrossPages = async () => {
    setBusy(true);
    const ids = await fetchDeletedAmenityIds();
    setSelected(ids);
    setBusy(false);
  };

  const doRestore = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    setBusy(true);
    await bulkRestore(ids);
    addToast(`${ids.length} place(s) restored`, 'success');
    setSelected([]);
    setBusy(false);
    refresh();
  };

  const doDeletePerm = async () => {
    const ids = [...selected];
    setBusy(true);
    const removed = await bulkPermanentDelete(ids);
    if (removed === 0) {
      addToast('Nothing was permanently deleted — the change was not saved', 'error');
    } else {
      addToast(`${removed}${removed < ids.length ? ` of ${ids.length}` : ''} place(s) permanently deleted`, 'success');
    }
    setConfirmPerm(false);
    setSelected([]);
    setBusy(false);
    setPage(1);
    refresh();
  };

  const doEmpty = async () => {
    setBusy(true);
    const removed = await emptyRecycleBin();
    if (removed === 0) {
      addToast('Recycle Bin is already empty', 'info');
    } else {
      addToast(`${removed} place(s) permanently deleted`, 'success');
    }
    setConfirmEmpty(false);
    setSelected([]);
    setBusy(false);
    setPage(1);
    refresh();
  };

  return (
    <ModalShell
      title="Recycle Bin"
      subtitle="Deleted places live here. Restore them at any time — permanent deletion cannot be undone."
      onClose={onClose}
      footer={
        confirmEmpty ? (
          <>
            <span className="text-xs text-[#dc2626] mr-auto">Permanently delete all {total} item{total === 1 ? '' : 's'}? This cannot be undone.</span>
            <button onClick={() => setConfirmEmpty(false)} disabled={busy} className="px-3 py-2.5 text-sm font-medium text-[#4b5563] hover:bg-[#f7f8fa] rounded-lg cursor-pointer whitespace-nowrap">Cancel</button>
            <button onClick={doEmpty} disabled={busy} className="inline-flex items-center gap-2 bg-[#dc2626] text-white px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50">
              <i className={`${busy ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-2-line'}`} /> Delete everything
            </button>
          </>
        ) : confirmPerm ? (
          <>
            <span className="text-xs text-[#dc2626] mr-auto">Permanently delete {selected.length}? This cannot be undone.</span>
            <button onClick={() => setConfirmPerm(false)} className="px-3 py-2.5 text-sm font-medium text-[#4b5563] hover:bg-[#f7f8fa] rounded-lg cursor-pointer whitespace-nowrap">Cancel</button>
            <button onClick={doDeletePerm} disabled={busy} className="inline-flex items-center gap-2 bg-[#dc2626] text-white px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50">
              <i className={`${busy ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-2-line'}`} /> Delete forever
            </button>
          </>
        ) : selected.length > 0 ? (
          <>
            <span className="text-sm font-semibold text-[#33414f] mr-auto">{selected.length} selected</span>
            <button onClick={doRestore} disabled={busy} className="inline-flex items-center gap-2 bg-[#0d5959] text-white px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50">
              <i className="ri-recycle-line" /> Restore
            </button>
            <button onClick={() => setConfirmPerm(true)} disabled={busy} className="inline-flex items-center gap-2 bg-[#dc2626] text-white px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50">
              <i className="ri-delete-bin-2-line" /> Delete forever
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setConfirmEmpty(true)}
              disabled={total === 0}
              className="mr-auto inline-flex items-center gap-2 text-[#dc2626] hover:bg-red-50 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="ri-delete-bin-2-line" /> Empty Bin
            </button>
            <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-[#4b5563] hover:bg-[#f7f8fa] rounded-lg cursor-pointer whitespace-nowrap">Close</button>
          </>
        )
      }
    >
      {purgedNotice > 0 && (
        <div className="flex items-center gap-2 mb-3 rounded-lg border border-[#e8edf2] bg-[#f7f8fa] px-3 py-2.5">
          <i className="ri-history-line text-[#0d5959]" />
          <p className="text-xs font-roboto text-[#33414f]">
            {purgedNotice} item{purgedNotice === 1 ? '' : 's'} older than {RECYCLE_AUTO_PURGE_DAYS} days were permanently removed automatically.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-[#f2f6f8] rounded-lg animate-pulse" />)}</div>
      ) : loadError ? (
        <div className="py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
            <i className="ri-error-warning-line text-red-500 text-2xl" />
          </div>
          <p className="text-sm font-semibold text-[#001731]">Couldn&rsquo;t load the Recycle Bin</p>
          <p className="text-xs text-[#7a8a99] mt-1 max-w-sm mx-auto break-words">{loadError}</p>
          <button onClick={refresh} className="mt-3 inline-flex items-center gap-1.5 bg-[#0d5959] text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap">
            <i className="ri-refresh-line" /> Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f2f6f8] flex items-center justify-center mx-auto mb-3">
            <i className="ri-delete-bin-6-line text-[#7a8a99] text-2xl" />
          </div>
          <p className="text-sm font-semibold text-[#001731]">Recycle Bin is empty</p>
          <p className="text-xs text-[#7a8a99] mt-1">Deleted places will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select-all across every page */}
          <div className="flex items-center gap-3 pb-2 flex-wrap">
            <label className="inline-flex items-center gap-1.5 text-xs font-roboto font-semibold text-[#0d5959] cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => (allSelected ? setSelected([]) : selectAllAcrossPages())}
                disabled={busy}
                className="w-4 h-4 text-[#0d5959] rounded focus:ring-[#0d5959] cursor-pointer"
              />
              {allSelected ? `All ${total} selected` : `Select all ${total}`}
            </label>
            {(selected.length > 0 || allSelected) && (
              <>
                <span className="text-[#d0d6dc]">|</span>
                <button onClick={() => setSelected([])} className="text-xs font-roboto text-[#7a8a99] cursor-pointer">Clear</button>
              </>
            )}
            <span className="ml-auto text-xs text-[#7a8a99]">
              {total} item{total === 1 ? '' : 's'}{selected.length > 0 ? ` · ${selected.length} selected` : ''}
            </span>
          </div>

          {/* Sticky action bar for a live selection */}
          {selected.length > 0 && (
            <div className="sticky top-0 z-10 -mx-1 px-3 py-2.5 mb-1 rounded-lg bg-[#eef7f5] border border-[#0d5959]/30 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[#0d5959] mr-auto whitespace-nowrap">{selected.length} selected</span>
              <button onClick={doRestore} disabled={busy} className="inline-flex items-center gap-1.5 bg-[#0d5959] text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-[#0d5959]/90 cursor-pointer whitespace-nowrap disabled:opacity-50">
                <i className="ri-recycle-line" /> Restore
              </button>
              <button onClick={() => setConfirmPerm(true)} disabled={busy} className="inline-flex items-center gap-1.5 bg-[#dc2626] text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-[#dc2626]/90 cursor-pointer whitespace-nowrap disabled:opacity-50">
                <i className="ri-delete-bin-2-line" /> Delete forever
              </button>
            </div>
          )}

          {items.map((a) => {
            const checked = selected.includes(a.id);
            return (
              <div
                key={a.id}
                onClick={() => toggle(a.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${checked ? 'border-[#0d5959] bg-[#eef7f5]' : 'border-[#e8edf2] hover:border-[#c7d3dc] hover:bg-[#f7f8fa]'}`}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(a.id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 text-[#0d5959] rounded focus:ring-[#0d5959] cursor-pointer" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-roboto font-medium text-[#001731] truncate">{a.name}</p>
                  <p className="text-xs text-[#7a8a99] truncate">
                    {categoryLabel(a.category)} · {a.neighbourhood_name || 'No area'} · deleted {a.deleted_at ? new Date(a.deleted_at).toLocaleDateString() : '—'}{a.deleted_by ? ` by ${a.deleted_by}` : ''}
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); restoreAmenity(a.id).then(() => refresh()); }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[#0d5959] hover:bg-[#eef7f5] cursor-pointer whitespace-nowrap">
                  <i className="ri-recycle-line" /> Restore
                </button>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1.5 border border-[#e8edf2] rounded-lg text-xs font-roboto text-[#33414f] bg-white focus:outline-none focus:border-[#0d5959] cursor-pointer"
              >
                {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} per page</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e8edf2] text-[#33414f] hover:bg-[#f7f8fa] disabled:opacity-40 cursor-pointer"><i className="ri-arrow-left-s-line text-base" /></button>
                <span className="px-1 text-xs font-roboto text-[#33414f]">{safePage} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e8edf2] text-[#33414f] hover:bg-[#f7f8fa] disabled:opacity-40 cursor-pointer"><i className="ri-arrow-right-s-line text-base" /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Review moderation modal
// ─────────────────────────────────────────────────────────────
export function ReviewsModal({
  open,
  amenityId,
  amenityName,
  onClose,
  onChanged,
}: {
  open: boolean;
  amenityId: string | null;
  amenityName: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [reviews, setReviews] = useState<AmenityReview[]>([]);
  const [deleted, setDeleted] = useState<AmenityReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'active' | 'bin'>('active');
  const [confirmPermId, setConfirmPermId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const load = async () => {
    if (!amenityId) return;
    setLoading(true);
    const [live, bin] = await Promise.all([fetchReviews(amenityId), fetchDeletedReviews(amenityId)]);
    setReviews(live);
    setDeleted(bin);
    setLoading(false);
  };

  useEffect(() => {
    if (open && amenityId) {
      setView('active');
      setConfirmPermId(null);
      setConfirmEmpty(false);
      load();
    }
  }, [open, amenityId]);

  if (!open || !amenityId) return null;

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
    hidden: 'bg-[#f2f6f8] text-[#7a8a99]',
    deleted: 'bg-[#fff1f2] text-[#be123c]',
  };

  const act = async (id: string, status: string) => {
    await setReviewStatus(id, status);
    await recomputeAmenityRating(amenityId);
    await load();
    onChanged();
  };

  // Move to bin — restorable, nothing lost yet.
  const softDel = async (id: string) => {
    setBusy(true);
    const ok = await softDeleteReview(id);
    if (ok) {
      await recomputeAmenityRating(amenityId);
      await load();
      onChanged();
    }
    setBusy(false);
  };

  const restore = async (id: string) => {
    setBusy(true);
    const ok = await restoreReview(id);
    if (ok) {
      await recomputeAmenityRating(amenityId);
      await load();
      onChanged();
    }
    setBusy(false);
  };

  // Permanent — bin only, cannot be undone.
  const deleteForever = async (id: string) => {
    setBusy(true);
    const ok = await permanentDeleteReview(id);
    setConfirmPermId(null);
    if (ok) {
      await recomputeAmenityRating(amenityId);
      await load();
      onChanged();
    }
    setBusy(false);
  };

  const emptyBin = async () => {
    setBusy(true);
    for (const r of deleted) {
      await permanentDeleteReview(r.id);
    }
    setConfirmEmpty(false);
    await recomputeAmenityRating(amenityId);
    await load();
    onChanged();
    setBusy(false);
  };

  const renderStars = (rating: number) => (
    <span className="text-amber-500 text-[15px]">
      {'★'.repeat(rating)}
      <span className="text-[#d6dbe1]">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );

  return (
    <ModalShell
      title="Reviews"
      subtitle={amenityName}
      onClose={onClose}
      footer={
        <>
          {view === 'bin' && deleted.length > 0 && (
            confirmEmpty ? (
              <>
                <span className="text-[15px] text-[#dc2626] mr-auto">Permanently delete all {deleted.length} review{deleted.length === 1 ? '' : 's'}? This cannot be undone.</span>
                <button onClick={() => setConfirmEmpty(false)} disabled={busy} className="px-4 py-2.5 text-[15px] font-medium text-[#4b5563] hover:bg-[#f7f8fa] rounded-lg cursor-pointer whitespace-nowrap">Cancel</button>
                <button onClick={emptyBin} disabled={busy} className="inline-flex items-center gap-2 bg-[#dc2626] text-white px-4 py-2.5 rounded-lg text-[15px] font-medium cursor-pointer whitespace-nowrap disabled:opacity-50">
                  <i className={`${busy ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-2-line'}`} /> Delete all
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmEmpty(true)} disabled={busy} className="mr-auto inline-flex items-center gap-2 text-[#dc2626] hover:bg-red-50 px-3 py-2.5 rounded-lg text-[15px] font-medium cursor-pointer whitespace-nowrap disabled:opacity-40">
                <i className="ri-delete-bin-2-line" /> Empty Bin
              </button>
            )
          )}
          <button onClick={onClose} className={`px-4 py-2.5 text-[15px] font-medium text-[#4b5563] hover:bg-[#f7f8fa] rounded-lg cursor-pointer whitespace-nowrap ${view === 'bin' && deleted.length > 0 ? '' : 'ml-auto'}`}>Close</button>
        </>
      }
    >
      {/* Active / Bin switcher */}
      <div className="inline-flex items-center gap-1 p-1 mb-4 bg-[#f2f6f8] rounded-full">
        <button onClick={() => { setView('active'); setConfirmEmpty(false); setConfirmPermId(null); }} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[15px] font-medium transition-colors cursor-pointer whitespace-nowrap ${view === 'active' ? 'bg-white text-[#0d5959] border border-[#d7e2e6]' : 'text-[#7a8a99] hover:text-[#33414f]'}`}>
          Active{reviews.length > 0 ? ` (${reviews.length})` : ''}
        </button>
        <button onClick={() => setView('bin')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[15px] font-medium transition-colors cursor-pointer whitespace-nowrap ${view === 'bin' ? 'bg-white text-[#0d5959] border border-[#d7e2e6]' : 'text-[#7a8a99] hover:text-[#33414f]'}`}>
          <i className="ri-delete-bin-6-line" /> Bin{deleted.length > 0 ? ` (${deleted.length})` : ''}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-[#f2f6f8] rounded-lg animate-pulse" />)}</div>
      ) : view === 'active' ? (
        reviews.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[15px] font-semibold text-[#001731]">No reviews yet</p>
            <p className="text-[15px] text-[#7a8a99] mt-1">Reviews submitted on the public page appear here for moderation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border border-[#e8edf2] rounded-lg p-4">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {renderStars(r.rating)}
                    <span className="text-[15px] text-[#7a8a99]">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[15px] font-semibold ${statusColor[r.moderation_status] || 'bg-[#f2f6f8] text-[#7a8a99]'}`}>{r.moderation_status}</span>
                </div>
                <p className="text-[15px] text-[#33414f] mb-2">{r.review_text || 'No text'}</p>
                <p className="text-[15px] text-[#7a8a99] mb-3">{r.reviewer_name || 'Anonymous'}{r.reviewer_email ? ` · ${r.reviewer_email}` : ''}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.moderation_status !== 'approved' && <button onClick={() => act(r.id, 'approved')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[15px] font-medium text-[#0d5959] hover:bg-[#eef7f5] cursor-pointer whitespace-nowrap"><i className="ri-check-line" /> Approve</button>}
                  {r.moderation_status !== 'rejected' && <button onClick={() => act(r.id, 'rejected')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[15px] font-medium text-red-600 hover:bg-red-50 cursor-pointer whitespace-nowrap"><i className="ri-close-line" /> Reject</button>}
                  {r.moderation_status !== 'hidden' && <button onClick={() => act(r.id, 'hidden')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[15px] font-medium text-[#7a8a99] hover:bg-[#f2f6f8] cursor-pointer whitespace-nowrap"><i className="ri-eye-off-line" /> Hide</button>}
                  <button onClick={() => softDel(r.id)} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[15px] font-medium text-[#7a8a99] hover:bg-red-50 hover:text-red-600 cursor-pointer whitespace-nowrap disabled:opacity-50" title="Move to the Recycle Bin (restorable)"><i className="ri-delete-bin-line" /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : deleted.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f2f6f8] flex items-center justify-center mx-auto mb-3">
            <i className="ri-delete-bin-6-line text-[#7a8a99] text-2xl" />
          </div>
          <p className="text-[15px] font-semibold text-[#001731]">Bin is empty</p>
          <p className="text-[15px] text-[#7a8a99] mt-1">Deleted reviews wait here and can be restored at any time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deleted.map((r) => (
            <div key={r.id} className="border border-[#f1d9dd] bg-[#fff8f9] rounded-lg p-4">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {renderStars(r.rating)}
                  <span className="text-[15px] text-[#7a8a99]">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[15px] font-semibold text-[#be123c]">In bin</span>
              </div>
              <p className="text-[15px] text-[#33414f] mb-2">{r.review_text || 'No text'}</p>
              <p className="text-[15px] text-[#7a8a99] mb-3">{r.reviewer_name || 'Anonymous'}{r.reviewer_email ? ` · ${r.reviewer_email}` : ''}</p>
              {confirmPermId === r.id ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] text-[#dc2626] mr-auto">Delete forever? This cannot be undone.</span>
                  <button onClick={() => setConfirmPermId(null)} className="px-3 py-1.5 text-[15px] font-medium text-[#4b5563] hover:bg-[#f2f6f8] rounded-lg cursor-pointer whitespace-nowrap">Cancel</button>
                  <button onClick={() => deleteForever(r.id)} disabled={busy} className="inline-flex items-center gap-1.5 bg-[#dc2626] text-white px-3 py-1.5 rounded-lg text-[15px] font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"><i className="ri-delete-bin-2-line" /> Delete forever</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => restore(r.id)} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[15px] font-medium text-[#0d5959] hover:bg-[#eef7f5] cursor-pointer whitespace-nowrap disabled:opacity-50"><i className="ri-recycle-line" /> Restore</button>
                  <button onClick={() => setConfirmPermId(r.id)} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[15px] font-medium text-red-600 hover:bg-red-50 cursor-pointer whitespace-nowrap disabled:opacity-50"><i className="ri-delete-bin-2-line" /> Delete forever</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Activity feed modal
// ─────────────────────────────────────────────────────────────
export function ActivityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchActivity().then((list) => {
        setEntries(list);
        setLoading(false);
      });
    }
  }, [open]);

  if (!open) return null;

  return (
    <ModalShell
      title="Activity log"
      subtitle="Recent administrative actions across the directory."
      onClose={onClose}
      footer={
        <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-[#4b5563] hover:bg-[#f7f8fa] rounded-lg cursor-pointer whitespace-nowrap">Close</button>
      }
    >
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 bg-[#f2f6f8] rounded-lg animate-pulse" />)}</div>
      ) : entries.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-semibold text-[#001731]">No activity yet</p>
          <p className="text-xs text-[#7a8a99] mt-1">Publish, star, flag, move and delete actions appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-[#e8edf2] text-sm">
              <div className="w-8 h-8 rounded-lg bg-[#eef7f5] text-[#0d5959] flex items-center justify-center shrink-0">
                <i className="ri-history-line text-base" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-roboto font-medium text-[#001731] truncate">{e.action}</p>
                {e.note && <p className="text-xs text-[#7a8a99] truncate">{e.note}</p>}
              </div>
              <span className="text-xs text-[#7a8a99] shrink-0 whitespace-nowrap">
                {e.created_at ? new Date(e.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

// Re-export the folder helpers used by the page to avoid duplicate imports.
export { fetchFolders, softDelete, bulkSoftDelete };