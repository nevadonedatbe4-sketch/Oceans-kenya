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
    <div className="md:hidden px-4 py-2 bg-white border-b border-gray-100">
      <div className="flex items-center gap-2">
        <div ref={scrollRef} className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
          {pills.map((pill) => (
            <button
              key={pill.key}
              onClick={pill.onRemove}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary text-[11px] font-roboto font-medium rounded-full whitespace-nowrap cursor-pointer hover:bg-primary/20 transition-colors active:scale-95"
            >
              {pill.label}
              <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-primary/20">
                <i className="ri-close-line text-[10px]"></i>
              </span>
            </button>
          ))}
        </div>
        {pills.length > 0 && (
          <button
            onClick={onClearAll}
            className="flex-shrink-0 text-[10px] font-roboto font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer whitespace-nowrap px-1"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}