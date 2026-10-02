import { useEffect, useState, type ReactNode } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/**
 * DevelopmentAdvancedFilters - the advanced filter sheet for New Developments.
 * Mirrors the shared Buy / Rent AdvancedFilters so every filter sheet in the
 * site reads identically: an inline panel on desktop / tablet and a bottom
 * sheet on mobile, with the same "SHOW SOLD / SHOW LET or AGREED LET" toggle
 * wording.
 */

export interface DevelopmentFilterState {
  area: string;
  type: string;
  unitType: string;
  developer: string;
  completion: string;
  price: string;
  stage: string;
  keywords: string;
  showLetAgreed: boolean;
}

interface DevelopmentAdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: DevelopmentFilterState) => void;
  initialFilters: DevelopmentFilterState;
  areaOptions: string[];
  typeOptions: string[];
  unitTypeOptions: string[];
  developerOptions: string[];
  completionOptions: string[];
  priceOptions: string[];
  stageOptions: string[];
}

const labelClass = 'block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5';

const inputClass =
  'w-full h-11 px-3 text-sm font-roboto font-medium text-primary placeholder:text-primary/40 bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors';

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} appearance-none pr-9 cursor-pointer`}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/50 pointer-events-none">
          <i className="ri-arrow-down-s-line text-base"></i>
        </span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 mb-3">{title}</h4>
      {children}
    </div>
  );
}

export default function DevelopmentAdvancedFilters({
  isOpen,
  onClose,
  onApply,
  initialFilters,
  areaOptions,
  typeOptions,
  unitTypeOptions,
  developerOptions,
  completionOptions,
  priceOptions,
  stageOptions,
}: DevelopmentAdvancedFiltersProps) {
  const [filters, setFilters] = useState<DevelopmentFilterState>({ ...initialFilters });
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

  const set = <K extends keyof DevelopmentFilterState>(key: K, value: DevelopmentFilterState[K]) =>
    setFilters((p) => ({ ...p, [key]: value }));

  const neutralArea = areaOptions[0] || '';
  const neutralType = typeOptions[0] || '';
  const neutralUnit = unitTypeOptions[0] || '';
  const neutralDev = developerOptions[0] || '';
  const neutralComp = completionOptions[0] || '';
  const neutralPrice = priceOptions[0] || '';
  const neutralStage = stageOptions[0] || '';

  const activeCount = [
    filters.area !== neutralArea,
    filters.type !== neutralType,
    filters.unitType !== neutralUnit,
    filters.developer !== neutralDev,
    filters.completion !== neutralComp,
    filters.price !== neutralPrice,
    filters.stage !== neutralStage,
    filters.keywords.trim() !== '',
  ].filter(Boolean).length;

  const handleApply = () => {
    onApply({ ...filters });
    onClose();
  };

  const handleClear = () => {
    const cleared: DevelopmentFilterState = {
      area: neutralArea,
      type: neutralType,
      unitType: neutralUnit,
      developer: neutralDev,
      completion: neutralComp,
      price: neutralPrice,
      stage: neutralStage,
      keywords: '',
      showLetAgreed: filters.showLetAgreed,
    };
    setFilters(cleared);
    onApply(cleared);
    onClose();
  };

  const toggleOn = filters.showLetAgreed;

  const fields = (
    <>
      {/* Location */}
      <Section title="Location">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FilterSelect label="Area" value={filters.area} options={areaOptions} onChange={(v) => set('area', v)} />
          <FilterSelect label="Development type" value={filters.type} options={typeOptions} onChange={(v) => set('type', v)} />
        </div>
      </Section>

      <div className="w-full h-px bg-primary/10 mb-5" />

      {/* Project */}
      <Section title="Project">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FilterSelect label="Unit type" value={filters.unitType} options={unitTypeOptions} onChange={(v) => set('unitType', v)} />
          <FilterSelect label="Developer" value={filters.developer} options={developerOptions} onChange={(v) => set('developer', v)} />
          <FilterSelect label="Completion" value={filters.completion} options={completionOptions} onChange={(v) => set('completion', v)} />
          <FilterSelect label="Build status" value={filters.stage} options={stageOptions} onChange={(v) => set('stage', v)} />
        </div>
      </Section>

      <div className="w-full h-px bg-primary/10 mb-5" />

      {/* Price + keywords */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FilterSelect label="Price range" value={filters.price} options={priceOptions} onChange={(v) => set('price', v)} />
        <div>
          <label className={labelClass}>Keywords</label>
          <input
            type="text"
            placeholder="e.g. rooftop, pool, gated"
            value={filters.keywords}
            onChange={(e) => set('keywords', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="w-full h-px bg-primary/10 mb-5 mt-5" />

      {/* Show sold / let agreed */}
      <div className="mb-1 flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            className="sr-only"
            type="checkbox"
            checked={toggleOn}
            onChange={() => set('showLetAgreed', !toggleOn)}
          />
          <div className={`w-9 h-5 rounded-full transition-colors ${toggleOn ? 'bg-primary' : 'bg-primary/10'}`}>
            <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${toggleOn ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}></div>
          </div>
        </label>
        <span className="text-sm font-roboto font-medium text-primary">SHOW SOLD</span>
      </div>
    </>
  );

  const actions = (
    <div className="flex flex-wrap items-center gap-2 pt-4 mt-5 border-t border-primary/10">
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
            {actions}
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