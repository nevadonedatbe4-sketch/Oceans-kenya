import { useEffect } from 'react';
import { addToast } from '@/pages/crm/components/CRMToast';

export interface BulkShareItem {
  id: string;
  title: string;
  url: string;
}

interface BulkShareModalProps {
  open: boolean;
  items: BulkShareItem[];
  heading?: string;
  onClose: () => void;
}

/**
 * Bulk share: lists the selected records and offers link / WhatsApp / email sharing.
 * Only the records passed in (already ownership-scoped by the caller) are shared.
 */
export default function BulkShareModal({ open, items, heading = 'properties', onClose }: BulkShareModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const allText = items.map((i) => `• ${i.title}\n${i.url}`).join('\n\n');

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(label, 'success');
    } catch {
      addToast('Could not copy to clipboard', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001731]/70" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div>
            <h2 className="text-base font-semibold text-[#001731]">Share {items.length} selected {heading}</h2>
            <p className="text-[11px] text-[#88929e] mt-0.5">Only records you own are included</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f8fa] cursor-pointer">
            <i className="ri-close-line text-[#636363] text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border p-2" style={{ borderColor: '#e5e7eb' }}>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#f7f8fa]">
                <i className="ri-home-4-line text-[#0d5959] text-sm flex-shrink-0" />
                <span className="text-[12px] font-medium text-[#001731] truncate flex-1">{item.title}</span>
                <button
                  onClick={() => copy(item.url, 'Link copied')}
                  className="text-[11px] font-semibold whitespace-nowrap cursor-pointer hover:underline"
                  style={{ color: '#0d5959' }}
                >
                  Copy link
                </button>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-2">Share via</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => copy(allText, `${items.length} links copied`)}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors cursor-pointer whitespace-nowrap hover:bg-[#f7f8fa] text-[#001731]"
                style={{ borderColor: '#e5e7eb' }}
              >
                <i className="ri-link text-[#0d5959]" /> Copy Links
              </button>
              <button
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(allText)}`, '_blank')}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors cursor-pointer whitespace-nowrap hover:bg-[#f7f8fa] text-[#001731]"
                style={{ borderColor: '#e5e7eb' }}
              >
                <i className="ri-whatsapp-line text-[#25D366]" /> WhatsApp
              </button>
              <button
                onClick={() => window.open(`mailto:?subject=${encodeURIComponent(`Property listings (${items.length})`)}&body=${encodeURIComponent(allText)}`, '_blank')}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors cursor-pointer whitespace-nowrap hover:bg-[#f7f8fa] text-[#001731]"
                style={{ borderColor: '#e5e7eb' }}
              >
                <i className="ri-mail-line text-[#0d5959]" /> Email
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full px-4 py-2.5 border rounded-lg text-sm font-medium text-[#636363] hover:bg-[#f7f8fa] transition-all cursor-pointer" style={{ borderColor: '#e5e7eb' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}