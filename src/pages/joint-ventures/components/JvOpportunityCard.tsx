import { Link } from 'react-router-dom';
import { smartTitleCase } from '@/lib/location';

interface JvOpportunityCardProps {
  title: string;
  link: string;
  location: string;
  landSize: string;
  dealType: string;
  projectType: string;
  capitalText: string;
  stage: string;
  summary: string;
  image?: string;
}

/**
 * A single live Joint Venture opportunity card (sourced from `jv_opportunities`).
 *
 * Unlike a land or residential card, a JV card leads with the DEAL facts the
 * desk captured in the CRM - land size, deal type, project type, capital
 * requirement and the project stage - never beds/baths. Only values that exist
 * in the record are rendered, so a half-filled opportunity never shows blanks.
 */
export default function JvOpportunityCard({
  title,
  link,
  location,
  landSize,
  dealType,
  projectType,
  capitalText,
  stage,
  summary,
  image,
}: JvOpportunityCardProps) {
  const hasImage = Boolean(image && image.trim());
  const facts = [
    landSize && { key: 'size', icon: 'ri-landscape-line', label: landSize },
    dealType && { key: 'deal', icon: 'ri-group-line', label: `${dealType} JV` },
    projectType && { key: 'project', icon: 'ri-building-4-line', label: projectType },
  ].filter(Boolean) as { key: string; icon: string; label: string }[];

  return (
    <Link
      to={link}
      className="group bg-white border-2 border-primary/12 rounded-sm overflow-hidden hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Media strip */}
      <div className="relative h-40 overflow-hidden bg-primary/5">
        {hasImage ? (
          <img
            src={image}
            alt={smartTitleCase(title)}
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-12 h-12 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              <i className="ri-group-line text-2xl"></i>
            </span>
          </div>
        )}
        <span className="absolute top-3 left-3 bg-accent text-white text-[10px] font-roboto font-bold px-2.5 py-1 uppercase tracking-wider z-10">
          JV Opportunity
        </span>
      </div>

      {/* Body */}
      <div className="p-5 md:p-6 flex flex-col flex-1">
        <h3 className="font-roboto font-medium text-[#2D303D] text-[18px] leading-snug mb-2">
          {smartTitleCase(title)}
        </h3>
        {location && (
          <p className="text-[#2D303D] font-roboto text-xs flex items-center gap-1.5 mb-3">
            <i className="ri-map-pin-2-line text-[#6b7280]"></i>
            {location}
          </p>
        )}

        {facts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {facts.map((f) => (
              <span
                key={f.key}
                className="text-xs font-roboto text-[#2D303D] bg-white border border-primary/15 px-2.5 py-1 rounded-sm inline-flex items-center gap-1"
              >
                <i className={`${f.icon} text-[#6b7280]`}></i>
                {f.label}
              </span>
            ))}
          </div>
        )}

        {capitalText && (
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-4 flex items-center justify-center text-golden shrink-0">
              <i className="ri-funds-line text-sm"></i>
            </span>
            <span className="text-sm font-roboto font-bold text-primary">Capital required: {capitalText}</span>
          </div>
        )}

        {summary && (
          <p className="text-[#2D303D] font-roboto text-xs leading-relaxed flex-1 mb-4 line-clamp-3">{summary}</p>
        )}

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-primary/12 mt-auto">
          <span className="text-[13px] font-roboto font-bold text-accent uppercase tracking-wider leading-tight">
            {stage || 'Live opportunity'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#002349] text-white border-2 border-[#002349] font-roboto text-[11px] tracking-wider uppercase font-bold whitespace-nowrap group-hover:bg-[#003A6C] group-hover:text-white transition-colors">
            View Deal <i className="ri-arrow-right-line"></i>
          </span>
        </div>
      </div>
    </Link>
  );
}