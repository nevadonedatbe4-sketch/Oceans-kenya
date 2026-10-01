import { useRef, type CSSProperties, type ReactNode } from 'react';

export interface NightLifeSubcat {
  key: string;
  label: string;
  icon: string;
  count: number;
}

export interface NightLifeAreaOption {
  name: string;
  count: number;
}

interface SelectFieldProps {
  icon: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

/** A compact, styled filter dropdown used across the Night Life filter row. */
function SelectField({ icon, label, value, onChange, children }: SelectFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-jost text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b6b6b]">
        {label}
      </span>
      <span className="relative inline-flex">
        <i className={`${icon} absolute left-3 top-1/2 -translate-y-1/2 text-[#9B1B30] text-[15px] pointer-events-none`}></i>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full min-w-[170px] pl-9 pr-8 py-2.5 rounded-md border border-[#1a1a1a]/15 bg-white text-sm font-roboto text-[#1a1a1a] cursor-pointer focus:outline-none focus:border-[#9B1B30] focus:ring-1 focus:ring-[#9B1B30]/20"
        >
          {children}
        </select>
        <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b6b6b] pointer-events-none"></i>
      </span>
    </label>
  );
}

interface NightLifeFilterBarProps {
  search: string;
  onSearch: (value: string) => void;
  subcats: NightLifeSubcat[];
  activeSub: string;
  onSub: (key: string) => void;
  areas: NightLifeAreaOption[];
  area: string;
  onArea: (value: string) => void;
  priceTier: string;
  priceTierOptions: string[];
  onPriceTier: (value: string) => void;
  minRating: number;
  onMinRating: (value: number) => void;
  sort: string;
  onSort: (value: string) => void;
  resultCount: number;
  totalCount: number;
  onReset: () => void;
  hasActiveFilters: boolean;
  /** The page's accent colour - the subcategory chips are shaded from it. */
  accentColor?: string;
}

export default function NightLifeFilterBar({
  search,
  onSearch,
  subcats,
  activeSub,
  onSub,
  areas,
  area,
  onArea,
  priceTier,
  priceTierOptions,
  onPriceTier,
  minRating,
  onMinRating,
  sort,
  onSort,
  resultCount,
  totalCount,
  onReset,
  hasActiveFilters,
  accentColor = '#9B1B30',
}: NightLifeFilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Tinted-shade chip styling that mirrors the Directory category pages:
   * the ACTIVE chip keeps the solid accent colour with white text, while
   * unselected chips sit on soft tints of the same hue (deeper on hover) so
   * the whole filter row reads as one on-theme palette instead of grey pills.
   */
  const chipStyle = (isActive: boolean): CSSProperties => {
    if (isActive) {
      return {
        '--dir-chip-bg': accentColor,
        '--dir-chip-fg': '#ffffff',
        '--dir-chip-border': accentColor,
        '--dir-chip-bg-hover': accentColor,
        '--dir-chip-border-hover': accentColor,
      } as CSSProperties;
    }
    return {
      '--dir-chip-bg': `color-mix(in srgb, ${accentColor} 10%, #ffffff)`,
      '--dir-chip-fg': `color-mix(in srgb, ${accentColor} 78%, #14201c)`,
      '--dir-chip-border': `color-mix(in srgb, ${accentColor} 20%, #ffffff)`,
      '--dir-chip-bg-hover': `color-mix(in srgb, ${accentColor} 20%, #ffffff)`,
      '--dir-chip-border-hover': `color-mix(in srgb, ${accentColor} 38%, #ffffff)`,
    } as CSSProperties;
  };

  return (
    <div className="rounded-xl border border-[#1a1a1a]/10 bg-white overflow-hidden">
      {/* Search */}
      <div className="p-4 md:p-5 bg-[#FBF6F4] border-b border-[#1a1a1a]/10">
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6b6b] text-base pointer-events-none"></i>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search clubs, lounges, casinos or a vibe - e.g. “rooftop”, “karaoke”"
              className="w-full pl-11 pr-11 py-3 rounded-md border border-[#1a1a1a]/15 bg-white text-sm font-roboto text-[#1a1a1a] placeholder:text-[#8a8a8a] focus:outline-none focus:border-[#9B1B30] focus:ring-1 focus:ring-[#9B1B30]/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  onSearch('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-base"></i>
              </button>
            )}
          </div>
          <div className="shrink-0 flex items-center justify-center gap-2 px-4 py-3 bg-[#9B1B30] text-white rounded-md">
            <span className="font-prata font-bold text-[20px] leading-none">{resultCount}</span>
            <span className="font-jost text-[13px] uppercase tracking-[0.08em]">
              {resultCount === 1 ? 'Spot' : 'Spots'}
            </span>
          </div>
        </div>
      </div>

      {/* Subcategory pills */}
      {subcats.length > 0 && (
        <div className="p-4 md:p-5 border-b border-[#1a1a1a]/10">
          <p className="font-jost text-[#6b6b6b] text-xs uppercase tracking-[0.12em] font-semibold mb-3">
            What kind of night?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSub('all')}
              className="dir-chip inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-jost font-semibold uppercase tracking-[0.06em] cursor-pointer whitespace-nowrap"
              style={chipStyle(activeSub === 'all')}
            >
              <i className="ri-moon-clear-line text-[14px]"></i>
              All
              <span className={activeSub === 'all' ? 'opacity-90' : 'opacity-70'}>{totalCount}</span>
            </button>
            {subcats.map((s) => {
              const active = activeSub === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onSub(s.key)}
                  className="dir-chip inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-jost font-semibold uppercase tracking-[0.06em] cursor-pointer whitespace-nowrap"
                  style={chipStyle(active)}
                >
                  <i className={`${s.icon} text-[14px]`}></i>
                  {s.label}
                  <span className={active ? 'opacity-90' : 'opacity-70'}>{s.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dropdown filters */}
      <div className="p-4 md:p-5 flex flex-wrap items-end gap-3 md:gap-4">
        <SelectField icon="ri-map-pin-line" label="Area" value={area} onChange={onArea}>
          <option value="all">All areas</option>
          {areas.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name} ({a.count})
            </option>
          ))}
        </SelectField>

        <SelectField icon="ri-price-tag-3-line" label="Price" value={priceTier} onChange={onPriceTier}>
          <option value="all">Any price</option>
          {priceTierOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </SelectField>

        <SelectField
          icon="ri-star-line"
          label="Rating"
          value={String(minRating)}
          onChange={(v) => onMinRating(Number(v))}
        >
          <option value="0">Any rating</option>
          <option value="4">4.0 &amp; up</option>
          <option value="4.5">4.5 &amp; up</option>
        </SelectField>

        <SelectField icon="ri-sort-desc" label="Sort by" value={sort} onChange={onSort}>
          <option value="recommended">Recommended</option>
          <option value="rating">Top rated</option>
          <option value="name">A - Z</option>
        </SelectField>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[13px] font-jost font-semibold uppercase tracking-[0.08em] text-[#9B1B30] border border-[#9B1B30]/25 hover:bg-[#9B1B30]/5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-refresh-line"></i>
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}