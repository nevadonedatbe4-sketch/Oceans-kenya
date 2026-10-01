import type { CSSProperties } from 'react';
import type { ContactGroup, GroupWithCount } from '@/pages/crm/contacts/contactGroups';
import { VIEW_ALL, VIEW_GROUPS } from '@/pages/crm/contacts/contactGroups';

interface ContactGroupNavProps {
  groups: GroupWithCount[];
  totalCount: number;
  activeId: string;
  onSelect: (id: string) => void;
  onCreateGroup: () => void;
  onManageGroup?: (group: ContactGroup) => void;
  variant?: 'desktop' | 'mobile';
  className?: string;
}

/**
 * CONTACTS GROUPS NAVIGATION — the single reusable group navigator.
 *
 * Desktop: rendered in the sticky left sidebar.
 * Mobile: rendered inside the full-height group drawer.
 *
 * Visual language (shared): white surface, dark-blue text/icons.
 * Hover / Active: dark-blue background, white text/icons.
 */
export default function ContactGroupNav({
  groups,
  totalCount,
  activeId,
  onSelect,
  onCreateGroup,
  onManageGroup,
  variant = 'desktop',
  className = '',
}: ContactGroupNavProps) {
  const padding = variant === 'mobile' ? 'p-4' : 'p-3';

  const countClass = (active: boolean) =>
    `ml-auto inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-semibold flex-shrink-0 ${
      active ? 'bg-white/20 text-white' : 'bg-[#001731]/8 text-[#001731] group-hover/nav:bg-white/20 group-hover/nav:text-white'
    }`;

  const topRowClass = (active: boolean) =>
    `w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors cursor-pointer group/nav outline-none focus-visible:ring-2 focus-visible:ring-[#001731]/40 ${
      active
        ? 'bg-[#001731] text-white font-semibold'
        : 'text-[#001731] font-medium hover:bg-[#001731] hover:text-white'
    }`;

  return (
    <div className={`flex flex-col ${className}`}>
      <div className={`${padding} space-y-1.5`}>
        <button type="button" onClick={() => onSelect(VIEW_ALL)} className={topRowClass(activeId === VIEW_ALL)}>
          <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 group-hover/nav:text-white">
            <i className="ri-contacts-book-3-line text-lg" />
          </span>
          <span className="admin-label">Contacts</span>
          <span className={countClass(activeId === VIEW_ALL)}>{totalCount}</span>
        </button>

        <button type="button" onClick={() => onSelect(VIEW_GROUPS)} className={topRowClass(activeId === VIEW_GROUPS)}>
          <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 group-hover/nav:text-white">
            <i className="ri-layout-grid-line text-lg" />
          </span>
          <span className="admin-label">All Groups</span>
          <span className={countClass(activeId === VIEW_GROUPS)}>{groups.length}</span>
        </button>
      </div>

      <div className={`${variant === 'mobile' ? 'px-4' : 'px-3'} pb-1`}>
        <p className="text-sm font-semibold uppercase tracking-wider text-[#001731]/45">Groups</p>
      </div>

      <div className={`${padding} pt-2 space-y-1.5 flex-1 overflow-y-auto`}>
        {groups.map((g) => {
          const active = activeId === g.id;
          return (
            <div
              key={g.id}
              style={{ '--g': active ? '#ffffff' : g.color } as CSSProperties}
              className={`group/nav flex items-center rounded-lg transition-colors ${
                active ? 'bg-[#001731] text-white' : 'text-[#001731] hover:bg-[#001731] hover:text-white'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(g.id)}
                className="flex-1 min-w-0 flex items-center gap-3 px-3 py-3 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg"
                title={g.name}
              >
                <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-[color:var(--g)] group-hover/nav:text-white">
                  <i className={`${g.icon} text-lg`} />
                </span>
                <span className={`admin-label truncate ${active ? 'font-semibold' : ''}`}>{g.name}</span>
                <span className={countClass(active)}>{g.count}</span>
              </button>
              {!g.builtin && onManageGroup && (
                <button
                  type="button"
                  onClick={() => onManageGroup(g)}
                  aria-label={`Manage ${g.name}`}
                  title="Rename / delete group"
                  className="mr-1.5 w-7 h-7 flex items-center justify-center rounded-md text-current opacity-0 group-hover/nav:opacity-100 focus-visible:opacity-100 hover:bg-white/20 transition-all cursor-pointer flex-shrink-0"
                >
                  <i className="ri-pencil-line text-base" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className={`${padding} border-t border-[#e5e7eb]`}>
        <button
          type="button"
          onClick={onCreateGroup}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-[#001731] font-semibold transition-colors cursor-pointer border border-dashed border-[#001731]/30 hover:bg-[#001731] hover:text-white hover:border-solid hover:border-[#001731]"
        >
          <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
            <i className="ri-add-line text-xl" />
          </span>
          <span className="admin-label">Create Group</span>
        </button>
      </div>
    </div>
  );
}