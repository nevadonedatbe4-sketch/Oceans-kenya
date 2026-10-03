import { Link } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import { useRecentlyViewedDevelopments } from '@/hooks/useRecentlyViewedDevelopments';
import EntityImage from '@/components/feature/EntityImage';

type CurrencyCode = 'KES' | 'USD' | 'GBP' | 'EUR' | 'UGX' | 'AED' | 'ZAR';

interface RecentlyViewedDevelopmentsProps {
  /** Hide the development currently being viewed. */
  excludeSlug?: string;
  className?: string;
}

/**
 * RecentlyViewedDevelopments - a compact rail of the projects a visitor has
 * just opened, linking straight back to their project pages. Renders nothing
 * when there is no history, so it never leaves an empty shell on the page.
 */
export default function RecentlyViewedDevelopments({ excludeSlug, className = '' }: RecentlyViewedDevelopmentsProps) {
  const { items, clear } = useRecentlyViewedDevelopments(excludeSlug);
  const { format } = useCurrency();

  if (items.length === 0) return null;

  return (
    <section className={`px-4 md:px-6 max-w-7xl mx-auto mt-10 md:mt-12 ${className}`}>
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#c9a84c] mb-1">Pick up where you left off</p>
          <h2 className="text-xl md:text-2xl font-bold text-primary">Recently viewed developments</h2>
        </div>
        <button
          type="button"
          onClick={clear}
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-roboto font-medium text-[#6b7280] hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-delete-bin-line text-base"></i>
          Clear
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:thin]">
        {items.map((item) => (
          <Link
            key={item.slug}
            to={`/property/${item.slug}`}
            className="group shrink-0 w-[220px] rounded-lg border border-[#e5e5e5] bg-white overflow-hidden hover:border-primary/30 transition-colors"
          >
            <div className="relative w-full h-[130px] bg-stone-100 overflow-hidden">
              <EntityImage
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-3">
              <h3 className="text-sm font-roboto font-semibold text-primary line-clamp-2 leading-snug mb-1">
                {item.name}
              </h3>
              {item.location && (
                <p className="text-xs font-roboto text-[#6b7280] flex items-center gap-1 line-clamp-1 mb-2">
                  <i className="ri-map-pin-2-line text-xs"></i>
                  {item.location}
                </p>
              )}
              <p className="text-sm font-roboto font-bold text-primary">
                {item.priceRaw > 0 ? format(item.priceRaw, (item.currency as CurrencyCode) || 'KES') : 'Price on request'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}