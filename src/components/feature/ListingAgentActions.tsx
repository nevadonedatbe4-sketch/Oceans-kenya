import { normalizePhone } from '@/lib/phone';

interface ListingAgentActionsProps {
  /** The assigned listing agent's phone number (raw, any format). */
  phone?: string | null;
  /** Opens the INTERNAL Oceans enquiry composer for this listing. */
  onMessage: () => void;
  /** 'dark' sits on the navy sidebar; 'light' on white cards. */
  tone?: 'dark' | 'light';
  /** Optional prefilled WhatsApp body (e.g. the property reference). */
  message?: string;
  /** Label for the message button. Defaults to "Send Message". */
  messageLabel?: string;
  className?: string;
}

/**
 * The three canonical ways to reach a listing agent:
 *   • Call Agent        → tel:
 *   • WhatsApp Agent    → wa.me click-to-chat (optionally prefilled)
 *   • Send Message      → the internal Oceans enquiry composer
 *
 * Call and WhatsApp use the LISTING AGENT's own number (never the logged-in
 * user's or a hard-coded default). When no valid number exists those two
 * actions render as clearly disabled hints with an explanation, while internal
 * messaging stays available.
 */
export default function ListingAgentActions({
  phone,
  onMessage,
  tone = 'dark',
  message,
  messageLabel = 'Send Message',
  className = '',
}: ListingAgentActionsProps) {
  const links = normalizePhone(phone);

  const dark = tone === 'dark';
  const midBtn = dark
    ? 'border border-white/25 text-white hover:bg-white/10'
    : 'border border-primary text-primary hover:bg-primary/5';
  const primaryBtn =
    'bg-accent text-white hover:bg-accent/90 border border-accent';
  const disabledBtn = dark
    ? 'border border-white/15 text-white/35 cursor-not-allowed'
    : 'border border-primary/20 text-primary/30 cursor-not-allowed';
  const base =
    'inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md ' +
    'text-xs font-roboto font-semibold uppercase tracking-wide ' +
    'whitespace-nowrap cursor-pointer transition-colors';

  const waHref = links.valid && links.whatsapp
    ? (message ? `${links.whatsapp}?text=${encodeURIComponent(message)}` : links.whatsapp)
    : undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-2 gap-2">
        {links.valid && links.tel ? (
          <a href={links.tel} className={`${base} ${midBtn}`} title={`Call ${links.e164}`}>
            <i className="ri-phone-line text-sm"></i>
            Call Agent
          </a>
        ) : (
          <span
            className={`${base} ${disabledBtn}`}
            title="No valid phone number on file"
            aria-disabled="true"
          >
            <i className="ri-phone-line text-sm"></i>
            Call Agent
          </span>
        )}

        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${base} ${midBtn}`}
            title={`WhatsApp ${links.e164}`}
          >
            <i className="ri-whatsapp-line text-sm"></i>
            WhatsApp
          </a>
        ) : (
          <span
            className={`${base} ${disabledBtn}`}
            title="No valid phone number on file"
            aria-disabled="true"
          >
            <i className="ri-whatsapp-line text-sm"></i>
            WhatsApp
          </span>
        )}
      </div>

      <button type="button" onClick={onMessage} className={`${base} ${primaryBtn} w-full`}>
        <i className="ri-mail-send-line text-sm"></i>
        {messageLabel}
      </button>
    </div>
  );
}