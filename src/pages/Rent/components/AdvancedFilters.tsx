import { useState } from 'react';

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
}

export interface FilterState {
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  maxBeds: string;
  minBaths: string;
  propertyTypes: string[];
  furnished: string[];
  lettingType: string[];
  minSize: string;
  maxSize: string;
  keywords: string;
  added: string;
  mustHaves: string[];
  keywordsExclude: string;
  pets: boolean;
  students: boolean;
  billsIncluded: boolean;
  parking: boolean;
  garden: boolean;
  balcony: boolean;
  wheelchair: boolean;
  chainFree: boolean;
  sharedAccommodation: boolean;
}

export const defaultFilters: FilterState = {
  minPrice: '',
  maxPrice: '',
  minBeds: '',
  maxBeds: '',
  minBaths: '',
  propertyTypes: [],
  furnished: [],
  lettingType: [],
  minSize: '',
  maxSize: '',
  keywords: '',
  added: '',
  mustHaves: [],
  keywordsExclude: '',
  pets: false,
  students: false,
  billsIncluded: false,
  parking: false,
  garden: false,
  balcony: false,
  wheelchair: false,
  chainFree: false,
  sharedAccommodation: false,
};

const priceOptions = ['', '50,000', '100,000', '150,000', '200,000', '300,000', '500,000', '1,000,000', '2,000,000', '5,000,000', '10,000,000'];
const sizeOptions = ['', '500', '1,000', '1,500', '2,000', '3,000', '5,000'];
const bedOptions = ['', '1', '2', '3', '4', '5', '6'];
const bathOptions = ['', '1', '2', '3', '4', '5'];
const propertyTypeList = ['Apartment', 'House', 'Townhouse', 'Penthouse', 'Villa', 'Studio', 'Bungalow', 'Maisonette', 'Land'];
const furnishedList = ['Furnished', 'Part furnished', 'Unfurnished'];
const lettingTypeList = ['Long term', 'Short term', 'Student'];
const addedOptions = ['Anytime', 'Last 24 hours', 'Last 3 days', 'Last 7 days', 'Last 14 days'];
const mustHavesList = ['Garden', 'Parking', 'Balcony', 'Swimming pool', 'Gym', 'Security', 'Pet friendly', 'Furnished'];

export default function AdvancedFilters({ isOpen, onClose, onApply, initialFilters }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({ ...initialFilters });
  const [expandedSection, setExpandedSection] = useState<string | null>('price');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleCheckbox = (key: keyof FilterState, value: string, list: string[]) => {
    const current = (filters[key] as string[]) || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setFilters({ ...filters, [key]: next });
  };

  const toggleBool = (key: keyof FilterState) => {
    setFilters({ ...filters, [key]: !filters[key as unknown as keyof FilterState] });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters({ ...defaultFilters });
  };

  const activeCount = [
    filters.minPrice || filters.maxPrice,
    filters.minBeds || filters.maxBeds,
    filters.minBaths,
    filters.propertyTypes.length,
    filters.furnished.length,
    filters.lettingType.length,
    filters.minSize || filters.maxSize,
    filters.keywords,
    filters.added,
    filters.mustHaves.length,
    filters.keywordsExclude,
    filters.pets,
    filters.students,
    filters.billsIncluded,
    filters.parking,
    filters.garden,
    filters.balcony,
    filters.wheelchair,
    filters.chainFree,
    filters.sharedAccommodation,
  ].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-lg h-full bg-white overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-prata text-primary">Filters</h2>
            {activeCount > 0 && (
              <p className="text-xs font-roboto text-gray-500 mt-0.5">{activeCount} filter{activeCount !== 1 ? 's' : ''} active</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleClear} className="text-xs font-roboto font-medium text-gray-500 hover:text-primary cursor-pointer whitespace-nowrap">
              Clear all
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-primary cursor-pointer">
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-1">
          {/* Price */}
          <div className="border-b border-gray-100">
            <button onClick={() => toggleSection('price')} className="w-full flex items-center justify-between py-3 cursor-pointer">
              <span className="text-sm font-roboto font-semibold text-gray-800">Price</span>
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${expandedSection === 'price' ? 'rotate-180' : ''}`}></i>
            </button>
            {expandedSection === 'price' && (
              <div className="pb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <select value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} className="w-full appearance-none h-10 px-3 pr-8 text-sm font-roboto text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                      {priceOptions.map((o) => <option key={o} value={o}>{o ? `KSh ${o}` : 'Min price'}</option>)}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                  </div>
                  <span className="text-sm font-roboto text-gray-400">to</span>
                  <div className="relative flex-1">
                    <select value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} className="w-full appearance-none h-10 px-3 pr-8 text-sm font-roboto text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                      {priceOptions.map((o) => <option key={o} value={o}>{o ? `KSh ${o}` : 'Max price'}</option>)}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bedrooms */}
          <div className="border-b border-gray-100">
            <button onClick={() => toggleSection('beds')} className="w-full flex items-center justify-between py-3 cursor-pointer">
              <span className="text-sm font-roboto font-semibold text-gray-800">Bedrooms</span>
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${expandedSection === 'beds' ? 'rotate-180' : ''}`}></i>
            </button>
            {expandedSection === 'beds' && (
              <div className="pb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <select value={filters.minBeds} onChange={(e) => setFilters({ ...filters, minBeds: e.target.value })} className="w-full appearance-none h-10 px-3 pr-8 text-sm font-roboto text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                      {bedOptions.map((o) => <option key={o} value={o}>{o ? `${o}+` : 'Min beds'}</option>)}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                  </div>
                  <span className="text-sm font-roboto text-gray-400">to</span>
                  <div className="relative flex-1">
                    <select value={filters.maxBeds} onChange={(e) => setFilters({ ...filters, maxBeds: e.target.value })} className="w-full appearance-none h-10 px-3 pr-8 text-sm font-roboto text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                      {bedOptions.map((o) => <option key={o} value={o}>{o ? `${o}` : 'Max beds'}</option>)}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bathrooms */}
          <div className="border-b border-gray-100">
            <button onClick={() => toggleSection('baths')} className="w-full flex items-center justify-between py-3 cursor-pointer">
              <span className="text-sm font-roboto font-semibold text-gray-800">Bathrooms</span>
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${expandedSection === 'baths' ? 'rotate-180' : ''}`}></i>
            </button>
            {expandedSection === 'baths' && (
              <div className="pb-4 space-y-3">
                <div className="relative">
                  <select value={filters.minBaths} onChange={(e) => setFilters({ ...filters, minBaths: e.target.value })} className="w-full appearance-none h-10 px-3 pr-8 text-sm font-roboto text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                    {bathOptions.map((o) => <option key={o} value={o}>{o ? `${o}+` : 'Any bathrooms'}</option>)}
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                </div>
              </div>
            )}
          </div>

          {/* Property type */}
          <div className="border-b border-gray-100">
            <button onClick={() => toggleSection('propertyType')} className="w-full flex items-center justify-between py-3 cursor-pointer">
              <span className="text-sm font-roboto font-semibold text-gray-800">Property type</span>
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${expandedSection === 'propertyType' ? 'rotate-180' : ''}`}></i>
            </button>
            {expandedSection === 'propertyType' && (
              <div className="pb-4 grid grid-cols-2 gap-2">
                {propertyTypeList.map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-4 h-4 flex items-center justify-center border rounded ${filters.propertyTypes.includes(type) ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                      {filters.propertyTypes.includes(type) && <i className="ri-check-line text-white text-xs"></i>}
                    </div>
                    <input type="checkbox" className="hidden" checked={filters.propertyTypes.includes(type)} onChange={() => toggleCheckbox('propertyTypes', type, propertyTypeList)} />
                    <span className="text-sm font-roboto text-gray-700">{type}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Furnished */}
          <div className="border-b border-gray-100">
            <button onClick={() => toggleSection('furnished')} className="w-full flex items-center justify-between py-3 cursor-pointer">
              <span className="text-sm font-roboto font-semibold text-gray-800">Furnished</span>
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${expandedSection === 'furnished' ? 'rotate-180' : ''}`}></i>
            </button>
            {expandedSection === 'furnished' && (
              <div className="pb-4 grid grid-cols-2 gap-2">
                {furnishedList.map((item) => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-4 h-4 flex items-center justify-center border rounded ${filters.furnished.includes(item) ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                      {filters.furnished.includes(item) && <i className="ri-check-line text-white text-xs"></i>}
                    </div>
                    <input type="checkbox" className="hidden" checked={filters.furnished.includes(item)} onChange={() => toggleCheckbox('furnished', item, furnishedList)} />
                    <span className="text-sm font-roboto text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Letting type */}
          <div className="border-b border-gray-100">
            <button onClick={() => toggleSection('lettingType')} className="w-full flex items-center justify-between py-3 cursor-pointer">
              <span className="text-sm font-roboto font-semibold text-gray-800">Letting type</span>
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${expandedSection === 'lettingType' ? 'rotate-180' : ''}`}></i>
            </button>
            {expandedSection === 'lettingType' && (
              <div className="pb-4 grid grid-cols-2 gap-2">
                {lettingTypeList.map((item) => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-4 h-4 flex items-center justify-center border rounded ${filters.lettingType.includes(item) ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                      {filters.lettingType.includes(item) && <i className="ri-check-line text-white text-xs"></i>}
                    </div>
                    <input type="checkbox" className="hidden" checked={filters.lettingType.includes(item)} onChange={() => toggleCheckbox('lettingType', item, lettingTypeList)} />
                    <span className="text-sm font-roboto text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Size */}
          <div className="border-b border-gray-100">
            <button onClick={() => toggleSection('size')} className="w-full flex items-center justify-between py-3 cursor-pointer">
              <span className="text-sm font-roboto font-semibold text-gray-800">Size (sq ft)</span>
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${expandedSection === 'size' ? 'rotate-180' : ''}`}></i>
            </button>
            {expandedSection === 'size' && (
              <div className="pb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <select value={filters.minSize} onChange={(e) => setFilters({ ...filters, minSize: e.target.value })} className="w-full appearance-none h-10 px-3 pr-8 text-sm font-roboto text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                      {sizeOptions.map((o) => <option key={o} value={o}>{o ? `${o} sq ft` : 'Min size'}</option>)}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                  </div>
                  <span className="text-sm font-roboto text-gray-400">to</span>
                  <div className="relative flex-1">
                    <select value={filters.maxSize} onChange={(e) => setFilters({ ...filters, maxSize: e.target.value })} className="w-full appearance-none h-10 px-3 pr-8 text-sm font-roboto text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                      {sizeOptions.map((o) => <option key={o} value={o}>{o ? `${o} sq ft` : 'Max size'}</option>)}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Added to site */}
          <div className="border-b border-gray-100">
            <button onClick={() => toggleSection('added')} className="w-full flex items-center justify-between py-3 cursor-pointer">
              <span className="text-sm font-roboto font-semibold text-gray-800">Added to site</span>
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${expandedSection === 'added' ? 'rotate-180' : ''}`}></i>
            </button>
            {expandedSection === 'added' && (
              <div className="pb-4 space-y-2">
                {addedOptions.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-4 h-4 flex items-center justify-center border rounded-full ${filters.added === opt ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                      {filters.added === opt && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    <input type="radio" name="added" className="hidden" checked={filters.added === opt} onChange={() => setFilters({ ...filters, added: opt })} />
                    <span className="text-sm font-roboto text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Must haves */}
          <div className="border-b border-gray-100">
            <button onClick={() => toggleSection('mustHaves')} className="w-full flex items-center justify-between py-3 cursor-pointer">
              <span className="text-sm font-roboto font-semibold text-gray-800">Must haves</span>
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${expandedSection === 'mustHaves' ? 'rotate-180' : ''}`}></i>
            </button>
            {expandedSection === 'mustHaves' && (
              <div className="pb-4 grid grid-cols-2 gap-2">
                {mustHavesList.map((item) => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-4 h-4 flex items-center justify-center border rounded ${filters.mustHaves.includes(item) ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                      {filters.mustHaves.includes(item) && <i className="ri-check-line text-white text-xs"></i>}
                    </div>
                    <input type="checkbox" className="hidden" checked={filters.mustHaves.includes(item)} onChange={() => toggleCheckbox('mustHaves', item, mustHavesList)} />
                    <span className="text-sm font-roboto text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Keywords */}
          <div className="border-b border-gray-100">
            <button onClick={() => toggleSection('keywords')} className="w-full flex items-center justify-between py-3 cursor-pointer">
              <span className="text-sm font-roboto font-semibold text-gray-800">Keywords</span>
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${expandedSection === 'keywords' ? 'rotate-180' : ''}`}></i>
            </button>
            {expandedSection === 'keywords' && (
              <div className="pb-4 space-y-3">
                <div>
                  <label className="block text-xs font-roboto text-gray-500 mb-1.5">Include keywords</label>
                  <input
                    value={filters.keywords}
                    onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
                    placeholder="e.g. garden, pool, balcony"
                    className="w-full h-10 px-3 text-sm font-roboto text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-roboto text-gray-500 mb-1.5">Exclude keywords</label>
                  <input
                    value={filters.keywordsExclude}
                    onChange={(e) => setFilters({ ...filters, keywordsExclude: e.target.value })}
                    placeholder="e.g. basement, shared"
                    className="w-full h-10 px-3 text-sm font-roboto text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* More options */}
          <div className="border-b border-gray-100">
            <button onClick={() => toggleSection('more')} className="w-full flex items-center justify-between py-3 cursor-pointer">
              <span className="text-sm font-roboto font-semibold text-gray-800">More options</span>
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${expandedSection === 'more' ? 'rotate-180' : ''}`}></i>
            </button>
            {expandedSection === 'more' && (
              <div className="pb-4 grid grid-cols-2 gap-2">
                {[
                  { key: 'pets', label: 'Pets allowed' },
                  { key: 'students', label: 'Students accepted' },
                  { key: 'billsIncluded', label: 'Bills included' },
                  { key: 'parking', label: 'Parking' },
                  { key: 'garden', label: 'Garden' },
                  { key: 'balcony', label: 'Balcony' },
                  { key: 'wheelchair', label: 'Wheelchair access' },
                  { key: 'chainFree', label: 'Chain free' },
                  { key: 'sharedAccommodation', label: 'Shared accommodation' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-4 h-4 flex items-center justify-center border rounded ${filters[item.key as keyof FilterState] ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                      {filters[item.key as keyof FilterState] && <i className="ri-check-line text-white text-xs"></i>}
                    </div>
                    <input type="checkbox" className="hidden" checked={!!filters[item.key as keyof FilterState]} onChange={() => toggleBool(item.key as keyof FilterState)} />
                    <span className="text-sm font-roboto text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white z-10 px-6 py-4 border-t border-gray-200 flex items-center gap-3">
          <button onClick={handleClear} className="flex-1 h-11 text-sm font-roboto font-semibold text-gray-600 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer whitespace-nowrap">
            Clear all
          </button>
          <button onClick={handleApply} className="flex-1 h-11 text-sm font-roboto font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
            Apply {activeCount > 0 ? `(${activeCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}