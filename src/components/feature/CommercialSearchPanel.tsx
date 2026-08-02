import { useState, useRef, useEffect } from 'react';

const COMMERCIAL_TYPES = [
  { key: 'any', label: 'Any sector', icon: 'ri-global-line' },
  { key: 'office', label: 'Offices', icon: 'ri-building-2-line' },
  { key: 'serviced_office', label: 'Serviced Office', icon: 'ri-building-line' },
  { key: 'retail', label: 'Retail / Shop', icon: 'ri-store-2-line' },
  { key: 'leisure', label: 'Leisure / Hospitality', icon: 'ri-hotel-line' },
  { key: 'warehouse', label: 'Warehouse', icon: 'ri-archive-line' },
  { key: 'industrial', label: 'Industrial', icon: 'ri-building-4-line' },
  { key: 'land', label: 'Land / Development', icon: 'ri-landscape-line' },
  { key: 'other', label: 'Other', icon: 'ri-apps-2-line' },
];

const RADIUS_OPTIONS = [
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

export interface CommercialSearchPanelProps {
  isBuy: boolean;
  onTogglePurpose: (buy: boolean) => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedRadius: string;
  onRadiusChange: (val: string) => void;
  minSize: string;
  onMinSizeChange: (val: string) => void;
  maxSize: string;
  onMaxSizeChange: (val: string) => void;
  onSearch: () => void;
  loading?: boolean;
  savedSearch: boolean;
  onToggleSave: () => void;
  sizeUnit: 'sqm' | 'sqft';
  priceOptions: string[];
  selectedPrice: string;
  onPriceChange: (val: string) => void;
}

export default function CommercialSearchPanel({
  isBuy,
  onTogglePurpose,
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedRadius,
  onRadiusChange,
  minSize,
  onMinSizeChange,
  maxSize,
  onMaxSizeChange,
  onSearch,
  loading = false,
  savedSearch,
  onToggleSave,
  sizeUnit,
  priceOptions,
  selectedPrice,
  onPriceChange,
}: CommercialSearchPanelProps) {
  const [showSize, setShowSize] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div ref={panelRef} className="w-full bg-[#0f1629] rounded-2xl border border-[#1e2a4a] overflow-hidden shadow-2xl">
      {/* Rent / Sale Toggle */}
      <div className="px-5 md:px-8 pt-5 pb-4 flex items-center justify-center border-b border-[#1e2a4a]">
        <div className="inline-flex bg-[#1a2545] rounded-full p-1.5" role="group" aria-label="Rent or Buy toggle">
          <button
            type="button"
            onClick={() => onTogglePurpose(false)}
            className={`px-8 py-3 text-sm font-roboto font-bold rounded-full transition-all cursor-pointer whitespace-nowrap tracking-wide ${!isBuy ? 'bg-[#D4A853] text-[#0f1629] shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
            aria-pressed={!isBuy}
          >
            RENT
          </button>
          <button
            type="button"
            onClick={() => onTogglePurpose(true)}
            className={`px-8 py-3 text-sm font-roboto font-bold rounded-full transition-all cursor-pointer whitespace-nowrap tracking-wide ${isBuy ? 'bg-[#D4A853] text-[#0f1629] shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
            aria-pressed={isBuy}
          >
            BUY
          </button>
        </div>
      </div>

      {/* Property Type Icons */}
      <div className="px-5 md:px-8 pt-4 pb-3 border-b border-[#1e2a4a]">
        <div className="flex flex-wrap items-center gap-2 md:gap-3" role="listbox" aria-label="Property types">
          {COMMERCIAL_TYPES.map((type) => (
            <button
              key={type.key}
              role="option"
              aria-selected={selectedType === type.key}
              onClick={() => onTypeChange(type.key)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-roboto font-bold transition-all cursor-pointer whitespace-nowrap border ${selectedType === type.key ? 'border-[#D4A853] bg-[#D4A853]/15 text-[#D4A853]' : 'border-[#1e2a4a] text-gray-300 hover:border-[#2a3a5a] hover:bg-[#1a2545]'}`}
            >
              <span className={`w-5 h-5 flex items-center justify-center ${selectedType === type.key ? 'text-[#D4A853]' : 'text-gray-400'}`}>
                <i className={`${type.icon} text-base`}></i>
              </span>
              <span className="hidden sm:inline">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Price + Size Row */}
      <div className="px-5 md:px-8 pt-4 pb-3 border-b border-[#1e2a4a]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Price Dropdown */}
          <div className="relative">
            <select
              value={selectedPrice}
              onChange={(e) => onPriceChange(e.target.value)}
              className="appearance-none h-12 px-5 pr-10 text-sm font-roboto font-bold text-gray-200 bg-[#1a2545] border border-[#2a3a5a] rounded-lg focus:outline-none focus:border-[#D4A853] focus:ring-1 focus:ring-[#D4A853]/20 cursor-pointer min-w-[200px]"
              aria-label="Price range"
            >
              {priceOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-gray-400 pointer-events-none">
              <i className="ri-arrow-down-s-line text-base"></i>
            </span>
          </div>

          {/* Size Toggle + Inputs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowSize(!showSize);
                if (!showSize) {
                  onMinSizeChange('');
                  onMaxSizeChange('');
                }
              }}
              className={`flex items-center gap-2 px-4 h-12 rounded-lg text-sm font-roboto font-bold transition-all cursor-pointer whitespace-nowrap border ${showSize ? 'border-[#D4A853] bg-[#D4A853]/15 text-[#D4A853]' : 'border-[#2a3a5a] bg-[#1a2545] text-gray-300 hover:border-[#3a4a6a]'}`}
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className={`${showSize ? 'ri-checkbox-fill' : 'ri-checkbox-blank-line'} text-sm`}></i>
              </span>
              Size ({sizeUnit === 'sqm' ? 'sq m' : 'sq ft'})
            </button>

            {showSize && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={minSize}
                  onChange={(e) => onMinSizeChange(e.target.value)}
                  placeholder="Min"
                  min="0"
                  className="w-24 h-12 px-3 text-sm font-roboto font-bold text-gray-200 bg-[#1a2545] border border-[#2a3a5a] rounded-lg focus:outline-none focus:border-[#D4A853] placeholder:text-gray-500"
                />
                <span className="text-sm text-gray-500 font-roboto font-bold">to</span>
                <input
                  type="number"
                  value={maxSize}
                  onChange={(e) => onMaxSizeChange(e.target.value)}
                  placeholder="Max"
                  min="0"
                  className="w-24 h-12 px-3 text-sm font-roboto font-bold text-gray-200 bg-[#1a2545] border border-[#2a3a5a] rounded-lg focus:outline-none focus:border-[#D4A853] placeholder:text-gray-500"
                />
              </div>
            )}
          </div>

          {/* Save Search */}
          <button
            onClick={onToggleSave}
            className={`ml-auto flex items-center gap-2 px-4 h-12 rounded-lg text-sm font-roboto font-bold transition-all cursor-pointer whitespace-nowrap border ${savedSearch ? 'border-[#D4A853] bg-[#D4A853]/15 text-[#D4A853]' : 'border-[#2a3a5a] bg-[#1a2545] text-gray-300 hover:border-[#3a4a6a]'}`}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className={`${savedSearch ? 'ri-heart-fill' : 'ri-heart-line'} text-sm`}></i>
            </span>
            {savedSearch ? 'Saved' : 'Save search'}
          </button>
        </div>
      </div>

      {/* Location + Radius + Search */}
      <div className="px-5 md:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          {/* Location Input */}
          <div className="relative flex-1 min-w-0">
            <div className="relative flex items-center gap-3 px-4 h-12 bg-[#1a2545] border border-[#2a3a5a] rounded-lg focus-within:border-[#D4A853] focus-within:ring-1 focus-within:ring-[#D4A853]/20 transition-colors">
              <span className="w-5 h-5 flex items-center justify-center shrink-0">
                <i className="ri-search-line text-gray-400 text-base"></i>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Nairobi, Westlands, or office space"
                maxLength={100}
                className="flex-1 min-w-0 text-base font-roboto font-bold text-gray-100 placeholder:text-gray-500 focus:outline-none bg-transparent"
                aria-label="Search by location"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-300 cursor-pointer shrink-0"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              )}
            </div>
          </div>

          {/* Radius Dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedRadius}
              onChange={(e) => onRadiusChange(e.target.value)}
              className="appearance-none h-12 px-5 pr-10 text-sm font-roboto font-bold text-gray-300 bg-[#1a2545] border border-[#2a3a5a] rounded-lg focus:outline-none focus:border-[#D4A853] cursor-pointer min-w-[170px]"
              aria-label="Area selection"
            >
              {RADIUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-gray-400 pointer-events-none">
              <i className="ri-arrow-down-s-line text-base"></i>
            </span>
          </div>

          {/* Search Button */}
          <button
            onClick={onSearch}
            disabled={loading}
            className="flex items-center justify-center gap-2.5 h-12 px-8 bg-[#D4A853] text-[#0f1629] text-base font-roboto font-bold rounded-lg hover:bg-[#c99a48] transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 shadow-lg shadow-[#D4A853]/20"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-loader-4-line text-base animate-spin"></i>
                </span>
                Searching...
              </>
            ) : (
              <>
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-search-line text-base"></i>
                </span>
                Search
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}