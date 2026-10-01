import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import SeoListingCard from '@/components/feature/SeoListingCard';
import ScrollRevealBlock from '@/components/feature/StaticBlock';
import type { ListingFilters } from '@/hooks/useListings';
import { useLoadMoreListings } from '@/hooks/useLoadMoreListings';
import { useSeoMeta, buildBreadcrumbSchema, buildFaqSchema, buildListingSchema } from '@/hooks/useSeoMeta';
import { ESTATE_AGENT_PAGES, type EstateAgentDef } from '@/lib/seoClusters';
import PageBreadcrumbTrail from '@/components/feature/PageBreadcrumbTrail';

const SITE_URL = 'https://www.oceanske.com';

function AgentFaq({ def }: { def: EstateAgentDef }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!def.faqs.length) return null;
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

function AgentRelated({ def }: { def: EstateAgentDef }) {
  return (
    <section className="mt-12 md:mt-16 bg-[#F7F9F9] rounded-lg p-6 md:p-8">
      <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-5">
        Expert Guidance in {def.area}
      </h2>
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

export default function EstateAgentPage({ slug }: { slug: string }) {
  const def: EstateAgentDef | undefined = ESTATE_AGENT_PAGES[slug];

  const filters: ListingFilters = {
    purpose: def?.purpose || 'sale',
    search: def?.area || '',
    propertyType: 'Any type',
    addedSince: 'Anytime',
    sortBy: 'A - Z',
    statusFilter: 'active',
  };

  const { items, totalCount, loading, loadingMore, error, hasMore, loadMore, refetch } = useLoadMoreListings(filters);

  const path = `/${def?.slug ?? slug}`;
  const schemas = useCallback(
    () =>
      def
        ? [
            buildBreadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Estate Agents', path: '/property-for-sale/nairobi' },
              { name: def.h1, path },
            ]),
            buildFaqSchema(def.faqs),
            buildListingSchema(
              items.map((p) => ({
                title: p.title,
                url: `${SITE_URL}/property/${p.slug}`,
                price: p.rawPrice,
                priceCurrency: p.currency || 'KES',
                address: p.area || p.location,
                image: p.image,
                bedrooms: p.beds,
                bathrooms: p.baths,
                propertyType: p.propertyType,
              })),
            ),
          ]
        : [],
    [def, path, items],
  );

  useSeoMeta({
    title: def?.metaTitle || 'Oceans Kenya | Premium Estate Agents in Nairobi',
    description:
      def?.metaDescription ||
      'Premium luxury real estate agents across the most desirable neighbourhoods of Nairobi, Kenya.',
    path,
    schemas: schemas(),
  });

  if (!def) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-36 pb-24 px-4 md:px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="font-roboto font-bold text-3xl text-primary mb-4">Page Not Found</h1>
            <p className="font-roboto text-stone-500 mb-6">This estate agency page could not be found.</p>
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
          <div className="absolute inset-0 bg-primary/75"></div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 md:px-6">
          <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-2">
            {def.eyebrow}
          </p>
          <h1 className="font-prata font-bold text-white text-3xl md:text-5xl leading-tight mb-3">
            {def.h1}
          </h1>
          <p className="font-roboto text-white/80 text-sm md:text-base max-w-2xl leading-relaxed">
            Premium real estate expertise in {def.area}, Nairobi - delivered with local mastery.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#properties"
              className="inline-flex items-center gap-2 px-7 py-3 bg-golden text-white border-2 border-golden text-sm font-roboto font-semibold uppercase hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-home-4-line"></i> View {def.area} Homes
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-7 py-3 border-2 border-white/60 text-white text-sm font-roboto font-semibold uppercase hover:bg-white hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-chat-3-line"></i> Speak to an Agent
            </Link>
          </div>
        </div>
      </section>

      <main className="py-10 md:py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <PageBreadcrumbTrail
            className="mb-8"
            items={[
              { label: 'Home', to: '/' },
              { label: 'Estate Agents', to: '/property-for-sale/nairobi' },
              { label: def.h1 },
            ]}
          />
          {/* Intro about local agents */}
          <ScrollRevealBlock>
            <div className="max-w-3xl mb-10">
              <h2 className="font-roboto font-bold text-primary text-lg md:text-xl mb-4">
                Why {def.area} home buyers choose Oceans Kenya
              </h2>
              {def.intro.map((para, i) => (
                <p key={i} className="font-roboto text-stone-600 text-sm leading-relaxed mb-4">
                  {para}
                </p>
              ))}
            </div>
          </ScrollRevealBlock>

          {/* Properties the agents represent */}
          <section id="properties">
            <div className="flex items-end justify-between mb-6">
              <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary">
                {def.area} Properties Best Served by Our Agents - {totalCount} result
                {totalCount === 1 ? '' : 's'}
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-[#F5F5F5] aspect-[4/3] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16 bg-[#F5F5F5] rounded-lg">
                <p className="font-roboto text-stone-500 mb-4">{error}</p>
                <button
                  onClick={refetch}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-roboto font-semibold uppercase hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-refresh-line"></i> Try Again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 bg-[#F5F5F5] rounded-lg">
                <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3 rounded-full">
                  <i className="ri-home-4-line text-white text-xl"></i>
                </div>
                <p className="font-roboto font-bold text-primary mb-1">No properties hosted here yet</p>
                <p className="font-roboto text-stone-500 text-sm max-w-md mx-auto mb-4">
                  New premium {def.area} listings arrive regularly. Register your interest to be contacted first.
                </p>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-roboto font-semibold uppercase hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Register Interest
                  <i className="ri-arrow-right-line text-xs"></i>
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((p) => (
                    <SeoListingCard key={p.id} property={p} />
                  ))}
                </div>
                {hasMore && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-7 py-3 bg-primary text-white text-sm font-roboto font-semibold uppercase tracking-wide rounded-md hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-wait"
                    >
                      <i className={loadingMore ? 'ri-loader-4-line animate-spin' : 'ri-add-line'}></i>
                      {loadingMore ? 'Loading…' : 'Load More Homes'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* FAQ */}
          <ScrollRevealBlock>
            <AgentFaq def={def} />
          </ScrollRevealBlock>

          {/* Related links */}
          <ScrollRevealBlock>
            <AgentRelated def={def} />
          </ScrollRevealBlock>

          {/* CTA */}
          <ScrollRevealBlock>
            <div className="mt-12 md:mt-16 bg-primary rounded-lg py-12 md:py-16 px-6 text-center">
              <h2 className="font-prata font-semibold text-white text-2xl md:text-3xl mb-4">
                Trusted Estate Agents in {def.area}
              </h2>
              <p className="font-roboto text-white/80 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-7">
                Whether you are buying, selling or investing in {def.area}, our local agents are ready to deliver a
                seamless, confidential experience from start to finish.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-golden text-white border-2 border-golden text-sm font-roboto font-semibold uppercase hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-chat-3-line"></i> Contact an Agent
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