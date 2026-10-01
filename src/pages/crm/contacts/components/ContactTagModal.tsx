import { useEffect, useState } from 'react';

interface ContactTagModalProps {
  open: boolean;
  mode: 'add' | 'remove';
  count: number;
  onClose: () => void;
  onApply: (tag: string, mode: 'add' | 'remove') => void;
}

/** Small modal to add or remove a tag across the selected contacts. */
export default function ContactTagModal({ open, mode, count, onClose, onApply }: ContactTagModalProps) {
  const [tag, setTag] = useState('');

  useEffect(() => {
    if (open) setTag('');
  }, [open, mode]);

  if (!open) return null;

  const verb = mode === 'add' ? 'Add tag to' : 'Remove tag from';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001731]/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="admin-subheading text-[#001731] mb-2">
          {mode === 'add' ? 'Add tag' : 'Remove tag'}
        </h3>
        <p className="admin-body text-[#001731]/60 mb-4">
          {verb} {count} selected contact{count === 1 ? '' : 's'}.
        </p>

        <label className="block admin-label font-medium text-[#374151] mb-1.5" htmlFor="bulk-tag">
          Tag name
        </label>
        <input
          id="bulk-tag"
          type="text"
          value={tag}
          autoFocus
          onChange={(e) => setTag(e.target.value)}
          placeholder="e.g. vip, investor, follow-up"
          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-md font-roboto bg-white focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/25"
        />

        <div className="flex items-center gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-[#001731]/20 rounded-md admin-label font-medium text-[#001731] hover:bg-[#f7f9fb] transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!tag.trim()}
            onClick={() => onApply(tag.trim(), mode)}
            className="flex-1 px-4 py-2.5 rounded-md admin-label font-semibold text-white bg-[#001731] hover:bg-[#0d5959] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === 'add' ? 'Add tag' : 'Remove tag'}
          </button>
        </div>
      </div>
    </div>
  );
}