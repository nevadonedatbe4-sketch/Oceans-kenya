import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import PageLoader from '@/components/feature/PageLoader';
import EntityImage from '@/components/feature/EntityImage';
import { useImageFocalPoint } from '@/hooks/useImageFocalPoint';
import { smartTitleCase } from '@/lib/location';

interface GuidePost {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  author: string | null;
  featured_image: string | null;
  excerpt: string | null;
  published_at: string | null;
  body: string | null;
}

function estimateReadTime(body: string | null): string {
  const words = (body || '').replace(/<[^>]*>/g, '').split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

export default function LivingNairobi() {
  const [posts, setPosts] = useState<GuidePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const focalPoint = useImageFocalPoint();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('id, title, slug, category, author, featured_image, excerpt, published_at, body')
        .eq('status', 'published')
        .eq('category', 'Living in Nairobi')
        .order('published_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPosts(
        ((data || []) as GuidePost[]).map((p) => ({
          ...p,
          title: smartTitleCase(p.title),
        })),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load guides';
      setError(message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative h-[340px] md:h-[440px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/70"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50"></div>
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm text-white text-[11px] font-roboto font-medium rounded-full mb-4">
              <i className="ri-book-open-line text-xs"></i>
              Living in Nairobi
            </span>
            <h1 className="text-white font-roboto font-bold text-3xl md:text-5xl mb-4 leading-tight">
              Your Guide to Life in Nairobi
            </h1>
            <p className="text-white/80 font-roboto text-sm md:text-base max-w-xl mx-auto">
              Schools, restaurants, malls, healthcare and more - researched by neighbourhood, connected to the properties we list.
            </p>
            <p className="mt-4 text-white/60 font-roboto text-xs">
              Last updated: <span className="text-white font-medium">August 2026</span>
            </p>
          </div>
        </div>
      </section>

      <PageBreadcrumbs />

      {/* Intro strip */}
      <div className="border-b border-primary/12 bg-stone-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
          <p className="font-roboto text-sm text-primary/70">
            Eight living guides, powered by live amenity data - counts update automatically as we add schools, restaurants and more.
          </p>
          <Link
            to="/neighbourhoods"
            className="inline-flex items-center gap-1.5 text-sm font-roboto font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
          >
            Compare neighbourhoods
            <i className="ri-arrow-right-line text-xs"></i>
          </Link>
        </div>
      </div>

      {/* Guides grid */}
      <main className="px-4 md:px-6 py-12 md:py-16 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-24">
            <PageLoader size={48} text="Loading guides..." />
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-stone-50 rounded-lg border border-primary/10">
            <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 bg-white rounded-full">
              <i className="ri-error-warning-line text-primary/40 text-xl"></i>
            </div>
            <p className="text-sm font-roboto font-semibold text-primary mb-1">Something went wrong</p>
            <p className="text-xs font-roboto text-primary/50 mb-3">{error}</p>
            <button
              onClick={fetchPosts}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-md text-xs font-roboto font-semibold cursor-pointer"
            >
              <i className="ri-refresh-line"></i> Try again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-stone-50 rounded-lg border border-primary/10">
            <p className="text-sm font-roboto font-semibold text-primary mb-1">No guides yet</p>
            <p className="text-xs font-roboto text-primary/50">Check back soon - our living guides are on the way.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post, i) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group cursor-pointer block bg-white border border-primary/12 rounded-lg overflow-hidden hover:border-primary/25 transition-all duration-300"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
                  <EntityImage
                    src={post.featured_image}
                    alt={post.title}
                    icon="ri-article-line"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{ objectPosition: focalPoint }}
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 bg-white/90 text-[10px] font-roboto font-semibold text-primary rounded-full">
                      Living in Nairobi
                    </span>
                  </div>
                </div>
                <div className="p-4 md:p-5">
                  <h2 className="font-roboto font-bold text-base text-primary leading-snug mb-2 group-hover:text-golden transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="font-roboto text-xs text-primary/55 leading-relaxed line-clamp-3 mb-3">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] font-roboto text-primary/45">
                    <span className="flex items-center gap-1">
                      <i className="ri-time-line text-xs"></i>
                      {estimateReadTime(post.body)}
                    </span>
                    <span className="flex items-center gap-1 group-hover:text-golden transition-colors">
                      Read guide
                      <i className="ri-arrow-right-line text-xs"></i>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-12 md:pb-16">
        <div className="text-center bg-primary rounded-lg py-10 md:py-14 px-4 md:px-6">
          <h3 className="font-roboto font-bold text-xl text-white mb-3">
            Not sure which neighbourhood fits you?
          </h3>
          <p className="font-roboto text-white/70 text-sm max-w-xl mx-auto mb-6">
            Compare schools, restaurants, malls and healthcare side by side - then browse the properties that match.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/neighbourhoods"
              className="inline-flex items-center gap-2 px-6 py-3 bg-golden text-white border-2 border-golden text-sm font-roboto font-medium tracking-wider uppercase hover:bg-golden/90 transition-colors whitespace-nowrap"
            >
              Compare Neighbourhoods
              <i className="ri-arrow-right-line text-xs"></i>
            </Link>
            <Link
              to="/rent"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white border-2 border-white/30 text-sm font-roboto font-medium tracking-wider uppercase hover:bg-white/20 transition-colors whitespace-nowrap"
            >
              Browse Properties
            </Link>
          </div>
        </div>
      </div>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}