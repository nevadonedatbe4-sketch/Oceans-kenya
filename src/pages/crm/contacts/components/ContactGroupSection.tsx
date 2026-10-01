import type { ContactRecord, GroupWithCount } from '@/pages/crm/contacts/contactGroups';
import ContactRow from '@/pages/crm/contacts/components/ContactRow';

interface ContactGroupSectionProps {
  group: GroupWithCount;
  collapsed: boolean;
  onToggle: (id: string) => void;
  visibleCount: number;
  onShowMore: (id: string) => void;
  selectedId: string | null;
  starredIds: Set<string>;
  allGroups: GroupWithCount[];
  onSelect: (c: ContactRecord) => void;
  onEdit: (c: ContactRecord) => void;
  onDelete: (c: ContactRecord) => void;
  onMoveToGroup: (c: ContactRecord, groupId: string) => void;
  onToggleStar: (c: ContactRecord) => void;
}

/**
 * Collapsible contact group: header (icon + name + count) with a divider,
 * then the grouped contact rows. Headings and counts use the dark-blue CRM
 * colour so the hierarchy reads at a glance.
 */
export default function ContactGroupSection({
  group,
  collapsed,
  onToggle,
  visibleCount,
  onShowMore,
  selectedId,
  starredIds,
  allGroups,
  onSelect,
  onEdit,
  onDelete,
  onMoveToGroup,
  onToggleStar,
}: ContactGroupSectionProps) {
  const shown = group.contacts.slice(0, visibleCount);
  const remaining = group.contacts.length - shown.length;

  return (
    <section className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(group.id)}
        aria-expanded={!collapsed}
        className="w-full flex items-center gap-3 px-4 md:px-5 pt-4 pb-3 text-left cursor-pointer group"
      >
        <span
          className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ backgroundColor: `${group.color}18`, color: group.color }}
        >
          <i className={`${group.icon} text-lg`} />
        </span>
        <h3 className="admin-heading text-[#001731] uppercase tracking-wide truncate">{group.name}</h3>
        <span className="inline-flex items-center justify-center min-w-[30px] h-7 px-2 rounded-full admin-meta font-bold bg-[#001731] text-white flex-shrink-0">
          {group.count}
        </span>
        <span className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-[#001731] group-hover:bg-[#001731]/8 transition-colors flex-shrink-0">
          {collapsed ? <i className="ri-arrow-down-s-line text-xl" /> : <i className="ri-arrow-up-s-line text-xl" />}
        </span>
      </button>

      <div className="mx-4 md:mx-5 border-b-2 border-[#001731]/12" />

      {!collapsed && (
        <div>
          {group.contacts.length === 0 ? (
            <div className="px-4 md:px-5 py-6 text-center">
              <p className="admin-body text-[#001731]/45">No contacts in this group yet.</p>
            </div>
          ) : (
            <>
              {shown.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  groups={allGroups}
                  currentGroupId={group.id}
                  isSelected={selectedId === c.id}
                  isStarred={starredIds.has(c.id)}
                  onSelect={onSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMoveToGroup={onMoveToGroup}
                  onToggleStar={onToggleStar}
                />
              ))}
              {remaining > 0 && (
                <div className="px-4 md:px-5 py-3 border-t border-[#eef1f4] text-center">
                  <button
                    type="button"
                    onClick={() => onShowMore(group.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg admin-label font-semibold text-[#001731] border border-[#001731]/20 hover:bg-[#001731] hover:text-white transition-colors cursor-pointer"
                  >
                    <i className="ri-add-line text-base" />
                    Show {Math.min(remaining, 25)} more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}