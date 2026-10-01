import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { type ReturnRoute } from '@/lib/navigation';
import InlineBackLink from '@/components/feature/InlineBackLink';

/**
 * PageBreadcrumbs - the single, shared breadcrumb used across every public page.
 *
 * The parent trail is generated automatically from the current URL so every
 * page stays consistent with zero per-page upkeep. A page can append its own
 * final crumb (e.g. a neighbourhood or school name) with the `current` prop,
 * or replace the whole trail entirely with `items`.
 *
 * Styling is intentionally fixed (no admin dependency) so it looks identical
 * everywhere it appears.
 */

export interface BreadcrumbCrumb {
  label: string;
  to?: string;
}

interface PageBreadcrumbsProps {
  /** Full explicit trail - when provided, auto-generation is skipped. */
  items?: BreadcrumbCrumb[];
  /** Label for the final (non-link) crumb, appended to the auto trail. */
  current?: string;
  /** Extra classes for the outer band (e.g. mgmt spacing tweaks). */
  className?: string;
  /** Show the context-aware Back control (default true). Set false when a page
   *  already renders its own prominent back button inside a hero. */
  showBack?: boolean;
}

const HOME: BreadcrumbCrumb = { label: 'Home', to: '/' };
// The shared "Nairobi" node - every directory-family page sits under it, so the
// auto trail matches the hand-rolled breadcrumbs used on the category pages.
const NAIROBI: BreadcrumbCrumb = { label: 'Nairobi', to: '/neighbourhoods' };

/** Static, exact-match trails keyed by pathname. */
const STATIC_TRAILS: Record<string, BreadcrumbCrumb[]> = {
  '/buy': [HOME, { label: 'Buy' }],
  '/rent': [HOME, { label: 'Rent' }],
  '/all-properties': [HOME, { label: 'Properties' }],
  '/about': [HOME, { label: 'About' }],
  '/contact': [HOME, { label: 'Contact' }],
  '/valuation': [HOME, { label: 'Valuation' }],
  '/landlords': [HOME, { label: 'Landlords' }],
  '/neighbourhoods': [HOME, { label: 'Neighbourhoods' }],
  '/new-developments': [HOME, { label: 'New Developments' }],
  '/schools': [HOME, NAIROBI, { label: 'Schools' }],
  '/living-in-nairobi': [HOME, { label: 'Living in Nairobi' }],
  '/directory': [HOME, NAIROBI, { label: 'Directory' }],
  '/night-life': [HOME, NAIROBI, { label: 'Night Life' }],
  '/joint-ventures': [HOME, { label: 'Joint Ventures' }],
  '/commute-time': [HOME, { label: 'Commute Time' }],
  '/commercial-property': [HOME, { label: 'Commercial Property' }],
  '/c/commercial-advertising': [HOME, { label: 'Commercial Advertising' }],
  '/privacy-policy': [HOME, { label: 'Privacy Policy' }],
  '/terms-conditions': [HOME, { label: 'Terms & Conditions' }],
  '/cookie-policy': [HOME, { label: 'Cookie Policy' }],
  '/disclaimer': [HOME, { label: 'Disclaimer' }],
  '/help-center': [HOME, { label: 'Help Center' }],
  '/report-a-listing': [HOME, { label: 'Report a Listing' }],
};

/** Turn a raw URL slug into a readable label. */
function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build the auto trail for a pathname, optionally appending a final crumb. */
function autoTrail(pathname: string, current?: string): BreadcrumbCrumb[] {
  const exact = STATIC_TRAILS[pathname];
  if (exact) return current ? [...exact, { label: current }] : exact;

  const segments = pathname.split('/').filter(Boolean);
  const trail: BreadcrumbCrumb[] = [HOME];

  if (segments[0] === 'blog') {
    trail.push({ label: 'Neighbourhoods & Guides', to: '/neighbourhoods' });
    trail.push({ label: current || humanize(segments[1] || 'Blog') });
    return trail;
  }
  if (segments[0] === 'neighbourhood') {
    trail.push({ label: 'Neighbourhoods', to: '/neighbourhoods' });
    trail.push({ label: current || humanize(segments[1] || '') });
    return trail;
  }
  if (segments[0] === 'directory') {
    trail.push(NAIROBI);
    trail.push({ label: 'Directory', to: '/directory' });
    if (segments[1] === 'place') trail.push({ label: current || 'Place' });
    else if (segments[1]) trail.push({ label: current || humanize(segments[1]) });
    return trail;
  }
  if (segments[0] === 'property') {
    trail.push({ label: 'Properties', to: '/all-properties' });
    trail.push({ label: current || humanize(segments[1] || '') });
    return trail;
  }
  if (segments[0] === 'joint-ventures') {
    trail.push({ label: 'Joint Ventures', to: '/joint-ventures' });
    trail.push({ label: current || humanize(segments[2] || segments[1] || '') });
    return trail;
  }

  // Generic fallback - humanise each segment into its own crumb.
  segments.forEach((seg, i) => {
    const isLast = i === segments.length - 1;
    const label = isLast && current ? current : humanize(seg);
    const to = isLast ? undefined : `/${segments.slice(0, i + 1).join('/')}`;
    trail.push({ label, to });
  });
  return trail;
}

export default function PageBreadcrumbs({
  items,
  current,
  className = '',
  showBack = true,
}: PageBreadcrumbsProps) {
  const { pathname } = useLocation();
  const trail = items && items.length > 0 ? items : autoTrail(pathname, current);

  // The canonical parent is the last crumb that links somewhere - used as the
  // final fallback when there is no recorded origin and no usable history.
  const parentCrumb = useMemo(() => [...trail].reverse().find((c) => c.to), [trail]);
  const parent: ReturnRoute | null =
    parentCrumb && parentCrumb.to ? { to: parentCrumb.to, label: parentCrumb.label } : null;

  if (trail.length === 0) return null;

  return (
    <div className={`bg-white border-b border-primary/12 ${className}`}>
      <div className="px-4 md:px-6 lg:px-10 py-2.5 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 md:gap-4 flex-wrap">
          {showBack && (
            <>
              <InlineBackLink parent={parent} />
              <span className="hidden sm:block w-px h-3.5 bg-primary/15 shrink-0" aria-hidden="true"></span>
            </>
          )}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-roboto text-gray-500 flex-wrap"
          >
            {trail.map((crumb, index) => {
              const isLast = index === trail.length - 1;
              return (
                <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && <i className="ri-arrow-right-s-line text-sm text-gray-300"></i>}
                  {isLast || !crumb.to ? (
                    <span
                      className="text-primary font-semibold"
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <Link to={crumb.to} className="hover:text-primary transition-colors whitespace-nowrap">
                      {crumb.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}