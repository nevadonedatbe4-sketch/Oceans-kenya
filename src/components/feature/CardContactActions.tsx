import { DEFAULT_CONTACT, toTelHref } from '@/lib/contactDefaults';

interface CardContactActionsProps {
  /** Agent phone number - falls back to the site default when empty. */
  phone?: string;
  /** When provided, renders a button that opens the enquiry modal. */
  onMessage?: () => void;
  /** When `onMessage` is not provided, this email is used for a mailto link. */
  email?: string;
  /** Label for the second action. Defaults to "Message". */
  messageLabel?: string;
  /** Optional subject line for the mailto fallback. */
  emailSubject?: string;
  className?: string;
}

/**
 * Shared, always-visible Call + Message action pair used on every property card
 * (Buy, Rent, All Properties, Commercial). Rendered as outlined buttons in the
 * brand dark navy so they never disappear against a card background.
 *
 * - 1px dark-navy border + dark-navy text and icons
 * - a very light navy tint on hover / focus / active
 * - touch-friendly sizing on mobile, contained and wrap-safe
 */
const BTN =
  'inline-flex items-center justify-center gap-1 px-2 py-1 min-h-[28px] ' +
  'text-xs font-roboto font-semibold leading-none rounded-md ' +
  'border border-primary text-primary bg-transparent ' +
  'hover:bg-primary hover:text-white hover:border-primary ' +
  'active:bg-primary active:text-white active:border-primary ' +
  'focus:outline-none focus-visible:bg-primary focus-visible:text-white focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 ' +
  'transition-colors cursor-pointer whitespace-nowrap';

export default function CardContactActions({
  phone,
  onMessage,
  email,
  messageLabel = 'Message',
  emailSubject,
  className = '',
}: CardContactActionsProps) {
  const callHref = toTelHref(phone);
  const mailHref = `mailto:${email || DEFAULT_CONTACT.email}${emailSubject ? `?subject=${encodeURIComponent(emailSubject)}` : ''}`;

  return (
    <div className={`flex flex-nowrap items-center justify-end gap-1.5 ${className}`}>
      <a href={callHref} className={BTN} aria-label="Call the agent">
        <span className="w-3.5 h-3.5 flex items-center justify-center">
          <i className="ri-phone-line text-sm"></i>
        </span>
        Call
      </a>

      {onMessage ? (
        <button type="button" onClick={onMessage} className={BTN} aria-label={messageLabel}>
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            <i className="ri-mail-line text-sm"></i>
          </span>
          {messageLabel}
        </button>
      ) : (
        <a href={mailHref} className={BTN} aria-label={messageLabel}>
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            <i className="ri-mail-line text-sm"></i>
          </span>
          {messageLabel}
        </a>
      )}
    </div>
  );
}