import { normalizePhone } from '@/lib/phone';

interface ContactActionsProps {
  phone?: string | null;
  /** 'light' works on white cards (default); 'dark' on navy/coloured surfaces. */
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md';
  /** compact → icon-only rectangular buttons (for dense table cells). */
  variant?: 'full' | 'compact';
  /** Optional prefilled WhatsApp / SMS body. */
  message?: string;
  className?: string;
}

/**
 * Clickable Call / WhatsApp / SMS actions for any phone number.
 *
 * Rendered as rectangular buttons with a soft gray fill and dark text so they
 * sit quietly beside the content; on hover they take on the filled brand navy
 * treatment with white text so they read as obvious, tappable actions. The
 * `full` variant also shows a visible text label ("Call" / "WhatsApp" /
 * "SMS"); the `compact` variant keeps the same rectangular shape but drops
 * the label so it still fits dense table cells. On navy surfaces
 * (`tone="dark"`) the buttons invert to a translucent white treatment so
 * they stay visible.
 *
 * Uses the real `tel:`, `sms:` and WhatsApp click-to-chat schemes with the
 * record's own number (normalised to international format). When the number
 * is missing or malformed the buttons render as muted, non-interactive hints
 * instead of producing broken links.
 *
 * Shared by both the Admin and Agent dashboards — editing here updates
 * every inbox, lead, contact and directory surface at once.
 */
export default function ContactActions({
  phone,
  tone = 'light',
  size = 'sm',
  variant = 'full',
  message,
  className = '',
}: ContactActionsProps) {
  const links = normalizePhone(phone);
  const isCompact = variant === 'compact';
  const iconSize = size === 'md' ? 'text-base' : 'text-sm';
  const sizing = isCompact
    ? (size === 'md' ? 'w-9 h-9 p-0' : 'w-8 h-8 p-0')
    : (size === 'md' ? 'px-3.5 py-2 text-sm gap-2' : 'px-2.5 py-1.5 text-xs gap-1.5');

  const base =
    `inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${sizing}`;

  // Quiet gray buttons on light surfaces that fill navy on hover; inverted
  // translucent treatment on navy surfaces so they remain clearly visible.
  const actionClass = tone === 'dark'
    ? 'bg-white/10 border border-white/25 text-white hover:bg-white/20'
    : 'bg-[#e5e7eb] text-[#001731] hover:bg-[#001731] hover:text-white';
  const disabledClass = tone === 'dark'
    ? 'bg-white/10 border border-white/15 text-white/35 cursor-not-allowed'
    : 'bg-[#e5e7eb] text-[#9aa1a9] cursor-not-allowed';

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const waHref = links.whatsapp
    ? message ? `${links.whatsapp}?text=${encodeURIComponent(message)}` : links.whatsapp
    : undefined;
  const smsHref = links.sms
    ? message ? `${links.sms}?&body=${encodeURIComponent(message)}` : links.sms
    : undefined;

  if (!links.valid) {
    return (
      <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`} title="No valid phone number on file">
        <span className={`${base} ${disabledClass}`} aria-hidden="true">
          <i className={`ri-phone-line ${iconSize}`} />
          {!isCompact && <span>Call</span>}
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <a
        href={links.tel || undefined}
        onClick={stop}
        aria-label={`Call ${links.e164}`}
        title={`Call ${links.e164}`}
        className={`${base} ${actionClass}`}
      >
        <i className={`ri-phone-line ${iconSize}`} />
        {!isCompact && <span>Call</span>}
      </a>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={stop}
        aria-label={`WhatsApp ${links.e164}`}
        title={`WhatsApp ${links.e164}`}
        className={`${base} ${actionClass}`}
      >
        <i className={`ri-whatsapp-line ${iconSize}`} />
        {!isCompact && <span>WhatsApp</span>}
      </a>
      {variant === 'full' && (
        <a
          href={smsHref}
          onClick={stop}
          aria-label={`Send SMS to ${links.e164}`}
          title={`SMS ${links.e164}`}
          className={`${base} ${actionClass}`}
        >
          <i className={`ri-message-2-line ${iconSize}`} />
          {!isCompact && <span>SMS</span>}
        </a>
      )}
    </span>
  );
}