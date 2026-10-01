import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Chevron from '@/components/base/Chevron';

export interface SubNavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  match: string;
  matchSearch?: string;
  /** Do NOT mark active when this query fragment is present (sibling disambiguation). */
  excludeSearch?: string;
  noQuery?: boolean;
}

interface NavSubmenuProps {
  label: string;
  icon: React.ReactNode;
  items: SubNavItem[];
  isActive: (match: string, matchSearch?: string, noQuery?: boolean) => boolean;
  /**
   * Optional richer override so a caller can apply its own per-child matcher
   * (e.g. query exclusions) without changing the shared `isActive` signature.
   */
  isChildActive?: (item: SubNavItem) => boolean;
  onNavigate?: () => void;
  /** When set, the parent row navigates to this path; the chevron toggles the submenu. */
  path?: string;
  /** Match path used to light up the parent row when its own page is active. */
  match?: string;
  /** Accent color for the active parent row, indicator bar and icons. */
  activeColor?: string;
  /** Background fill for the active parent row. */
  activeBg?: string;
}

/** Tracks whether we're on a desktop (lg+) viewport, driving side-panel vs inline behavior. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return isDesktop;
}

/**
 * Connected portal navigation submenu — shared by the Admin and Agent portals.
 *
 * Desktop: the submenu opens as a panel ATTACHED to the SIDE of the parent nav item — anchored
 * beside the sidebar with a small pointer notch bridging the gap, so it reads as an extension of
 * the navigation rather than a detached floating card. Position is measured synchronously on open
 * (before paint) and kept in sync on scroll/resize.
 *
 * Mobile: the submenu expands INLINE, full-width inside the nav container, so content never clips.
 *
 * Accent color is configurable so each portal keeps its own identity.
 */
export default function NavSubmenu({
  label,
  icon,
  items,
  isActive,
  isChildActive,
  onNavigate,
  path,
  match,
  activeColor = '#00ddb4',
  activeBg = '#012144',
}: NavSubmenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const isDesktop = useIsDesktop();
  const btnRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const childIsOn = (item: SubNavItem) => (isChildActive ? isChildActive(item) : isActive(item.match, item.matchSearch, item.noQuery));
  const childActive = items.some((c) => childIsOn(c));
  const selfActive = match ? isActive(match) : false;
  const active = childActive || open || selfActive;

  // Measure the button and anchor the desktop panel beside it — synchronously before paint so it
  // is correctly positioned on the very first render (no visible jump).
  useLayoutEffect(() => {
    if (!open || !isDesktop) return;
    const place = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.top, left: r.right });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, isDesktop]);

  // Close the desktop side-panel on outside click / Escape.
  useEffect(() => {
    if (!open || !isDesktop) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, isDesktop]);

  // Collapse whenever we cross the desktop/mobile boundary so state never gets stuck.
  useEffect(() => {
    setOpen(false);
  }, [isDesktop]);

  const handleNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  const list = (variant: 'desktop' | 'mobile') => (
    <div className={variant === 'desktop' ? 'p-3' : 'p-2.5'}>
      <p className="text-[17px] font-roboto font-bold text-crm-navy pb-2 mb-2.5 border-b-2 border-crm-navy">
        {label}
      </p>
      <div className="space-y-1.5">
        {items.map((child) => {
          const childIsActive = childIsOn(child);
          return (
            <Link
              key={child.path}
              to={child.path}
              onClick={handleNavigate}
              className={`group flex items-center gap-3 rounded-md font-roboto transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-crm-navy focus-visible:ring-offset-2 focus-visible:ring-offset-white px-3 py-3 text-[15px] ${
                childIsActive
                  ? 'bg-crm-navy text-white font-semibold'
                  : 'text-crm-navy font-medium hover:bg-crm-navy hover:text-white hover:font-semibold'
              }`}
            >
              <span
                className={`w-7 h-7 flex items-center justify-center flex-shrink-0 transition-colors ${
                  childIsActive ? 'text-white' : 'text-crm-navy group-hover:text-white'
                }`}
              >
                {child.icon}
              </span>
              <span className="flex-1 min-w-0 text-left">{child.label}</span>
              {childIsActive && <Chevron className="text-white flex-shrink-0" />}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-w-0">
      <div
        ref={btnRef}
        className={`group relative flex items-center rounded-md transition-colors whitespace-nowrap ${
          active ? '' : 'hover:bg-white/5'
        }`}
        style={{ backgroundColor: active ? activeBg : undefined }}
      >
        {active && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full"
            style={{ backgroundColor: activeColor }}
          />
        )}
        {path ? (
          <Link
            to={path}
            onClick={handleNavigate}
            className={`flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-base font-roboto font-semibold transition-colors cursor-pointer ${
              active ? '' : 'text-white/80 hover:text-white'
            }`}
            style={{ color: active ? activeColor : undefined }}
          >
            <span className="flex-shrink-0" style={{ color: active ? activeColor : undefined }}>
              <span className={active ? '' : 'text-white/60 group-hover:text-white'}>{icon}</span>
            </span>
            <span className="flex-1 text-left truncate">{label}</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-base font-roboto font-semibold transition-colors cursor-pointer ${
              active ? '' : 'text-white/80 hover:text-white'
            }`}
            style={{ color: active ? activeColor : undefined }}
          >
            <span className="flex-shrink-0" style={{ color: active ? activeColor : undefined }}>
              <span className={active ? '' : 'text-white/60 group-hover:text-white'}>{icon}</span>
            </span>
            <span className="flex-1 text-left truncate">{label}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
          className={`mr-1.5 my-1 p-1.5 rounded-md transition-colors cursor-pointer flex-shrink-0 ${
            active ? '' : 'text-white/70 hover:text-white'
          }`}
          style={{ color: active ? activeColor : undefined }}
        >
          <Chevron className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* MOBILE — inline, full-width expansion inside the nav container. No floating popover. */}
      {!isDesktop && (
        <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="min-h-0 overflow-hidden">
            <div className="mt-2 mb-1 w-full min-w-0 rounded-lg bg-white border border-crm-navy/15">
              {list('mobile')}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP — panel attached to the SIDE of the sidebar item, bridged by a pointer notch. */}
      {isDesktop && open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[100] w-[264px] max-w-[calc(100vw-17rem)]"
          style={{ top: pos.top, left: pos.left + 8, maxHeight: 'calc(100vh - 24px)' }}
        >
          {/* Notch bridging the ~8px gap so the panel reads as connected to the nav, not detached. */}
          <span
            aria-hidden
            className="absolute left-[-6px] top-[16px] w-3 h-3 rotate-45 bg-white border-l border-b border-crm-navy/15"
          />
          <div className="w-full max-h-[inherit] overflow-y-auto rounded-lg bg-white border border-crm-navy/15 shadow-[0_10px_30px_rgba(0,23,49,0.22)]">
            {list('desktop')}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}