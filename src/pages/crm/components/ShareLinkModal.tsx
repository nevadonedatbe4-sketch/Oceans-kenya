import { useEffect } from 'react';
import { addToast } from '@/pages/crm/components/CRMToast';

interface ShareLinkModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  url: string;
  icon?: string;
  onClose: () => void;
}

/**
 * Single-record share sheet used by every CRM list. Mirrors the bulk share
 * modal (link / WhatsApp / email) but is scoped to one record so each row's
 * action menu can offer the exact same "share this property" behaviour.
 */
export default function ShareLinkModal({
  open,
  title,
  subtitle,
  url,
  icon = 'ri-home-4-line',
  onClose,
}: ShareLinkModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(label, 'success');
    } catch {
      addToast('Could not copy to clipboard', 'error');
    }
  };

  const btnSecondary =
    'inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors cursor-pointer whitespace-nowrap hover:bg-[#f7f8fa] text-[#001731]';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001731]/70" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#001731]">Share property</h2>
            <p className="text-[11px] text-[#88929e] mt-0.5 truncate">Copy or send this live link to anyone</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f8fa] cursor-pointer"
            aria-label="Close"
          >
            <i className="ri-close-line text-[#636363] text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-2.5 rounded-lg border p-3" style={{ borderColor: '#e5e7eb' }}>
            <span className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(13,89,89,0.1)' }}>
              <i className={`${icon} text-[#0d5959] text-sm`} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-[#001731] truncate">{title || 'Untitled'}</p>
              <p className="text-[11px] text-[#88929e] truncate">{subtitle || url}</p>
            </div>
          </div>

          <button
            onClick={() => copy(url, 'Link copied')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer hover:opacity-90 whitespace-nowrap"
            style={{ backgroundColor: '#0d5959' }}
          >
            <i className="ri-link" /> Copy link
          </button>

          <div>
            <p className="text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-2">Send via</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank')}
                className={btnSecondary}
              >
                <i className="ri-whatsapp-line text-[#25D366] text-base" /> WhatsApp
              </button>
              <button
                onClick={() => window.open(`mailto:?subject=${encodeURIComponent(title || 'Property')}&body=${encodeURIComponent(url)}`, '_blank')}
                className={btnSecondary}
              >
                <i className="ri-mail-line text-[#0d5959] text-base" /> Email
              </button>
            </div>
          </div>

          <button
            onClick={() => window.open(url, '_blank')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border text-[#001731] cursor-pointer hover:bg-[#f7f8fa] whitespace-nowrap"
            style={{ borderColor: '#e5e7eb' }}
          >
            <i className="ri-external-link-line text-base" /> Open public page
          </button>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 border rounded-lg text-sm font-medium text-[#636363] hover:bg-[#f7f8fa] transition-all cursor-pointer"
            style={{ borderColor: '#e5e7eb' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}