import { useCallback, useEffect, useRef, useState } from 'react';

export interface HoodFilterOption {
  key: string;
  label: string;
}

interface HoodFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: HoodFilterOption[];
  activeFilter: string;
  onFilterChange: (key: string) => void;
  resultCount: number;
  totalCount: number;
  // Backend-editable labels (fall back to the published defaults).
  searchPlaceholder?: string;
  areasWord?: string;
  heading?: string;
  resetLabel?: string;
}

export default function HoodFilterBar({
  searchQuery,
  onSearchChange,
  filters,
  activeFilter,
  onFilterChange,
  resultCount,
  totalCount,
  searchPlaceholder = 'Looking for a neighbourhood…',
  areasWord = 'Areas',
  heading = 'Browse by vibe',
  resetLabel = 'Reset',
}: HoodFilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
  }, [updateArrows]);

  const scrollByAmount = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 240, behavior: 'smooth' });
  };

  const handleScroll = () => updateArrows();

  return (
    <div className="border-2 border-[#1a1a1a]/10 rounded-lg overflow-hidden">
      {/* Search row */}
      <form
        className="flex flex-col sm:flex-row items-stretch gap-3 p-4 md:p-5 bg-[#F7F9F9] border-b border-[#1a1a1a]/10"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-[#636363] text-base pointer-events-none"></i>
          <input
            ref={inputRef}
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-11 py-3 rounded-md border border-[#1a1a1a]/15 bg-white text-[15px] font-roboto text-[#1a1a1a] placeholder:text-[#636363] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[#636363] hover:text-[#1a1a1a] transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-base"></i>
            </button>
          )}
        </div>
        <div className="shrink-0 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-md">
          <span className="font-prata font-bold text-[20px] leading-none">{resultCount}</span>
          <span className="font-jost text-[13px] uppercase tracking-[0.08em]">
            {areasWord}
          </span>
        </div>
      </form>

      {/* Category pills - horizontally swipeable on mobile/tablet, wraps on desktop */}
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.12em] font-semibold">
            {heading}
          </p>
          {(activeFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                onFilterChange('all');
                onSearchChange('');
              }}
              className="inline-flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-golden hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line"></i>
              {resetLabel}
            </button>
          )}
        </div>

        <div className="relative flex items-center">
          {/* Left arrow - mobile/tablet only */}
          <button
            type="button"
            aria-label="Scroll filters left"
            onClick={() => scrollByAmount(-1)}
            disabled={!canScrollLeft}
            className={`lg:hidden shrink-0 z-10 -ml-1 mr-2 w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer whitespace-nowrap ${
              canScrollLeft
                ? 'border-[#1a1a1a]/20 text-[#1a1a1a] bg-white hover:border-primary hover:text-primary'
                : 'border-[#1a1a1a]/10 text-[#1a1a1a]/25 bg-white/70 cursor-default'
            }`}
          >
            <i className="ri-arrow-left-s-line text-lg leading-none"></i>
          </button>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex flex-1 flex-nowrap gap-2 overflow-x-auto pb-1 no-scrollbar items-center lg:flex-wrap lg:overflow-visible lg:pb-0"
          >
            {filters.map((f) => {
              const active = activeFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => onFilterChange(f.key)}
                  className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-jost font-semibold uppercase tracking-[0.07em] transition-all cursor-pointer whitespace-nowrap border ${
                    active
                      ? 'bg-primary text-white border-primary shadow-none'
                      : 'border-[#1a1a1a]/15 text-[#1a1a1a] hover:border-primary hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Right arrow - mobile/tablet only */}
          <button
            type="button"
            aria-label="Scroll filters right"
            onClick={() => scrollByAmount(1)}
            disabled={!canScrollRight}
            className={`lg:hidden shrink-0 z-10 -mr-1 ml-2 w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer whitespace-nowrap ${
              canScrollRight
                ? 'border-[#1a1a1a]/20 text-[#1a1a1a] bg-white hover:border-primary hover:text-primary'
                : 'border-[#1a1a1a]/10 text-[#1a1a1a]/25 bg-white/70 cursor-default'
            }`}
          >
            <i className="ri-arrow-right-s-line text-lg leading-none"></i>
          </button>
        </div>

      </div>
    </div>
  );
}