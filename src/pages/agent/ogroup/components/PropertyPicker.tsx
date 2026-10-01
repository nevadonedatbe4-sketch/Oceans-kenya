import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import usePortalBase from '@/hooks/usePortalBase';
import {
  searchPropertiesRanked, propertyImage, propertyMeta, type PropertyOption,
} from '../appointmentLookups';

export interface PropertyValue {
  id: string | null;
  title: string;
  slug: string | null;
  /** Preview image of the linked listing (cover first, then main). */
  image?: string | null;
  /** Preformatted subtitle (type · location · price) for the linked listing. */
  meta?: string | null;
}

interface Props {
  value: PropertyValue;
  onChange: (v: PropertyValue) => void;
  /** The acting user id — used to rank the agent's OWN listings first. */
  ownerUserId?: string | null;
}

/** Property CRMs a new record can be created in, resolved to the active portal. */
interface CrmOption { key: string; label: string; hint: string; icon: string; to: string; }

/**
 * Live property search with link/unlink and a visual preview.
 *
 * Results are GROUPED so an agent books their own stock first:
 *   • My Listings   — properties where the agent is the listing agent
 *   • Other properties — the wider authorised pool
 *
 * Three ways to set the property:
 *   1. Link a real listing from the system (search + thumbnail preview).
 *   2. Add a property that isn't in the system yet → pick a property CRM and
 *      open the real creation form (in a new tab, so the appointment survives).
 *   3. Type a one-off property that stays a custom entry on the appointment.
 */
export default function PropertyPicker({ value, onChange, ownerUserId }: Props) {
  const base = usePortalBase();
  const [term, setTerm] = useState(value.title);
  const [mineResults, setMineResults] = useState<PropertyOption[]>([]);
  const [otherResults, setOtherResults] = useState<PropertyOption[]>([]);
  const [open, setOpen] = useState(false);
  const [showCrm, setShowCrm] = useState(false);
  const [loading, setLoading] = useState(false);
  const skip = useRef(false);

  const crmOptions: CrmOption[] = [
    { key: 'all', label: 'All Properties', hint: 'General residential listing', icon: 'ri-home-4-line', to: `${base}/listings/new` },
    { key: 'land', label: 'Land', hint: 'Plots, acreage & land parcels', icon: 'ri-landscape-line', to: `${base}/land-listings/new` },
    { key: 'dev', label: 'New Development', hint: 'Off-plan & multi-unit projects', icon: 'ri-building-2-line', to: `${base}/developments/new` },
    ...(base === '/admin'
      ? [{ key: 'jv', label: 'Joint Venture', hint: 'JV opportunities & capital desk', icon: 'ri-briefcase-4-line', to: '/admin/jv-opportunities/new' }]
      : []),
  ];

  const clearResults = () => { setMineResults([]); setOtherResults([]); };

  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    if (!open) return;
    if (term.trim().length < 2) { clearResults(); return; }
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const { mine, others } = await searchPropertiesRanked(term, ownerUserId);
        if (active) { setMineResults(mine); setOtherResults(others); setLoading(false); }
      } catch {
        if (active) { clearResults(); setLoading(false); }
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [term, open, ownerUserId]);

  const choose = (p: PropertyOption) => {
    skip.current = true;
    setTerm(p.title || '');
    onChange({ id: p.id, title: p.title || '', slug: p.slug, image: propertyImage(p), meta: propertyMeta(p) });
    setOpen(false);
    clearResults();
  };

  /** Keep whatever the user typed as a property that isn't a system listing. */
  const useCustom = () => {
    const t = term.trim();
    skip.current = true;
    setTerm(t);
    if (t) onChange({ id: null, title: t, slug: null, image: null, meta: null });
    setOpen(false);
    clearResults();
  };

  const openCrmChooser = () => {
    setOpen(false);
    setShowCrm(true);
  };

  const clear = () => {
    skip.current = true;
    setTerm('');
    onChange({ id: null, title: '', slug: null, image: null, meta: null });
    clearResults();
  };

  const hasCustomName = !value.id && term.trim().length > 0;
  const canUseCustom = term.trim().length >= 2 && (!value.id || term.trim() !== value.title);
  const noResults = mineResults.length === 0 && otherResults.length === 0;

  const optionRow = (p: PropertyOption, isMine: boolean) => {
    const img = propertyImage(p);
    return (
      <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(p)} className="w-full text-left px-3 py-2 hover:bg-neutral-50 cursor-pointer border-b border-neutral-50 last:border-b-0 flex items-center gap-3">
        <span className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-neutral-100 flex items-center justify-center">
          {img ? <img src={img} alt={p.title || 'Listing'} className="w-full h-full object-cover" /> : <i className="ri-image-line text-neutral-300" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="block text-sm text-neutral-800 truncate">{p.title || 'Untitled listing'}</span>
            {isMine && <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-teal-600 text-white font-semibold">Your listing</span>}
          </span>
          <span className="block text-[11px] text-neutral-400 truncate">{propertyMeta(p) || 'Listing'}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <i className="ri-home-4-line absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 text-sm" />
        <input
          value={term}
          onChange={(e) => { setTerm(e.target.value); onChange({ id: null, title: e.target.value, slug: null }); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Search a listing by title or location…"
          className="w-full pl-9 pr-16 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-white"
        />
        {(value.id || term.trim().length > 0) && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
            {value.slug && (
              <Link to={`/property/${value.slug}`} target="_blank" rel="noreferrer" onMouseDown={(e) => e.preventDefault()} title="Open listing" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-neutral-100 text-teal-600 cursor-pointer">
                <i className="ri-external-link-line text-sm" />
              </Link>
            )}
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clear} title="Unlink property" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer">
              <i className="ri-close-line text-sm" />
            </button>
          </div>
        )}
      </div>

      {/* Linked listing → visual preview so the wrong property is obvious at a glance */}
      {value.id && (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-teal-100 bg-teal-50/50 p-2">
          <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-white border border-teal-100 flex items-center justify-center">
            {value.image ? (
              <img src={value.image} alt={value.title} className="w-full h-full object-cover" />
            ) : (
              <i className="ri-image-line text-teal-400 text-lg" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-800 truncate">{value.title || 'Linked listing'}</p>
            <p className="text-[11px] text-neutral-500 truncate">{value.meta || 'Listing linked in the system'}</p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-semibold">
            <i className="ri-links-line" /> Linked
          </span>
        </div>
      )}

      {/* Manual / off-system entry */}
      {hasCustomName && value.id === null && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-2">
          <span className="w-7 h-7 shrink-0 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
            <i className="ri-edit-line text-sm" />
          </span>
          <p className="text-[11px] text-amber-800 leading-snug">
            <span className="font-semibold">Manual property</span> — not linked to a listing in the system. It will be saved as a custom entry on this appointment.
          </p>
        </div>
      )}

      {/* Persistent escape hatch — reachable without even searching. */}
      {!value.id && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={openCrmChooser}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800 cursor-pointer"
        >
          <i className="ri-add-circle-line text-sm" />
          Add new Property Listing
        </button>
      )}

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-neutral-100 rounded-lg shadow-xl max-h-72 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2.5 text-xs text-neutral-400 flex items-center gap-2"><i className="ri-loader-4-line animate-spin" /> Searching listings…</div>
          ) : noResults ? (
            <div className="px-3 py-3">
              {term.trim().length < 2 ? (
                <p className="text-xs text-neutral-400">Start typing to search existing listings…</p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-neutral-700">Property not found</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Is this property not yet in the system?</p>
                </>
              )}
            </div>
          ) : (
            <>
              {mineResults.length > 0 && (
                <>
                  <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-teal-700 bg-teal-50/70">My Listings</p>
                  {mineResults.map((p) => optionRow(p, true))}
                </>
              )}
              {otherResults.length > 0 && (
                <>
                  <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 bg-neutral-50">Other properties</p>
                  {otherResults.map((p) => optionRow(p, false))}
                </>
              )}
            </>
          )}

          {canUseCustom && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={useCustom}
              className="w-full text-left px-3 py-2.5 hover:bg-amber-50 cursor-pointer border-t border-neutral-100 flex items-center gap-2 text-amber-700"
            >
              <i className="ri-add-line text-sm" />
              <span className="text-xs font-medium truncate">Use “{term.trim()}” as a property not in the system</span>
            </button>
          )}

          {/* Add new property → choose the property CRM */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openCrmChooser}
            className="w-full text-left px-3 py-2.5 hover:bg-teal-50 cursor-pointer border-t border-neutral-100 flex items-center gap-2 text-teal-700"
          >
            <i className="ri-building-line text-sm" />
            <span className="text-xs font-semibold">Add new property</span>
          </button>
        </div>
      )}

      {/* Property CRM chooser — opens the authoritative creation form. */}
      {showCrm && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowCrm(false)} />
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-neutral-100 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-3 py-2.5 border-b border-neutral-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-neutral-800">Where should this property be created?</p>
              <button type="button" onClick={() => setShowCrm(false)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer">
                <i className="ri-close-line text-sm" />
              </button>
            </div>
            <div className="p-1.5 max-h-48 overflow-y-auto">
              {crmOptions.map((opt) => (
                <Link
                  key={opt.key}
                  to={opt.to}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShowCrm(false)}
                  className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-teal-50 cursor-pointer"
                >
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <i className={`${opt.icon} text-base`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-neutral-800 truncate">{opt.label}</span>
                    <span className="block text-[11px] text-neutral-400 truncate">{opt.hint}</span>
                  </span>
                  <i className="ri-external-link-line text-neutral-300 text-sm" />
                </Link>
              ))}
            </div>
            <p className="px-3 py-2 bg-neutral-50 text-[11px] text-neutral-500 border-t border-neutral-100">
              Opens in a new tab so you don&rsquo;t lose this appointment. Come back and search it once saved.
            </p>
          </div>
        </>
      )}
    </div>
  );
}