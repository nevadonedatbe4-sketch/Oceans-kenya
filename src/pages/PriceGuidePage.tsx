import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import ScrollRevealBlock from '@/components/feature/StaticBlock';
import { usePriceGuide, formatKes, cleanRentalRange } from '@/hooks/usePriceGuide';
import { useSeoMeta, buildBreadcrumbSchema, buildFaqSchema, buildPriceOfferSchema } from '@/hooks/useSeoMeta';
import { PROPERTY_PRICE_PAGES, type PriceGuideDef } from '@/lib/seoClusters';
import PageBreadcrumbTrail from '@/components/feature/PageBreadcrumbTrail';

function PriceSnapshot({ def, value, sub }: { def: PriceGuideDef; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-lg border-2 border-primary/15 px-6 py-8 text-center">
      <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.25em] mb-2">
        {def.mode === 'property' ? 'Average Sale Price' : 'Monthly Rent Range'}
      </p>
      <p className="font-prata font-bold text-primary text-2xl md:text-3xl leading-tight mb-2">
        {value}
      </p>
      <p className="font-roboto text-stone-500 text-xs md:text-sm">{sub}</p>
    </div>
  );
}

function ComparisonTable({ areas, def }: { areas: ReturnType<typeof usePriceGuide>['areas']; def: PriceGuideDef }) {
  if (!areas.length) return null;
  const rows = areas.slice(0, 10);
  return (
    <section className="mt-12 md:mt-16">
      <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-5">
        {def.area} in Context - Premium Nairobi Prices
      </h2>
      <p className="font-roboto text-stone-500 text-sm mb-6 max-w-3xl">
        Compare the current {def.mode === 'property' ? 'average sale price' : 'rental range'} in{' '}
        <span className="font-semibold text-primary/80">{def.area}</span> with Nairobi's other premium enclaves.
        Figures are drawn from our live neighbourhood market data.
      </p>
      <div className="overflow-x-auto rounded-lg border-2 border-primary/12">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#F7F9F9]">
              <th className="px-5 py-3.5 text-xs font-roboto font-semibold uppercase tracking-wider text-primary/70">
                Neighbourhood
              </th>
              <th className="px-5 py-3.5 text-xs font-roboto font-semibold uppercase tracking-wider text-primary/70">
                Avg Sale Price
              </th>
              <th className="px-5 py-3.5 text-xs font-roboto font-semibold uppercase tracking-wider text-primary/70">
                Monthly Rent Range
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((a) => {
              const isTarget = a.slug === def.areaSlug;
              return (
                <tr key={a.id} className={`${isTarget ? 'bg-accent-100/60' : 'bg-white'}`}>
                  <td className="px-5 py-3.5">
                    <Link
                      to={isTarget ? '#' : `/property-prices/${a.slug}`}
                      className={`font-roboto text-sm font-semibold ${
                        isTarget ? 'text-accent-900' : 'text-primary hover:text-[#2d4a7a] transition-colors'
                      }`}
                    >
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 font-roboto text-sm text-stone-600">
                    {a.average_sale_price ? formatKes(a.average_sale_price) : '-'}
                  </td>
                  <td className="px-5 py-3.5 font-roboto text-sm text-stone-600">
                    {a.rental_range_kes ? `KSh ${cleanRentalRange(a.rental_range_kes)}` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FaqSection({ def }: { def: PriceGuideDef }) {
  const [open, setOpen] = useState(0);
  return (
    <section className="mt-12 md:mt-16">
      <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-5">
        Frequently Asked Questions
      </h2>
      <div className="divide-y-2 divide-primary/12 border-y-2 border-primary/12">
        {def.faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-4 text-left cursor-pointer group"
                aria-expanded={isOpen}
              >
                <span className="font-roboto font-semibold text-primary text-sm md:text-base">{f.q}</span>
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full border border-primary/20 text-primary shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 bg-primary text-white border-primary' : ''
                  }`}
                >
                  <i className="ri-arrow-down-s-line"></i>
                </span>
              </button>
              {isOpen && (
                <p className="font-roboto text-stone-500 text-sm leading-relaxed pb-5 -mt-1">{f.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RelatedLinks({ def }: { def: PriceGuideDef }) {
  return (
    <section className="mt-12 md:mt-16 bg-[#F7F9F9] rounded-lg p-6 md:p-8">
      <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-5">Explore More in {def.area}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {def.related.map((r) => (
          <Link
            key={r.href}
            to={r.href}
            className="group flex items-center justify-between gap-3 bg-white border-2 border-primary/12 rounded-lg px-5 py-4 hover:border-primary/40 transition-colors cursor-pointer"
          >
            <span className="font-roboto font-medium text-primary text-sm md:text-base group-hover:text-[#2d4a7a] transition-colors">
              {r.label}
            </span>
            <span className="w-7 h-7 flex items-center justify-center text-primary shrink-0 group-hover:translate-x-1 transition-transform">
              <i className="ri-arrow-right-line"></i>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function PriceGuidePage({ slug }: { slug: string }) {
  const def: PriceGuideDef | undefined = PROPERTY_PRICE_PAGES[slug];
  const { target, areas, loading, error, refetch } = usePriceGuide(def?.areaSlug || slug);

  const path = `/${def?.slug ?? slug}`;

  const headline = useMemo(() => {
    if (!def) return { value: '-', sub: '' };
    if (def.mode === 'property') {
      if (target?.average_sale_price != null && target.average_sale_price > 0) {
        return {
          value: formatKes(target.average_sale_price),
          sub: `Indicative average sale price for a premium home in ${def.area}, Nairobi`,
        };
      }
      if (target?.summary || def.area) {
        return {
          value: 'On request',
          sub: `Current average sale price for ${def.area} - contact our agents for a precise valuation`,
        };
      }
      return { value: '-', sub: 'Live data not yet available for this area' };
    }
    if (cleanRentalRange(target?.rental_range_kes ?? null)) {
      return {
        value: `KSh ${cleanRentalRange(target?.rental_range_kes ?? '')}`,
        sub: `Indicative monthly rent range for premium property in ${def.area}, Nairobi`,
      };
    }
    return {
      value: 'On request',
      sub: `Current rental range for ${def.area} - contact our agents for current availability`,
    };
  }, [def, target]);

  const schemas = useMemo(
    () =>
      def
        ? [
            buildBreadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Property Intelligence', path: '/property-for-sale/nairobi' },
              { name: def.h1, path },
            ]),
            buildFaqSchema(def.faqs),
            buildPriceOfferSchema(
              def.area,
              def.mode === 'property' ? target?.average_sale_price ?? null : null,
              target?.rental_range_kes ?? null,
            ),
          ]
        : [],
    [def, path, target],
  );

  useSeoMeta({
    title: def?.metaTitle || 'Oceans Kenya | Premium Property in Nairobi',
    description: def?.metaDescription || 'Premium property prices and rentals across Nairobi, Kenya.',
    path,
    schemas,
  });

  if (!def) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-36 pb-24 px-4 md:px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="font-roboto font-bold text-3xl text-primary mb-4">Page Not Found</h1>
            <p className="font-roboto text-stone-500 mb-6">This premium price guide could not be found.</p>
            <Link
              to="/property-for-sale/nairobi"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white border-2 border-primary text-sm font-roboto font-semibold uppercase hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              Browse Nairobi Property
              <i className="ri-arrow-right-line text-xs"></i>
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-14 md:pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="w-full h-full bg-gradient-to-br from-primary via-primary to-accent/70"></div>
          <div className="absolute inset-0 bg-primary/70"></div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 md:px-6">
          <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-2">
            {def.eyebrow}
          </p>
          <h1 className="font-prata font-bold text-white text-3xl md:text-5xl leading-tight mb-3">
            {def.h1}
          </h1>
          <p className="font-roboto text-white/80 text-sm md:text-base max-w-2xl leading-relaxed">
            Data-backed insight into the {def.area} property market, Nairobi, Kenya.
          </p>
        </div>
      </section>

      <main className="py-10 md:py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <PageBreadcrumbTrail
            className="mb-8"
            items={[
              { label: 'Home', to: '/' },
              { label: 'Property Intelligence', to: '/property-for-sale/nairobi' },
              { label: def.h1 },
            ]}
          />
          {/* Price snapshot */}
          <ScrollRevealBlock>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#F5F5F5] h-32 rounded-lg animate-pulse" />
                <div className="bg-[#F5F5F5] h-32 rounded-lg animate-pulse" />
              </div>
            ) : error ? (
              <div className="text-center py-10 bg-[#F5F5F5] rounded-lg">
                <p className="font-roboto text-stone-500 mb-4">{error}</p>
                <button
                  onClick={refetch}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-roboto font-semibold uppercase hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-refresh-line"></i> Try Again
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                <PriceSnapshot def={def} value={headline.value} sub={headline.sub} />
                <div className="bg-accent-100/70 rounded-lg px-6 py-8 flex items-center">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 flex items-center justify-center bg-accent-500 text-white rounded-full shrink-0">
                      <i className="ri-line-chart-line text-lg"></i>
                    </span>
                    <div>
                      <p className="font-roboto font-bold text-accent-900 text-sm md:text-base mb-1">
                        Live market data, updated continuously
                      </p>
                      <p className="font-roboto text-stone-600 text-xs md:text-sm leading-relaxed">
                        These figures are drawn from Oceans Kenya's live {def.area} property data for real,
                        informed decisions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollRevealBlock>

          {/* Intro */}
          <ScrollRevealBlock>
            <div className="max-w-3xl mb-8">
              <h2 className="font-roboto font-bold text-primary text-lg md:text-xl mb-4">
                About this {def.mode === 'property' ? 'property price' : 'rental price'} guide
              </h2>
              {def.intro.map((para, i) => (
                <p key={i} className="font-roboto text-stone-600 text-sm leading-relaxed mb-4">
                  {para}
                </p>
              ))}
            </div>
          </ScrollRevealBlock>

          {/* Comparison table */}
          <ScrollRevealBlock>
            <ComparisonTable areas={areas} def={def} />
          </ScrollRevealBlock>

          {/* FAQ */}
          <ScrollRevealBlock>
            <FaqSection def={def} />
          </ScrollRevealBlock>

          {/* Related links */}
          <ScrollRevealBlock>
            <RelatedLinks def={def} />
          </ScrollRevealBlock>

          {/* CTA */}
          <ScrollRevealBlock>
            <div className="mt-12 md:mt-16 bg-primary rounded-lg py-12 md:py-16 px-6 text-center">
              <h2 className="font-prata font-semibold text-white text-2xl md:text-3xl mb-4">
                Get a Precise Valuation in {def.area}
              </h2>
              <p className="font-roboto text-white/80 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-7">
                For an exact, street-level valuation of your {def.area} home, or to explore the latest premium
                listings in the area, speak to an Oceans Kenya specialist today.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-golden text-white border-2 border-golden text-sm font-roboto font-semibold uppercase hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-chat-3-line"></i> Request a Valuation
              </Link>
            </div>
          </ScrollRevealBlock>
        </div>
      </main>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}