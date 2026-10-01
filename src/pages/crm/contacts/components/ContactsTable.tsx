import type { ContactRecord, GroupWithCount } from '@/pages/crm/contacts/contactGroups';
import ContactTableRow from '@/pages/crm/contacts/components/ContactTableRow';
import type { SortDir, SortKey } from '@/pages/crm/contacts/contactTableUtils';

interface ContactsTableProps {
  rows: ContactRecord[];
  groups: GroupWithCount[];
  currentGroupId: string;
  selectedIds: Set<string>;
  starredIds: Set<string>;
  sortKey: SortKey;
  sortDir: SortDir;
  visibleCount: number;
  onSort: (key: SortKey) => void;
  onToggleSelect: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onShowMore: () => void;
  onSelect: (c: ContactRecord) => void;
  onEdit: (c: ContactRecord) => void;
  onDelete: (c: ContactRecord) => void;
  onMoveToGroup: (c: ContactRecord, groupId: string) => void;
  onToggleStar: (c: ContactRecord) => void;
  onUnsubscribe: () => void;
  onDownload: () => void;
  onAddTags: () => void;
  onRemoveTags: () => void;
  onBulkDelete: () => void;
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email Address' },
  { key: 'source', label: 'Source' },
  { key: 'updated', label: 'Updated' },
  { key: 'status', label: 'Status' },
];

/**
 * The CRM contacts table: a sortable header, a checkbox selection column,
 * and a bulk-action bar that appears when rows are selected.
 */
export default function ContactsTable({
  rows,
  groups,
  currentGroupId,
  selectedIds,
  starredIds,
  sortKey,
  sortDir,
  visibleCount,
  onSort,
  onToggleSelect,
  onToggleAll,
  onShowMore,
  onSelect,
  onEdit,
  onDelete,
  onMoveToGroup,
  onToggleStar,
  onUnsubscribe,
  onDownload,
  onAddTags,
  onRemoveTags,
  onBulkDelete,
}: ContactsTableProps) {
  const shown = rows.slice(0, visibleCount);
  const remaining = rows.length - shown.length;
  const allShownSelected = shown.length > 0 && shown.every((r) => selectedIds.has(r.id));
  const selectedCount = selectedIds.size;

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return 'ri-arrow-up-down-line text-[#ffffff]/45';
    return sortDir === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc';
  };

  return (
    <section className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
      {/* Bulk actions bar */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3 bg-[#f7f9fb] border-b border-[#eef1f4]">
          <span className="admin-meta font-semibold text-[#001731]">
            {selectedCount} of {rows.length} contacts selected.
          </span>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 ml-auto">
            <span className="admin-meta font-semibold text-[#001731]/60">Bulk Actions:</span>
            <button
              type="button"
              onClick={onUnsubscribe}
              className="admin-label font-medium text-[#001731] underline-offset-2 hover:underline hover:text-[#0d5959] transition-colors cursor-pointer whitespace-nowrap"
            >
              Unsubscribe Email
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="admin-label font-medium text-[#001731] underline-offset-2 hover:underline hover:text-[#0d5959] transition-colors cursor-pointer whitespace-nowrap"
            >
              Download
            </button>
            <button
              type="button"
              onClick={onAddTags}
              className="admin-label font-medium text-[#001731] underline-offset-2 hover:underline hover:text-[#0d5959] transition-colors cursor-pointer whitespace-nowrap"
            >
              Add tags
            </button>
            <button
              type="button"
              onClick={onRemoveTags}
              className="admin-label font-medium text-[#001731] underline-offset-2 hover:underline hover:text-[#0d5959] transition-colors cursor-pointer whitespace-nowrap"
            >
              Remove tags
            </button>
            <button
              type="button"
              onClick={onBulkDelete}
              className="admin-label font-semibold text-[#dc2626] underline-offset-2 hover:underline transition-colors cursor-pointer whitespace-nowrap"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto big-scroll-x">
        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr className="bg-[#001731] text-white">
              <th className="w-12 pl-4 pr-2 py-4 align-middle">
                <input
                  type="checkbox"
                  checked={allShownSelected}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  aria-label="Select all contacts"
                  className="w-4 h-4 accent-white cursor-pointer"
                />
              </th>
              {COLUMNS.map((col) => (
                <th key={col.key} className="py-4 pr-4 text-left align-middle">
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className="inline-flex items-center gap-1.5 uppercase tracking-wide admin-meta font-bold text-white hover:text-white/80 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {col.label}
                    <i className={`${sortIcon(col.key)} text-base`} />
                  </button>
                </th>
              ))}
              <th className="w-14 pr-4 py-4" />
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <ContactTableRow
                key={c.id}
                contact={c}
                groups={groups}
                currentGroupId={currentGroupId}
                selected={selectedIds.has(c.id)}
                isStarred={starredIds.has(c.id)}
                onToggleSelect={onToggleSelect}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                onMoveToGroup={onMoveToGroup}
                onToggleStar={onToggleStar}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-t border-[#eef1f4]">
          <span className="admin-meta text-[#001731]/55">
            Showing {shown.length} of {rows.length} contacts
          </span>
          {remaining > 0 && (
            <button
              type="button"
              onClick={onShowMore}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md admin-label font-semibold text-[#001731] border border-[#001731]/20 hover:bg-[#001731] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line text-lg" />
              Load {Math.min(remaining, 25)} more
            </button>
          )}
        </div>
      )}
    </section>
  );
}