import { normalizePhone } from '@/lib/phone';

interface CardContactActionsProps {
  /** Agent phone number. */
  phone?: string;
  /**
   * Opens the INTERNAL enquiry composer. Required for the Message action —
   * card messaging must always stay inside Oceans, never hand off to an
   * external mail client.
   */
  onMessage?: () => void;
  /** Label for the message action. Defaults to "Message". */
  messageLabel?: string;
  className?: string;
}

/**
 * Shared, always-visible Call + Message action pair used on every property card
 * (Buy, Rent, All Properties, Commercial). Rendered as outlined buttons in the
 * brand dark navy so they never disappear against a card background.
 *
 * Messaging is internal only: the Message button opens the on-page enquiry
 * composer. There is deliberately NO `mailto:` fallback.
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
  messageLabel = 'Message',
  className = '',
}: CardContactActionsProps) {
  const links = normalizePhone(phone);
  const callHref = links.valid && links.tel ? links.tel : undefined;

  return (
    <div className={`flex flex-nowrap items-center justify-end gap-1.5 ${className}`}>
      {callHref ? (
        <a href={callHref} className={BTN} aria-label="Call the agent">
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            <i className="ri-phone-line text-sm"></i>
          </span>
          Call
        </a>
      ) : (
        <span
          className={`${BTN} opacity-45 cursor-not-allowed hover:bg-transparent hover:text-primary`}
          title="No valid phone number on file"
          aria-disabled="true"
        >
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            <i className="ri-phone-line text-sm"></i>
          </span>
          Call
        </span>
      )}

      {onMessage && (
        <button type="button" onClick={onMessage} className={BTN} aria-label={messageLabel}>
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            <i className="ri-mail-send-line text-sm"></i>
          </span>
          {messageLabel}
        </button>
      )}
    </div>
  );
}