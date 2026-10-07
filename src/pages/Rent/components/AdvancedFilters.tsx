import { useState, useEffect } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
  /* 'sale' hides rental-only controls (furnishing, availability, price-per,
     house share, student accommodation) so buy/sale pages read as sales pages. */
  mode?: 'rent' | 'sale';
}

export interface FilterState {
  minPrice: string;
  maxPrice: string;
  minBaths: string;
  propertyTypes: string[];
  furnished: string[];
  minSize: string;
  maxSize: string;
  added: string;
  mustHaves: string[];
}

export const defaultFilters: FilterState = {
  minPrice: '',
  maxPrice: '',
  minBaths: '',
  propertyTypes: [],
  furnished: [],
  minSize: '',
  maxSize: '',
  added: '',
  mustHaves: [],
};

const propertyTypeList = ['Apartment', 'House', 'Villa', 'Penthouse', 'Townhouse', 'Studio', 'Land', 'Commercial'];
// "Wheelchair access" is a must-have checkbox (backed by real amenity data);
// it maps to the Wheelchair Accessible / Wheelchair Access amenities.
const mustHavesList = ['Garden', 'Parking/garage', 'Balcony/terrace', 'Pets allowed', 'Bills included', 'Swimming pool', 'Gym', 'Power backup', 'Wheelchair access'];
const propertyFeaturesList = ['New', 'Period property', 'Cottage', 'Modern', 'Utility room', 'Basement', 'Conservatory', 'Home office', 'En-suite', 'Bathtub', 'Patio', 'Kitchen island'];
const furnishingOptions = ['Any', 'Furnished', 'Part-furnished', 'Unfurnished'];
const availabilityOptions = ['Show all', 'Immediately', 'Within 1 month', 'Within 3 months', 'Within 6 months', 'Within 1 year'];
const addedOptionsDesktop = ['Anytime', 'Last 24 hours', 'Last 3 days', 'Last 7 days', 'Last 14 days', 'Last 30 days'];
const bathsMinOptions = ['No min', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'];
const bathsMaxOptions = ['No max', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'];
const priceMinOptions = ['No min', '$50K', '$100K', '$200K', '$300K', '$500K', '$750K', '$1M', '$1.5M', '$2.5M', '$5M', '$10M'];
const priceMaxOptions = ['No max', '$50K', '$100K', '$200K', '$300K', '$500K', '$750K', '$1M', '$1.5M', '$2.5M', '$5M', '$10M'];
const pricePerOptions = ['Daily', 'Weekly', 'Monthly'];

export default function AdvancedFilters({ isOpen, onClose, onApply, initialFilters, mode = 'rent' }: AdvancedFiltersProps) {
  const isSale = mode === 'sale';
  const [filters, setFilters] = useState<FilterState>({ ...initialFilters });
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  // Mobile-specific state
  const [mobileHouseShare, setMobileHouseShare] = useState<'include' | 'exclude' | 'only' | null>(null);
  const [mobileStudentAccom, setMobileStudentAccom] = useState<'include' | 'exclude' | 'only' | null>(null);
  const [mobileShowSold, setMobileShowSold] = useState(false);
  const [mobileAvailability, setMobileAvailability] = useState('Show all');
  const [mobileFurnishing, setMobileFurnishing] = useState('Any');
  const [mobileAdded, setMobileAdded] = useState('Anytime');
  const [mobileMinBaths, setMobileMinBaths] = useState('No min');
  const [mobileMaxBaths, setMobileMaxBaths] = useState('No max');
  const [mobileMinPrice, setMobileMinPrice] = useState('No min');
  const [mobileMaxPrice, setMobileMaxPrice] = useState('No max');
  const [mobilePricePer, setMobilePricePer] = useState('Monthly');
  const [mobileShowLetAgreed, setMobileShowLetAgreed] = useState(false);
  const [mobileShowAllTypes, setMobileShowAllTypes] = useState(false);
  // Desktop state
  const [desktopFurnishing, setDesktopFurnishing] = useState('Any');
  const [desktopAvailability, setDesktopAvailability] = useState('Show all');
  const [desktopAdded, setDesktopAdded] = useState('Anytime');
  const [desktopShowLetAgreed, setDesktopShowLetAgreed] = useState(false);

  // Detect mobile so we only lock body scroll for the bottom sheet (not the inline desktop/tablet panel)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useBodyScrollLock(isOpen && isMobile);

  const toggleCheckbox = (key: keyof FilterState, value: string) => {
    const current = (filters[key] as string[]) || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setFilters({ ...filters, [key]: next });
  };

  const visiblePropertyTypes = showAllTypes ? propertyTypeList : propertyTypeList.slice(0, 8);
  const visibleFeatures = showAllFeatures ? propertyFeaturesList : propertyFeaturesList.slice(0, 12);

  const mobileVisibleTypes = mobileShowAllTypes ? propertyTypeList : propertyTypeList.slice(0, 8);

  // Sales pages shouldn't offer rental-only must-haves.
  const activeMustHaves = isSale
    ? mustHavesList.filter((i) => i !== 'Pets allowed' && i !== 'Bills included')
    : mustHavesList;

  const handleApply = () => {
    const merged: FilterState = {
      ...filters,
      furnished: desktopFurnishing !== 'Any' ? [desktopFurnishing] : [],
      added: desktopAdded !== 'Anytime' ? desktopAdded : '',
    };
    onApply(merged);
    onClose();
  };

  const handleClear = () => {
    setFilters({ ...defaultFilters });
    setDesktopFurnishing('Any');
    setDesktopAvailability('Show all');
    setDesktopAdded('Anytime');
    setDesktopShowLetAgreed(false);
    setMobileHouseShare(null);
    setMobileStudentAccom(null);
    setMobileShowSold(false);
    setMobileAvailability('Show all');
    setMobileFurnishing('Any');
    setMobileAdded('Anytime');
    setMobileMinBaths('No min');
    setMobileMaxBaths('No max');
    setMobileMinPrice('No min');
    setMobileMaxPrice('No max');
    setMobilePricePer('Monthly');
    setMobileShowLetAgreed(false);
    onApply({ ...defaultFilters });
    onClose();
  };

  if (!isOpen) return null;

  const hasActiveFilters =
    filters.minPrice || filters.maxPrice ||
    filters.minBaths || filters.propertyTypes.length > 0 || filters.mustHaves.length > 0 ||
    desktopFurnishing !== 'Any' || desktopAdded !== 'Anytime' || desktopShowLetAgreed;

  return (
    <>
      {/* ===== DESKTOP (lg) Advanced Filters Panel ===== */}
      <div className="hidden lg:block">
        <div className="mt-2 bg-white border border-primary/20 rounded-lg overflow-hidden max-w-[1400px] mx-auto">
          <div className="px-4 md:px-6 py-5 max-w-[1400px] mx-auto">
            {/* Property type */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50">Property type</h4>
                <button
                  type="button"
                  onClick={() => setShowAllTypes(!showAllTypes)}
                  className="text-[12px] font-roboto font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer whitespace-nowrap ml-auto"
                >
                  {showAllTypes ? 'Show less' : 'Show all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                {visiblePropertyTypes.map((type) => (
                  <label key={type} className="flex items-center gap-1.5 cursor-pointer group">
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={filters.propertyTypes.includes(type)}
                      onChange={() => toggleCheckbox('propertyTypes', type)}
                    />
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      filters.propertyTypes.includes(type)
                        ? 'bg-primary border-primary'
                        : 'border-primary/20 bg-white group-hover:border-primary/30'
                    }`}>
                      {filters.propertyTypes.includes(type) && <i className="ri-check-line text-white text-[10px]"></i>}
                    </span>
                    <span className="text-sm font-roboto text-primary whitespace-nowrap">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Must-haves */}
            <div className="mb-5">
              <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 mb-3">Must-haves</h4>
              <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                {activeMustHaves.map((item) => (
                  <label key={item} className="flex items-center gap-1.5 cursor-pointer group">
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={filters.mustHaves.includes(item)}
                      onChange={() => toggleCheckbox('mustHaves', item)}
                    />
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      filters.mustHaves.includes(item)
                        ? 'bg-primary border-primary'
                        : 'border-primary/20 bg-white group-hover:border-primary/30'
                    }`}>
                      {filters.mustHaves.includes(item) && <i className="ri-check-line text-white text-[10px]"></i>}
                    </span>
                    <span className="text-sm font-roboto text-primary whitespace-nowrap">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Property features */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50">Property features</h4>
                <button
                  type="button"
                  onClick={() => setShowAllFeatures(!showAllFeatures)}
                  className="text-[12px] font-roboto font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer whitespace-nowrap ml-auto"
                >
                  {showAllFeatures ? 'Show less' : 'Show all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                {visibleFeatures.map((item) => (
                  <label key={item} className="flex items-center gap-1.5 cursor-pointer group">
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={filters.mustHaves.includes(item)}
                      onChange={() => toggleCheckbox('mustHaves', item)}
                    />
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      filters.mustHaves.includes(item)
                        ? 'bg-primary border-primary'
                        : 'border-primary/20 bg-white group-hover:border-primary/30'
                    }`}>
                      {filters.mustHaves.includes(item) && <i className="ri-check-line text-white text-[10px]"></i>}
                    </span>
                    <span className="text-sm font-roboto text-primary whitespace-nowrap">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Dropdown grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSale ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-4 mb-5`}>
              {!isSale && (
              <div className="relative">
                <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Furnishing</label>
                <select
                  value={desktopFurnishing}
                  onChange={(e) => setDesktopFurnishing(e.target.value)}
                  className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer"
                >
                  {furnishingOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none">
                  <i className="ri-arrow-down-wide-fill text-sm"></i>
                </span>
              </div>
              )}
              {!isSale && (
              <div className="relative">
                <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Availability</label>
                <select
                  value={desktopAvailability}
                  onChange={(e) => setDesktopAvailability(e.target.value)}
                  className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer"
                >
                  {availabilityOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none">
                  <i className="ri-arrow-down-wide-fill text-sm"></i>
                </span>
              </div>
              )}
              <div className="relative">
                <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Added to site</label>
                <select
                  value={desktopAdded}
                  onChange={(e) => setDesktopAdded(e.target.value)}
                  className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer"
                >
                  {addedOptionsDesktop.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none">
                  <i className="ri-arrow-down-wide-fill text-sm"></i>
                </span>
              </div>
            </div>

            {/* Show sold */}
            <div className="mb-5 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={desktopShowLetAgreed}
                  onChange={() => setDesktopShowLetAgreed(!desktopShowLetAgreed)}
                />
                <div className={`w-9 h-5 rounded-full transition-colors ${desktopShowLetAgreed ? 'bg-primary' : 'bg-primary/10'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${desktopShowLetAgreed ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}></div>
                </div>
              </label>
              <span className="text-sm font-roboto font-medium text-primary">{isSale ? 'SHOW SOLD' : 'SHOW LET or AGREED LET'}</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-primary/10">
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
                Apply &amp; Search
              </button>
              <span className="text-xs font-roboto text-primary/50 ml-auto">
                {hasActiveFilters ? `${[
                  filters.propertyTypes.length > 0,
                  filters.mustHaves.length > 0,
                  desktopFurnishing !== 'Any',
                  desktopAdded !== 'Anytime',
                  desktopShowLetAgreed,
                ].filter(Boolean).length} filter(s) applied` : 'No advanced filters applied'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TABLET (md - lg) Advanced Filters Panel ===== */}
      <div className="hidden md:block lg:hidden">
        <div className="mt-2 bg-white border border-primary/20 rounded-lg overflow-hidden max-w-[1400px] mx-auto">
          <div className="px-4 md:px-6 py-5 max-w-[1400px] mx-auto">
            {/* Property type */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50">Property type</h4>
                <button type="button" onClick={() => setShowAllTypes(!showAllTypes)} className="text-[12px] font-roboto font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer whitespace-nowrap ml-auto">
                  {showAllTypes ? 'Show less' : 'Show all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                {visiblePropertyTypes.map((type) => (
                  <label key={type} className="flex items-center gap-1.5 cursor-pointer group">
                    <input className="sr-only" type="checkbox" checked={filters.propertyTypes.includes(type)} onChange={() => toggleCheckbox('propertyTypes', type)} />
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${filters.propertyTypes.includes(type) ? 'bg-primary border-primary' : 'border-primary/20 bg-white group-hover:border-primary/30'}`}>
                      {filters.propertyTypes.includes(type) && <i className="ri-check-line text-white text-[10px]"></i>}
                    </span>
                    <span className="text-sm font-roboto text-primary whitespace-nowrap">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Must-haves */}
            <div className="mb-5">
              <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 mb-3">Must-haves</h4>
              <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                {activeMustHaves.map((item) => (
                  <label key={item} className="flex items-center gap-1.5 cursor-pointer group">
                    <input className="sr-only" type="checkbox" checked={filters.mustHaves.includes(item)} onChange={() => toggleCheckbox('mustHaves', item)} />
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${filters.mustHaves.includes(item) ? 'bg-primary border-primary' : 'border-primary/20 bg-white group-hover:border-primary/30'}`}>
                      {filters.mustHaves.includes(item) && <i className="ri-check-line text-white text-[10px]"></i>}
                    </span>
                    <span className="text-sm font-roboto text-primary whitespace-nowrap">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Property features */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50">Property features</h4>
                <button type="button" onClick={() => setShowAllFeatures(!showAllFeatures)} className="text-[12px] font-roboto font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer whitespace-nowrap ml-auto">
                  {showAllFeatures ? 'Show less' : 'Show all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                {(showAllFeatures ? propertyFeaturesList : propertyFeaturesList.slice(0, 8)).map((item) => (
                  <label key={item} className="flex items-center gap-1.5 cursor-pointer group">
                    <input className="sr-only" type="checkbox" checked={filters.mustHaves.includes(item)} onChange={() => toggleCheckbox('mustHaves', item)} />
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${filters.mustHaves.includes(item) ? 'bg-primary border-primary' : 'border-primary/20 bg-white group-hover:border-primary/30'}`}>
                      {filters.mustHaves.includes(item) && <i className="ri-check-line text-white text-[10px]"></i>}
                    </span>
                    <span className="text-sm font-roboto text-primary whitespace-nowrap">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Dropdown grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSale ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-4 mb-5`}>
              {!isSale && (
              <div className="relative">
                <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Furnishing</label>
                <select value={desktopFurnishing} onChange={(e) => setDesktopFurnishing(e.target.value)} className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {furnishingOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
              </div>
              )}
              {!isSale && (
              <div className="relative">
                <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Availability</label>
                <select value={desktopAvailability} onChange={(e) => setDesktopAvailability(e.target.value)} className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {availabilityOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
              </div>
              )}
              <div className="relative">
                <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Added to site</label>
                <select value={desktopAdded} onChange={(e) => setDesktopAdded(e.target.value)} className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {addedOptionsDesktop.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
              </div>
            </div>

            {/* Show sold */}
            <div className="mb-5 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input className="sr-only" type="checkbox" checked={desktopShowLetAgreed} onChange={() => setDesktopShowLetAgreed(!desktopShowLetAgreed)} />
                <div className={`w-9 h-5 rounded-full transition-colors ${desktopShowLetAgreed ? 'bg-primary' : 'bg-primary/10'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${desktopShowLetAgreed ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}></div>
                </div>
              </label>
              <span className="text-sm font-roboto font-medium text-primary">{isSale ? 'SHOW SOLD' : 'SHOW LET or AGREED LET'}</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-primary/10">
              <button type="button" onClick={handleClear} className="flex items-center gap-2 h-11 px-4 text-base font-roboto font-medium text-primary border border-primary/20 rounded-lg hover:border-primary/50 transition-colors cursor-pointer whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-close-circle-line text-sm"></i></span>
                Clear all
              </button>
              <button type="button" onClick={handleApply} className="flex items-center gap-2 h-11 px-6 bg-primary text-white border-2 border-primary text-base font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
                Apply &amp; Search
              </button>
              <span className="text-xs font-roboto text-primary/50 ml-auto">{hasActiveFilters ? `${[
                filters.propertyTypes.length > 0, filters.mustHaves.length > 0, desktopFurnishing !== 'Any',
                desktopAdded !== 'Anytime', desktopShowLetAgreed,
              ].filter(Boolean).length} filter(s) applied` : 'No advanced filters applied'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE Advanced Filters Bottom Sheet ===== */}
      <div className="md:hidden fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Filters">
        <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
        <div className="absolute inset-x-0 bottom-0 max-h-[90dvh] bg-white rounded-t-2xl flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10 shrink-0">
            <span className="text-base font-roboto font-semibold text-primary">Filters</span>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-primary rounded-md cursor-pointer hover:bg-primary/5 transition-colors" aria-label="Close filters">
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 py-4">
          {/* Radius */}
          <div className="mb-4">
            <label className="block text-[10px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Radius</label>
            <div className="relative">
              <select id="searchbar-mobile-radius" className="appearance-none h-11 px-4 pr-9 text-base font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer whitespace-nowrap transition-colors w-full">
                <option value="This area only">This area only</option>
                <option value="½ mile">½ mile</option>
                <option value="1 mile">1 mile</option>
                <option value="3 miles">3 miles</option>
                <option value="5 miles">5 miles</option>
                <option value="10 miles">10 miles</option>
                <option value="15 miles">15 miles</option>
                <option value="20 miles">20 miles</option>
                <option value="30 miles">30 miles</option>
                <option value="40 miles">40 miles</option>
              </select>
              <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/50 pointer-events-none"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
            </div>
          </div>

          <div className="w-full h-px bg-primary/5 mb-4"></div>

          {/* Bathrooms */}
          <div className="mb-4">
            <h4 className="text-[10px] font-roboto font-semibold uppercase tracking-widest text-primary/50 mb-2">Bathrooms</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Min baths</label>
                <select value={mobileMinBaths} onChange={(e) => setMobileMinBaths(e.target.value)} className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {bathsMinOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
              </div>
              <div className="relative">
                <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Max baths</label>
                <select value={mobileMaxBaths} onChange={(e) => setMobileMaxBaths(e.target.value)} className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {bathsMaxOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-primary/5 mb-4"></div>

          {/* Price */}
          <div className="mb-4">
            <h4 className="text-[10px] font-roboto font-semibold uppercase tracking-widest text-primary/50 mb-2">Price</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="relative">
                <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Min price</label>
                <select value={mobileMinPrice} onChange={(e) => setMobileMinPrice(e.target.value)} className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {priceMinOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
              </div>
              <div className="relative">
                <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Max price</label>
                <select value={mobileMaxPrice} onChange={(e) => setMobileMaxPrice(e.target.value)} className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {priceMaxOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
              </div>
            </div>
            {!isSale && (
            <div className="relative">
              <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Price per</label>
              <select value={mobilePricePer} onChange={(e) => setMobilePricePer(e.target.value)} className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                {pricePerOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
            </div>
            )}
          </div>

          <div className="w-full h-px bg-primary/5 mb-4"></div>

          {/* Property type */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-[10px] font-roboto font-semibold uppercase tracking-widest text-primary/50">Property type</h4>
              <button type="button" onClick={() => setMobileShowAllTypes(!mobileShowAllTypes)} className="text-[10px] font-roboto font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer whitespace-nowrap ml-auto">
                {mobileShowAllTypes ? 'Show less' : 'Show all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
              {mobileVisibleTypes.map((type) => (
                <label key={type} className="flex items-center gap-1.5 cursor-pointer group">
                  <input className="sr-only" type="checkbox" checked={filters.propertyTypes.includes(type)} onChange={() => toggleCheckbox('propertyTypes', type)} />
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${filters.propertyTypes.includes(type) ? 'bg-primary border-primary' : 'border-primary/20 bg-white group-hover:border-primary/30'}`}>
                    {filters.propertyTypes.includes(type) && <i className="ri-check-line text-white text-[10px]"></i>}
                  </span>
                  <span className="text-sm font-roboto text-primary whitespace-nowrap">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-primary/5 mb-4"></div>

          {/* Include, exclude & show only (rental-only - hidden for sales) */}
          {!isSale && (
          <div className="mb-4">
            <h4 className="text-[10px] font-roboto font-semibold uppercase tracking-widest text-primary/50 mb-2">Include, exclude &amp; show only</h4>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-roboto font-semibold uppercase tracking-widest text-primary/50">House share</span>
                <div className="flex gap-0.5 bg-primary/5 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setMobileHouseShare(mobileHouseShare === 'include' ? null : 'include')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-roboto font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${mobileHouseShare === 'include' ? 'bg-white text-primary shadow-sm' : 'text-primary/50 hover:text-stone-500'}`}
                  >
                    <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0"><i className="ri-add-circle-line text-xs"></i></span>Include
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileHouseShare(mobileHouseShare === 'exclude' ? null : 'exclude')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-roboto font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${mobileHouseShare === 'exclude' ? 'bg-white text-primary shadow-sm' : 'text-primary/50 hover:text-stone-500'}`}
                  >
                    <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0"><i className="ri-close-circle-line text-xs"></i></span>Exclude
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileHouseShare(mobileHouseShare === 'only' ? null : 'only')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-roboto font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${mobileHouseShare === 'only' ? 'bg-white text-primary shadow-sm' : 'text-primary/50 hover:text-stone-500'}`}
                  >
                    <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0"><i className="ri-checkbox-circle-line text-xs"></i></span>Show only
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-roboto font-semibold uppercase tracking-widest text-primary/50">Student accommodation</span>
                <div className="flex gap-0.5 bg-primary/5 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setMobileStudentAccom(mobileStudentAccom === 'include' ? null : 'include')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-roboto font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${mobileStudentAccom === 'include' ? 'bg-white text-primary shadow-sm' : 'text-primary/50 hover:text-stone-500'}`}
                  >
                    <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0"><i className="ri-add-circle-line text-xs"></i></span>Include
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileStudentAccom(mobileStudentAccom === 'exclude' ? null : 'exclude')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-roboto font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${mobileStudentAccom === 'exclude' ? 'bg-white text-primary shadow-sm' : 'text-primary/50 hover:text-stone-500'}`}
                  >
                    <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0"><i className="ri-close-circle-line text-xs"></i></span>Exclude
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileStudentAccom(mobileStudentAccom === 'only' ? null : 'only')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-roboto font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${mobileStudentAccom === 'only' ? 'bg-white text-primary shadow-sm' : 'text-primary/50 hover:text-stone-500'}`}
                  >
                    <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0"><i className="ri-checkbox-circle-line text-xs"></i></span>Show only
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

          <div className="w-full h-px bg-primary/5 mb-4"></div>

          {/* Must-haves */}
          <div className="mb-4">
            <h4 className="text-[10px] font-roboto font-semibold uppercase tracking-widest text-primary/50 mb-2">Must-haves</h4>
            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
              {activeMustHaves.map((item) => (
                <label key={item} className="flex items-center gap-1.5 cursor-pointer group">
                  <input className="sr-only" type="checkbox" checked={filters.mustHaves.includes(item)} onChange={() => toggleCheckbox('mustHaves', item)} />
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${filters.mustHaves.includes(item) ? 'bg-primary border-primary' : 'border-primary/20 bg-white group-hover:border-primary/30'}`}>
                    {filters.mustHaves.includes(item) && <i className="ri-check-line text-white text-[10px]"></i>}
                  </span>
                  <span className="text-sm font-roboto text-primary whitespace-nowrap">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-primary/5 mb-4"></div>

          {/* Furnishing, Availability, Added */}
          <div className="flex flex-col gap-3 mb-4">
            {!isSale && (
            <div className="relative">
              <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Furnishing</label>
              <select value={mobileFurnishing} onChange={(e) => setMobileFurnishing(e.target.value)} className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                {furnishingOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
            </div>
            )}
            {!isSale && (
            <div className="relative">
              <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Availability</label>
              <select value={mobileAvailability} onChange={(e) => setMobileAvailability(e.target.value)} className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                {availabilityOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
            </div>
            )}
            <div className="relative">
              <label className="block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5">Added to site</label>
              <select value={mobileAdded} onChange={(e) => setMobileAdded(e.target.value)} className="appearance-none w-full h-11 px-3 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                {addedOptionsDesktop.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 bottom-[11px] text-primary/50 pointer-events-none"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
            </div>
          </div>

          {/* Show sold (sale) / Show let or agreed let (rent) */}
          <div className="mb-5 flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                className="sr-only"
                type="checkbox"
                checked={isSale ? mobileShowSold : mobileShowLetAgreed}
                onChange={() => (isSale ? setMobileShowSold(!mobileShowSold) : setMobileShowLetAgreed(!mobileShowLetAgreed))}
              />
              <div className={`w-9 h-5 rounded-full transition-colors ${(isSale ? mobileShowSold : mobileShowLetAgreed) ? 'bg-primary' : 'bg-primary/10'}`}>
                <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${(isSale ? mobileShowSold : mobileShowLetAgreed) ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}></div>
              </div>
            </label>
            <span className="text-[13px] font-roboto font-medium text-primary">{isSale ? 'SHOW SOLD' : 'SHOW LET or AGREED LET'}</span>
          </div>

            </div>
          </div>
          {/* Sticky footer actions */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-primary/10 bg-white shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <button type="button" onClick={handleClear} className="flex items-center justify-center gap-2 h-11 px-4 text-base font-roboto font-medium text-primary border border-primary/20 rounded-lg hover:border-primary/50 transition-colors cursor-pointer whitespace-nowrap">
              Clear all
            </button>
            <button type="button" onClick={handleApply} className="flex items-center justify-center gap-2 h-11 px-6 bg-primary text-white text-base font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap ml-auto flex-1">
              Apply &amp; Search
            </button>
          </div>
        </div>
      </div>
    </>
  );
}