import { Link } from 'react-router-dom';
import SeoListingCard from '@/components/feature/SeoListingCard';
import { useLoadMoreListings } from '@/hooks/useLoadMoreListings';
import type { ListingFilters } from '@/hooks/useListings';
import { areaSearchHref } from '@/lib/areaSearch';

interface ContextualPropertiesProps {
  /** The areas this guide is actually about - properties are drawn only from these. */
  areas: string[];
  heading: string;
  subheading: string;
  /** Where the "View all" CTA should point (defaults to the first area search). */
  viewAllHref?: string;
  className?: string;
}

/**
 * Contextual property recommendations.
 *
 * Properties are only ever shown from the areas THIS article is about - never a
 * generic "everything" query. The caller supplies the areas and an editorial
 * heading ("Where to Stay Near Nairobi's Food Scene"), so a dining guide shows
 * homes near the food, not arbitrary listings.
 */
export default function ContextualProperties({
  areas,
  heading,
  subheading,
  viewAllHref,
  className = '',
}: ContextualPropertiesProps) {
  const search = areas.join(' or ');
  const filters: ListingFilters = {
    purpose: 'sale',
    search,
    propertyType: 'Any type',
    addedSince: 'Anytime',
    sortBy: 'A - Z',
    statusFilter: 'active',
  };
  const { items, loading, loadingMore, error, hasMore, loadMore, refetch } = useLoadMoreListings(filters);

  if (areas.length === 0) return null;

  const allHref = viewAllHref || areaSearchHref(areas[0]);

  return (
    <section className={className}>
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <i className="ri-home-4-line text-lg"></i>
          </span>
          <div>
            <h2 className="font-prata font-semibold text-primary text-[22px] md:text-[27px] leading-tight">
              {heading}
            </h2>
            <p className="font-roboto text-[14px] text-[#636363]">{subheading}</p>
          </div>
        </div>
        <Link
          to={allHref}
          className="hidden sm:inline-flex items-center gap-1.5 font-jost text-[12px] font-semibold uppercase tracking-[0.08em] text-primary hover:text-[#0D5959] transition-colors cursor-pointer whitespace-nowrap"
        >
          View all
          <i className="ri-arrow-right-line"></i>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-[#F5F5F5] aspect-[4/3] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-background-100 border-2 border-primary/12 rounded-lg">
          <p className="font-roboto text-[#636363] mb-4">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-jost font-semibold uppercase tracking-[0.08em] rounded-md hover:bg-[#002349] transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-refresh-line"></i> Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-background-100 border-2 border-primary/12 rounded-lg px-4">
          <div className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-full mx-auto mb-3">
            <i className="ri-home-4-line text-primary text-xl"></i>
          </div>
          <p className="font-prata font-semibold text-primary text-[20px] mb-1">
            No homes listed in these areas right now
          </p>
          <p className="font-roboto text-[14px] text-[#636363] max-w-md mx-auto mb-5">
            New listings arrive regularly. Browse the full search or speak to an agent and we will
            alert you when something matching comes up.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={allHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-jost font-semibold uppercase tracking-[0.08em] rounded-md hover:bg-[#002349] transition-colors cursor-pointer whitespace-nowrap"
            >
              Browse properties
              <i className="ri-arrow-right-line text-xs"></i>
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-primary/20 text-primary text-[13px] font-jost font-semibold uppercase tracking-[0.08em] rounded-md hover:border-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              Talk to an agent
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {items.map((p) => (
              <SeoListingCard key={p.id} property={p} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-7 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-[13px] font-jost font-semibold uppercase tracking-[0.08em] rounded-md hover:bg-[#002349] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-wait"
              >
                <i className={loadingMore ? 'ri-loader-4-line animate-spin' : 'ri-add-line'}></i>
                {loadingMore ? 'Loading…' : 'Load more properties'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}