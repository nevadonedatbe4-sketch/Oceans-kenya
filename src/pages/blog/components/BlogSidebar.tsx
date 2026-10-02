import { Link } from 'react-router-dom';
import GuideToc, { type TocItem } from '@/pages/blog/components/GuideToc';
import { relatedAreaHref, type RelatedArea } from '@/pages/blog/components/RelatedNeighbourhoods';

interface BlogSidebarProps {
  tocItems: TocItem[];
  areas: RelatedArea[];
  /** The guide's primary area name (used for the properties CTA). */
  areaName?: string;
  className?: string;
}

/**
 * Desktop editorial sidebar. Visually secondary to the article, sticky on
 * scroll, and built from the same modules the article references - so it never
 * competes with the reading experience.
 */
export default function BlogSidebar({ tocItems, areas, areaName, className = '' }: BlogSidebarProps) {
  return (
    <aside className={`${className} w-full`}>
      <div className="flex flex-col gap-5">
        <GuideToc items={tocItems} variant="sidebar" />

        {areas.length > 0 && (
          <div className="bg-[#F7F9F9] rounded-lg border-2 border-primary/12 p-5">
            <p className="text-golden text-[11px] font-roboto font-semibold uppercase tracking-[0.3em] mb-3">
              Nearby areas
            </p>
            <div className="flex flex-wrap gap-2">
              {areas.slice(0, 6).map((area) => (
                <Link
                  key={area.slug}
                  to={relatedAreaHref(area.slug)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-primary/15 text-[13px] font-roboto font-medium text-primary hover:border-primary/40 transition-colors cursor-pointer"
                >
                  <i className="ri-map-pin-2-line text-[12px] text-golden"></i>
                  <span className="whitespace-nowrap">{area.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="bg-primary rounded-lg p-5 text-center">
          <span className="w-11 h-11 flex items-center justify-center rounded-full bg-white/15 text-white mx-auto mb-3">
            <i className="ri-chat-3-line text-xl"></i>
          </span>
          <h3 className="font-prata font-semibold text-white text-[18px] leading-snug mb-2">
            Talk to an agent
          </h3>
          <p className="font-roboto text-[13px] text-white/75 leading-relaxed mb-4">
            Local advice on schools, commute and pricing for this area.
          </p>
          <Link
            to="/contact"
            className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 bg-golden text-white text-[12px] font-jost font-semibold uppercase tracking-[0.08em] rounded-md hover:bg-[#8a6d1f] transition-colors cursor-pointer whitespace-nowrap"
          >
            Contact us
            <i className="ri-arrow-right-line"></i>
          </Link>
        </div>
      </div>
    </aside>
  );
}