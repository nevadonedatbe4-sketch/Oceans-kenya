import { useState, useRef, useEffect } from 'react';
import PageLoader from '@/components/feature/PageLoader';

const COMMERCIAL_TYPES = [
  { key: 'any', label: 'Any sector', icon: 'ri-global-line' },
  { key: 'office', label: 'Offices', icon: 'ri-building-2-line' },
  { key: 'serviced_office', label: 'Serviced Office', icon: 'ri-building-line' },
  { key: 'retail', label: 'Retail / Shop', icon: 'ri-store-2-line' },
  { key: 'leisure', label: 'Leisure / Hospitality', icon: 'ri-hotel-line' },
  { key: 'guest_house', label: 'Guest House', icon: 'ri-hotel-bed-line' },
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
  placeholderCycle?: string[];
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
  placeholderCycle,
}: CommercialSearchPanelProps) {
  // ── Animated placeholder cycling (typewriter effect) ──────────────
  const animPhrases = placeholderCycle && placeholderCycle.length > 0
    ? placeholderCycle
    : [
        "Looking for prime office space...",
        "Looking for retail space to lease...",
        "Looking for warehouse & industrial units...",
      ];
  const [animText, setAnimText] = useState('');
  const [animPhase, setAnimPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing');
  const [animIdx, setAnimIdx] = useState(0);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldAnimate = searchQuery.trim() === '';

  // Typewriter animation effect
  useEffect(() => {
    if (!shouldAnimate) {
      setAnimText('');
      return;
    }
    const phrase = animPhrases[animIdx];
    const cleanup = () => {
      if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
    };
    if (animPhase === 'typing') {
      if (animText.length < phrase.length) {
        animTimerRef.current = setTimeout(() => setAnimText(phrase.slice(0, animText.length + 1)), 70 + Math.random() * 50);
      } else {
        animTimerRef.current = setTimeout(() => setAnimPhase('pausing'), 2500);
      }
    } else if (animPhase === 'pausing') {
      animTimerRef.current = setTimeout(() => setAnimPhase('deleting'), 500);
    } else if (animPhase === 'deleting') {
      if (animText.length > 0) {
        animTimerRef.current = setTimeout(() => setAnimText(animText.slice(0, -1)), 35 + Math.random() * 25);
      } else {
        animTimerRef.current = setTimeout(() => { setAnimIdx((prev) => (prev + 1) % animPhrases.length); setAnimPhase('typing'); }, 350);
      }
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animText, animPhase, animIdx, shouldAnimate]);

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
        <div className="inline-flex gap-1" role="group" aria-label="Rent or Buy toggle">
          <button
            type="button"
            onClick={() => onTogglePurpose(false)}
            className={`px-10 py-3 text-sm font-bold rounded-lg transition-all duration-300 cursor-pointer whitespace-nowrap tracking-[0.12em] ${!isBuy ? 'bg-accent text-white shadow-[0_4px_20px_rgba(13,89,89,0.35)]' : 'border border-white/30 text-gray-400 hover:text-white hover:border-white/60'}`}
            aria-pressed={!isBuy}
          >
            RENT
          </button>
          <button
            type="button"
            onClick={() => onTogglePurpose(true)}
            className={`px-10 py-3 text-sm font-bold rounded-lg transition-all duration-300 cursor-pointer whitespace-nowrap tracking-[0.12em] ${isBuy ? 'bg-accent text-white shadow-[0_4px_20px_rgba(13,89,89,0.35)]' : 'border border-white/30 text-gray-400 hover:text-white hover:border-white/60'}`}
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
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-roboto font-bold transition-all cursor-pointer whitespace-nowrap border ${selectedType === type.key ? 'border-accent bg-accent/20 text-accent' : 'border-[#1e2a4a] text-gray-300 hover:border-[#2a3a5a] hover:bg-[#1a2545]'}`}
            >
              <span className={`w-5 h-5 flex items-center justify-center ${selectedType === type.key ? 'text-accent' : 'text-gray-400'}`}>
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
              className="appearance-none h-12 px-5 pr-10 text-sm font-roboto font-bold text-gray-200 bg-[#1a2545] border border-[#2a3a5a] rounded-lg focus:outline-none focus:border-golden focus:ring-1 focus:ring-golden/20 cursor-pointer min-w-[200px]"
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
              className={`flex items-center gap-2 px-4 h-12 rounded-lg text-sm font-roboto font-bold transition-all cursor-pointer whitespace-nowrap border ${showSize ? 'border-golden bg-golden/15 text-golden' : 'border-[#2a3a5a] bg-[#1a2545] text-gray-300 hover:border-[#3a4a6a]'}`}
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
                  className="w-24 h-12 px-3 text-sm font-roboto font-bold text-gray-200 bg-[#1a2545] border border-[#2a3a5a] rounded-lg focus:outline-none focus:border-golden placeholder:text-gray-500"
                />
                <span className="text-sm text-gray-500 font-roboto font-bold">to</span>
                <input
                  type="number"
                  value={maxSize}
                  onChange={(e) => onMaxSizeChange(e.target.value)}
                  placeholder="Max"
                  min="0"
                  className="w-24 h-12 px-3 text-sm font-roboto font-bold text-gray-200 bg-[#1a2545] border border-[#2a3a5a] rounded-lg focus:outline-none focus:border-golden placeholder:text-gray-500"
                />
              </div>
            )}
          </div>

          {/* Save Search */}
          <button
            onClick={onToggleSave}
            className={`ml-auto flex items-center gap-2 px-4 h-12 rounded-lg text-sm font-roboto font-bold transition-all cursor-pointer whitespace-nowrap border ${savedSearch ? 'border-golden bg-golden/15 text-golden' : 'border-[#2a3a5a] bg-[#1a2545] text-gray-300 hover:border-[#3a4a6a]'}`}
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
            <div className="relative flex items-center gap-3 px-4 h-12 bg-[#1a2545] border border-[#2a3a5a] rounded-lg focus-within:border-golden focus-within:ring-1 focus-within:ring-golden/20 transition-colors">
              <span className="w-5 h-5 flex items-center justify-center shrink-0">
                <i className="ri-search-line text-gray-400 text-base"></i>
              </span>

              {/* Animated placeholder overlay */}
              {shouldAnimate && animText && (
                <div className="absolute inset-0 flex items-center px-4 pointer-events-none z-[1]">
                  <span className="w-5 h-5 flex items-center justify-center shrink-0" />
                  <span className="flex-1 min-w-0 text-base font-roboto font-bold text-gray-500 truncate ml-3">
                    {animText}
                    <span className="inline-block w-[2px] h-[1.1em] bg-gray-500/60 ml-0.5 align-middle animate-[cursor-blink_1s_step-end_infinite]" />
                  </span>
                </div>
              )}

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={shouldAnimate ? '' : "Looking for"}
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
              className="appearance-none h-12 px-5 pr-10 text-sm font-roboto font-bold text-gray-300 bg-[#1a2545] border border-[#2a3a5a] rounded-lg focus:outline-none focus:border-golden cursor-pointer min-w-[170px]"
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
            className="flex items-center justify-center gap-2.5 h-12 px-8 bg-accent text-white text-base font-roboto font-bold rounded-lg hover:bg-[#0a4646] transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 shadow-[0_4px_20px_rgba(13,89,89,0.30)]"
          >
            {loading ? (
              <>
                <PageLoader size={20} />
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