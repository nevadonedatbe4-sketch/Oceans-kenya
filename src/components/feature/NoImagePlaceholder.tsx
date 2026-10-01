interface NoImagePlaceholderProps {
  /** Caption under the icon. */
  label?: string;
  /** Remix icon class. */
  icon?: string;
  /** Extra wrapper classes. */
  className?: string;
  /** Icon-only variant for tiny thumbnails. */
  compact?: boolean;
}

/**
 * NoImagePlaceholder - the honest, neutral stand-in shown when a directory
 * entity has no verified real photograph.
 *
 * Directory content never auto-generates or fakes an image, so a business,
 * school or place without a real photo shows this instead of a misleading
 * stock/AI picture.
 */
export default function NoImagePlaceholder({
  label = 'No image available',
  icon = 'ri-image-line',
  className = '',
  compact = false,
}: NoImagePlaceholderProps) {
  if (compact) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-stone-100 text-stone-400 ${className}`}>
        <i className={`${icon} text-base`} aria-hidden="true"></i>
      </div>
    );
  }
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center gap-2 bg-stone-100 text-stone-400 px-3 text-center ${className}`}
    >
      <span className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80">
        <i className={`${icon} text-lg`} aria-hidden="true"></i>
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider leading-tight">{label}</span>
    </div>
  );
}