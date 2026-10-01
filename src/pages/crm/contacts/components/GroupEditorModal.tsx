import { useEffect, useState } from 'react';
import type { ContactGroup } from '@/pages/crm/contacts/contactGroups';

interface GroupEditorModalProps {
  open: boolean;
  /** null = create a new group; otherwise rename/delete this group. */
  group: ContactGroup | null;
  existingNames: string[];
  onClose: () => void;
  onSave: (name: string, group: ContactGroup | null) => void;
  onDelete: (group: ContactGroup) => void;
}

/** Create / rename / delete a contact group. */
export default function GroupEditorModal({
  open,
  group,
  existingNames,
  onClose,
  onSave,
  onDelete,
}: GroupEditorModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(group?.name || '');
      setError('');
    }
  }, [open, group]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    const value = name.trim();
    if (!value) {
      setError('Group name is required');
      return;
    }
    const clash = existingNames
      .filter((n) => n.toLowerCase() !== (group?.name || '').toLowerCase())
      .some((n) => n.toLowerCase() === value.toLowerCase());
    if (clash) {
      setError('A group with this name already exists');
      return;
    }
    onSave(value, group);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001731]/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative bg-white rounded-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eef1f4]">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#0d5959]/10 text-[#0d5959] flex-shrink-0">
              <i className={`${group ? 'ri-pencil-line' : 'ri-folder-add-line'} text-lg`} />
            </span>
            <h2 className="admin-heading text-[#001731]">{group ? 'Manage Group' : 'Create Group'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#001731]/55 hover:text-[#001731] hover:bg-[#001731]/8 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="px-6 py-5">
          <label className="block admin-label font-medium text-[#001731] mb-1.5">Group name</label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder="e.g. Investors"
            maxLength={40}
            className={`w-full px-3.5 py-2.5 border rounded-lg font-roboto focus:outline-none focus:ring-1 bg-white ${
              error ? 'border-[#dc2626] focus:ring-[#dc2626]/25' : 'border-[#e5e7eb] focus:border-[#0d5959] focus:ring-[#0d5959]/25'
            }`}
          />
          {error && <p className="admin-meta text-[#dc2626] mt-1">{error}</p>}
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 px-6 py-4 border-t border-[#eef1f4] bg-[#f7f9fb]">
          {group && (
            <button
              type="button"
              onClick={() => onDelete(group)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg admin-label font-semibold text-[#dc2626] border border-[#dc2626]/25 hover:bg-[#dc2626] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-delete-bin-line text-base" />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg admin-label font-semibold text-white bg-[#001731] hover:bg-[#0d5959] transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-check-line text-base" />
            {group ? 'Save Changes' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}