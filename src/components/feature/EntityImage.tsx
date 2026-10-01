import { useState, type CSSProperties } from 'react';
import NoImagePlaceholder from '@/components/feature/NoImagePlaceholder';

interface EntityImageProps {
  /** The real image URL, or empty/null when the entity has no verified photo. */
  src?: string | null;
  alt: string;
  /** Classes applied to the <img> (mirrored on the placeholder by default). */
  className?: string;
  /** Optional inline styles (e.g. object-position) applied to the <img>. */
  style?: CSSProperties;
  /** Optional classes just for the placeholder wrapper. */
  placeholderClassName?: string;
  /** Icon-only placeholder for tiny thumbnails. */
  compact?: boolean;
  label?: string;
  icon?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * EntityImage - renders a real photograph, and falls back to the honest neutral
 * "No image available" placeholder when there is none (or the URL fails).
 *
 * Property, development and JV imagery must never auto-generate a fake picture,
 * so an entity without a real photo shows a clean placeholder instead.
 */
export default function EntityImage({
  src,
  alt,
  className = '',
  style,
  placeholderClassName,
  compact = false,
  label,
  icon,
  loading,
}: EntityImageProps) {
  const clean = (src || '').trim();
  const [failed, setFailed] = useState(false);

  if (!clean || failed) {
    return (
      <NoImagePlaceholder
        className={placeholderClassName ?? className}
        compact={compact}
        label={label ?? 'No image available'}
        icon={icon ?? 'ri-image-line'}
      />
    );
  }

  return (
    <img
      src={clean}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}