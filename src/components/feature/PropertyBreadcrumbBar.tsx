import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ShareButton from '@/components/feature/ShareButton';

/**
 * PropertyBreadcrumbBar - the single, shared breadcrumb + utility bar used on
 * every property detail layout (regular houses/apartments AND Land / Joint
 * Ventures). Keeping it global means the trail, Save, Share and Print controls
 * behave and look identical wherever a listing is rendered.
 *
 * Controls:
 *  - Save  → toggles the listing in the visitor's locally-saved set (persisted)
 *  - Share → delegates to the global ShareButton (native share / copy link)
 *  - Print → opens the browser print dialog for the current page
 */

interface PropertyBreadcrumbBarProps {
  /** Title shown as the final, non-link crumb. */
  title: string;
  /** Parent crumb label, e.g. "Buy", "Rent", "Land & Joint Ventures". */
  parentLabel: string;
  /** Parent crumb link target. */
  parentHref: string;
  /** Listing slug (used for share + saved state key). */
  slug?: string | null;
  /** Listing id (share fallback). */
  id?: string | null;
  /** Pre-formatted price line for the share sheet. */
  priceLabel?: string;
  /** Outer wrapper classes (e.g. border/padding tweaks per layout). */
  className?: string;
}

const SAVED_KEY = 'saved_properties';

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default function PropertyBreadcrumbBar({
  title,
  parentLabel,
  parentHref,
  slug,
  id,
  priceLabel,
  className = '',
}: PropertyBreadcrumbBarProps) {
  const saveKey = String(slug || id || title);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readSaved().includes(saveKey));
  }, [saveKey]);

  const toggleSave = () => {
    const current = readSaved();
    const next = current.includes(saveKey)
      ? current.filter((k) => k !== saveKey)
      : [...current, saveKey];
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable - still reflect the toggle in the UI
    }
    setSaved(next.includes(saveKey));
  };

  return (
    <div className={`flex items-center justify-between gap-4 flex-wrap ${className}`}>
      <nav className="flex items-center gap-1.5 flex-wrap min-w-0" aria-label="Breadcrumb">
        <Link
          to="/"
          className="flex items-center gap-1 text-xs font-roboto whitespace-nowrap hover:opacity-70 transition-opacity cursor-pointer shrink-0 text-[#888]"
        >
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            <i className="ri-home-4-line text-xs"></i>
          </span>
          Home
        </Link>
        <span className="w-3 h-3 flex items-center justify-center shrink-0">
          <i className="ri-arrow-right-s-line text-xs text-[#cccccc]"></i>
        </span>
        <Link
          to={parentHref}
          className="text-xs font-roboto whitespace-nowrap hover:opacity-70 transition-opacity cursor-pointer shrink-0 text-[#888]"
        >
          {parentLabel}
        </Link>
        <span className="w-3 h-3 flex items-center justify-center shrink-0">
          <i className="ri-arrow-right-s-line text-xs text-[#cccccc]"></i>
        </span>
        <span
          className="text-xs font-roboto whitespace-nowrap shrink-0 truncate max-w-[220px]"
          style={{ color: '#012042' }}
          aria-current="page"
        >
          {title}
        </span>
      </nav>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={toggleSave}
          aria-pressed={saved}
          className={`w-8 h-8 flex items-center justify-center border transition-colors cursor-pointer rounded-[2px] ${
            saved ? 'border-primary text-primary' : 'border-[#ddd] hover:border-[#aaa] text-[#555555]'
          }`}
          title={saved ? 'Saved' : 'Save property'}
        >
          <i className={`${saved ? 'ri-heart-fill' : 'ri-heart-line'} text-sm`}></i>
        </button>
        <ShareButton
          title={title}
          slug={slug}
          id={id}
          priceLabel={priceLabel}
          idleIcon="ri-share-line"
          className="w-8 h-8 flex items-center justify-center border border-[#ddd] hover:border-[#aaa] transition-colors cursor-pointer rounded-[2px] text-[#555555]"
          activeClassName="border-primary text-primary"
          iconClassName="text-sm"
        />
        <button
          type="button"
          onClick={() => window.print()}
          className="w-8 h-8 flex items-center justify-center border border-[#ddd] hover:border-[#aaa] transition-colors cursor-pointer rounded-[2px] text-[#555555]"
          title="Print property"
        >
          <i className="ri-printer-line text-sm"></i>
        </button>
      </div>
    </div>
  );
}