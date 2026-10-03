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
 * "Why Buy a New Development?" benefits block.
 *
 * Deliberately styled as quiet, supporting decision-support information that
 * sits near the bottom of the page - not a primary hero-style section. It uses
 * the site's body face (Roboto), a small left-aligned heading and a compact
 * icon + copy grid so it never competes with the actual developments, pricing
 * or amenities above it. Eyebrow, title, collapsible labels and every card
 * still come from the backend.
 */
export default function BenefitsSection({ eyebrow, title, collapseLabel, openLabel, items }: BenefitsSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="py-8 md:py-10 px-4 md:px-6 font-roboto" style={{ background: '#f5f7f7' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 md:mb-5">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-widest uppercase text-primary/45 mb-1.5">{eyebrow}</p>
          )}
          {title && <h2 className="text-lg md:text-xl font-bold text-primary leading-snug">{title}</h2>}
        </div>

        <MobileCollapsible
          label={collapseLabel}
          openLabel={openLabel}
          summary={items.slice(0, 3).map((b) => b.title).join(' · ')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {items.map((b, i) => (
              <div
                key={`${b.title}-${i}`}
                className="flex items-start gap-3 p-4 border rounded-sm bg-white transition-colors hover:border-primary/25"
                style={{ borderColor: '#eef0f2' }}
              >
                <span className="w-8 h-8 flex items-center justify-center shrink-0 rounded-md bg-primary/5 text-primary">
                  <i className={`${b.icon || 'ri-checkbox-circle-line'} text-base`}></i>
                </span>
                <span className="min-w-0">
                  {b.title && <h3 className="text-sm font-semibold text-primary mb-1">{b.title}</h3>}
                  {b.desc && <p className="text-xs md:text-sm text-primary/60 leading-relaxed">{b.desc}</p>}
                </span>
              </div>
            ))}
          </div>
        </MobileCollapsible>
      </div>
    </section>
  );
}