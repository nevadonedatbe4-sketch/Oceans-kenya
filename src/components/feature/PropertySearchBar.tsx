import { useEffect, useRef, useState, type ReactNode } from 'react';
import LocationSearch, { type LocationSuggestion } from '@/components/feature/LocationSearch';
import { BEDROOM_OPTIONS } from '@/lib/bedrooms';

/**
 * PropertySearchBar - the single, shared property-search toolbar.
 *
 * Visual spec (matched closely to a leading property-portal reference):
 *  - Labels sit ABOVE each field.
 *  - Fields are rectangular with a restrained ~4px radius and a thin border.
 *  - All controls share one height (~54px).
 *  - Location is significantly wider than the other fields.
 *  - One neutral outlined "Filters" control and one solid brand "Save" button.
 *  - A "Map view / Create alert" action row sits beneath the controls.
 *
 * It is fully controlled: the owning page keeps its state + search logic and
 * simply passes values + change handlers. No data logic lives here.
 */

const DEFAULT_RADIUS_OPTIONS = [
  'This area only',
  '\u00bc mile',
  '\u00bd mile',
  '1 mile',
  '3 miles',
  '5 miles',
  '10 miles',
  '15 miles',
  '20 miles',
  '30 miles',
  '40 miles',
];

const DEFAULT_BED_OPTIONS = BEDROOM_OPTIONS;

const DEFAULT_TYPE_OPTIONS = [
  'Show all',
  'House',
  'Apartment',
  'Bungalow',
  'Studio',
  'Maisonette',
  'Villa',
  'Townhouse',
  'Penthouse',
  'Detached',
  'Semi-detached',
  'Terraced',
  'Land',
];

export interface SearchExtraField {
  /** Stable key for React lists. */
  key: string;
  /** Field label shown above the control. */
  label: string;
  /** Current value ('' shows the first option). */
  value: string;
  /** Selectable options; the first is the neutral "all" default. */
  options: string[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export interface PropertySearchBarProps {
  searchQuery: string;
  onLocationChange: (value: string, suggestion?: LocationSuggestion) => void;
  placeholderCycle?: string[];

  radiusValue?: string;
  onRadiusChange?: (value: string) => void;
  radiusOptions?: string[];
  radiusLabel?: string;

  bedsValue?: string;
  onBedsChange?: (value: string) => void;
  bedOptions?: string[];
  bedsLabel?: string;

  priceValue?: string;
  onPriceChange?: (value: string) => void;
  priceOptions?: string[];
  priceLabel?: string;

  /* Separate min / max price dropdowns. When these are supplied the single
     "Price" control is replaced by two independent selects (min + max). */
  priceMinValue?: string;
  onPriceMinChange?: (value: string) => void;
  priceMinOptions?: string[];
  priceMinLabel?: string;

  priceMaxValue?: string;
  onPriceMaxChange?: (value: string) => void;
  priceMaxOptions?: string[];
  priceMaxLabel?: string;

  /** Validation message shown when the selected price range is contradictory. */
  priceRangeError?: string;

  /** When provided, renders a small "Clear price" action beside the min/max fields. */
  onClearPrice?: () => void;

  typeValue?: string;
  onTypeChange?: (value: string) => void;
  typeOptions?: string[];
  typeLabel?: string;

  landSizeValue?: string;
  onLandSizeChange?: (value: string) => void;
  landSizeOptions?: string[];
  landSizeLabel?: string;

  onFilters?: () => void;
  filtersActive?: boolean;
  /** Number of currently-applied advanced filters; drives the button badge. */
  filtersCount?: number;

  saved?: boolean;
  onToggleSave?: () => void;

  /** Runs the search with the current criteria (the explicit "Search" action). */
  onSearch?: () => void;

  /** 'dark' adapts labels/controls for use on a dark panel. */
  tone?: 'light' | 'dark';

  onMapView?: () => void;
  mapActive?: boolean;

  onCreateAlert?: () => void;

  /**
   * Radius search rendered INSIDE the action row (Map view / Create alert /
   * Save search), styled as one of those links. Kept separate from the
   * main-row `radiusValue` select so pages can choose where the radius lives.
   */
  actionRadiusValue?: string;
  onActionRadiusChange?: (value: string) => void;
  actionRadiusOptions?: string[];

  /**
   * Additional, property-type-specific selects (e.g. Land use, Road access,
   * Developer, Completion, Unit type). These are merged INTO the single main
   * search row - same visual language, same bar - so each page carries its OWN
   * field schema without a second, detached search row.
   */
  extraFields?: SearchExtraField[];

  className?: string;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-sm font-roboto font-semibold text-primary leading-none mb-1.5 whitespace-nowrap truncate">
      {children}
    </label>
  );
}

function LocationField({
  value,
  onChange,
  placeholderCycle,
  embedded = false,
}: {
  value: string;
  onChange: (value: string, suggestion?: LocationSuggestion) => void;
  placeholderCycle?: string[];
  embedded?: boolean;
}) {
  return (
    <div className="min-w-0 w-full">
      {!embedded && <FieldLabel>Enter a location</FieldLabel>}
      <LocationSearch
        value={value}
        onChange={onChange}
        placeholderCycle={placeholderCycle}
        variant="zoopla"
        embedded={embedded}
        className="w-full"
      />
    </div>
  );
}

function ClearPriceButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-[54px] px-2 inline-flex items-center gap-1.5 text-sm font-roboto font-medium text-primary/60 hover:text-primary whitespace-nowrap cursor-pointer transition-colors"
      aria-label="Clear price"
    >
      <span className="w-4 h-4 flex items-center justify-center">
        <i className="ri-close-circle-line text-base"></i>
      </span>
      Clear price
    </button>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  options,
  ariaLabel,
  fieldClassName = '',
  embedded = false,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  ariaLabel?: string;
  fieldClassName?: string;
  /** Borderless row layout (label left, value right) used inside the mobile "one box". */
  embedded?: boolean;
  /** Tighter typography + a self-sizing dropdown so long price figures stay fully visible. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape while the panel is open.
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selected = value !== '' && value != null ? value : options[0] || '';

  const dropdown = open && (
    <ul
      role="listbox"
      className={`absolute top-full left-0 mt-1 ${compact ? 'min-w-full w-max max-w-[360px]' : 'right-0'} bg-white border border-primary/15 rounded-[6px] shadow-lg z-[60] max-h-[300px] overflow-y-auto py-1`}
    >
      {options.map((o) => {
        const isSelected = o === selected;
        return (
          <li
            key={o}
            role="option"
            aria-selected={isSelected}
            onClick={() => {
              onChange(o);
              setOpen(false);
            }}
            className={`px-4 py-2.5 text-base font-roboto cursor-pointer whitespace-nowrap flex items-center justify-between gap-2 transition-colors ${isSelected ? 'text-primary font-semibold bg-primary/5' : 'text-primary hover:bg-primary/5'}`}
          >
            <span className={compact ? 'whitespace-nowrap' : 'truncate'}>{o}</span>
            {isSelected && (
              <span className="w-4 h-4 flex items-center justify-center text-primary shrink-0">
                <i className="ri-check-line text-base"></i>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );

  if (embedded) {
    return (
      <div className={`relative min-w-0 ${fieldClassName}`} ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel || label}
          className="w-full h-[54px] px-4 bg-transparent flex items-center justify-between gap-3 cursor-pointer text-left focus:outline-none"
        >
          <span className="text-sm font-roboto text-primary/50 whitespace-nowrap shrink-0">{label}</span>
          <span className="flex items-center gap-1 min-w-0">
            <span className="text-base font-roboto font-medium text-primary truncate">{selected}</span>
            <span className="w-5 h-5 flex items-center justify-center text-primary shrink-0">
              <i className={`ri-arrow-down-s-line text-xl transition-transform duration-200 ${open ? 'rotate-180' : ''}`}></i>
            </span>
          </span>
        </button>
        {dropdown}
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${fieldClassName}`} ref={wrapRef}>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel || label}
          className={`w-full h-[54px] ${compact ? 'pl-4 pr-8 text-sm' : 'pl-4 pr-10 text-base'} rounded-[4px] border border-primary/60 bg-white font-roboto text-primary cursor-pointer text-left whitespace-nowrap focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-colors`}
        >
          <span className={compact ? 'block whitespace-nowrap' : 'block truncate'}>{selected}</span>
        </button>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-primary">
          <i className={`ri-arrow-down-s-line text-2xl transition-transform duration-200 ${open ? 'rotate-180' : ''}`}></i>
        </span>
        {dropdown}
      </div>
    </div>
  );
}

function FiltersButton({
  onClick,
  active,
  count = 0,
  className = '',
}: {
  onClick: () => void;
  active?: boolean;
  count?: number;
  className?: string;
}) {
  const isActive = Boolean(active) || count > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 md:gap-2 h-[38px] md:h-[54px] px-3.5 md:px-5 rounded-[4px] border text-sm md:text-base font-roboto font-semibold whitespace-nowrap cursor-pointer transition-colors ${isActive ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-primary/60 hover:border-primary hover:bg-primary/5'} ${className}`}
    >
      <span className="w-5 h-5 flex items-center justify-center">
        <i className="ri-equalizer-line"></i>
      </span>
      Filters
      {count > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-white text-primary text-[11px] font-bold leading-none">
          {count}
        </span>
      )}
    </button>
  );
}

function SearchButton({
  onClick,
  className = '',
  dark,
  label = 'Search',
}: {
  onClick: () => void;
  className?: string;
  dark?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 md:gap-2 h-[38px] md:h-[54px] px-3.5 md:px-6 rounded-[4px] text-sm md:text-base font-roboto font-semibold whitespace-nowrap cursor-pointer transition-colors ${dark ? 'bg-golden text-white hover:bg-golden/90' : 'bg-primary text-white hover:bg-primary/90'} ${className}`}
    >
      <span className="w-5 h-5 flex items-center justify-center">
        <i className="ri-search-line"></i>
      </span>
      {label}
    </button>
  );
}

function RadiusAction({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selected = value !== '' && value != null ? value : options[0] || '';

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Search radius"
        className="group flex items-center gap-2 text-base font-roboto font-semibold text-primary cursor-pointer whitespace-nowrap"
      >
        <span className="w-5 h-5 flex items-center justify-center">
          <i className="ri-focus-3-line"></i>
        </span>
        <span className="underline underline-offset-4 decoration-primary/40 group-hover:decoration-primary transition-colors">
          Radius: {selected}
        </span>
        <span className="w-5 h-5 flex items-center justify-center">
          <i className={`ri-arrow-down-s-line text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}></i>
        </span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute bottom-full left-0 mb-2 min-w-[200px] bg-white border border-primary/15 rounded-[6px] shadow-lg z-[60] max-h-[300px] overflow-y-auto py-1"
        >
          {options.map((o) => {
            const isSelected = o === selected;
            return (
              <li
                key={o}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={`px-4 py-2.5 text-base font-roboto cursor-pointer whitespace-nowrap flex items-center justify-between gap-2 transition-colors ${isSelected ? 'text-primary font-semibold bg-primary/5' : 'text-primary hover:bg-primary/5'}`}
              >
                <span className="truncate">{o}</span>
                {isSelected && (
                  <span className="w-4 h-4 flex items-center justify-center text-primary shrink-0">
                    <i className="ri-check-line text-base"></i>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SearchActions({
  onMapView,
  mapActive,
  onCreateAlert,
  onToggleSave,
  saved,
  radiusValue,
  onRadiusChange,
  radiusOptions,
}: {
  onMapView?: () => void;
  mapActive?: boolean;
  onCreateAlert?: () => void;
  onToggleSave?: () => void;
  saved?: boolean;
  radiusValue?: string;
  onRadiusChange?: (value: string) => void;
  radiusOptions?: string[];
}) {
  const hasLeading = Boolean(onMapView) || Boolean(onCreateAlert);
  const showRadius = typeof onRadiusChange === 'function';
  const showSave = Boolean(onToggleSave);
  return (
    <div className="mt-4 pt-3 border-t border-primary/15 flex items-center gap-4 flex-wrap">
      {onMapView && (
        <button
          type="button"
          onClick={onMapView}
          className="group flex items-center gap-2 text-base font-roboto font-semibold text-primary cursor-pointer"
        >
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-map-2-line"></i>
          </span>
          <span className="underline underline-offset-4 decoration-primary/40 group-hover:decoration-primary transition-colors">
            {mapActive ? 'List view' : 'Map view'}
          </span>
        </button>
      )}
      {onMapView && onCreateAlert && <span className="h-5 w-px bg-primary/20" aria-hidden="true"></span>}
      {onCreateAlert && (
        <button
          type="button"
          onClick={onCreateAlert}
          className="group flex items-center gap-2 text-base font-roboto font-semibold text-primary cursor-pointer"
        >
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-notification-3-line"></i>
          </span>
          <span className="underline underline-offset-4 decoration-primary/40 group-hover:decoration-primary transition-colors">
            Create alert
          </span>
        </button>
      )}
      {hasLeading && (showRadius || showSave) && <span className="h-5 w-px bg-primary/20" aria-hidden="true"></span>}
      {showRadius && (
        <RadiusAction
          value={radiusValue || ''}
          onChange={onRadiusChange as (v: string) => void}
          options={radiusOptions || DEFAULT_RADIUS_OPTIONS}
        />
      )}
      {showRadius && showSave && <span className="h-5 w-px bg-primary/20" aria-hidden="true"></span>}
      {showSave && (
        <button
          type="button"
          onClick={onToggleSave}
          className="group flex items-center gap-2 text-base font-roboto font-semibold text-primary cursor-pointer"
        >
          <span className="w-5 h-5 flex items-center justify-center">
            <i className={saved ? 'ri-heart-fill' : 'ri-heart-line'}></i>
          </span>
          <span className="underline underline-offset-4 decoration-primary/40 group-hover:decoration-primary transition-colors">
            {saved ? 'Search saved' : 'Save search'}
          </span>
        </button>
      )}
    </div>
  );
}

export default function PropertySearchBar({
  searchQuery,
  onLocationChange,
  placeholderCycle,
  radiusValue,
  onRadiusChange,
  radiusOptions,
  radiusLabel,
  bedsValue,
  onBedsChange,
  bedOptions,
  bedsLabel,
  priceValue,
  onPriceChange,
  priceOptions,
  priceLabel,
  priceMinValue,
  onPriceMinChange,
  priceMinOptions,
  priceMinLabel,
  priceMaxValue,
  onPriceMaxChange,
  priceMaxOptions,
  priceMaxLabel,
  priceRangeError,
  onClearPrice,
  typeValue,
  onTypeChange,
  typeOptions,
  typeLabel,
  landSizeValue,
  onLandSizeChange,
  landSizeOptions,
  landSizeLabel,
  onFilters,
  filtersActive,
  filtersCount,
  saved,
  onToggleSave,
  onSearch,
  onMapView,
  mapActive,
  onCreateAlert,
  actionRadiusValue,
  onActionRadiusChange,
  actionRadiusOptions,
  extraFields = [],
  tone = 'light',
  className = '',
}: PropertySearchBarProps) {
  const isDark = tone === 'dark';
  const priceOpts = priceOptions ?? [];
  const showRadius = typeof onRadiusChange === 'function';
  const showBeds = typeof onBedsChange === 'function';
  const showPrice = typeof onPriceChange === 'function' && priceOpts.length > 0;
  const showPriceMin = typeof onPriceMinChange === 'function' && (priceMinOptions?.length ?? 0) > 0;
  const showPriceMax = typeof onPriceMaxChange === 'function' && (priceMaxOptions?.length ?? 0) > 0;
  const showPriceRange = showPriceMin || showPriceMax;
  const showType = typeof onTypeChange === 'function';
  const showLandSize = typeof onLandSizeChange === 'function' && (landSizeOptions?.length ?? 0) > 0;
  const showFilters = typeof onFilters === 'function';
  const showSave = typeof onToggleSave === 'function';
  const showSearch = typeof onSearch === 'function';
  const showActions = typeof onMapView === 'function' || typeof onCreateAlert === 'function' || showSave || typeof onActionRadiusChange === 'function';

  const locationField = (
    <LocationField value={searchQuery} onChange={onLocationChange} placeholderCycle={placeholderCycle} />
  );

  return (
    <div className={`${isDark ? '[&_label]:text-white' : ''} ${className}`}>
      {/* ── Desktop (lg+): single compact row, Zoopla style ── */}
      <div className="hidden lg:flex flex-nowrap items-end gap-3 w-full">
        <div className="flex-[2.2] min-w-0">
          {locationField}
        </div>
        {showRadius && (
          <SelectControl
            label={radiusLabel ?? 'Radius'}
            value={radiusValue || ''}
            onChange={onRadiusChange as (v: string) => void}
            options={radiusOptions || DEFAULT_RADIUS_OPTIONS}
            fieldClassName="flex-1 min-w-0"
          />
        )}
        {showBeds && (
          <SelectControl
            label={bedsLabel ?? 'Bedrooms'}
            value={bedsValue || ''}
            onChange={onBedsChange as (v: string) => void}
            options={bedOptions || DEFAULT_BED_OPTIONS}
            fieldClassName="flex-1 min-w-0"
          />
        )}
        {showPriceRange ? (
          <>
            {showPriceMin && (
              <SelectControl
                label={priceMinLabel ?? 'Min price'}
                value={priceMinValue || ''}
                onChange={onPriceMinChange as (v: string) => void}
                options={priceMinOptions as string[]}
                compact
                fieldClassName="flex-1 min-w-0"
              />
            )}
            {showPriceMax && (
              <SelectControl
                label={priceMaxLabel ?? 'Max price'}
                value={priceMaxValue || ''}
                onChange={onPriceMaxChange as (v: string) => void}
                options={priceMaxOptions as string[]}
                compact
                fieldClassName="flex-1 min-w-0"
              />
            )}
            {showPriceRange && typeof onClearPrice === 'function' && (
              <ClearPriceButton onClick={onClearPrice} />
            )}
          </>
        ) : showPrice && (
          <SelectControl
            label={priceLabel ?? 'Price'}
            value={priceValue || ''}
            onChange={onPriceChange as (v: string) => void}
            options={priceOpts}
            fieldClassName="flex-1 min-w-0"
          />
        )}
        {showType && (
          <SelectControl
            label={typeLabel ?? 'Property type'}
            value={typeValue || ''}
            onChange={onTypeChange as (v: string) => void}
            options={typeOptions || DEFAULT_TYPE_OPTIONS}
            fieldClassName="flex-[1.1] min-w-0"
          />
        )}
        {showLandSize && (
          <SelectControl
            label={landSizeLabel ?? 'Land size'}
            value={landSizeValue || ''}
            onChange={onLandSizeChange as (v: string) => void}
            options={landSizeOptions as string[]}
            ariaLabel={landSizeLabel ?? 'Land size'}
            fieldClassName="flex-1 min-w-0"
          />
        )}
        {extraFields.map((field) => (
          <SelectControl
            key={field.key}
            label={field.label}
            value={field.value}
            onChange={field.onChange}
            options={field.options}
            ariaLabel={field.ariaLabel || field.label}
            fieldClassName="flex-1 min-w-0"
          />
        ))}
        {showFilters && <FiltersButton onClick={onFilters as () => void} active={filtersActive} count={filtersCount} className="shrink-0" />}
        {showSearch && <SearchButton onClick={onSearch as () => void} dark={isDark} className="shrink-0" />}
      </div>

      {/* ── Tablet (md → lg) ── */}
      <div className="hidden md:flex lg:hidden flex-wrap items-end gap-3">
        <div className="w-full min-w-0">
          {locationField}
        </div>
        {showRadius && (
          <SelectControl
            label={radiusLabel ?? 'Radius'}
            value={radiusValue || ''}
            onChange={onRadiusChange as (v: string) => void}
            options={radiusOptions || DEFAULT_RADIUS_OPTIONS}
            fieldClassName="flex-1 min-w-[150px]"
          />
        )}
        {showBeds && (
          <SelectControl
            label={bedsLabel ?? 'Bedrooms'}
            value={bedsValue || ''}
            onChange={onBedsChange as (v: string) => void}
            options={bedOptions || DEFAULT_BED_OPTIONS}
            fieldClassName="flex-1 min-w-[150px]"
          />
        )}
        {showPriceRange ? (
          <>
            {showPriceMin && (
              <SelectControl
                label={priceMinLabel ?? 'Min price'}
                value={priceMinValue || ''}
                onChange={onPriceMinChange as (v: string) => void}
                options={priceMinOptions as string[]}
                compact
                fieldClassName="flex-1 min-w-[190px]"
              />
            )}
            {showPriceMax && (
              <SelectControl
                label={priceMaxLabel ?? 'Max price'}
                value={priceMaxValue || ''}
                onChange={onPriceMaxChange as (v: string) => void}
                options={priceMaxOptions as string[]}
                compact
                fieldClassName="flex-1 min-w-[190px]"
              />
            )}
            {showPriceRange && typeof onClearPrice === 'function' && (
              <ClearPriceButton onClick={onClearPrice} />
            )}
          </>
        ) : showPrice && (
          <SelectControl
            label={priceLabel ?? 'Price'}
            value={priceValue || ''}
            onChange={onPriceChange as (v: string) => void}
            options={priceOpts}
            fieldClassName="flex-1 min-w-[150px]"
          />
        )}
        {showType && (
          <SelectControl
            label={typeLabel ?? 'Property type'}
            value={typeValue || ''}
            onChange={onTypeChange as (v: string) => void}
            options={typeOptions || DEFAULT_TYPE_OPTIONS}
            fieldClassName="flex-1 min-w-[150px]"
          />
        )}
        {showLandSize && (
          <SelectControl
            label={landSizeLabel ?? 'Land size'}
            value={landSizeValue || ''}
            onChange={onLandSizeChange as (v: string) => void}
            options={landSizeOptions as string[]}
            ariaLabel={landSizeLabel ?? 'Land size'}
            fieldClassName="flex-1 min-w-[150px]"
          />
        )}
        {extraFields.map((field) => (
          <SelectControl
            key={field.key}
            label={field.label}
            value={field.value}
            onChange={field.onChange}
            options={field.options}
            ariaLabel={field.ariaLabel || field.label}
            fieldClassName="flex-1 min-w-[150px]"
          />
        ))}
        {showFilters && <FiltersButton onClick={onFilters as () => void} active={filtersActive} count={filtersCount} className="shrink-0" />}
        {showSearch && <SearchButton onClick={onSearch as () => void} dark={isDark} className="shrink-0" />}
      </div>

      {/* ── Mobile (< md): one unified search box - location field + Filters only (Zoopla style) ── */}
      <div className="md:hidden">
        <div className="rounded-[6px] border border-primary/25 bg-white overflow-hidden divide-y divide-primary/10 shadow-[0_1px_2px_rgba(0,23,49,0.04)]">
          <LocationField
            value={searchQuery}
            onChange={onLocationChange}
            placeholderCycle={placeholderCycle}
            embedded
          />
          {(showFilters || showSearch) && (
            <div className="p-2.5 flex items-stretch gap-2.5">
              {showFilters && <FiltersButton onClick={onFilters as () => void} active={filtersActive} count={filtersCount} className="flex-1 min-w-0" />}
              {showSearch && <SearchButton onClick={onSearch as () => void} dark={isDark} className="flex-1 min-w-0" />}
            </div>
          )}
        </div>
      </div>

      {priceRangeError && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-roboto text-red-500" role="alert">
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-error-warning-line"></i>
          </span>
          {priceRangeError}
        </p>
      )}

      {showActions && (
        <SearchActions
          onMapView={onMapView}
          mapActive={mapActive}
          onCreateAlert={onCreateAlert}
          onToggleSave={onToggleSave}
          saved={saved}
          radiusValue={actionRadiusValue}
          onRadiusChange={onActionRadiusChange}
          radiusOptions={actionRadiusOptions}
        />
      )}
    </div>
  );
}