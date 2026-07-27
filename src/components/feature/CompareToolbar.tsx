import { Link } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import type { CompareProperty } from '@/hooks/useCompareToolbar';

interface CompareToolbarProps {
  selected: CompareProperty[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onCompare: () => void;
}

export default function CompareToolbar({ selected, onRemove, onClearAll, onCompare }: CompareToolbarProps) {
  const { format } = useCurrency();

  if (selected.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-all duration-300">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-10 py-3">
        <div className="flex items-center gap-4">
          {/* Counter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-roboto font-semibold text-primary uppercase tracking-wider">
              Compare ({selected.length}/3)
            </span>
          </div>

          {/* Selected property pills */}
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto no-scrollbar">
            {selected.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg pl-2 pr-1.5 py-1.5 shrink-0"
              >
                <div className="w-8 h-8 rounded overflow-hidden shrink-0 bg-gray-200">
                  <img
                    src={p.image}
                    alt={p.title}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0 max-w-[140px]">
                  <p className="text-xs font-roboto font-semibold text-[#002349] truncate">
                    {format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                  </p>
                  <p className="text-[10px] font-roboto text-gray-400 truncate">{p.title}</p>
                </div>
                <button
                  onClick={() => onRemove(p.id)}
                  className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer shrink-0 transition-colors"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: 3 - selected.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center w-[120px] h-[44px] border border-dashed border-gray-300 rounded-lg shrink-0"
              >
                <span className="text-[10px] font-roboto text-gray-400">Add property</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClearAll}
              className="text-xs font-roboto text-gray-500 hover:text-red-500 underline underline-offset-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              Clear all
            </button>
            <button
              onClick={onCompare}
              disabled={selected.length < 2}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white text-xs font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-scales-line text-sm"></i>
              </span>
              Compare Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}