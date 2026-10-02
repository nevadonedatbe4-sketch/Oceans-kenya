import MobileCollapsible from '@/components/feature/MobileCollapsible';
import type { NewDevBenefit } from '@/hooks/useNewDevelopmentsPageContent';

interface BenefitsSectionProps {
  eyebrow: string;
  title: string;
  collapseLabel: string;
  openLabel: string;
  items: NewDevBenefit[];
}

/**
 * "Why Buy a New Development?" benefits grid. Eyebrow, title, collapsible
 * labels and every card come from the backend.
 */
export default function BenefitsSection({ eyebrow, title, collapseLabel, openLabel, items }: BenefitsSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="py-10 md:py-16 lg:py-20 px-4 md:px-6" style={{ background: '#f5f7f7' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-5 md:mb-14">
          {eyebrow && <p className="text-golden text-sm md:text-base font-bold tracking-widest uppercase mb-2 md:mb-3">{eyebrow}</p>}
          {title && <h2 className="text-2xl md:text-[28px] font-bold text-primary">{title}</h2>}
        </div>

        <MobileCollapsible
          label={collapseLabel}
          openLabel={openLabel}
          summary={items.slice(0, 3).map((b) => b.title).join(' · ')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {items.map((b, i) => (
              <div key={`${b.title}-${i}`} className="p-5 md:p-6 lg:p-7 border rounded-sm bg-white hover:-translate-y-1 transition-all duration-300" style={{ borderColor: '#f3f4f6' }}>
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-primary rounded-full mb-4 md:mb-5">
                  <i className={`${b.icon || 'ri-checkbox-circle-line'} text-lg md:text-xl text-white`}></i>
                </div>
                {b.title && <h3 className="text-primary font-bold text-sm md:text-base mb-2">{b.title}</h3>}
                {b.desc && <p className="text-primary/70 text-xs md:text-sm leading-relaxed">{b.desc}</p>}
              </div>
            ))}
          </div>
        </MobileCollapsible>
      </div>
    </section>
  );
}