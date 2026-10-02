import { Link } from 'react-router-dom';
import EntityImage from '@/components/feature/EntityImage';
import { AREA_GUIDE_PAGES } from '@/lib/areaGuides';

export interface RelatedArea {
  slug: string;
  name: string;
  heroImage: string | null;
  summary: string | null;
  tags: string[];
  city: string;
  targetMarket: string | null;
  averageSalePrice: number | null;
  rentalRange: string | null;
}

/**
 * Resolve a neighbourhood slug to a real destination. Prefer the SEO area-guide
 * cluster page when it exists, otherwise the neighbourhood detail page - so a
 * card never links to an empty route.
 */
export function relatedAreaHref(slug: string): string {
  return AREA_GUIDE_PAGES[`area-guides/${slug}`] ? `/area-guides/${slug}` : `/neighbourhood/${slug}`;
}

interface RelatedNeighbourhoodsProps {
  areas: RelatedArea[];
  className?: string;
}

export default function RelatedNeighbourhoods({ areas, className = '' }: RelatedNeighbourhoodsProps) {
  if (areas.length === 0) return null;

  return (
    <section className={className}>
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-accent-100 text-accent-700 shrink-0">
          <i className="ri-road-map-line text-lg"></i>
        </span>
        <div>
          <h2 className="font-prata font-semibold text-primary text-[22px] md:text-[27px] leading-tight">
            Explore nearby neighbourhoods
          </h2>
          <p className="font-roboto text-[14px] text-[#636363]">
            Compare the areas around this one before you decide.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {areas.map((area) => (
          <Link
            key={area.slug}
            to={relatedAreaHref(area.slug)}
            className="group block bg-white overflow-hidden rounded-lg border-2 border-primary/12 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-[#F5F5F5]">
              <EntityImage
                src={area.heroImage}
                alt={area.name}
                icon="ri-map-pin-2-line"
                className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
            <div className="p-4">
              <h3 className="font-prata font-semibold text-primary text-[19px] leading-snug mb-1.5 group-hover:text-[#0D5959] transition-colors">
                {area.name}
              </h3>
              {area.summary && (
                <p className="font-roboto text-[14px] text-[#333333] leading-[1.6] line-clamp-2 mb-3">
                  {area.summary}
                </p>
              )}
              <span className="inline-flex items-center gap-1.5 font-jost text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0D5959] whitespace-nowrap">
                Explore guide
                <i className="ri-arrow-right-line group-hover:translate-x-0.5 transition-transform"></i>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}