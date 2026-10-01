import { useRef, useEffect } from 'react';

interface FilterPill {
  key: string;
  label: string;
  onRemove: () => void;
}

interface MobileFilterPillsProps {
  pills: FilterPill[];
  onClearAll: () => void;
}

export default function MobileFilterPills({ pills, onClearAll }: MobileFilterPillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [pills]);

  if (pills.length === 0) return null;

  return (
    <div className="md:hidden relative z-50 px-4 py-2 bg-white border-b border-gray-100">
      <div className="flex items-center gap-2">
        <div ref={scrollRef} className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
          {pills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={pill.onRemove}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary text-[11px] font-roboto font-medium rounded-full whitespace-nowrap cursor-pointer hover:bg-primary/20 transition-colors active:scale-95 touch-manipulation"
            >
              {pill.label}
              <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-primary/20">
                <i className="ri-close-line text-[10px]"></i>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="relative z-10 flex-shrink-0 inline-flex items-center justify-center gap-1 h-8 px-3 rounded-full bg-primary/10 text-[11px] font-roboto font-medium text-primary hover:bg-primary/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap touch-manipulation"
        >
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            <i className="ri-restart-line text-xs"></i>
          </span>
          Clear all
        </button>
      </div>
    </div>
  );
}