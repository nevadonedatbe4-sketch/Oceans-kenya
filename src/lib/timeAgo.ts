/**
 * formatTimeAgo - relative timestamp used by NON-listing surfaces (admin &
 * agent notifications, dashboard activity feeds, etc.).
 *
 * HARD RULE: this function must NEVER emit a zero or fabricated age such as
 * "0 months ago", "0 days ago" or "NaN months ago".
 *
 *  • Missing / unparseable date            → '' (caller omits the metadata)
 *  • Future date                           → "Added recently"
 *  • < 1 week                              → days / hours / minutes
 *  • 28-29 days                            → weeks (NOT "0 months")
 *  • months / years                        → only once a whole unit elapsed
 *
 * Listing cards should use `formatListingAge` from '@/lib/listingMeta' so the
 * wording ("Listed ...") and rules are shared across every listing surface.
 */
export function formatTimeAgo(createdAt: string | Date): string {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '';

  const diffMs = Date.now() - created.getTime();
  if (diffMs < 0) return 'Added recently';

  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Added just now';
  if (diffMins < 60) return `Added ${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `Added ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `Added ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

  const weeks = Math.floor(diffDays / 7);
  if (weeks < 4) return `Added ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;

  const months = Math.floor(diffDays / 30);
  if (months >= 1 && months < 12) return `Added ${months} ${months === 1 ? 'month' : 'months'} ago`;

  const years = Math.floor(diffDays / 365);
  if (years >= 1) return `Added ${years} ${years === 1 ? 'year' : 'years'} ago`;

  // 28-29 days: exactly 4 weeks but not yet a full month - show weeks, never
  // "0 months ago".
  return `Added ${weeks} weeks ago`;
}