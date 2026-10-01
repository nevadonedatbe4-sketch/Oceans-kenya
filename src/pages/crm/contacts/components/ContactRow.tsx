import { useEffect, useRef, useState } from 'react';
import type { ContactRecord, GroupWithCount } from '@/pages/crm/contacts/contactGroups';
import { getInitials, typeInfo, visibleTags } from '@/pages/crm/contacts/contactGroups';
import { displayTitle } from '@/lib/crmDisplay';

interface ContactRowProps {
  contact: ContactRecord;
  groups: GroupWithCount[];
  currentGroupId: string;
  isSelected: boolean;
  onSelect: (c: ContactRecord) => void;
  onEdit: (c: ContactRecord) => void;
  onDelete: (c: ContactRecord) => void;
  onMoveToGroup: (c: ContactRecord, groupId: string) => void;
  onToggleStar: (c: ContactRecord) => void;
  isStarred: boolean;
}

/**
 * A single contact row.
 *
 * Layout: avatar | Name | Company/Role | Phone | Email | Status | More
 * Name is the strongest element; secondary info stays readable but visually
 * subordinate. Rows use subtle separators and a clear hover/selected state.
 */
export default function ContactRow({
  contact,
  groups,
  currentGroupId,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onMoveToGroup,
  onToggleStar,
  isStarred,
}: ContactRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const info = typeInfo(contact.type);
  const tags = visibleTags(contact.tags).slice(0, 2);
  const companyRole = displayTitle(contact.company) || info.label;

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMoveOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setMoveOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div
      onClick={() => onSelect(contact)}
      className={`group relative flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors border-b border-[#eef1f4] last:border-b-0 ${
        isSelected ? 'bg-[#0d5959]/8' : 'hover:bg-[#f7f9fb]'
      }`}
    >
      {/* Star / favourite */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar(contact);
        }}
        aria-label={isStarred ? 'Remove from special' : 'Mark as special'}
        className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
          isStarred ? 'text-[#b08d2a]' : 'text-[#c7cdd4] hover:text-[#b08d2a]'
        }`}
      >
        <i className={`${isStarred ? 'ri-star-fill' : 'ri-star-line'} text-base`} />
      </button>

      {/* Avatar / initials */}
      <div className="w-11 h-11 rounded-full bg-[#0d5959]/10 flex items-center justify-center flex-shrink-0">
        <span className="text-[#0d5959] text-base font-bold">{getInitials(contact.name)}</span>
      </div>

      {/* Name + company/role + mobile meta */}
      <div className="min-w-0 flex-1">
        <p className="admin-body font-semibold text-[#001731] truncate">{displayTitle(contact.name)}</p>
        <p className="admin-meta text-[#001731]/55 truncate">{companyRole}</p>
        {/* Compact phone / email line — mobile & tablet only */}
        <div className="lg:hidden flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1">
          {contact.phone && (
            <span className="inline-flex items-center gap-1.5 admin-meta text-[#001731]/70">
              <i className="ri-phone-line text-sm" />
              {contact.phone}
            </span>
          )}
          {contact.email && (
            <span className="inline-flex items-center gap-1.5 admin-meta text-[#001731]/70 min-w-0 max-w-full">
              <i className="ri-mail-line text-sm" />
              <span className="truncate">{contact.email}</span>
            </span>
          )}
        </div>
        {tags.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1.5 mt-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex px-2 py-0.5 rounded-full admin-meta bg-[#001731]/6 text-[#001731]/70 capitalize">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Phone column (desktop) */}
      <div className="hidden lg:flex items-center gap-2 w-[168px] flex-shrink-0 min-w-0">
        {contact.phone ? (
          <>
            <span className="w-5 h-5 flex items-center justify-center text-[#001731]/40 flex-shrink-0">
              <i className="ri-phone-line text-base" />
            </span>
            <span className="admin-meta text-[#001731]/75 truncate">{contact.phone}</span>
          </>
        ) : (
          <span className="admin-meta text-[#001731]/30">—</span>
        )}
      </div>

      {/* Email column (desktop) */}
      <div className="hidden xl:flex items-center gap-2 w-[230px] flex-shrink-0 min-w-0">
        {contact.email ? (
          <>
            <span className="w-5 h-5 flex items-center justify-center text-[#001731]/40 flex-shrink-0">
              <i className="ri-mail-line text-base" />
            </span>
            <span className="admin-meta text-[#001731]/75 truncate">{contact.email}</span>
          </>
        ) : (
          <span className="admin-meta text-[#001731]/30">—</span>
        )}
      </div>

      {/* Status badge */}
      <span
        className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full admin-meta font-semibold flex-shrink-0 whitespace-nowrap"
        style={{ backgroundColor: `${info.color}18`, color: info.color }}
      >
        <i className={`${info.icon} text-sm`} />
        {info.label}
      </span>

      {/* More menu */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
            setMoveOpen(false);
          }}
          aria-label="More actions"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-[#001731]/55 hover:text-[#001731] hover:bg-[#001731]/8 transition-colors cursor-pointer"
        >
          <i className="ri-more-2-fill text-lg" />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 z-30 w-56 bg-white border border-[#e5e7eb] rounded-lg overflow-hidden animate-dropdown-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit(contact);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[#001731] font-medium hover:bg-[#001731] hover:text-white transition-colors cursor-pointer"
            >
              <i className="ri-edit-line text-base" />
              <span className="admin-label">Edit contact</span>
            </button>

            <button
              type="button"
              onClick={() => setMoveOpen((v) => !v)}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[#001731] font-medium hover:bg-[#001731] hover:text-white transition-colors cursor-pointer border-t border-[#eef1f4]"
            >
              <i className="ri-folder-transfer-line text-base" />
              <span className="admin-label">Move to group</span>
              {moveOpen ? (
                <i className="ri-arrow-up-s-line ml-auto text-base" />
              ) : (
                <i className="ri-arrow-down-s-line ml-auto text-base" />
              )}
            </button>

            {moveOpen && (
              <div className="max-h-56 overflow-y-auto border-t border-[#eef1f4] bg-[#f7f9fb]">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    disabled={g.id === currentGroupId}
                    onClick={() => {
                      setMenuOpen(false);
                      setMoveOpen(false);
                      onMoveToGroup(contact, g.id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                      g.id === currentGroupId
                        ? 'text-[#001731]/40 cursor-default'
                        : 'text-[#001731] hover:bg-[#001731] hover:text-white cursor-pointer'
                    }`}
                  >
                    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0" style={{ color: 'inherit' }}>
                      <i className={`${g.icon} text-base`} />
                    </span>
                    <span className="admin-meta truncate">{g.name}</span>
                    {g.id === currentGroupId && <i className="ri-check-line ml-auto text-base" />}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete(contact);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[#dc2626] font-medium hover:bg-[#dc2626] hover:text-white transition-colors cursor-pointer border-t border-[#eef1f4]"
            >
              <i className="ri-delete-bin-line text-base" />
              <span className="admin-label">Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}