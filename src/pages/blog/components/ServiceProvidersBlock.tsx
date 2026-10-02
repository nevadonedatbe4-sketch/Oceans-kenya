import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAmenities } from '@/hooks/useAmenities';
import AmenityCard from '@/components/feature/AmenityCard';
import AmenityDetailModal from '@/components/feature/AmenityDetailModal';
import { categoryColor, type Amenity } from '@/lib/amenities';
import { areaNameBelongsTo } from '@/lib/locationRegistry';
import { DEFAULT_SERVICE_CATEGORIES } from '@/lib/ecosystemBlocks';

interface ServiceProvidersBlockProps {
  /** Amenity category slugs to draw from (empty = a sensible service set). */
  categories: string[];
  /** Optional finer filter - amenity subcategory keys. */
  subcategories: string[];
  /** Optional area filter (empty = every area). */
  areas: string[];
  limit: number;
  heading: string;
  subheading: string;
  className?: string;
}

/**
 * "Service providers" - a live block of vetted, published directory records
 * for the things a new resident or investor actually needs: relocation and
 * moving, legal and immigration, schools, healthcare, banking, insurance,
 * property maintenance and recruitment.
 *
 * It reads the SAME `amenities` directory the rest of the site uses (published
 * only, via useAmenities), so editing a record in the CMS updates every guide.
 */
export default function ServiceProvidersBlock({
  categories,
  subcategories,
  areas,
  limit,
  heading,
  subheading,
  className = '',
}: ServiceProvidersBlockProps) {
  const { amenities, loading, error, refetch } = useAmenities();
  const [selected, setSelected] = useState<Amenity | null>(null);

  const effectiveCategories = categories.length > 0 ? categories : DEFAULT_SERVICE_CATEGORIES;

  const items = useMemo(() => {
    const matched = amenities.filter((a) => {
      if (!a.category || !effectiveCategories.includes(a.category)) return false;
      if (subcategories.length > 0 && !(a.subcategory && subcategories.includes(a.subcategory))) {
        return false;
      }
      if (areas.length > 0 && !areas.some((ar) => areaNameBelongsTo(a.neighbourhood_name, ar))) {
        return false;
      }
      return true;
    });
    const sorted = matched.sort((a, b) => {
      const af = a.is_featured || a.is_guide_curated ? 1 : 0;
      const bf = b.is_featured || b.is_guide_curated ? 1 : 0;
      if (af !== bf) return bf - af;
      return a.name.localeCompare(b.name);
    });
    return sorted.slice(0, limit);
  }, [amenities, effectiveCategories, subcategories, areas, limit]);

  const relatedFor = (a: Amenity): Amenity[] =>
    amenities.filter((x) => x.id !== a.id && x.category === a.category).slice(0, 6);

  if (loading) {
    return (
      <section className={className}>
        <div className="h-7 w-64 bg-[#F5F5F5] rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-[#F5F5F5] h-36 rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={className}>
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
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className={className}>
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-accent-100 text-accent-700 shrink-0">
            <i className="ri-customer-service-2-line text-lg"></i>
          </span>
          <div>
            <h2 className="font-prata font-semibold text-primary text-[22px] md:text-[27px] leading-tight">
              {heading}
            </h2>
            <p className="font-roboto text-[14px] text-[#636363]">{subheading}</p>
          </div>
        </div>
        <Link
          to="/directory"
          className="hidden sm:inline-flex items-center gap-1.5 font-jost text-[12px] font-semibold uppercase tracking-[0.08em] text-primary hover:text-[#0D5959] transition-colors cursor-pointer whitespace-nowrap"
        >
          Browse the directory
          <i className="ri-arrow-right-line"></i>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {items.map((a) => (
          <AmenityCard
            key={a.id}
            amenity={a}
            categoryColor={categoryColor(a.category)}
            distanceText={null}
            onViewDetails={() => setSelected(a)}
          />
        ))}
      </div>

      {selected && (
        <AmenityDetailModal
          amenity={selected}
          categoryColor={categoryColor(selected.category)}
          distanceText={null}
          related={relatedFor(selected)}
          onSelectRelated={(a) => setSelected(a)}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}