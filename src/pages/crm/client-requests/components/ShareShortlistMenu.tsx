import { useEffect, useRef, useState } from 'react';
import type { ClientMatch, ClientRequest } from '@/lib/clientRequestsApi';
import { propertyPublicUrl } from '@/lib/shareLinks';
import { copyToClipboard } from '@/lib/share';
import { formatMoneyIn } from '@/lib/fxRates';
import useFxRates from '@/hooks/useFxRates';
import { transactionLabel, categoryLabel } from '@/lib/clientRequests';
import { firstName } from '@/lib/name';
import { showToast } from '@/pages/crm/components/CRMToast';

interface ShareShortlistMenuProps {
  request: ClientRequest;
  matches: ClientMatch[];
}

/** Human-readable price line for a match row, in the client's chosen currency. */
function priceLine(m: ClientMatch, currency: string | null | undefined, rates: Record<string, number>): string {
  return formatMoneyIn(m.listing_price, currency || m.listing_currency || 'KES', rates, m.listing_currency);
}

/**
 * "Share shortlist" — lets an agent send the client's shortlisted properties as
 * a single message straight from the CRM: open it in their mail app (Email),
 * fire it into WhatsApp, or copy the whole list to paste anywhere.
 *
 * Everything is a deep link (mailto: / wa.me) so no backend is required and the
 * agent always sends from their own address / number.
 */
export default function ShareShortlistMenu({ request, matches }: ShareShortlistMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const rates = useFxRates();

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const shortlist = matches.filter((m) => m.shortlisted && !m.excluded);

  const buildBody = (): string => {
    const greeting = `Hi ${firstName(request.client_name) || 'there'},`;
    const head = shortlist.length === 1
      ? 'Here is the property I shortlisted for you'
      : `Here are the ${shortlist.length} properties I shortlisted for you`;
    const context = `(${transactionLabel(request.transaction_type)} · ${categoryLabel(request.property_category)}${(request.locations || []).length ? ` in ${request.locations!.join(', ')}` : ''})`;
    const items = shortlist.map((m, i) => {
      const url = propertyPublicUrl(m.listing_slug, m.listing_id);
      const meta = [m.listing_location, priceLine(m, request.currency, rates)].filter(Boolean).join(' · ');
      return `${i + 1}. ${m.listing_title || 'Property'}\n   ${meta}\n   ${url}`;
    });
    const outro = 'Let me know which ones you would like to view and I will arrange it.';
    return [greeting, '', `${head} ${context}:`, '', ...items, '', outro].join('\n');
  };

  const subject = `Shortlisted properties${request.reference ? ` — ${request.reference}` : ''} for ${request.client_name || 'you'}`;
  const body = buildBody();

  const email = (request.client_email || '').trim();
  const emailHref = email
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : '';
  const digits = (request.client_phone || '').replace(/[^\d]/g, '');
  const waHref = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(body)}` : '';

  const copyList = async () => {
    setOpen(false);
    const ok = await copyToClipboard(body);
    showToast(ok ? 'Shortlist copied to clipboard' : 'Could not copy the shortlist', ok ? 'success' : 'error');
  };

  const empty = shortlist.length === 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={empty}
        title={empty ? 'Shortlist at least one property first' : 'Send the shortlist to the client'}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-stone-200 text-sm font-medium text-stone-400 hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
      >
        <i className="ri-share-forward-line" /> Share shortlist
      </button>

      {open && !empty && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg border border-stone-300 z-30 p-2">
          <div className="px-2.5 py-1.5 text-xs text-stone-500">
            Sending {shortlist.length} shortlisted {shortlist.length === 1 ? 'property' : 'properties'} to{' '}
            <span className="font-semibold text-stone-700">{request.client_name || 'the client'}</span>
          </div>

          {emailHref ? (
            <a
              href={emailHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              <i className="ri-mail-send-line text-base text-[#0f766e]" /> Email to {email}
            </a>
          ) : (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-stone-400">
              <i className="ri-mail-line text-base" /> No client email on file
            </div>
          )}

          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              <i className="ri-whatsapp-line text-base text-emerald-600" /> WhatsApp {request.client_phone}
            </a>
          ) : (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-stone-400">
              <i className="ri-whatsapp-line text-base" /> No client phone on file
            </div>
          )}

          <button
            onClick={copyList}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            <i className="ri-file-copy-line text-base text-stone-500" /> Copy list
          </button>
        </div>
      )}
    </div>
  );
}