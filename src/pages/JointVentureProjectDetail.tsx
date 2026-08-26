import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { supabase } from '@/lib/supabase';
import { normalizeJvProjectImages, type JvImage } from '@/lib/jvImages';

interface JvProjectDetail {
  id: string;
  title: string;
  location: string;
  type: string;
  units: number;
  status: string;
  priceRange: string;
  description: string;
  images: JvImage[];
}

export default function JointVentureProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<JvProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      setNotFound(false);

      const { data, error: dbError } = await supabase
        .from('jv_projects')
        .select('id, title, slug, location, type, units, status, price_range, description, image, jv_project_images(id, image_url, storage_path, alt_text, sort_order, is_cover)')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (cancelled) return;

      if (dbError) {
        setError(dbError.message || 'Failed to load project');
        setLoading(false);
        return;
      }

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const title = String(data.title || '');
      const legacyImage = String(data.image || '') || null;

      setProject({
        id: String(data.id),
        title,
        location: String(data.location || ''),
        type: String(data.type || ''),
        units: Number(data.units) || 0,
        status: String(data.status || ''),
        priceRange: String(data.price_range || ''),
        description: String(data.description || ''),
        images: normalizeJvProjectImages(data.jv_project_images, legacyImage, title),
      });
      setActiveIdx(0);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const images = project?.images || [];
  const hasMultiple = images.length > 1;
  const activeImage = images[activeIdx];

  const goNext = () => setActiveIdx((prev) => (prev + 1 >= images.length ? 0 : prev + 1));
  const goPrev = () => setActiveIdx((prev) => (prev - 1 < 0 ? images.length - 1 : prev - 1));

  return (
    <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
      <Header />

      {/* Loading */}
      {loading && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 bg-stone-200 rounded" />
            <div className="h-[420px] bg-stone-200 rounded-sm" />
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-20 bg-stone-200 rounded-sm" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Error */}
      {!loading && error && (
        <section className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full mx-auto mb-4">
            <i className="ri-error-warning-line text-2xl text-red-400" />
          </div>
          <h1 className="font-prata text-primary text-2xl mb-3">Something went wrong</h1>
          <p className="text-primary/70 font-roboto text-sm mb-6">{error}</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs tracking-widest uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
            >
              <i className="ri-refresh-line" /> Try Again
            </button>
            <Link
              to="/joint-ventures"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary/20 text-primary text-xs tracking-widest uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-stone-50 transition-colors"
            >
              Back to projects
            </Link>
          </div>
        </section>
      )}

      {/* Not found */}
      {!loading && !error && notFound && (
        <section className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="w-16 h-16 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-4">
            <i className="ri-building-2-line text-2xl text-primary/50" />
          </div>
          <h1 className="font-prata text-primary text-2xl mb-3">Project not found</h1>
          <p className="text-primary/70 font-roboto text-sm mb-6">
            This project may have been unpublished or removed.
          </p>
          <Link
            to="/joint-ventures"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#002349] text-white text-xs tracking-widest uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-white hover:text-[#002349] border-2 border-[#002349] transition-colors"
          >
            <i className="ri-arrow-left-line" /> View all projects
          </Link>
        </section>
      )}

      {/* Project content */}
      {!loading && !error && project && (
        <>
          {/* Breadcrumb band */}
          <section className="border-b border-primary/10">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-2 text-xs font-roboto text-primary/60">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <i className="ri-arrow-right-s-line" />
              <Link to="/joint-ventures" className="hover:text-primary transition-colors">Joint Ventures</Link>
              <i className="ri-arrow-right-s-line" />
              <span className="text-primary font-medium truncate max-w-[260px]">{project.title}</span>
            </div>
          </section>

          <section className="max-w-6xl mx-auto px-6 py-8 md:py-12">
            {/* Title + meta */}
            <div className="mb-6 md:mb-8">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-block px-3 py-1 bg-accent/15 text-accent text-[10px] uppercase tracking-wider font-bold font-roboto">
                  {project.type || 'Project'}
                </span>
                <span className="inline-block px-3 py-1 bg-primary/5 text-primary text-[10px] uppercase tracking-wider font-bold font-roboto">
                  {project.status}
                </span>
              </div>
              <h1 className="font-prata text-primary text-2xl md:text-4xl leading-tight mb-3">
                {project.title}
              </h1>
              {project.location && (
                <p className="text-primary/60 font-roboto text-sm flex items-center gap-1.5">
                  <i className="ri-map-pin-2-line text-golden" />
                  {project.location}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
              {/* Gallery */}
              <div className="lg:col-span-2">
                <div className="relative bg-stone-100 overflow-hidden rounded-sm">
                  {activeImage ? (
                    <img
                      src={activeImage.url}
                      alt={activeImage.alt}
                      className="w-full h-[300px] md:h-[440px] object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-[300px] md:h-[440px] flex items-center justify-center">
                      <i className="ri-building-2-line text-4xl text-primary/30" />
                    </div>
                  )}

                  {hasMultiple && (
                    <>
                      <span className="absolute bottom-3 right-3 bg-black/55 text-white text-[11px] font-roboto font-semibold px-2.5 py-1 rounded-sm tracking-wider">
                        {activeIdx + 1} / {images.length}
                      </span>
                      <button
                        type="button"
                        onClick={goPrev}
                        aria-label="Previous image"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center cursor-pointer hover:bg-black/65 transition-colors"
                      >
                        <i className="ri-arrow-left-s-line text-lg"></i>
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        aria-label="Next image"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center cursor-pointer hover:bg-black/65 transition-colors"
                      >
                        <i className="ri-arrow-right-s-line text-lg"></i>
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2.5 mt-3 flex-wrap">
                    {images.map((img, idx) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setActiveIdx(idx)}
                        aria-label={`View image ${idx + 1}`}
                        className={`w-16 h-14 md:w-20 md:h-16 rounded-sm overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 ${
                          idx === activeIdx ? 'border-golden' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info panel */}
              <div className="lg:col-span-1">
                <div className="border-2 border-primary/12 bg-white p-6 md:p-7 sticky top-24">
                  <h2 className="font-roboto font-bold text-primary text-sm uppercase tracking-widest mb-5">
                    Project Details
                  </h2>

                  <div className="space-y-4 mb-6">
                    {project.units > 0 && (
                      <div className="flex items-center justify-between py-3 border-b border-primary/10">
                        <span className="text-primary/60 font-roboto text-sm flex items-center gap-2">
                          <i className="ri-building-line text-golden" /> Units
                        </span>
                        <span className="font-roboto font-bold text-primary text-sm">{project.units}</span>
                      </div>
                    )}
                    {project.priceRange && (
                      <div className="flex items-center justify-between py-3 border-b border-primary/10">
                        <span className="text-primary/60 font-roboto text-sm flex items-center gap-2">
                          <i className="ri-funds-line text-golden" /> Price Range
                        </span>
                        <span className="font-roboto font-bold text-primary text-sm">{project.priceRange}</span>
                      </div>
                    )}
                    {project.type && (
                      <div className="flex items-center justify-between py-3 border-b border-primary/10">
                        <span className="text-primary/60 font-roboto text-sm flex items-center gap-2">
                          <i className="ri-layout-grid-line text-golden" /> Type
                        </span>
                        <span className="font-roboto font-bold text-primary text-sm">{project.type}</span>
                      </div>
                    )}
                    {project.status && (
                      <div className="flex items-center justify-between py-3 border-b border-primary/10">
                        <span className="text-primary/60 font-roboto text-sm flex items-center gap-2">
                          <i className="ri-pulse-line text-golden" /> Status
                        </span>
                        <span className="font-roboto font-bold text-accent text-sm">{project.status}</span>
                      </div>
                    )}
                  </div>

                  <Link
                    to="/joint-ventures"
                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-[#002349] text-white border-2 border-[#002349] font-roboto text-xs tracking-widest uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-white hover:text-[#002349] transition-colors mb-3"
                  >
                    <i className="ri-group-line" /> Partner with this project
                  </Link>
                  <button
                    onClick={() => navigate('/joint-ventures')}
                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 border border-primary/20 text-primary font-roboto text-xs tracking-widest uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-stone-50 transition-colors"
                  >
                    <i className="ri-arrow-left-line" /> All projects
                  </button>
                </div>
              </div>
            </div>

            {/* Description */}
            {project.description && (
              <div className="mt-10 md:mt-12 max-w-3xl">
                <h2 className="font-roboto font-bold text-primary text-xl md:text-2xl mb-4">
                  About this project
                </h2>
                <p className="text-primary/70 font-roboto text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            )}
          </section>
        </>
      )}

      <Footer />
      <BackToTop />
    </div>
  );
}