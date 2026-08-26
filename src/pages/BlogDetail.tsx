import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import PageLoader from '@/components/feature/PageLoader';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  categoryTag: string;
  author: string;
  authorAvatar: string;
  featured_image: string;
  excerpt: string;
  published_at: string;
  readTime: string;
  body: string;
  relatedGuides: string[];
}

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${className} reveal-up ${isVisible ? 'revealed' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

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

      if (!error && dbPost) {
        const mapped: BlogPost = {
          id: dbPost.id,
          title: dbPost.title || '',
          slug: dbPost.slug || slug,
          category: dbPost.category || '',
          categoryTag: dbPost.category || '',
          author: dbPost.author || 'Oceans Kenya',
          authorAvatar: '',
          featured_image: dbPost.featured_image || '',
          excerpt: dbPost.excerpt || '',
          published_at: dbPost.published_at || '',
          readTime: estimateReadTime(dbPost.body || ''),
          body: dbPost.body || '',
          relatedGuides: [],
        };
        setPost(mapped);
      } else {
        setPost(null);
      }
    } catch {
      setPost(null);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const relatedGuides = post?.relatedGuides
    ? [] 
    : [];

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-32 pb-20 px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <PageLoader size={56} text="Loading article..." />
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
        <main className="pt-32 pb-20 px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-roboto font-bold text-3xl text-primary mb-4">Article Not Found</h1>
            <p className="font-roboto text-stone-500 mb-6">
              We could not find the blog post you are looking for.
            </p>
            <Link
              to="/neighbourhoods"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-sm font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Back to Neighbourhoods &amp; Guides
              <i className="ri-arrow-right-line text-xs"></i>
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Article Hero */}
      <section className="relative pt-28 md:pt-32 pb-12 md:pb-16 overflow-hidden">
        <div className="absolute inset-0">
          {post.featured_image && (
            <img
              alt={post.title}
              className="w-full h-full object-cover object-top"
              src={post.featured_image}
            />
          )}
          <div className="absolute inset-0 bg-primary/80"></div>
        </div>
        <div className="relative max-w-3xl mx-auto px-4 md:px-6">
          <nav className="mb-6">
            <ol className="flex items-center gap-2 text-xs font-roboto text-white/60">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li><i className="ri-arrow-right-s-line"></i></li>
              <li>
                <Link to="/neighbourhoods" className="hover:text-white transition-colors">Neighbourhoods &amp; Guides</Link>
              </li>
              <li><i className="ri-arrow-right-s-line"></i></li>
              <li className="text-white font-medium">Blog</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2 mb-4">
            {post.categoryTag && (
              <span className="px-2.5 py-1 bg-white/15 backdrop-blur-sm text-white text-[10px] font-roboto font-medium rounded-full">
                {post.categoryTag}
              </span>
            )}
            {post.category && post.category !== post.categoryTag && (
              <span className="px-2.5 py-1 bg-white/15 backdrop-blur-sm text-white text-[10px] font-roboto font-medium rounded-full">
                {post.category}
              </span>
            )}
          </div>
          <h1 className="font-roboto font-bold text-2xl md:text-4xl text-white mb-4 leading-tight">
            {post.title}
          </h1>
          <div className="flex items-center gap-3 text-white/70 text-xs font-roboto">
            {post.author && <span>{post.author}</span>}
            {post.author && formattedDate && <span>&middot;</span>}
            {formattedDate && <span>{formattedDate}</span>}
            {post.readTime && (
              <>
                <span>&middot;</span>
                <span className="flex items-center gap-1">
                  <i className="ri-time-line"></i>
                  {post.readTime}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Article Body */}
      <main className="py-10 md:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          {/* Excerpt */}
          {post.excerpt && (
            <Reveal>
              <div className="border-l-4 border-primary pl-4 md:pl-5 mb-8 md:mb-10">
                <p className="font-roboto text-stone-600 text-sm md:text-base leading-relaxed italic">
                  {post.excerpt}
                </p>
              </div>
            </Reveal>
          )}

          {/* Body Content */}
          <Reveal delay={100}>
            <div
              className="font-roboto text-stone-700 text-sm leading-relaxed space-y-5 [&_h3]:font-roboto font-bold [&_h3]:text-lg [&_h3]:text-primary [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:leading-relaxed [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:leading-relaxed [&_strong]:text-stone-800 [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:p-2 [&_th]:bg-stone-50 [&_th]:font-roboto [&_th]:font-medium [&_th]:text-stone-600 [&_td]:p-2 [&_td]:border-t [&_td]:border-primary/12 [&_em]:text-stone-500"
              dangerouslySetInnerHTML={{ __html: post.body }}
            />
          </Reveal>

          {/* Related Neighbourhood Guides */}
          {relatedGuides.length > 0 && (
            <div className="mt-12 md:mt-16 pt-8">
              <Reveal>
                <h3 className="font-roboto font-bold text-lg text-primary mb-4">Related Area Guides</h3>
              </Reveal>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedGuides.map((guide, i) => (
                  <Reveal key={guide.slug} delay={i * 100}>
                    <Link
                      to={`/neighbourhood/${guide.slug}`}
                      className="group cursor-pointer block bg-stone-50 rounded-lg overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img
                          alt={guide.name}
                          className="w-full h-full object-cover object-top transition-transform duration-1000 ease-out group-hover:scale-110"
                          src={guide.heroImage}
                        />
                        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                          {guide.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-white/85 text-[9px] font-roboto font-medium text-stone-600 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-roboto font-bold text-sm text-primary mb-1">{guide.name} Guide</h4>
                        <p className="font-roboto text-stone-500 text-xs leading-relaxed line-clamp-2">
                          {guide.summary}
                        </p>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          )}

          {/* Back Link */}
          <div className="mt-8 md:mt-10 pt-6">
            <Link
              to="/neighbourhoods"
              className="inline-flex items-center gap-1.5 text-sm font-roboto font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              <i className="ri-arrow-left-line"></i>
              Back to Neighbourhoods &amp; Guides
            </Link>
          </div>
        </div>
      </main>

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-12 md:pb-16">
        <Reveal>
          <div className="text-center bg-stone-50 py-10 md:py-14 px-4 md:px-6 rounded-lg">
            <h3 className="font-roboto font-bold text-xl text-primary mb-3">
              Need Personalised Neighbourhood Advice?
            </h3>
            <p className="font-roboto text-stone-500 text-sm max-w-xl mx-auto mb-6">
              Our agents live and breathe Nairobi&apos;s neighbourhoods. Tell us what matters to you — schools, commute, budget, lifestyle — and we&apos;ll match you with the perfect area.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white border-2 border-primary text-sm font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Talk to an Agent
              <i className="ri-arrow-right-line text-xs"></i>
            </Link>
          </div>
        </Reveal>
      </div>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}

function estimateReadTime(body: string): string {
  const words = body.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}