import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';

export interface BulkForwardItem {
  id: string;
  title: string;
  location?: string;
  priceLabel?: string;
  url: string;
}

interface BulkForwardModalProps {
  open: boolean;
  items: BulkForwardItem[];
  senderName: string;
  heading?: string;
  onClose: () => void;
}

/**
 * Bulk forward: emails the exact set of selected records (never the whole table).
 * Uses the existing `forward-message` edge function.
 */
export default function BulkForwardModal({ open, items, senderName, heading = 'property listings', onClose }: BulkForwardModalProps) {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setEmail(''); setNote(''); setError(''); }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const body = items
    .map((i) => [`${i.title}`, i.location ? `Location: ${i.location}` : '', i.priceLabel ? `Price: ${i.priceLabel}` : '', i.url].filter(Boolean).join('\n'))
    .join('\n\n');

  const handleSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    setSending(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('forward-message', {
        body: {
          to: email.trim().toLowerCase(),
          subject: `${items.length} ${heading}`,
          senderName,
          body,
          note: note.trim(),
        },
      });
      if (invokeError) throw new Error(invokeError.message || 'Failed to forward');
      if (data && (data as { error?: string }).error) throw new Error((data as { error?: string }).error);
      addToast(`Forwarded ${items.length} ${heading}`, 'success');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to forward');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001731]/70" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div>
            <h2 className="text-base font-semibold text-[#001731]">Forward {items.length} selected {heading}</h2>
            <p className="text-[11px] text-[#88929e] mt-0.5">Only the selected records will be sent</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f8fa] cursor-pointer">
            <i className="ri-close-line text-[#636363] text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">To <span className="text-[#dc2626]">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-[#0d5959] text-[#001731]"
              style={{ borderColor: '#e5e7eb' }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">Selected records</label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-lg border p-2" style={{ borderColor: '#e5e7eb' }}>
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 px-2 py-1.5">
                  <i className="ri-home-4-line text-[#0d5959] text-sm flex-shrink-0" />
                  <span className="text-[12px] font-medium text-[#001731] truncate flex-1">{item.title}</span>
                  {item.priceLabel && <span className="text-[11px] font-semibold text-[#88929e] whitespace-nowrap">{item.priceLabel}</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">Add a note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Add a note for the recipient..."
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-[#0d5959] text-[#001731] resize-none"
              style={{ borderColor: '#e5e7eb' }}
            />
          </div>

          {error && (
            <p className="text-xs text-[#dc2626] flex items-center gap-1">
              <i className="ri-error-warning-line" /> {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium text-[#636363] hover:bg-[#f7f8fa] transition-all cursor-pointer whitespace-nowrap" style={{ borderColor: '#e5e7eb' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={sending || !email.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            style={{ backgroundColor: '#0d5959' }}
          >
            {sending ? 'Forwarding...' : `Forward ${items.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}