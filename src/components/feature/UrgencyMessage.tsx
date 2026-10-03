interface UrgencyMessageProps {
  /** Resolved message text. When empty, nothing is rendered. */
  message?: string | null;
  className?: string;
}

/**
 * Compact Booking.com-style availability alert.
 *
 * Short, highly visible red text with a small warning icon - deliberately not a
 * large banner: no extra padding and no disruption to the surrounding card
 * layout. Sits immediately beneath the price / availability information.
 * Renders nothing at all when there is no trustworthy message.
 */
export default function UrgencyMessage({ message, className = '' }: UrgencyMessageProps) {
  const text = (message || '').trim();
  if (!text) return null;
  return (
    <p className={`flex items-start gap-1.5 text-[12px] font-roboto font-bold text-red-600 leading-tight ${className}`}>
      <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 mt-px">
        <i className="ri-alarm-warning-line text-[13px]"></i>
      </span>
      <span>{text}</span>
    </p>
  );
}