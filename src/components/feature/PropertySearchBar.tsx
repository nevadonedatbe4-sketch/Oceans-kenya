import { useEffect, useRef, useState, type ReactNode } from 'react';
import LocationSearch, { type LocationSuggestion } from '@/components/feature/LocationSearch';

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

const DEFAULT_BED_OPTIONS = ['Any beds', 'Studio', '1+', '2+', '3+', '4+', '5+'];

const DEFAULT_TYPE_OPTIONS = [
  'Any type',
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
    <label className="block text-base font-roboto font-semibold text-primary leading-none mb-1.5">
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

function SelectControl({
  label,
  value,
  onChange,
  options,
  ariaLabel,
  fieldClassName = '',
  embedded = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  ariaLabel?: string;
  fieldClassName?: string;
  /** Borderless row layout (label left, value right) used inside the mobile "one box". */
  embedded?: boolean;
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
      className="absolute top-full left-0 right-0 mt-1 bg-white border border-primary/15 rounded-[6px] shadow-lg z-[60] max-h-[300px] overflow-y-auto py-1"
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
          className="w-full h-[54px] pl-4 pr-10 rounded-[4px] border border-primary/60 bg-white text-base font-roboto text-primary cursor-pointer text-left whitespace-nowrap focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-colors"
        >
          <span className="block truncate">{selected}</span>
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
  className = '',
}: {
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 h-[54px] px-5 rounded-[4px] border text-base font-roboto font-semibold whitespace-nowrap cursor-pointer transition-colors ${active ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-primary/60 hover:border-primary hover:bg-primary/5'} ${className}`}
    >
      <span className="w-5 h-5 flex items-center justify-center">
        <i className="ri-equalizer-line"></i>
      </span>
      Filters
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
      className={`flex items-center justify-center gap-2 h-[54px] px-6 rounded-[4px] text-base font-roboto font-semibold whitespace-nowrap cursor-pointer transition-colors ${dark ? 'bg-golden text-white hover:bg-golden/90' : 'bg-primary text-white hover:bg-primary/90'} ${className}`}
    >
      <span className="w-5 h-5 flex items-center justify-center">
        <i className="ri-search-line"></i>
      </span>
      {label}
    </button>
  );
}

function SearchActions({
  onMapView,
  mapActive,
  onCreateAlert,
  onToggleSave,
  saved,
}: {
  onMapView?: () => void;
  mapActive?: boolean;
  onCreateAlert?: () => void;
  onToggleSave?: () => void;
  saved?: boolean;
}) {
  const hasLeading = Boolean(onMapView) || Boolean(onCreateAlert);
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
      {hasLeading && onToggleSave && <span className="h-5 w-px bg-primary/20" aria-hidden="true"></span>}
      {onToggleSave && (
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
  saved,
  onToggleSave,
  onSearch,
  onMapView,
  mapActive,
  onCreateAlert,
  extraFields = [],
  tone = 'light',
  className = '',
}: PropertySearchBarProps) {
  const isDark = tone === 'dark';
  const priceOpts = priceOptions ?? [];
  const showRadius = typeof onRadiusChange === 'function';
  const showBeds = typeof onBedsChange === 'function';
  const showPrice = typeof onPriceChange === 'function' && priceOpts.length > 0;
  const showType = typeof onTypeChange === 'function';
  const showLandSize = typeof onLandSizeChange === 'function' && (landSizeOptions?.length ?? 0) > 0;
  const showFilters = typeof onFilters === 'function';
  const showSave = typeof onToggleSave === 'function';
  const showSearch = typeof onSearch === 'function';
  const showActions = typeof onMapView === 'function' || typeof onCreateAlert === 'function' || showSave;

  const locationField = (
    <LocationField value={searchQuery} onChange={onLocationChange} placeholderCycle={placeholderCycle} />
  );

  return (
    <div className={`${isDark ? '[&_label]:text-white' : ''} ${className}`}>
      {/* ── Desktop (lg+) ── */}
      <div className="hidden lg:flex flex-wrap items-end gap-x-3 gap-y-4 w-full">
        <div className="flex-[2] min-w-[280px]">
          {locationField}
        </div>
        {showRadius && (
          <SelectControl
            label={radiusLabel ?? 'Radius'}
            value={radiusValue || ''}
            onChange={onRadiusChange as (v: string) => void}
            options={radiusOptions || DEFAULT_RADIUS_OPTIONS}
            fieldClassName="flex-1 min-w-[165px]"
          />
        )}
        {showBeds && (
          <SelectControl
            label={bedsLabel ?? 'Bedrooms'}
            value={bedsValue || ''}
            onChange={onBedsChange as (v: string) => void}
            options={bedOptions || DEFAULT_BED_OPTIONS}
            fieldClassName="flex-1 min-w-[165px]"
          />
        )}
        {showPrice && (
          <SelectControl
            label={priceLabel ?? 'Price'}
            value={priceValue || ''}
            onChange={onPriceChange as (v: string) => void}
            options={priceOpts}
            fieldClassName="flex-1 min-w-[165px]"
          />
        )}
        {showType && (
          <SelectControl
            label={typeLabel ?? 'Property type'}
            value={typeValue || ''}
            onChange={onTypeChange as (v: string) => void}
            options={typeOptions || DEFAULT_TYPE_OPTIONS}
            fieldClassName="flex-[1.1] min-w-[180px]"
          />
        )}
        {showLandSize && (
          <SelectControl
            label={landSizeLabel ?? 'Land size'}
            value={landSizeValue || ''}
            onChange={onLandSizeChange as (v: string) => void}
            options={landSizeOptions as string[]}
            ariaLabel={landSizeLabel ?? 'Land size'}
            fieldClassName="flex-1 min-w-[165px]"
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
            fieldClassName="flex-1 min-w-[165px]"
          />
        ))}
        {showFilters && <FiltersButton onClick={onFilters as () => void} active={filtersActive} className="shrink-0" />}
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
        {showPrice && (
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
        {showFilters && <FiltersButton onClick={onFilters as () => void} active={filtersActive} className="shrink-0" />}
        {showSearch && <SearchButton onClick={onSearch as () => void} dark={isDark} className="shrink-0" />}
      </div>

      {/* ── Mobile (< md): one unified search box - location field + Filters only (Zoopla style) ── */}
      <div className="md:hidden">
        <div className="rounded-[6px] border border-primary/60 bg-white overflow-hidden divide-y divide-primary/10">
          <LocationField
            value={searchQuery}
            onChange={onLocationChange}
            placeholderCycle={placeholderCycle}
            embedded
          />
          {(showFilters || showSearch) && (
            <div className="p-3 flex items-center gap-2">
              {showFilters && <FiltersButton onClick={onFilters as () => void} active={filtersActive} className="flex-1" />}
              {showSearch && <SearchButton onClick={onSearch as () => void} dark={isDark} className="flex-1" />}
            </div>
          )}
        </div>
      </div>

      {showActions && (
        <SearchActions
          onMapView={onMapView}
          mapActive={mapActive}
          onCreateAlert={onCreateAlert}
          onToggleSave={onToggleSave}
          saved={saved}
        />
      )}
    </div>
  );
}