import { useEffect, useRef, useState } from 'react';
import type { ContactRecord, GroupWithCount } from '@/pages/crm/contacts/contactGroups';
import { getInitials } from '@/pages/crm/contacts/contactGroups';
import {
  formatDate,
  prettySource,
  statusInfo,
} from '@/pages/crm/contacts/contactTableUtils';
import { displayTitle } from '@/lib/crmDisplay';

interface ContactTableRowProps {
  contact: ContactRecord;
  groups: GroupWithCount[];
  currentGroupId: string;
  selected: boolean;
  isStarred: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (c: ContactRecord) => void;
  onEdit: (c: ContactRecord) => void;
  onDelete: (c: ContactRecord) => void;
  onMoveToGroup: (c: ContactRecord, groupId: string) => void;
  onToggleStar: (c: ContactRecord) => void;
}

/**
 * One row of the contacts table.
 * Columns: checkbox · Name · Phone · Email · Source · Updated · Status · ⋯
 */
export default function ContactTableRow({
  contact,
  groups,
  currentGroupId,
  selected,
  isStarred,
  onToggleSelect,
  onSelect,
  onEdit,
  onDelete,
  onMoveToGroup,
  onToggleStar,
}: ContactTableRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = statusInfo(contact);

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
    <tr
      onClick={() => onSelect(contact)}
      className={`border-b border-[#eef1f4] last:border-b-0 cursor-pointer transition-colors ${
        selected ? 'bg-[#0d5959]/8' : 'hover:bg-[#f7f9fb]'
      }`}
    >
      {/* Checkbox */}
      <td className="w-12 pl-4 pr-2 py-[18px] align-middle">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(contact.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${contact.name}`}
          className="w-4 h-4 accent-[#001731] cursor-pointer"
        />
      </td>

      {/* Name + avatar + star */}
      <td className="py-[18px] pr-4 align-middle">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(contact);
            }}
            aria-label={isStarred ? 'Remove from special' : 'Mark as special'}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer flex-shrink-0 ${
              isStarred ? 'text-[#b08d2a]' : 'text-[#c7cdd4] hover:text-[#b08d2a]'
            }`}
          >
            <i className={`${isStarred ? 'ri-star-fill' : 'ri-star-line'} text-base`} />
          </button>

          <span className="w-10 h-10 rounded-full bg-[#0d5959]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[#0d5959] font-bold">{getInitials(contact.name)}</span>
          </span>

          <span className="min-w-0">
            <span className="block admin-body font-semibold text-[#001731] truncate max-w-[220px]">
              {displayTitle(contact.name)}
            </span>
            {contact.company && (
              <span className="block admin-meta text-[#001731]/55 truncate max-w-[220px]">
                {displayTitle(contact.company)}
              </span>
            )}
          </span>
        </div>
      </td>

      {/* Phone */}
      <td className="py-[18px] pr-4 align-middle whitespace-nowrap">
        <span className="admin-meta text-[#001731]/75">{contact.phone || '—'}</span>
      </td>

      {/* Email */}
      <td className="py-[18px] pr-4 align-middle">
        <span className="block admin-meta text-[#001731]/75 truncate max-w-[260px]">
          {contact.email || '—'}
        </span>
      </td>

      {/* Source */}
      <td className="py-[18px] pr-4 align-middle whitespace-nowrap">
        <span className="admin-meta text-[#001731]/70">{prettySource(contact.source)}</span>
      </td>

      {/* Updated */}
      <td className="py-[18px] pr-4 align-middle whitespace-nowrap">
        <span className="admin-meta text-[#001731]/70">{formatDate(contact.created_at)}</span>
      </td>

      {/* Status */}
      <td className="py-[18px] pr-4 align-middle whitespace-nowrap">
        <span
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full admin-meta font-semibold"
          style={{ backgroundColor: `${status.color}18`, color: status.color }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
          {status.label}
        </span>
      </td>

      {/* More */}
      <td className="w-14 pr-4 py-[18px] align-middle text-right">
        <div className="relative inline-block" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
              setMoveOpen(false);
            }}
            aria-label="More actions"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#001731]/55 hover:text-[#001731] hover:bg-[#001731]/8 transition-colors cursor-pointer"
          >
            <i className="ri-more-2-fill text-lg" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-40 w-56 bg-white border border-[#e5e7eb] rounded-lg overflow-hidden text-left animate-dropdown-enter"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(contact);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-[#001731] hover:bg-[#001731] hover:text-white transition-colors cursor-pointer"
              >
                <i className="ri-edit-line text-lg" />
                <span className="admin-label font-medium">Edit contact</span>
              </button>

              <button
                type="button"
                onClick={() => setMoveOpen((v) => !v)}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-[#001731] hover:bg-[#001731] hover:text-white transition-colors cursor-pointer border-t border-[#eef1f4]"
              >
                <i className="ri-folder-transfer-line text-lg" />
                <span className="admin-label font-medium">Move to group</span>
                <i className={`${moveOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} ml-auto text-lg`} />
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
                      <i className={`${g.icon} text-lg`} />
                      <span className="admin-meta truncate">{g.name}</span>
                      {g.id === currentGroupId && <i className="ri-check-line ml-auto text-lg" />}
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
                className="w-full flex items-center gap-2.5 px-4 py-3 text-[#dc2626] hover:bg-[#dc2626] hover:text-white transition-colors cursor-pointer border-t border-[#eef1f4]"
              >
                <i className="ri-delete-bin-line text-lg" />
                <span className="admin-label font-medium">Delete</span>
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}