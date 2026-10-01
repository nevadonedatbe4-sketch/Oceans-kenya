import { useEffect, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/**
 * LandAdvancedFilters - the advanced filter panel for the Joint Ventures land
 * search. Filters the live land feed (all_listings · property_category = land)
 * by transaction type, price, acreage, title type, district and keywords.
 *
 * Desktop / tablet: renders as an inline panel under the shared search bar.
 * Mobile: renders as a bottom sheet (opened by the Filters button in the bar).
 */

export interface LandFilterState {
  minPrice: string;
  maxPrice: string;
  minAcres: string;
  maxAcres: string;
  titleTypes: string[];
  categories: string[];
  district: string;
  keywords: string;
}

export const defaultLandFilters: LandFilterState = {
  minPrice: '',
  maxPrice: '',
  minAcres: '',
  maxAcres: '',
  titleTypes: [],
  categories: [],
  district: '',
  keywords: '',
};

const TITLE_OPTIONS = ['Freehold', 'Leasehold', 'Mailo', 'Kibanja / customary', 'In process'];

const CATEGORY_OPTIONS: { key: string; label: string }[] = [
  { key: 'outright', label: 'Outright purchase' },
  { key: 'joint_venture', label: 'Joint venture' },
];

interface LandAdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: LandFilterState) => void;
  initialFilters: LandFilterState;
  districts?: string[];
}

const labelClass = 'block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5';

const inputClass =
  'w-full h-11 px-3 text-sm font-roboto font-medium text-primary placeholder:text-primary/40 bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors';

function CheckRow({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 text-left cursor-pointer group">
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          checked ? 'bg-primary border-primary' : 'border-primary/30 bg-white group-hover:border-primary/50'
        }`}
      >
        {checked && <i className="ri-check-line text-white text-[10px]"></i>}
      </span>
      <span className="text-sm font-roboto text-primary whitespace-nowrap">{label}</span>
    </button>
  );
}

export default function LandAdvancedFilters({
  isOpen,
  onClose,
  onApply,
  initialFilters,
  districts = [],
}: LandAdvancedFiltersProps) {
  const [filters, setFilters] = useState<LandFilterState>({ ...initialFilters });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useBodyScrollLock(isOpen && isMobile);

  // Keep the panel in sync when reopened from outside.
  useEffect(() => {
    if (isOpen) setFilters({ ...initialFilters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleArray = (key: 'titleTypes' | 'categories', value: string) => {
    setFilters((prev) => {
      const current = prev[key];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const activeCount = [
    filters.categories.length > 0,
    filters.minPrice !== '' || filters.maxPrice !== '',
    filters.minAcres !== '' || filters.maxAcres !== '',
    filters.titleTypes.length > 0,
    filters.district.trim() !== '',
    filters.keywords.trim() !== '',
  ].filter(Boolean).length;

  const handleApply = () => {
    onApply({ ...filters });
    onClose();
  };

  const handleClear = () => {
    const cleared = { ...defaultLandFilters };
    setFilters(cleared);
    onApply(cleared);
    onClose();
  };

  const fields = (
    <>
      {/* Transaction type */}
      <div className="mb-5">
        <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 mb-3">Transaction type</h4>
        <div className="flex flex-wrap gap-x-6 gap-y-2.5">
          {CATEGORY_OPTIONS.map((c) => (
            <CheckRow
              key={c.key}
              checked={filters.categories.includes(c.key)}
              onClick={() => toggleArray('categories', c.key)}
              label={c.label}
            />
          ))}
        </div>
      </div>

      <div className="w-full h-px bg-primary/10 mb-5" />

      {/* Price range */}
      <div className="mb-5">
        <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 mb-3">Price range (KES)</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Min price</label>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 5,000,000"
              value={filters.minPrice}
              onChange={(e) => setFilters((p) => ({ ...p, minPrice: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Max price</label>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 50,000,000"
              value={filters.maxPrice}
              onChange={(e) => setFilters((p) => ({ ...p, maxPrice: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-primary/10 mb-5" />

      {/* Land size */}
      <div className="mb-5">
        <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 mb-3">Land size (acres)</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Min acres</label>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="e.g. 2"
              value={filters.minAcres}
              onChange={(e) => setFilters((p) => ({ ...p, minAcres: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Max acres</label>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="e.g. 20"
              value={filters.maxAcres}
              onChange={(e) => setFilters((p) => ({ ...p, maxAcres: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-primary/10 mb-5" />

      {/* Title type */}
      <div className="mb-5">
        <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 mb-3">Title type</h4>
        <div className="flex flex-wrap gap-x-6 gap-y-2.5">
          {TITLE_OPTIONS.map((t) => (
            <CheckRow
              key={t}
              checked={filters.titleTypes.includes(t)}
              onClick={() => toggleArray('titleTypes', t)}
              label={t}
            />
          ))}
        </div>
      </div>

      <div className="w-full h-px bg-primary/10 mb-5" />

      {/* District + keywords */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>District / region</label>
          {districts.length > 0 ? (
            <div className="relative">
              <select
                value={filters.district}
                onChange={(e) => setFilters((p) => ({ ...p, district: e.target.value }))}
                className={`${inputClass} cursor-pointer appearance-none pr-9`}
              >
                <option value="">All districts</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/50 pointer-events-none">
                <i className="ri-arrow-down-s-line text-base"></i>
              </span>
            </div>
          ) : (
            <input
              type="text"
              placeholder="e.g. Nairobi, Kiambu"
              value={filters.district}
              onChange={(e) => setFilters((p) => ({ ...p, district: e.target.value }))}
              className={inputClass}
            />
          )}
        </div>
        <div>
          <label className={labelClass}>Keywords</label>
          <input
            type="text"
            placeholder="e.g. road frontage, water"
            value={filters.keywords}
            onChange={(e) => setFilters((p) => ({ ...p, keywords: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>
    </>
  );

  const actions = (extraClass = '') => (
    <div className={`flex flex-wrap items-center gap-2 pt-4 mt-5 border-t border-primary/10 ${extraClass}`}>
      <button
        type="button"
        onClick={handleClear}
        className="flex items-center gap-2 h-11 px-4 text-base font-roboto font-medium text-primary border border-primary/20 rounded-lg hover:border-primary/50 transition-colors cursor-pointer whitespace-nowrap"
      >
        <span className="w-4 h-4 flex items-center justify-center">
          <i className="ri-close-circle-line text-sm"></i>
        </span>
        Clear all
      </button>
      <button
        type="button"
        onClick={handleApply}
        className="flex items-center gap-2 h-11 px-6 bg-primary text-white border-2 border-primary text-base font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
      >
        <span className="w-4 h-4 flex items-center justify-center">
          <i className="ri-search-line text-sm"></i>
        </span>
        Apply filters
      </button>
      <span className="text-xs font-roboto text-primary/50 ml-auto">
        {activeCount > 0 ? `${activeCount} filter(s) applied` : 'No advanced filters applied'}
      </span>
    </div>
  );

  return (
    <>
      {/* ===== DESKTOP / TABLET inline panel ===== */}
      <div className="hidden md:block">
        <div className="mt-4 bg-white border border-primary/20 rounded-lg overflow-hidden">
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50">Advanced filters</h4>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs font-roboto font-semibold text-primary/60 hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
              >
                Close
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-close-line text-sm"></i>
                </span>
              </button>
            </div>
            {fields}
            {actions()}
          </div>
        </div>
      </div>

      {/* ===== MOBILE bottom sheet ===== */}
      <div className="md:hidden fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Advanced filters">
        <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
        <div className="absolute inset-x-0 bottom-0 max-h-[90dvh] bg-white rounded-t-2xl flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10 shrink-0">
            <span className="text-base font-roboto font-semibold text-primary">Advanced filters</span>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-primary rounded-md cursor-pointer hover:bg-primary/5 transition-colors"
              aria-label="Close filters"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 py-4">{fields}</div>
          </div>
          <div className="px-4 py-3 border-t border-primary/10 bg-white shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center justify-center gap-2 h-11 px-4 text-base font-roboto font-medium text-primary border border-primary/20 rounded-lg hover:border-primary/50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center justify-center gap-2 h-11 px-6 bg-primary text-white text-base font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap ml-auto flex-1"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}