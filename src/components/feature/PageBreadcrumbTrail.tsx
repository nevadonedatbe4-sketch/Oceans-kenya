import { Link } from 'react-router-dom';
import type { ReturnRoute } from '@/lib/navigation';
import InlineBackLink from '@/components/feature/InlineBackLink';

/**
 * PageBreadcrumbTrail - the GLOBAL breadcrumb band for pages whose top banner
 * is a dark hero.
 *
 * GLOBAL RULE: breadcrumbs must never sit inside a dark hero. They live on the
 * white background, immediately below the hero, so they stay readable and
 * consistent on every page. Any page that hand-rolls a hero breadcrumb should
 * use this component instead.
 *
 * The trail is passed in explicitly (some pages have bespoke hierarchies) and
 * carries the shared, context-aware Back control on the same line, so every page
 * that uses it also gets a reliable way back. Styling is intentionally fixed so
 * the band looks identical everywhere.
 */

export interface BreadcrumbTrailItem {
  label: string;
  to?: string;
}

interface PageBreadcrumbTrailProps {
  items: BreadcrumbTrailItem[];
  /** Extra classes for the band (typically a bottom margin). */
  className?: string;
  /**
   * Show the shared Back control (default true). Set false only when the page
   * already renders its own prominent back link (e.g. inside a hero), to avoid
   * two Back controls on the same page.
   */
  showBack?: boolean;
}

export default function PageBreadcrumbTrail({
  items,
  className = '',
  showBack = true,
}: PageBreadcrumbTrailProps) {
  if (!items.length) return null;

  // The canonical parent is the last crumb that links somewhere - used as the
  // final fallback when there is no recorded origin and no usable history.
  const parentCrumb = [...items].reverse().find((item) => item.to);
  const parent: ReturnRoute | null =
    parentCrumb && parentCrumb.to ? { to: parentCrumb.to, label: parentCrumb.label } : null;

  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`}>
      {showBack && (
        <>
          <InlineBackLink parent={parent} />
          <span className="hidden sm:block w-px h-3.5 bg-primary/15 shrink-0" aria-hidden="true"></span>
        </>
      )}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-[13px] font-roboto text-[#636363] flex-wrap">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                {index > 0 && (
                  <i className="ri-arrow-right-s-line text-[#c4c4c4]" aria-hidden="true"></i>
                )}
                {isLast || !item.to ? (
                  <span
                    className="text-[#1a1a1a] font-medium"
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.to}
                    className="hover:text-primary transition-colors whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}