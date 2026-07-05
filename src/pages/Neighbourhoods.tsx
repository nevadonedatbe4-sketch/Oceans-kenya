import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { neighborhoods as mockNeighborhoods } from '@/mocks/neighborhoods';
import { properties as mockProperties } from '@/mocks/properties';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import ContactCTA from '@/components/feature/ContactCTA';

interface DBNeighbourhood {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  city: string;
  country: string;
  hero_image: string | null;
  image?: string | null;
  summary: string | null;
  description: string | null;
  tags: string[] | null;
  vibe: string | null;
  target_market: string | null;
  propertyCount: number;
  is_published: boolean;
  content_html: string | null;
  expat_guide: string | null;
  practical_info: string | null;
  average_sale_price: number | null;
  rental_range_kes: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  author: string | null;
  featured_image: string | null;
  excerpt: string | null;
  published_at: string | null;
}

type TabKey = 'neighbourhoods' | 'guides' | 'blog';
type FilterKey = 'all' | 'sale' | 'rent' | 'luxury' | 'family';

export default function Neighbourhoods() {
  const [activeTab, setActiveTab] = useState<TabKey>('neighbourhoods');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoods, setHoods] = useState<DBNeighbourhood[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalNeighbourhoods: 0,
    totalListings: 0,
    forSale: 0,
    forRent: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: dbHoods, error: hoodError } = await supabase
          .from('neighbourhoods')
          .select(
            'id, name, slug, sort_order, city, country, hero_image, summary, description, tags, vibe, target_market, content_html, expat_guide, practical_info, average_sale_price, rental_range_kes, is_published'
          )
          .eq('is_published', true)
          .order('sort_order', { ascending: true });

        if (!hoodError && dbHoods && dbHoods.length > 0) {
          const { data: listingsData } = await supabase
            .from('listings')
            .select('neighbourhood, purpose, location')
            .eq('is_published', true)
            .eq('status', 'available');

          const enriched = dbHoods.map((h) => {
            const name = h.name;
            const areaListings =
              listingsData?.filter(
                (l) =>
                  (l.neighbourhood && l.neighbourhood.toLowerCase() === name.toLowerCase()) ||
                  (l.location && l.location.toLowerCase().includes(name.toLowerCase()))
              ) || [];
            const saleCount = areaListings.filter((l) => l.purpose === 'sale').length;
            const rentCount = areaListings.filter((l) => l.purpose === 'rent').length;
            const totalCount = areaListings.length;

            return {
              ...h,
              propertyCount: totalCount > 0 ? totalCount : 0,
              _saleCount: saleCount,
              _rentCount: rentCount,
            } as DBNeighbourhood & { _saleCount: number; _rentCount: number };
          });

          setHoods(enriched as unknown as DBNeighbourhood[]);

          const allListings = listingsData || [];
          setStats({
            totalNeighbourhoods: dbHoods.length,
            totalListings: allListings.length,
            forSale: allListings.filter((l) => l.purpose === 'sale').length,
            forRent: allListings.filter((l) => l.purpose === 'rent').length,
          });
        } else {
          const fallback = mockNeighborhoods.map((n) => ({
            id: n.id,
            name: n.name,
            slug: n.slug,
            sort_order: n.sort_order || 0,
            city: 'Nairobi',
            country: 'Kenya',
            hero_image: n.image || n.hero_image || null,
            image: n.image || n.hero_image || null,
            summary: n.summary || n.description || null,
            description: n.longDescription || null,
            tags: n.tags || [],
            vibe: n.vibe || null,
            target_market: n.target_market || null,
            propertyCount: n.propertyCount,
            is_published: true,
            content_html: null,
            expat_guide: null,
            practical_info: null,
            average_sale_price: n.average_sale_price || null,
            rental_range_kes: n.rental_range_kes || null,
          }));
          setHoods(fallback);

          const saleCount = mockProperties.filter((p) => p.type === 'sale').length;
          const rentCount = mockProperties.filter((p) => p.type === 'rent').length;
          setStats({
            totalNeighbourhoods: mockNeighborhoods.length,
            totalListings: mockProperties.length,
            forSale: saleCount,
            forRent: rentCount,
          });
        }

        const { data: posts } = await supabase
          .from('blog_posts')
          .select('id, title, slug, category, author, featured_image, excerpt, published_at')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(6);

        if (posts && posts.length > 0) {
          setBlogPosts(posts);
        } else {
          setBlogPosts(getMockBlogPosts());
        }
      } catch {
        const fallback = mockNeighborhoods.map((n) => ({
          id: n.id,
          name: n.name,
          slug: n.slug,
          sort_order: n.sort_order || 0,
          city: 'Nairobi',
          country: 'Kenya',
          hero_image: n.image || n.hero_image || null,
          image: n.image || n.hero_image || null,
          summary: n.summary || n.description || null,
          description: n.longDescription || null,
          tags: n.tags || [],
          vibe: n.vibe || null,
          target_market: n.target_market || null,
          propertyCount: n.propertyCount,
          is_published: true,
          content_html: null,
          expat_guide: null,
          practical_info: null,
          average_sale_price: n.average_sale_price || null,
          rental_range_kes: n.rental_range_kes || null,
        }));
        setHoods(fallback);
        setBlogPosts(getMockBlogPosts());
        const saleCount = mockProperties.filter((p) => p.type === 'sale').length;
        const rentCount = mockProperties.filter((p) => p.type === 'rent').length;
        setStats({
          totalNeighbourhoods: mockNeighborhoods.length,
          totalListings: mockProperties.length,
          forSale: saleCount,
          forRent: rentCount,
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredHoods = useMemo(() => {
    let result = [...hoods];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.summary && h.summary.toLowerCase().includes(q)) ||
          (h.description && h.description.toLowerCase().includes(q)) ||
          (h.tags && h.tags.some((t) => t.toLowerCase().includes(q))) ||
          h.city.toLowerCase().includes(q)
      );
    }

    if (activeFilter === 'luxury') {
      result = result.filter(
        (h) =>
          h.tags &&
          h.tags.some((t) => ['luxury', 'ultra-exclusive', 'prestigious'].includes(t.toLowerCase()))
      );
    } else if (activeFilter === 'family') {
      result = result.filter(
        (h) =>
          h.tags && h.tags.some((t) => ['family', 'family-friendly', 'gated'].includes(t.toLowerCase()))
      );
    } else if (activeFilter === 'sale') {
      result = result.filter((h) => h.propertyCount > 0);
    } else if (activeFilter === 'rent') {
      result = result.filter((h) => h.propertyCount > 0);
    }

    return result;
  }, [hoods, searchQuery, activeFilter]);

  const guideHoods = useMemo(() => {
    return hoods.filter((h) => h.expat_guide || h.content_html || h.practical_info);
  }, [hoods]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative pt-28 md:pt-32 pb-16 md:pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            alt="Nairobi skyline"
            className="w-full h-full object-cover object-top"
            src="https://readdy.ai/api/search-image?query=Aerial%20panoramic%20view%20of%20Nairobi%20Kenya%20skyline%20at%20golden%20hour%20with%20modern%20high-rise%20buildings%20green%20urban%20canopy%20and%20Ngong%20Hills%20in%20the%20distance%20warm%20sunset%20lighting%20professional%20cityscape%20photography&width=1920&height=600&seq=177800101&orientation=landscape"
          />
          <div className="absolute inset-0 bg-primary/80"></div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 text-center">
          <p className="text-golden text-xs md:text-sm font-roboto font-semibold uppercase tracking-[0.35em] mb-3">
            Explore the City
          </p>
          <h1 className="font-prata text-3xl md:text-5xl text-white mb-4 leading-tight">
            Neighbourhoods &amp; Guides
          </h1>
          <p className="font-roboto text-white/80 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Discover Nairobi&apos;s most desirable residential enclaves. From the diplomatic grandeur
            of Runda to the urban energy of Kilimani, each neighbourhood offers a distinct lifestyle
            and investment opportunity.
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-stone-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="text-center">
              <p className="font-prata text-xl md:text-2xl text-primary">{stats.totalNeighbourhoods}</p>
              <p className="font-roboto text-stone-400 text-[10px] md:text-xs uppercase tracking-wider">Neighbourhoods</p>
            </div>
            <div className="text-center">
              <p className="font-prata text-xl md:text-2xl text-primary">{stats.totalListings}</p>
              <p className="font-roboto text-stone-400 text-[10px] md:text-xs uppercase tracking-wider">Active Listings</p>
            </div>
            <div className="text-center">
              <p className="font-prata text-xl md:text-2xl text-primary">{stats.forSale}</p>
              <p className="font-roboto text-stone-400 text-[10px] md:text-xs uppercase tracking-wider">For Sale</p>
            </div>
            <div className="text-center">
              <p className="font-prata text-xl md:text-2xl text-primary">{stats.forRent}</p>
              <p className="font-roboto text-stone-400 text-[10px] md:text-xs uppercase tracking-wider">To Let</p>
            </div>
          </div>
        </div>
      </section>

      <main className="py-10 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6 md:mb-8">
            <ol className="flex items-center gap-2 text-xs font-roboto text-stone-400">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              </li>
              <li>
                <i className="ri-arrow-right-s-line text-stone-300"></i>
              </li>
              <li className="text-primary font-medium">Neighbourhoods</li>
            </ol>
          </nav>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-stone-100 mb-6 md:mb-8 overflow-x-auto">
            {[
              { key: 'neighbourhoods' as TabKey, label: 'Neighbourhoods', icon: 'ri-map-pin-2-line' },
              { key: 'guides' as TabKey, label: 'Area Guides', icon: 'ri-book-open-line' },
              { key: 'blog' as TabKey, label: 'Blog', icon: 'ri-article-line' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs md:text-sm font-roboto transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Neighbourhoods */}
          {activeTab === 'neighbourhoods' && (
            <div className="space-y-6 md:space-y-8">
              {/* Search & Filters */}
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="relative flex-1 max-w-md">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm"></i>
                  <input
                    type="text"
                    placeholder="Search neighbourhoods..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm font-roboto focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { key: 'all' as FilterKey, label: 'All Areas' },
                    { key: 'sale' as FilterKey, label: 'For Sale' },
                    { key: 'rent' as FilterKey, label: 'For Rent' },
                    { key: 'luxury' as FilterKey, label: 'Luxury' },
                    { key: 'family' as FilterKey, label: 'Family' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setActiveFilter(f.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-roboto font-medium transition-all cursor-pointer whitespace-nowrap ${
                        activeFilter === f.key
                          ? 'bg-primary text-white'
                          : 'bg-stone-50 text-stone-500 hover:bg-stone-100 border border-stone-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-stone-50 rounded-lg aspect-[4/3] animate-pulse" />
                  ))}
                </div>
              ) : filteredHoods.length === 0 ? (
                <div className="text-center py-16 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
                    <i className="ri-map-pin-line text-stone-400 text-xl"></i>
                  </div>
                  <p className="font-prata text-base text-primary mb-1">No Neighbourhoods Found</p>
                  <p className="font-roboto text-stone-400 text-xs">Try adjusting your search or filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredHoods.map((n) => (
                    <Link
                      key={n.id}
                      to={`/neighbourhood/${n.slug}`}
                      className="group cursor-pointer block bg-white rounded-lg overflow-hidden border border-stone-100 hover:border-stone-200 transition-all duration-300"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img
                          alt={n.name}
                          className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                          src={n.hero_image || ''}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          {n.tags &&
                            n.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-[10px] font-roboto font-medium text-stone-600 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-white/80 text-[10px] font-roboto font-medium tracking-wide">
                            {n.propertyCount} Properties
                          </p>
                          <h3 className="text-white text-lg font-prata leading-tight drop-shadow-sm mt-0.5">
                            {n.name}
                          </h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="font-roboto text-stone-500 text-xs leading-relaxed line-clamp-2">
                          {n.summary || n.description || ''}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                          <span className="font-roboto text-[10px] text-stone-400 uppercase tracking-wider">
                            {n.city}, {n.country}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-roboto font-medium text-primary group-hover:text-primary/80 transition-colors">
                            Explore
                            <i className="ri-arrow-right-line"></i>
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Area Guides */}
          {activeTab === 'guides' && (
            <div className="space-y-6">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-stone-50 rounded-lg h-48 animate-pulse" />
                  ))}
                </div>
              ) : guideHoods.length === 0 ? (
                <div className="text-center py-16 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
                    <i className="ri-book-open-line text-stone-400 text-xl"></i>
                  </div>
                  <p className="font-prata text-base text-primary mb-1">No Guides Yet</p>
                  <p className="font-roboto text-stone-400 text-xs">Area guides are coming soon.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {guideHoods.map((h) => (
                    <Link
                      key={h.id}
                      to={`/neighbourhood/${h.slug}`}
                      className="group cursor-pointer flex flex-col sm:flex-row bg-white rounded-lg overflow-hidden border border-stone-100 hover:border-stone-200 transition-all duration-300"
                    >
                      <div className="sm:w-48 h-40 sm:h-auto shrink-0 relative overflow-hidden bg-stone-100">
                        {h.hero_image ? (
                          <img
                            alt={h.name}
                            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                            src={h.hero_image}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className="ri-image-line text-stone-300 text-2xl" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col justify-between flex-1">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {h.tags &&
                              h.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-stone-50 text-[10px] font-roboto font-medium text-stone-500 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                          </div>
                          <h3 className="font-prata text-base text-primary mb-1">{h.name} Guide</h3>
                          <p className="font-roboto text-stone-500 text-xs leading-relaxed line-clamp-3">
                            {h.summary || h.description || ''}
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                          <span className="font-roboto text-[10px] text-stone-400 uppercase tracking-wider">
                            {h.city}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-roboto font-medium text-primary group-hover:text-primary/80 transition-colors">
                            Read Guide
                            <i className="ri-arrow-right-line"></i>
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Blog */}
          {activeTab === 'blog' && (
            <div className="space-y-6">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-stone-50 rounded-lg h-56 animate-pulse" />
                  ))}
                </div>
              ) : blogPosts.length === 0 ? (
                <div className="text-center py-16 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
                    <i className="ri-article-line text-stone-400 text-xl"></i>
                  </div>
                  <p className="font-prata text-base text-primary mb-1">No Blog Posts Yet</p>
                  <p className="font-roboto text-stone-400 text-xs">Check back soon for neighbourhood insights.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {blogPosts.map((post) => (
                    <div
                      key={post.id}
                      className="group cursor-default block bg-white rounded-lg overflow-hidden border border-stone-100 hover:border-stone-200 transition-all duration-300"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img
                          alt={post.title}
                          className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                          src={post.featured_image || ''}
                        />
                        {post.category && (
                          <div className="absolute top-3 left-3">
                            <span className="px-2 py-0.5 bg-primary/90 text-white text-[10px] font-roboto font-medium rounded-full">
                              {post.category}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-prata text-sm text-primary leading-snug mb-2 line-clamp-2 group-hover:text-primary/80 transition-colors">
                          {post.title}
                        </h3>
                        <p className="font-roboto text-stone-500 text-xs leading-relaxed line-clamp-2 mb-3">
                          {post.excerpt || ''}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-roboto text-stone-400">
                          {post.author && <span>{post.author}</span>}
                          {post.author && post.published_at && <span>&middot;</span>}
                          {post.published_at && (
                            <span>{new Date(post.published_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Area Guides & Insights Section */}
          {activeTab === 'neighbourhoods' && !loading && filteredHoods.length > 0 && (
            <div className="mt-16 md:mt-24">
              <div className="text-center mb-8 md:mb-10">
                <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.35em] mb-2">
                  Insights
                </p>
                <h2 className="font-prata text-2xl md:text-3xl text-primary mb-3">
                  Area Guides &amp; Insights
                </h2>
                <p className="font-roboto text-stone-500 text-sm max-w-2xl mx-auto">
                  In-depth guides to help you understand each neighbourhood&apos;s unique character, property market, and lifestyle.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredHoods.slice(0, 3).map((n) => (
                  <Link
                    key={n.id}
                    to={`/neighbourhood/${n.slug}`}
                    className="group cursor-pointer bg-stone-50 rounded-lg p-5 md:p-6 border border-stone-100 hover:border-stone-200 transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full shrink-0">
                        <i className="ri-map-pin-2-line text-primary text-lg"></i>
                      </div>
                      <div>
                        <h4 className="font-prata text-base text-primary mb-1">{n.name} Guide</h4>
                        <p className="font-roboto text-stone-500 text-xs leading-relaxed line-clamp-2">
                          {n.summary || n.description || ''}
                        </p>
                        <span className="flex items-center gap-1 text-[10px] font-roboto font-medium text-primary mt-2 group-hover:text-primary/80 transition-colors">
                          Read more
                          <i className="ri-arrow-right-line"></i>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-16 md:mt-24 text-center bg-stone-50 py-12 md:py-16 px-4 md:px-6 rounded-lg mx-3 md:mx-6 max-w-6xl mx-auto">
            <h3 className="font-prata text-xl md:text-2xl text-primary mb-3">
              Let Our Agents Guide You
            </h3>
            <p className="font-roboto text-stone-500 text-sm max-w-xl mx-auto mb-6">
              Not sure which neighbourhood fits your lifestyle and budget? Our experienced agents have deep local knowledge of every Nairobi enclave. Tell us your priorities and we will match you with the perfect area.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Speak to an Agent
              <i className="ri-arrow-right-line text-xs"></i>
            </Link>
          </div>
        </div>
      </main>

      <ContactCTA />
      <Footer />
      <BackToTop />
    </div>
  );
}

function getMockBlogPosts(): BlogPost[] {
  return [
    {
      id: '1',
      title: 'Why Karen Remains Nairobi\'s Most Desirable Family Suburb',
      slug: 'why-karen-remains-nairobi-most-desirable-family-suburb',
      category: 'Neighbourhood Guide',
      author: 'Sarah Kimani',
      featured_image:
        'https://readdy.ai/api/search-image?query=Beautiful%20suburban%20family%20home%20in%20Karen%20Nairobi%20with%20mature%20garden%20and%20large%20trees%20warm%20golden%20afternoon%20sunlight%20professional%20real%20estate%20photography&width=600&height=375&seq=blog-karen&orientation=landscape',
      excerpt:
        'Karen has consistently ranked as Nairobi\'s top family suburb for over a decade. We explore what makes this leafy enclave so special.',
      published_at: '2026-05-15T10:00:00Z',
    },
    {
      id: '2',
      title: 'The Rise of Kilimani: Nairobi\'s Urban Renaissance',
      slug: 'the-rise-of-kilimani-nairobi-urban-renaissance',
      category: 'Market Analysis',
      author: 'James Ochieng',
      featured_image:
        'https://readdy.ai/api/search-image?query=Modern%20high-rise%20apartment%20buildings%20in%20Kilimani%20Nairobi%20with%20rooftop%20terraces%20and%20city%20skyline%20views%20warm%20sunset%20lighting%20professional%20architecture%20photography&width=600&height=375&seq=blog-kilimani&orientation=landscape',
      excerpt:
        'How Kilimani transformed from a quiet residential area into Nairobi\'s most vibrant cosmopolitan hub, and what it means for investors.',
      published_at: '2026-05-10T10:00:00Z',
    },
    {
      id: '3',
      title: 'Investing in Runda: A Diplomatic Enclave with Enduring Value',
      slug: 'investing-in-runda-diplomatic-enclave-enduring-value',
      category: 'Investment',
      author: 'Amina Hassan',
      featured_image:
        'https://readdy.ai/api/search-image?query=Grand%20luxury%20estate%20home%20in%20Runda%20Nairobi%20with%20manicured%20garden%20and%20driveway%20mature%20trees%20and%20green%20hedges%20professional%20real%20estate%20photography%20warm%20lighting&width=600&height=375&seq=blog-runda&orientation=landscape',
      excerpt:
        'Runda\'s unique position as a diplomatic enclave makes it one of the most stable and appreciating property markets in East Africa.',
      published_at: '2026-05-05T10:00:00Z',
    },
    {
      id: '4',
      title: 'Kileleshwa: The Best-Value Upscale Neighbourhood in Nairobi',
      slug: 'kileleshwa-best-value-upscale-neighbourhood-nairobi',
      category: 'Neighbourhood Guide',
      author: 'David Mwangi',
      featured_image:
        'https://readdy.ai/api/search-image?query=Modern%20apartment%20complex%20in%20Kileleshwa%20Nairobi%20with%20panoramic%20city%20view%20from%20hillside%20warm%20afternoon%20light%20professional%20real%20estate%20photography&width=600&height=375&seq=blog-kileleshwa&orientation=landscape',
      excerpt:
        'Kileleshwa offers the perfect balance of upscale living and value for money. Discover why savvy investors are flocking here.',
      published_at: '2026-04-28T10:00:00Z',
    },
    {
      id: '5',
      title: 'A First-Timer\'s Guide to Buying Property in Nairobi',
      slug: 'first-timers-guide-buying-property-nairobi',
      category: 'Buyers Guide',
      author: 'Grace Njoroge',
      featured_image:
        'https://readdy.ai/api/search-image?query=Happy%20family%20holding%20house%20keys%20in%20front%20of%20modern%20home%20in%20Nairobi%20Kenya%20warm%20natural%20lighting%20professional%20lifestyle%20photography&width=600&height=375&seq=blog-buyers&orientation=landscape',
      excerpt:
        'Everything you need to know about the property buying process in Nairobi, from legal requirements to financing options.',
      published_at: '2026-04-20T10:00:00Z',
    },
    {
      id: '6',
      title: 'Westlands vs Kilimani: Where Should You Live?',
      slug: 'westlands-vs-kilimani-where-should-you-live',
      category: 'Comparison',
      author: 'Peter Omondi',
      featured_image:
        'https://readdy.ai/api/search-image?query=Split%20view%20of%20modern%20Westlands%20and%20Kilimani%20Nairobi%20skyline%20with%20high-rise%20buildings%20and%20city%20lights%20evening%20warm%20tones%20professional%20cityscape%20photography&width=600&height=375&seq=blog-vs&orientation=landscape',
      excerpt:
        'We compare Nairobi\'s two most popular urban neighbourhoods on lifestyle, property prices, amenities, and investment potential.',
      published_at: '2026-04-15T10:00:00Z',
    },
  ];
}