import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import PageLoader from '@/components/feature/PageLoader';
import ContactAgentModal from '@/components/feature/ContactAgentModal';
import ShareButton from '@/components/feature/ShareButton';
import RecentlyViewedDevelopments from '@/components/feature/RecentlyViewedDevelopments';
import RichTextContent from '@/components/feature/RichTextContent';
import DevelopmentGallery from '@/pages/NewDevelopments/components/DevelopmentGallery';
import DevelopmentProjectModel from '@/pages/NewDevelopments/components/DevelopmentProjectModel';
import InventorySection from '@/pages/DevelopmentDetail/components/InventorySection';
import ProjectInfoSections from '@/pages/DevelopmentDetail/components/ProjectInfoSections';
import NearbyPlaces from '@/pages/DevelopmentDetail/components/NearbyPlaces';
import FloorPlansSection from '@/pages/DevelopmentDetail/components/FloorPlansSection';
import ProjectSidebar from '@/pages/DevelopmentDetail/components/ProjectSidebar';
import DevelopmentTabs, { type DevelopmentTab } from '@/pages/DevelopmentDetail/components/DevelopmentTabs';
import SectionFold from '@/pages/DevelopmentDetail/components/SectionFold';
import CollapsibleDescription from '@/pages/DevelopmentDetail/components/CollapsibleDescription';
import { useDevelopmentProject } from '@/hooks/useDevelopmentProject';
import { recordRecentlyViewedDevelopment } from '@/hooks/useRecentlyViewedDevelopments';
import { useCurrency } from '@/hooks/useCurrency';
import { useSiteMeta } from '@/hooks/useSiteMeta';
import { useSeoMeta, buildBreadcrumbSchema, absoluteUrl } from '@/hooks/useSeoMeta';
import { titleCase, sentenceCase } from '@/pages/NewDevelopments/components/typography';
import { priceBounds, inventoryAlert } from '@/lib/developmentUnits';

type CurrencyCode = 'KES' | 'USD' | 'GBP' | 'EUR' | 'UGX' | 'AED' | 'ZAR';

function stageBadge(stage: string): { label: string; color: string } | null {
  const s = (stage || '').trim().toLowerCase();
  if (s === 'off_plan') return { label: 'Off-Plan', color: 'bg-[#fd7e14]' };
  if (s === 'under_construction') return { label: 'Under Construction', color: 'bg-amber-500' };
  if (s === 'completed' || s === '' || s === 'ready') return { label: 'Completed', color: 'bg-[#28a745]' };
  return null;
}

/**
 * PROJECT / DEVELOPMENT PAGE — full inventory destination, organised as tabs.
 *
 * The development is the primary subject. The header (gallery → name + from
 * price + location → quick actions) stays fixed at the top; below it a segmented
 * tab bar switches the main content between Overview / Floor Plans / Location.
 * A sticky sidebar carries the interactive map and the enquiry actions so the
 * location and the "contact" step stay in view on every tab.
 *
 * Every value is derived from the real project & linked unit records; empty
 * categories are omitted entirely rather than rendered as placeholders.
 */
export default function DevelopmentDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { project, loading, error } = useDevelopmentProject(slug ?? null);
  const { format } = useCurrency();
  const { siteName, locality: siteLocality, country: siteCountry } = useSiteMeta();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightUnitId = searchParams.get('unit') || '';

  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryReason, setEnquiryReason] = useState('Enquire');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const openEnquiry = (reason: string, message: string) => {
    setEnquiryReason(reason);
    setEnquiryMessage(message);
    setEnquiryOpen(true);
  };

  // Every section is rendered fully expanded; long-form copy is trimmed in place
  // with CollapsibleDescription (see the About this Property & Key amenities blocks).

  const projectName = project ? titleCase(project.name) : '';
  const bounds = project ? priceBounds(project) : { min: 0, max: 0, currency: 'KES' };
  const currency = (project?.currency as CurrencyCode) || 'KES';

  // Structured data: the project as a RealEstateListing plus the breadcrumb trail
  // (Home → New Projects → this development) so search engines index it strongly.
  const projectSchemas = useMemo(() => {
    if (!project) return [] as Record<string, unknown>[];
    const url = absoluteUrl(`/development/${project.slug}`);
    const trail = [
      { name: 'Home', path: '/' },
      { name: 'New Projects', path: '/new-developments' },
      { name: projectName || project.name, path: `/development/${project.slug}` },
    ];
    const listingSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: projectName,
      description: project.descriptionText ? project.descriptionText.slice(0, 500) : undefined,
      url,
      image: project.gallery.length > 0 ? project.gallery : undefined,
      address: {
        '@type': 'PostalAddress',
        addressLocality: project.city || project.location || siteLocality,
        addressCountry: siteCountry,
      },
      ...(bounds.min > 0
        ? {
            offers: {
              '@type': 'Offer',
              price: bounds.min,
              priceCurrency: currency,
              availability: 'https://schema.org/InStock',
              url,
            },
          }
        : {}),
    };
    return [buildBreadcrumbSchema(trail), listingSchema];
  }, [project, projectName, bounds.min, currency, siteLocality, siteCountry]);

  useSeoMeta({
    title: project ? `${projectName} | New Development | ${siteName}` : `New Development | ${siteName}`,
    description: project
      ? (project.descriptionText ? project.descriptionText.slice(0, 158) : `Explore ${projectName}, a new development with ${project.units.length} available home${project.units.length === 1 ? '' : 's'}.`)
      : `Explore premium new developments with ${siteName}.`,
    path: slug ? `/development/${slug}` : undefined,
    ogImage: project?.gallery?.[0],
    schemas: projectSchemas,
  });

  // Remember this project so the recently-viewed rail can bring the visitor back.
  useEffect(() => {
    if (!project) return;
    recordRecentlyViewedDevelopment({
      slug: project.slug,
      name: projectName,
      image: project.gallery[0] || '',
      location: project.location || project.city || '',
      priceRaw: project.lowestPrice || 0,
      currency: project.currency || 'KES',
    });
  }, [project, projectName]);

  // Absolute public URL for sharing this development page (the current URL).
  const shareUrl = typeof window !== 'undefined' ? window.location.href : undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-[60px] md:pt-[130px] lg:pt-[148px]">
        <Header />
        <main className="dev-detail-roboto px-4 md:px-6 py-8 md:py-12 max-w-6xl mx-auto">
          <PageLoader size={56} text="Loading development..." />
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white pt-[60px] md:pt-[130px] lg:pt-[148px]">
        <Header />
        <main className="dev-detail-roboto pt-16 pb-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-400"></i>
            </div>
            <h1 className="font-roboto font-bold text-2xl md:text-3xl text-primary mb-3">Unable to load this development</h1>
            <p className="font-roboto text-stone-500 mb-6">{error}</p>
            <Link to="/new-developments" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
              <i className="ri-arrow-left-line"></i>Back to New Developments
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white pt-[60px] md:pt-[130px] lg:pt-[148px]">
        <Header />
        <main className="dev-detail-roboto pt-16 pb-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-4">
              <i className="ri-building-2-line text-2xl text-stone-400"></i>
            </div>
            <h1 className="font-roboto font-bold text-2xl md:text-3xl text-primary mb-3">Development not found</h1>
            <p className="font-roboto text-stone-500 mb-6">This development may have been removed or unpublished.</p>
            <Link to="/new-developments" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
              <i className="ri-arrow-left-line"></i>Back to New Developments
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  const badge = stageBadge(project.status);
  const features = project.features || [];
  const alert = inventoryAlert(project);
  const locationLine = titleCase(project.location) || titleCase(project.city) || '';
  const mapQuery = project.address || [project.location, project.city].filter(Boolean).join(', ');
  const mapSrc = mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&ie=UTF8&iwloc=&output=embed`
    : '';

  const highlightedUnit = highlightUnitId ? project.units.find((u) => u.id === highlightUnitId) : undefined;

  // Section folds default to open, except the two longest blocks (Overview &
  // Key amenities) which start folded. See SECTION_FOLD_DEFAULTS.
  const hasProjectFacts = Boolean(
    project.totalUnits ||
      project.units.length > 0 ||
      project.developer ||
      project.createdAt ||
      project.completionDate ||
      project.status ||
      project.paymentPlan?.depositPercent != null ||
      project.paymentPlan?.installments
  );

  const priceLabel = bounds.min > 0
    ? (project.hasPriceRange && bounds.max > bounds.min
      ? `From ${format(bounds.min, currency)}`
      : format(bounds.min, currency))
    : 'Price on request';

  // ── Header tab ──
  // Overview + Location are now inline in the main scroll, so the only tab is
  // Floor Plans (and only when plans actually exist). Clicking it toggles the
  // plans view on and off, so it always has a clear way back to the overview.
  const hasFloorPlans = project.floorPlans.length > 0;
  const tabs: DevelopmentTab[] = hasFloorPlans
    ? [{ id: 'floor-plans', label: 'Floor Plans', icon: 'ri-layout-masonry-line' }]
    : [];
  const tabParam = searchParams.get('tab');
  const showingFloorPlans = hasFloorPlans && tabParam === 'floor-plans';
  const changeTab = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (next.get('tab') === id) next.delete('tab');
    else next.set('tab', id);
    setSearchParams(next);
    try {
      document.getElementById('development-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      // non-critical
    }
  };

  // Opens the floor plans view (used by the quick-action pill). Unlike the tab
  // toggle, this always lands the visitor on the plans, mirroring the card link.
  const openFloorPlans = () => {
    if (!hasFloorPlans) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'floor-plans');
    setSearchParams(next);
    try {
      document.getElementById('development-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      // non-critical
    }
  };

  const scrollToInventory = () => {
    if (showingFloorPlans) {
      const next = new URLSearchParams(searchParams);
      next.delete('tab');
      setSearchParams(next);
    }
    window.setTimeout(() => {
      document.getElementById('available-homes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  return (
    <div className="min-h-screen bg-white pt-[60px] md:pt-[130px] lg:pt-[148px]">
      <Header />

      <PageBreadcrumbs current={projectName} />

      <main className="dev-detail-roboto pb-16">
        {/* ── Hero gallery ── */}
        <section className="px-4 md:px-6 max-w-7xl mx-auto mt-4 md:mt-6">
          <div className="relative w-full h-[280px] sm:h-[380px] md:h-[480px] overflow-hidden bg-stone-100">
            <DevelopmentGallery
              images={project.gallery}
              name={projectName}
              showThumbnails
              thumbCount={4}
              overlay={
                <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5">
                  <span className="text-white text-xs font-bold uppercase tracking-wide px-2.5 py-1 bg-[#001731] rounded-sm">
                    New Development
                  </span>
                  {badge && (
                    <span className={`text-white text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-sm ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
              }
            />
          </div>
        </section>

        {/* ── Project header ── */}
        <section className="px-4 md:px-6 max-w-7xl mx-auto mt-6 md:mt-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-4xl font-bold text-primary leading-tight">{projectName}</h1>
              {locationLine && (
                <p className="mt-2 flex items-center gap-1.5 text-sm md:text-base font-roboto text-[#6b7280]">
                  <i className="ri-map-pin-2-line text-base"></i>
                  {locationLine}
                </p>
              )}
            </div>
            <div className="shrink-0 lg:text-right">
              <p className="text-2xl md:text-3xl font-bold text-primary leading-tight whitespace-nowrap">{priceLabel}</p>
              {alert && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[#8a6d1f]">
                  <i className="ri-fire-line text-base"></i>{alert}
                </p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={scrollToInventory}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-md whitespace-nowrap cursor-pointer hover:bg-primary/90 transition-colors"
            >
              <i className="ri-layout-grid-line text-base"></i>View available homes
            </button>
            <button
              type="button"
              onClick={() =>
                hasFloorPlans
                  ? openFloorPlans()
                  : openEnquiry('Floor Plans', `Hello, could you please send me the floor plans and layouts for ${projectName}?`)
              }
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#eef2f7] border border-[#dbe3ec] text-[13px] font-semibold text-[#001731] whitespace-nowrap cursor-pointer hover:border-primary/40 transition-colors"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-map-2-line text-[#0d5959]"></i>
              </span>
              {hasFloorPlans ? 'Floor Plan Available' : 'Request Floor Plan'}
            </button>
            {project.videoUrl && (
              <button
                type="button"
                onClick={() => window.open(project.videoUrl, '_blank', 'noopener,noreferrer')}
                aria-label={`Play the video tour for ${projectName}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#eef2f7] border border-[#dbe3ec] text-[13px] font-semibold text-[#001731] whitespace-nowrap cursor-pointer hover:border-primary/40 transition-colors"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-play-circle-line text-[#0d5959]"></i>
                </span>
                Video Tour Available
              </button>
            )}
            <ShareButton
              title={projectName}
              url={shareUrl}
              label="Share this development"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#e5e5e5] text-primary text-sm font-semibold rounded-md whitespace-nowrap cursor-pointer hover:border-primary transition-colors"
              iconClassName="text-base"
            />
          </div>

          {highlightedUnit && (
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-roboto text-primary/70 bg-[#fdf8ec] border border-[#e8d9a8] rounded-md px-3 py-1.5">
              <i className="ri-eye-line text-base"></i>
              You&apos;re viewing:
              <span className="font-semibold">
                {highlightedUnit.bedrooms <= 0 ? 'Studio' : `${highlightedUnit.bedrooms} bed`}
                {highlightedUnit.price > 0 ? ` \u00b7 ${format(highlightedUnit.price, currency)}` : ''}
              </span>
            </p>
          )}
        </section>

        {/* ── Two-column body (main content + sticky map rail) ── */}
        <section className="px-4 md:px-6 max-w-7xl mx-auto mt-6">
          {tabs.length > 0 && (
            <div
              id="development-tabs"
              className="sticky z-30 top-[60px] md:top-[130px] lg:top-[148px] scroll-mt-[60px] md:scroll-mt-[130px] lg:scroll-mt-[148px] mb-5 pb-3 bg-white"
            >
              <DevelopmentTabs tabs={tabs} active={showingFloorPlans ? 'floor-plans' : ''} onChange={changeTab} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Main content column */}
            <div className="lg:col-span-2 space-y-6">
              {showingFloorPlans ? (
                <>
                  <button
                    type="button"
                    onClick={() => changeTab('floor-plans')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer hover:underline"
                  >
                    <i className="ri-arrow-left-line text-base"></i>Back to overview
                  </button>
                  <FloorPlansSection
                    floorPlans={project.floorPlans}
                    name={projectName}
                    onEnquire={openEnquiry}
                  />
                </>
              ) : (
                <>
                  {/* Project details heading */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg md:text-xl font-bold text-primary">Project details</h2>
                  </div>

                  {/* About this Property (long copy trimmed with read-more) */}
                  {project.description && (
                    <SectionFold
                      id="overview"
                      title="About this Property"
                      icon="ri-file-text-line"
                    >
                      <CollapsibleDescription>
                        <RichTextContent
                          html={project.description}
                          normalizeCase
                          className="text-base font-normal text-primary/75 leading-relaxed"
                        />
                      </CollapsibleDescription>
                    </SectionFold>
                  )}

                  {/* Key amenities & features (long lists trimmed with read-more) */}
                  {features.length > 0 && (
                    <SectionFold
                      id="amenities"
                      title="Key amenities & features"
                      icon="ri-sparkling-2-line"
                    >
                      <CollapsibleDescription moreLabel="See more">
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                          {features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-base font-normal text-primary/80">
                              <i className="ri-check-line text-[#00703c] text-base"></i>
                              {titleCase(f)}
                            </li>
                          ))}
                        </ul>
                      </CollapsibleDescription>
                    </SectionFold>
                  )}

                  {/* Project facts model (scale, unit types, pricing, developer, timeline) */}
                  {hasProjectFacts && (
                    <SectionFold
                      id="facts"
                      title="Project facts"
                      icon="ri-building-2-line"
                      summary={project.developer ? `Developer: ${titleCase(project.developer)}` : 'Scale, unit types & timeline'}
                    >
                      <DevelopmentProjectModel development={project} />
                    </SectionFold>
                  )}

                  {/* Project information: key info, ownership, finance, costs, utilities */}
                  <ProjectInfoSections
                    development={project}
                    priceLabel={priceLabel}
                    currency={currency}
                    onEnquire={openEnquiry}
                  />

                  {/* Location & nearby (folded - the map itself lives in the sticky rail) */}
                  {mapQuery && (
                    <SectionFold
                      id="location"
                      title="Location"
                      icon="ri-map-pin-2-line"
                      summary={project.address || locationLine}
                    >
                      <div className="flex flex-wrap items-center gap-3 mb-5">
                        <p className="text-sm md:text-base font-roboto text-[#6b7280] min-w-0 flex-1">
                          {project.address || locationLine}
                        </p>
                      </div>

                      <NearbyPlaces
                        lat={project.latitude}
                        lng={project.longitude}
                        name={projectName}
                        proximityNote={String(project.primaryRow?.proximity_amenities || '')}
                      />
                    </SectionFold>
                  )}

                  {/* Available homes (live inventory) */}
                  <InventorySection
                    units={project.units}
                    propertyType={project.propertyType}
                    availableUnits={project.availableUnits}
                    highlightUnitId={highlightUnitId}
                    showUrgency={project.showUrgencyMessage}
                    contained
                  />
                </>
              )}
            </div>

            {/* Sticky rail: map + enquiry */}
            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-[160px]">
                <ProjectSidebar
                  mapSrc={mapSrc}
                  name={projectName}
                  address={project.address || locationLine}
                  priceLabel={priceLabel}
                  onEnquire={openEnquiry}
                />
              </div>
            </aside>
          </div>
        </section>

        {/* ── Enquiry ── */}
        <section className="px-4 md:px-6 max-w-7xl mx-auto mt-10 md:mt-12">
          <div className="rounded-lg bg-primary p-6 md:p-10 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-white">Interested in {projectName}?</h2>
            <p className="text-white/70 text-sm md:text-base mt-2 max-w-2xl mx-auto">
              Request the full price list, brochure or arrange a viewing - our team will get back to you with current availability.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => openEnquiry('Request Price List', `Hello, I would like the full price list and unit availability for ${projectName}.`)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white text-base font-bold rounded-md whitespace-nowrap cursor-pointer hover:bg-accent/90 transition-colors"
              >
                <i className="ri-price-tag-3-line text-base"></i>Request price list
              </button>
              <button
                type="button"
                onClick={() => openEnquiry('Book a Viewing', `Hello, I would like to book a viewing at ${projectName}.`)}
                className="inline-flex items-center gap-2 px-6 py-3 border border-white text-white text-base font-bold rounded-md whitespace-nowrap cursor-pointer hover:bg-white hover:text-primary transition-colors"
              >
                <i className="ri-calendar-check-line text-base"></i>Book a viewing
              </button>
            </div>
          </div>
        </section>

        <RecentlyViewedDevelopments excludeSlug={project.slug} square />
      </main>

      <Footer />
      <BackToTop />

      <ContactAgentModal
        isOpen={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        propertyTitle={projectName}
        propertyId={project.slug}
        propertySlug={project.slug}
        propertyPrice={bounds.min > 0 ? format(bounds.min, currency) : 'Price on request'}
        propertyLocation={project.location || project.city || ''}
        reason={enquiryReason}
        initialMessage={enquiryMessage}
        listingRef={project.slug}
        details={`${sentenceCase(titleCase(project.propertyType))} development${project.developer ? ` by ${titleCase(project.developer)}` : ''}`}
      />
    </div>
  );
}