import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNewDevelopments, type Development } from '@/hooks/useNewDevelopments';
import DevelopmentCard from '@/pages/NewDevelopments/components/DevelopmentCard';
import DevelopmentModal from '@/pages/NewDevelopments/components/DevelopmentModal';
import { areaNameBelongsTo } from '@/lib/locationRegistry';

interface FeaturedDevelopmentsBlockProps {
  /** Areas to filter by (already resolved - falls back to the guide's areas). */
  areas: string[];
  limit: number;
  heading: string;
  subheading: string;
  className?: string;
}

/**
 * "Featured developments" - a live block of new/off-plan projects, drawn from
 * the SAME `listings` grouping the New Developments page uses. Editor-configurable
 * per article, so an investment guide can surface the projects that matter.
 */
export default function FeaturedDevelopmentsBlock({
  areas,
  limit,
  heading,
  subheading,
  className = '',
}: FeaturedDevelopmentsBlockProps) {
  const { developments, loading, error, refetch } = useNewDevelopments();
  const [selected, setSelected] = useState<Development | null>(null);

  const items = useMemo(() => {
    let list = developments;
    if (areas.length > 0) {
      list = list.filter((d) =>
        areas.some((a) => areaNameBelongsTo(d.location, a) || areaNameBelongsTo(d.city, a)),
      );
    }
    const sorted = [...list].sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return sorted.slice(0, limit);
  }, [developments, areas, limit]);

  if (loading) {
    return (
      <section className={className}>
        <div className="h-7 w-64 bg-[#F5F5F5] rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: Math.min(limit, 3) }).map((_, i) => (
            <div key={i} className="bg-[#F5F5F5] h-80 rounded-lg animate-pulse" />
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

  // Nothing to show for this guide - stay quiet rather than render an empty shell.
  if (items.length === 0) return null;

  return (
    <section className={className}>
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <i className="ri-building-2-line text-lg"></i>
          </span>
          <div>
            <h2 className="font-prata font-semibold text-primary text-[22px] md:text-[27px] leading-tight">
              {heading}
            </h2>
            <p className="font-roboto text-[14px] text-[#636363]">{subheading}</p>
          </div>
        </div>
        <Link
          to="/new-developments"
          className="hidden sm:inline-flex items-center gap-1.5 font-jost text-[12px] font-semibold uppercase tracking-[0.08em] text-primary hover:text-[#0D5959] transition-colors cursor-pointer whitespace-nowrap"
        >
          View all developments
          <i className="ri-arrow-right-line"></i>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {items.map((dev) => (
          <DevelopmentCard key={dev.key} development={dev} onOpen={setSelected} />
        ))}
      </div>

      <DevelopmentModal development={selected} onClose={() => setSelected(null)} />
    </section>
  );
}