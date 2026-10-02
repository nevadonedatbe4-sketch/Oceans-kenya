import type { Development } from '@/hooks/useNewDevelopments';
import FeaturedDevelopmentCard from '@/pages/NewDevelopments/components/FeaturedDevelopmentCard';

interface FeaturedSectionProps {
  eyebrow: string;
  title: string;
  text: string;
  items: Development[];
  onOpen: (development: Development) => void;
  onRequestBrochure: (development: Development) => void;
}

/**
 * Featured developments block. The heading copy comes from the backend; the
 * projects themselves are real records flagged `is_featured` in the CRM.
 */
export default function FeaturedSection({ eyebrow, title, text, items, onOpen, onRequestBrochure }: FeaturedSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-[#f5f7f7]" id="featured">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 md:mb-12 text-start">
          {eyebrow && <p className="text-golden text-sm font-bold tracking-widest uppercase mb-2">{eyebrow}</p>}
          {title && <h2 className="text-2xl md:text-[28px] font-bold text-primary">{title}</h2>}
          {text && <p className="text-primary/70 text-sm md:text-base mt-3 max-w-2xl">{text}</p>}
        </div>
        <div className="space-y-6 md:space-y-8">
          {items.map((dev, idx) => (
            <FeaturedDevelopmentCard
              key={dev.key}
              development={dev}
              imageLeft={idx % 2 === 0}
              onOpen={onOpen}
              onRequestBrochure={onRequestBrochure}
            />
          ))}
        </div>
      </div>
    </section>
  );
}