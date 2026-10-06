import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSeoMeta, buildBreadcrumbSchema } from '@/hooks/useSeoMeta';
import Header from '@/components/feature/Header';
import PageBreadcrumbTrail from '@/components/feature/PageBreadcrumbTrail';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import PageLoader from '@/components/feature/PageLoader';
import BlogArticleBody from '@/components/feature/BlogArticleBody';
import NearbyAreaStrip from '@/components/feature/NearbyAreaStrip';
import BlogHero, { type HeroMetaItem } from '@/pages/blog/components/BlogHero';
import GuideToc, { type TocItem } from '@/pages/blog/components/GuideToc';
import BlogSidebar from '@/pages/blog/components/BlogSidebar';
import RelatedNeighbourhoods, { type RelatedArea } from '@/pages/blog/components/RelatedNeighbourhoods';
import RelatedReading, { type RelatedPost } from '@/pages/blog/components/RelatedReading';
import AreaProperties from '@/pages/blog/components/AreaProperties';
import DiningQuickGuide from '@/pages/blog/components/DiningQuickGuide';
import VenuesByArea from '@/pages/blog/components/VenuesByArea';
import VenuesByOccasion from '@/pages/blog/components/VenuesByOccasion';
import ContextualProperties from '@/pages/blog/components/ContextualProperties';
import GuideMethodNote from '@/pages/blog/components/GuideMethodNote';
import ThingsToDoQuickGuide from '@/pages/blog/components/ThingsToDoQuickGuide';
import PlacesByTheme from '@/pages/blog/components/PlacesByTheme';
import PlacesByArea from '@/pages/blog/components/PlacesByArea';
import MicroGuidePlaces from '@/pages/blog/components/MicroGuidePlaces';
import EcosystemBlocks from '@/pages/blog/components/EcosystemBlocks';
import { normalizeEcoBlocks, type EcoBlock } from '@/lib/ecosystemBlocks';
import { useGuideVenues } from '@/hooks/useGuideVenues';
import { useGuidePlaces } from '@/hooks/useGuidePlaces';
import { useCuratedPlaces } from '@/hooks/useCuratedPlaces';
import { toGuidePlace, groupPlacesByTheme, type GuidePlace } from '@/lib/guidePlaces';
import {
  resolveMicroGuideConfig,
  filterMicroGuidePlaces,
  areasPresentInPlaces,
} from '@/lib/microGuides';
import {
  toGuideVenue,
  groupVenuesByArea,
  groupVenuesByOccasion,
  scopeVenuesToAreas,
  fragmentId,
} from '@/lib/guideVenues';
import { buildArticle } from '@/lib/blogArticle';
import { areaSearchHref } from '@/lib/areaSearch';
import { formatKes, cleanRentalRange } from '@/hooks/usePriceGuide';
import { usePageContent } from '@/hooks/usePageContent';
import { DEFAULT_BLOG_DETAIL } from '@/lib/pageCopy';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  featured_image: string;
  excerpt: string;
  published_at: string;
  updated_at: string;
  body: string;
  article_type: string;
  relatedNeighbourhoods: string[];
  related_posts: string[];
  guide_area: string | null;
  guide_categories: string[] | null;
  guide_match: string[] | null;
  eco_blocks: EcoBlock[];
}

interface QuickFact {
  label: string;
  value: string;
}

function formatDate(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function estimateReadTime(body: string): string {
  const words = subjectWords(body);
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function subjectWords(body: string): number {
  return body.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
}

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedAreas, setRelatedAreas] = useState<RelatedArea[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [guideAreaNames, setGuideAreaNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { content: c } = usePageContent('blog_detail', DEFAULT_BLOG_DETAIL);

  const fetchPost = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const { data: dbPost, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (error || !dbPost) {
        setPost(null);
        setRelatedAreas([]);
        setRelatedPosts([]);
        setGuideAreaNames([]);
        setLoading(false);
        return;
      }

      const relatedSlugs: string[] = dbPost.related_neighbourhoods || [];

      const mapped: BlogPost = {
        id: dbPost.id,
        title: dbPost.title || '',
        slug: dbPost.slug || slug,
        category: dbPost.category || '',
        author: dbPost.author || c.default_author,
        featured_image: dbPost.featured_image || '',
        excerpt: dbPost.excerpt || '',
        published_at: dbPost.published_at || '',
        updated_at: dbPost.updated_at || dbPost.published_at || '',
        body: dbPost.body || '',
        article_type: dbPost.article_type || 'editorial',
        relatedNeighbourhoods: relatedSlugs,
        related_posts: (dbPost.related_posts || []) as string[],
        guide_area: dbPost.guide_area || null,
        guide_categories: dbPost.guide_categories || null,
        guide_match: dbPost.guide_match || null,
        eco_blocks: normalizeEcoBlocks(dbPost.eco_blocks),
      };
      setPost(mapped);

      if (relatedSlugs.length > 0) {
        const { data: hoods } = await supabase
          .from('neighbourhoods')
          .select('slug, name, hero_image, summary, tags, city, target_market, average_sale_price, rental_range_kes, is_published')
          .in('slug', relatedSlugs);

        const rows = (hoods || []).sort(
          (a, b) => relatedSlugs.indexOf(a.slug) - relatedSlugs.indexOf(b.slug),
        );

        // Guide area names resolve regardless of a neighbourhood page's publish
        // state, so a dining guide never silently drops a whole area's venues.
        setGuideAreaNames(rows.map((h) => h.name).filter(Boolean));

        const mappedAreas: RelatedArea[] = rows
          .filter((h) => h.is_published)
          .map((h) => ({
            slug: h.slug,
            name: h.name,
            heroImage: h.hero_image,
            summary: h.summary,
            tags: (h.tags || []) as string[],
            city: h.city || 'Nairobi',
            targetMarket: h.target_market,
            averageSalePrice: h.average_sale_price != null ? Number(h.average_sale_price) : null,
            rentalRange: h.rental_range_kes,
          }));
        setRelatedAreas(mappedAreas);
      } else {
        setRelatedAreas([]);
        setGuideAreaNames([]);
      }

      // Editorially-selected sibling articles (Related reading block).
      const relatedPostSlugs: string[] = dbPost.related_posts || [];
      if (relatedPostSlugs.length > 0) {
        const { data: relRows } = await supabase
          .from('blog_posts')
          .select('slug, title, category, excerpt, featured_image')
          .in('slug', relatedPostSlugs)
          .eq('status', 'published');
        const ordered = (relRows || []).sort(
          (a, b) => relatedPostSlugs.indexOf(a.slug) - relatedPostSlugs.indexOf(b.slug),
        );
        setRelatedPosts(ordered as RelatedPost[]);
      } else {
        setRelatedPosts([]);
      }
    } catch {
      setPost(null);
      setRelatedAreas([]);
      setRelatedPosts([]);
      setGuideAreaNames([]);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const { html: articleHtml, headings } = useMemo(() => buildArticle(post?.body), [post?.body]);

  const primaryArea = relatedAreas[0]?.name || '';
  const city = relatedAreas[0]?.city || 'Nairobi';

  // Editor-configured live ecosystem blocks (listings / developments / services).
  const ecoBlocks = useMemo(() => (post?.eco_blocks || []).filter((b) => b.enabled), [post]);

  // ── Editorial dining modules (only for dining_guide articles) ────────────
  const isDining = post?.article_type === 'dining_guide';
  const { venues: guideVenueRows } = useGuideVenues();
  const areaNames = useMemo(
    () => (guideAreaNames.length > 0 ? guideAreaNames : relatedAreas.map((a) => a.name)),
    [guideAreaNames, relatedAreas],
  );
  const guideVenues = useMemo(() => guideVenueRows.map(toGuideVenue), [guideVenueRows]);
  const scopedVenues = useMemo(
    () => scopeVenuesToAreas(guideVenues, areaNames),
    [guideVenues, areaNames],
  );
  const areaVenueGroups = useMemo(
    () => groupVenuesByArea(scopedVenues, areaNames),
    [scopedVenues, areaNames],
  );
  const occasionVenueGroups = useMemo(
    () => groupVenuesByOccasion(scopedVenues),
    [scopedVenues],
  );
  const quickGuideItems = useMemo(
    () =>
      occasionVenueGroups.map((g) => ({
        key: g.key,
        label: g.label,
        icon: g.icon,
        count: g.venues.length,
      })),
    [occasionVenueGroups],
  );

  // ── Editorial things-to-do modules (things_to_do / attraction articles) ───
  const isThingsToDo =
    post?.article_type === 'things_to_do' || post?.article_type === 'attraction';
  const { places: guidePlaceRows } = useGuidePlaces();
  const guidePlaces = useMemo(() => guidePlaceRows.map(toGuidePlace), [guidePlaceRows]);
  const scopedPlaces = useMemo(
    () => scopeVenuesToAreas(guidePlaces, areaNames) as GuidePlace[],
    [guidePlaces, areaNames],
  );
  const themePlaceGroups = useMemo(() => groupPlacesByTheme(scopedPlaces), [scopedPlaces]);
  const placeAreaGroups = useMemo(
    () => groupVenuesByArea(scopedPlaces, areaNames),
    [scopedPlaces, areaNames],
  );
  const themeQuickItems = useMemo(
    () =>
      themePlaceGroups.map((g) => ({
        key: g.key,
        label: g.label,
        icon: g.icon,
        count: g.places.length,
      })),
    [themePlaceGroups],
  );

  // ── Micro-guides ("Best Cafés in Kilimani"...) - the scalable engine ─────
  const isMicroGuide = post?.article_type === 'micro_guide';
  const { places: curatedPlaceRows } = useCuratedPlaces();
  const curatedPlaces = useMemo(() => curatedPlaceRows.map(toGuidePlace), [curatedPlaceRows]);
  const microConfig = useMemo(
    () =>
      resolveMicroGuideConfig({
        guide_area: post?.guide_area,
        guide_categories: post?.guide_categories,
        guide_match: post?.guide_match,
      }),
    [post],
  );
  const microPlaces = useMemo(
    () => filterMicroGuidePlaces(curatedPlaces, microConfig),
    [curatedPlaces, microConfig],
  );
  const microAreas = useMemo(
    () => (microConfig.area ? [microConfig.area] : areasPresentInPlaces(microPlaces)),
    [microConfig, microPlaces],
  );
  const microHeading = microConfig.area ? `The shortlist in ${microConfig.area}` : 'The Nairobi shortlist';
  const microSubheading = 'Every place below is a real, verified listing - curated for this guide, never paid placement.';
  const microStayHeading = microConfig.area
    ? `Where to Stay in ${microConfig.area}`
    : "Where to Stay Near Nairobi's Best";
  const microStaySubheading = microConfig.area
    ? `Homes in ${microConfig.area}, so it is all on your doorstep.`
    : 'Homes across the neighbourhoods above.';

  const tocItems = useMemo<TocItem[]>(() => {
    const items: TocItem[] = [{ id: 'guide-top', label: 'Overview', level: 2 }];
    headings.forEach((h) => items.push({ id: h.id, label: h.text, level: h.level }));
    if (isDining && areaVenueGroups.length > 0) {
      items.push({ id: 'quick-guide', label: 'Quick guide', level: 2 });
      items.push({ id: 'by-area', label: 'Where to eat by area', level: 2 });
      areaVenueGroups.forEach((g) =>
        items.push({ id: `area-${fragmentId(g.name)}`, label: g.name, level: 3 }),
      );
      if (occasionVenueGroups.length > 0) {
        items.push({ id: 'by-occasion', label: 'Choose by occasion', level: 2 });
      }
    }
    if (isThingsToDo && themePlaceGroups.length > 0) {
      items.push({ id: 'ttd-quick-guide', label: 'The quick guide', level: 2 });
      items.push({ id: 'ttd-theme', label: 'Things to do by theme', level: 2 });
    }
    if (isThingsToDo && placeAreaGroups.length > 0) {
      items.push({ id: 'ttd-area', label: 'Things to do by area', level: 2 });
      placeAreaGroups.forEach((g) =>
        items.push({ id: `area-${fragmentId(g.name)}`, label: g.name, level: 3 }),
      );
    }
    if (isMicroGuide && microPlaces.length > 0) {
      items.push({ id: 'micro-guide-places', label: microHeading, level: 2 });
    }
    if (isMicroGuide && microAreas.length > 0) {
      items.push({ id: 'stay', label: 'Where to stay', level: 2 });
    } else if ((isDining || isThingsToDo) && areaNames.length > 0) {
      items.push({ id: 'stay', label: 'Where to stay', level: 2 });
    } else if (primaryArea) {
      items.push({ id: 'properties', label: `Properties in ${primaryArea}`, level: 2 });
    }
    ecoBlocks.forEach((b) => items.push({ id: `eco-${b.type}`, label: b.heading, level: 2 }));
    items.push({ id: 'nearby', label: 'Explore nearby neighbourhoods', level: 2 });
    if (relatedPosts.length > 0) {
      items.push({ id: 'related-reading', label: 'Related reading', level: 2 });
    }
    return items;
  }, [headings, primaryArea, isDining, isThingsToDo, isMicroGuide, microHeading, microPlaces, microAreas, areaVenueGroups, occasionVenueGroups, themePlaceGroups, placeAreaGroups, areaNames, relatedPosts, ecoBlocks]);

  const heroMeta = useMemo<HeroMetaItem[]>(() => {
    const meta: HeroMetaItem[] = [];
    meta.push({ icon: 'ri-map-pin-2-line', label: 'Location', value: city });
    if (post?.category) meta.push({ icon: 'ri-book-2-line', label: 'Type', value: post.category });
    const updated = formatDate(post?.updated_at || '');
    if (updated) meta.push({ icon: 'ri-calendar-check-line', label: 'Updated', value: updated });
    if (post?.published_at) {
      meta.push({ icon: 'ri-time-line', label: 'Reading', value: estimateReadTime(post.body) });
    }
    if (primaryArea) {
      meta.push({
        icon: 'ri-home-4-line',
        label: 'Homes',
        value: `View in ${primaryArea}`,
        href: areaSearchHref(primaryArea),
      });
    }
    return meta;
  }, [post, city, primaryArea]);

  const quickFacts = useMemo<QuickFact[]>(() => {
    const area = relatedAreas[0];
    if (!area) return [];
    const facts: QuickFact[] = [];
    if (area.tags.length > 0) facts.push({ label: 'Lifestyle', value: area.tags.slice(0, 3).join(' · ') });
    if (area.averageSalePrice != null && area.averageSalePrice > 0) {
      facts.push({ label: 'Average sale price', value: formatKes(area.averageSalePrice) });
    }
    const rent = cleanRentalRange(area.rentalRange || '');
    if (rent) facts.push({ label: 'Monthly rent', value: `KSh ${rent}` });
    if (area.targetMarket) facts.push({ label: 'Best for', value: area.targetMarket });
    return facts;
  }, [relatedAreas]);

  const structuredData = useMemo(() => {
    if (!post) return undefined;
    return [
      buildBreadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Neighbourhoods & Guides', path: '/neighbourhoods' },
        { name: post.title, path: `/blog/${post.slug}` },
      ]),
    ];
  }, [post]);

  useSeoMeta({
    title: post ? post.title : 'Article',
    description: post?.excerpt || c.seo_description,
    path: `/blog/${post?.slug || slug || ''}`,
    ogImage: post?.featured_image || undefined,
    schemas: structuredData,
    noindex: !post,
  });

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-32 md:pt-40 lg:pt-44 pb-20 px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <PageLoader size={56} text={c.loading_text} />
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-28 md:pt-40 lg:pt-44">
          <PageBreadcrumbTrail items={[{ label: 'Home', to: '/' }, { label: 'Guides', to: '/neighbourhoods' }, { label: 'Not found' }]} />
        </div>
        <main className="pb-20 px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-prata font-bold text-3xl text-primary mb-4">{c.notfound_title}</h1>
            <p className="font-roboto text-[#636363] mb-6">{c.notfound_text}</p>
            <Link
              to="/neighbourhoods"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-jost font-semibold tracking-wider uppercase rounded-md hover:bg-[#002349] transition-colors whitespace-nowrap cursor-pointer"
            >
              {c.notfound_button}
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

      <div id="guide-top" className="scroll-mt-24">
        <BlogHero
          eyebrow={
            isDining
              ? 'Oceans Kenya · Where to Eat'
              : isThingsToDo
                ? 'Oceans Kenya · Things to Do'
                : isMicroGuide
                  ? 'Oceans Kenya · Local Guide'
                  : 'Oceans Kenya · Neighbourhood Guide'
          }
          title={post.title}
          category={post.category}
          featuredImage={post.featured_image}
          dek={post.excerpt}
          meta={heroMeta}
        />
      </div>

      <main className="py-10 md:py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <PageBreadcrumbTrail
            className="mb-8 md:mb-10"
            items={[
              { label: 'Home', to: '/' },
              { label: 'Neighbourhoods & Guides', to: '/neighbourhoods' },
              { label: post.title },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-12 items-start">
            <article className="min-w-0">
              {/* Compact mobile navigation */}
              <GuideToc items={tocItems} variant="inline" className="lg:hidden mb-8" />

              {/* Article body */}
              <div className="max-w-[720px]">
                <BlogArticleBody html={articleHtml} />
              </div>

              {/* Editorial dining modules - real venues from the database */}
              {isDining && (areaVenueGroups.length > 0 || occasionVenueGroups.length > 0) && (
                <div className="mt-12 md:mt-14 space-y-12 md:space-y-16">
                  <DiningQuickGuide items={quickGuideItems} />
                  <VenuesByArea groups={areaVenueGroups} />
                  <VenuesByOccasion groups={occasionVenueGroups} />
                  <GuideMethodNote venues={scopedVenues} />
                </div>
              )}

              {/* Editorial things-to-do modules - real places from the database */}
              {isThingsToDo && (themePlaceGroups.length > 0 || placeAreaGroups.length > 0) && (
                <div className="mt-12 md:mt-14 space-y-12 md:space-y-16">
                  <ThingsToDoQuickGuide items={themeQuickItems} />
                  <PlacesByTheme groups={themePlaceGroups} />
                  <PlacesByArea groups={placeAreaGroups} />
                  <GuideMethodNote venues={scopedPlaces} />
                </div>
              )}

              {/* Micro-guide picks - real curated places from the database */}
              {isMicroGuide && microPlaces.length > 0 && (
                <div className="mt-12 md:mt-14 space-y-12 md:space-y-16">
                  <MicroGuidePlaces
                    places={microPlaces}
                    heading={microHeading}
                    subheading={microSubheading}
                    groupByArea={!microConfig.area}
                  />
                  <GuideMethodNote venues={microPlaces} />
                </div>
              )}

              {/* Contextual properties - only from the areas this guide covers */}
              {isMicroGuide && microAreas.length > 0 ? (
                <div id="stay" className="scroll-mt-24 mt-14 md:mt-16 pt-10 border-t-2 border-primary/10">
                  <ContextualProperties
                    areas={microAreas}
                    heading={microStayHeading}
                    subheading={microStaySubheading}
                  />
                </div>
              ) : isDining && areaNames.length > 0 ? (
                <div id="stay" className="scroll-mt-24 mt-14 md:mt-16 pt-10 border-t-2 border-primary/10">
                  <ContextualProperties
                    areas={areaNames}
                    heading="Where to Stay Near Nairobi's Food Scene"
                    subheading="Homes in and around the areas above, so the food is on your doorstep."
                  />
                </div>
              ) : isThingsToDo && areaNames.length > 0 ? (
                <div id="stay" className="scroll-mt-24 mt-14 md:mt-16 pt-10 border-t-2 border-primary/10">
                  <ContextualProperties
                    areas={areaNames}
                    heading="Where to Stay Near Nairobi's Highlights"
                    subheading="Homes in and around the areas above, so the city's best experiences are on your doorstep."
                  />
                </div>
              ) : primaryArea ? (
                <div id="properties" className="scroll-mt-24 mt-14 md:mt-16 pt-10 border-t-2 border-primary/10">
                  <AreaProperties areaName={primaryArea} />
                </div>
              ) : null}

              {/* Ecosystem blocks - live listings, developments & service providers */}
              <EcosystemBlocks blocks={ecoBlocks} defaultAreas={areaNames} />

              {/* Related areas */}
              <div id="nearby" className="scroll-mt-24 mt-14 md:mt-16 pt-10 border-t-2 border-primary/10">
                {relatedAreas.length > 0 ? (
                  <RelatedNeighbourhoods areas={relatedAreas} />
                ) : (
                  <NearbyAreaStrip label={city} heading="Explore nearby neighbourhoods" className="mt-0" />
                )}
              </div>

              {/* Related reading - editorially-selected sibling guides */}
              {relatedPosts.length > 0 && (
                <div id="related-reading" className="scroll-mt-24 mt-14 md:mt-16 pt-10 border-t-2 border-primary/10">
                  <RelatedReading posts={relatedPosts} />
                </div>
              )}

              <div className="mt-8 md:mt-10 pt-6">
                <Link
                  to="/neighbourhoods"
                  className="inline-flex items-center gap-1.5 text-sm font-roboto font-medium text-primary hover:text-[#0D5959] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-arrow-left-line"></i>
                  {c.back_label}
                </Link>
              </div>
            </article>

            <BlogSidebar
              className="hidden lg:block lg:sticky lg:top-28"
              tocItems={tocItems}
              areas={relatedAreas}
              areaName={primaryArea}
            />
          </div>

          {/* CTA */}
          <div className="mt-16 md:mt-20">
            <div className="text-center bg-primary rounded-lg py-12 md:py-16 px-4 md:px-6">
              <h3 className="font-prata font-semibold text-white text-2xl md:text-3xl mb-3">{c.cta_title}</h3>
              <p className="font-roboto text-white/80 text-sm md:text-base max-w-xl mx-auto mb-6 leading-relaxed">
                {c.cta_text}
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-golden text-white border-2 border-golden text-sm font-jost font-semibold tracking-wider uppercase hover:bg-[#8a6d1f] transition-colors whitespace-nowrap cursor-pointer"
              >
                {c.cta_button}
                <i className="ri-arrow-right-line text-xs"></i>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}