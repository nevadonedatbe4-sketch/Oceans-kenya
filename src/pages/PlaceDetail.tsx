import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbTrail from '@/components/feature/PageBreadcrumbTrail';
import NoImagePlaceholder from '@/components/feature/NoImagePlaceholder';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import { supabase } from '@/lib/supabase';
import { readReturnFrom, withReturnFrom, useCurrentPath } from '@/lib/navigation';
import {
  amenityImage,
  amenityMapsUrl,
  categoryColor,
  categoryLabel,
  subcategoryLabel,
  subcategoryMeta,
  amenityLabel,
  amenityLabelStyle,
  normalizeUrl,
  type Amenity,
} from '@/lib/amenities';
import {
  incrementViewCount,
  fetchReviews,
  recomputeAmenityRating,
  type AmenityReview,
} from '@/lib/directory';
import { normalizeAmenityRow } from '@/lib/publicAmenities';
import { usePageContent } from '@/hooks/usePageContent';
import { DEFAULT_PLACE_DETAIL } from '@/lib/pageCopy';

function renderStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

export default function PlaceDetail() {
  const { id } = useParams<{ id: string }>();
  const currentPath = useCurrentPath();
  const { search } = useLocation();
  const [place, setPlace] = useState<Amenity | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState<AmenityReview[]>([]);
  const [related, setRelated] = useState<Amenity[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const { content: c } = usePageContent('place_detail', DEFAULT_PLACE_DETAIL);

  // Review form state
  const [formName, setFormName] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formError, setFormError] = useState('');

  // Share popover
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .is('deleted_at', null)
        .is('attributes->>is_archived', null)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const place = normalizeAmenityRow(data as Amenity);
      setPlace(place);
      // Count the public view (a real visit to the published page).
      void incrementViewCount(place.id);
      // Load reviews (approved only for public display)
      const all = await fetchReviews(place.id);
      setReviews(all.filter((r) => r.moderation_status === 'approved'));
      // Related places in the same category
      const { data: rel } = await supabase
        .from('amenities')
        .select('*')
        .eq('is_published', true)
        .is('deleted_at', null)
        .is('attributes->>is_archived', null)
        .eq('category_id', place.category_id)
        .neq('id', place.id)
        .limit(6);
      setRelated(((rel || []) as Amenity[]).map(normalizeAmenityRow));
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('key, value')
      .like('key', 'amenity_category_color_%')
      .then(({ data }) => {
        if (data && data.length) {
          const overrides: Record<string, string> = {};
          (data as { key: string; value: string }[]).forEach((r) => {
            const cat = r.key.replace('amenity_category_color_', '');
            if (r.value) overrides[cat] = r.value;
          });
          setCategoryColors(overrides);
        }
      })
      .catch(() => {});
  }, []);

  // Close share popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const publicUrl = useMemo(() => {
    if (!place) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const path = `/directory/place/${place.slug || place.id}`;
    return `${base}${path}`;
  }, [place]);

  const shareLinks = useMemo(() => {
    if (!place) return [];
    const u = encodeURIComponent(publicUrl);
    const t = encodeURIComponent(place.name);
    return [
      { label: 'WhatsApp', icon: 'ri-whatsapp-line', href: `https://wa.me/?text=${t}%20${u}` },
      { label: 'Facebook', icon: 'ri-facebook-circle-line', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
      { label: 'X', icon: 'ri-twitter-x-line', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
      { label: 'LinkedIn', icon: 'ri-linkedin-box-line', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
      { label: 'Email', icon: 'ri-mail-line', href: `mailto:?subject=${t}&body=${u}` },
    ];
  }, [place, publicUrl]);

  const ratingSummary = useMemo(() => {
    if (!reviews.length) return { avg: null, count: 0 };
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    return { avg, count: reviews.length };
  }, [reviews]);

  const submitReview = async () => {
    if (!place) return;
    setFormError('');
    setFormMessage(null);
    if (formRating < 1 || formRating > 5) {
      setFormError('Please choose a star rating from 1 to 5.');
      return;
    }
    if (formText.trim().length < 10) {
      setFormError('Please write a short review (at least 10 characters).');
      return;
    }
    if (formText.trim().length > 500) {
      setFormError('Review must be under 500 characters.');
      return;
    }
    setFormSubmitting(true);
    // Basic spam guard: reject duplicate submissions within a short window for same name+text.
    const dup = reviews.some(
      (r) => (r.reviewer_name || '') === formName.trim() && (r.review_text || '') === formText.trim(),
    );
    if (dup) {
      setFormError('It looks like you already submitted this review.');
      setFormSubmitting(false);
      return;
    }
    const { error } = await supabase.from('amenity_reviews').insert({
      amenity_id: place.id,
      rating: formRating,
      review_text: formText.trim(),
      reviewer_name: formName.trim() || null,
      moderation_status: 'pending',
    });
    setFormSubmitting(false);
    if (error) {
      setFormError('We could not save your review right now. Please try again.');
      return;
    }
    await recomputeAmenityRating(place.id);
    setFormMessage({ type: 'success', text: 'Thank you! Your review is pending approval and will appear once reviewed.' });
    setFormName('');
    setFormRating(5);
    setFormText('');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setFormMessage({ type: 'success', text: 'Link copied to clipboard.' });
    } catch {
      setFormError('Could not copy the link automatically. Copy it from the address bar.');
    }
    setShareOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !place) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-24">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 bg-[#F3F0E9] rounded-full">
              <i className="ri-map-pin-2-line text-2xl text-primary" />
            </div>
            <h1 className="font-prata font-bold text-primary text-3xl mb-3">{c.notfound_title}</h1>
            <p className="font-roboto text-[#636363] text-sm mb-6 leading-relaxed">
              {c.notfound_text}
            </p>
            <Link
              to="/directory"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-jost font-semibold uppercase tracking-[0.08em] hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-arrow-left-line" /> {c.notfound_button}
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  const colour = categoryColor(place.category, categoryColors);
  const label = amenityLabel(place);
  const style = amenityLabelStyle(place, colour);
  const icon = style.icon || place.icon || 'ri-map-pin-2-line';
  const website = normalizeUrl(place.website);
  const maps = amenityMapsUrl(place);
  const gallery = Array.isArray(place.gallery) ? place.gallery.filter(Boolean) : [];
  const features = Array.isArray(place.attributes?.features) ? (place.attributes.features as string[]) : [];

  // Where "Back" should land when there is no recorded origin, and the
  // section crumb for the hierarchy breadcrumb.
  const placeSection =
    place.category === 'education'
      ? { to: '/schools', label: 'Schools' }
      : place.category === 'night_life'
        ? { to: '/night-life', label: 'Night Life' }
        : place.category
          ? { to: `/directory/${place.category}`, label: categoryLabel(place.category) }
          : { to: '/directory', label: 'Directory' };

  // Breadcrumbs reflect the real hierarchy (Home → Nairobi → [Area] → Section →
  // Name), never the user's browsing history.
  const fromCtx = readReturnFrom(search);
  const fromArea = fromCtx ? new URLSearchParams(fromCtx.split('?')[1] || '').get('area') : null;
  const crumbItems: { label: string; to?: string }[] = [
    { label: 'Home', to: '/' },
    { label: 'Nairobi', to: '/neighbourhoods' },
  ];
  if (place.category === 'education') {
    const areaName = fromArea || place.neighbourhood_name;
    if (areaName) crumbItems.push({ label: areaName, to: `/schools?area=${encodeURIComponent(areaName)}` });
    crumbItems.push({ label: 'Schools', to: '/schools' });
  } else {
    crumbItems.push({ label: placeSection.label, to: placeSection.to });
  }
  crumbItems.push({ label: place.name });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Hero */}
      <section className="relative h-[300px] md:h-[400px] overflow-hidden bg-[#081F47]">
        {amenityImage(place) ? (
          <img src={amenityImage(place)} alt={place.alt_text || place.name} className="w-full h-full object-cover object-center" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/50">
            <i className="ri-image-line text-3xl" />
            <span className="text-xs font-roboto font-semibold uppercase tracking-wider">{c.no_image_label}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-6 left-4 md:left-6 right-4 md:right-6 flex flex-col gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white w-fit" style={{ backgroundColor: style.bg, border: `1px solid ${style.border}` }}>
            <i className={`${icon} text-sm`} /> {label}
          </span>
          <h1 className="text-white font-prata font-bold text-3xl md:text-5xl">{place.name}</h1>
        </div>
      </section>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Breadcrumb */}
              <PageBreadcrumbTrail items={crumbItems} />

              {/* Description */}
              {place.description && (
                <section>
                  <h2 className="font-prata font-semibold text-primary text-xl mb-3">{c.about_heading}</h2>
                  <p className="font-roboto text-[#3A3A3A] text-[15px] leading-relaxed">{place.description}</p>
                </section>
              )}

              {/* Services offered + price range */}
              {(Array.isArray(place.services) && place.services.length > 0) && (
                <section>
                  <h2 className="font-prata font-semibold text-primary text-xl mb-3">{c.services_heading}</h2>
                  <div className="flex flex-wrap gap-2">
                    {place.services.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F3F0E9] text-[#3A3A3A] text-sm font-roboto">
                        <i className="ri-service-line text-primary text-sm" /> {s}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {place.price_range && (
                <section>
                  <h2 className="font-prata font-semibold text-primary text-xl mb-3">{c.price_range_heading}</h2>
                  <div className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-primary/15 bg-white">
                    <i className="ri-price-tag-3-line text-primary text-lg" />
                    <span className="font-roboto text-[#1a1a1a] text-base font-semibold">{place.price_range}</span>
                  </div>
                </section>
              )}

              {/* Contact / location */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(place.address || place.neighbourhood_name) && (
                  <div className="flex items-start gap-2">
                    <i className="ri-map-pin-line text-primary text-lg mt-0.5" />
                    <div>
                      <p className="text-xs text-[#636363] uppercase tracking-wider mb-0.5">{c.location_label}</p>
                      <p className="text-sm text-[#1a1a1a] font-medium">{place.address || place.neighbourhood_name}</p>
                      {place.neighbourhood_name && place.address && <p className="text-xs text-[#636363]">{place.neighbourhood_name}</p>}
                    </div>
                  </div>
                )}
                {place.opening_hours && (
                  <div className="flex items-start gap-2">
                    <i className="ri-time-line text-primary text-lg mt-0.5" />
                    <div>
                      <p className="text-xs text-[#636363] uppercase tracking-wider mb-0.5">{c.hours_label}</p>
                      <p className="text-sm text-[#1a1a1a] font-medium">{place.opening_hours}</p>
                    </div>
                  </div>
                )}
                {place.phone && (
                  <div className="flex items-start gap-2">
                    <i className="ri-phone-line text-primary text-lg mt-0.5" />
                    <div>
                      <p className="text-xs text-[#636363] uppercase tracking-wider mb-0.5">{c.phone_label}</p>
                      <a href={`tel:${place.phone}`} className="text-sm text-primary font-medium hover:underline">{place.phone}</a>
                    </div>
                  </div>
                )}
                {place.email && (
                  <div className="flex items-start gap-2">
                    <i className="ri-mail-line text-primary text-lg mt-0.5" />
                    <div>
                      <p className="text-xs text-[#636363] uppercase tracking-wider mb-0.5">{c.email_label}</p>
                      <a href={`mailto:${place.email}`} className="text-sm text-primary font-medium hover:underline break-all">{place.email}</a>
                    </div>
                  </div>
                )}
              </section>

              {/* Features */}
              {features.length > 0 && (
                <section>
                  <h2 className="font-prata font-semibold text-primary text-xl mb-3">{c.features_heading}</h2>
                  <div className="flex flex-wrap gap-2">
                    {features.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F3F0E9] text-[#3A3A3A] text-sm font-roboto">
                        <i className="ri-check-line text-primary text-sm" /> {f}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Gallery */}
              {gallery.length > 0 && (
                <section>
                  <h2 className="font-prata font-semibold text-primary text-xl mb-3">{c.gallery_heading}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gallery.map((url, i) => (
                      <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden">
                        <img src={url} alt={`${place.name} ${i + 1}`} className="w-full h-full object-cover object-center" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Reviews */}
              <section className="border-t border-primary/10 pt-8">
                <h2 className="font-prata font-semibold text-primary text-xl mb-4">{c.reviews_heading}</h2>
                <div className="flex items-center gap-3 mb-4">
                  {ratingSummary.avg != null ? (
                    <>
                      <span className="text-amber-500 text-2xl font-semibold">{ratingSummary.avg.toFixed(1)}</span>
                      <div>
                        <span className="text-amber-500 text-lg">{renderStars(Math.round(ratingSummary.avg))}</span>
                        <p className="text-xs text-[#636363]">{ratingSummary.count} review{ratingSummary.count === 1 ? '' : 's'}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-[#636363]">{c.no_reviews_text}</p>
                  )}
                </div>

                {place.google_review_text && (
                  <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="ri-google-fill text-base" style={{ color: '#4285F4' }} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#636363]">{c.from_google_label}</span>
                    </div>
                    <p className="font-roboto text-[#3A3A3A] text-sm leading-relaxed italic">&ldquo;{place.google_review_text}&rdquo;</p>
                  </div>
                )}

                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="border border-primary/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-amber-500 text-sm">{renderStars(r.rating)}</span>
                        <span className="text-xs text-[#636363]">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-[#1a1a1a] leading-relaxed">{r.review_text}</p>
                      <p className="text-xs text-[#636363] mt-2 font-medium">{r.reviewer_name || 'Anonymous'} · <span className="text-primary/70">{c.verified_visitor}</span></p>
                    </div>
                  ))}
                </div>

                {/* Write a review */}
                <div className="mt-8 border border-primary/10 rounded-lg p-5 bg-[#FBFBFB]">
                  <h3 className="font-roboto font-semibold text-primary text-base mb-3">{c.write_review_heading}</h3>
                  {formMessage && (
                    <div className={`mb-3 px-3 py-2.5 rounded-md text-sm ${formMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {formMessage.text}
                    </div>
                  )}
                  {formError && <div className="mb-3 px-3 py-2.5 rounded-md text-sm bg-red-50 text-red-700">{formError}</div>}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#636363] uppercase tracking-wider mb-1.5">{c.rating_label}</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setFormRating(n)}
                            className={`text-2xl cursor-pointer transition-colors ${formRating >= n ? 'text-amber-500' : 'text-[#d6dbe1]'}`}
                            aria-label={`${n} star${n === 1 ? '' : 's'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#636363] uppercase tracking-wider mb-1.5">{c.name_label}</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        maxLength={60}
                        placeholder={c.name_placeholder}
                        className="w-full px-3 py-2.5 border border-primary/20 rounded-md text-sm font-roboto text-[#1a1a1a] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#636363] uppercase tracking-wider mb-1.5">{c.review_label}</label>
                      <textarea
                        value={formText}
                        onChange={(e) => setFormText(e.target.value)}
                        maxLength={500}
                        rows={4}
                        placeholder={c.review_placeholder}
                        className="w-full px-3 py-2.5 border border-primary/20 rounded-md text-sm font-roboto text-[#1a1a1a] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-[11px] text-[#636363]">{c.moderated_note}</span>
                        <span className={`text-[11px] ${formText.length > 450 ? 'text-red-600' : 'text-[#636363]'}`}>{formText.length}/500</span>
                      </div>
                    </div>
                    <button
                      onClick={submitReview}
                      disabled={formSubmitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      <i className={`${formSubmitting ? 'ri-loader-4-line animate-spin' : 'ri-chat-3-line'}`} />
                      {formSubmitting ? c.submitting : c.submit_review}
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-5 lg:sticky lg:top-24 h-fit">
              {/* Map */}
              {maps && (
                <div className="rounded-lg overflow-hidden border border-primary/10">
                  <iframe
                    title={`Map of ${place.name}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(place.latitude != null && place.longitude != null ? `${place.latitude},${place.longitude}` : place.address || place.name)}&output=embed`}
                    width="100%"
                    height="220"
                    loading="lazy"
                    className="border-0 w-full"
                  />
                </div>
              )}

              {/* Quick facts */}
              <div className="rounded-lg border border-primary/10 p-4 bg-white">
                <p className="text-xs text-[#636363] uppercase tracking-wider mb-2">{c.quick_facts}</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-[#636363]">{c.category_label}</span><span className="text-primary font-medium">{categoryLabel(place.category)}</span></div>
                  {place.subcategory && <div className="flex justify-between"><span className="text-[#636363]">{c.type_label}</span><span className="text-primary font-medium">{subcategoryLabel(place.subcategory)}</span></div>}
                  {place.price_range && <div className="flex justify-between"><span className="text-[#636363]">{c.price_fact_label}</span><span className="text-primary font-medium">{place.price_range}</span></div>}
                  {place.neighbourhood_name && <div className="flex justify-between"><span className="text-[#636363]">{c.area_label}</span><span className="text-primary font-medium">{place.neighbourhood_name}</span></div>}
                  {(place.view_count || 0) > 0 && <div className="flex justify-between"><span className="text-[#636363]">{c.views_label}</span><span className="text-primary font-medium">{(place.view_count || 0).toLocaleString()}</span></div>}
                </div>
              </div>

              {/* Actions + share */}
              <div className="rounded-lg border border-primary/10 p-4 bg-white space-y-2.5">
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
                    {c.visit_website} <i className="ri-external-link-line" />
                  </a>
                )}
                {maps && (
                  <a href={maps} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 border border-primary/25 text-primary rounded-md text-sm font-semibold hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap">
                    {c.get_directions} <i className="ri-map-pin-line" />
                  </a>
                )}
                {place.phone && (
                  <a href={`tel:${place.phone}`} className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 border border-primary/25 text-primary rounded-md text-sm font-semibold hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap">
                    {c.call_button} <i className="ri-phone-line" />
                  </a>
                )}

                {/* Share */}
                <div ref={shareRef} className="relative">
                  <button onClick={() => setShareOpen((s) => !s)} className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 border border-primary/25 text-primary rounded-md text-sm font-semibold hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap">
                    <i className="ri-share-line" /> {c.share_button}
                  </button>
                  {shareOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-white border border-primary/10 rounded-lg shadow-xl overflow-hidden animate-float-in">
                      <div className="px-4 py-3 grid grid-cols-3 gap-2">
                        {shareLinks.map((s) => (
                          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 py-2 rounded-md hover:bg-[#F3F0E9] transition-colors cursor-pointer">
                            <i className={`${s.icon} text-lg text-primary`} />
                            <span className="text-[10px] text-[#636363]">{s.label}</span>
                          </a>
                        ))}
                      </div>
                      <button onClick={copyLink} className="w-full inline-flex items-center justify-center gap-2 py-2.5 border-t border-primary/10 text-sm text-primary hover:bg-[#F3F0E9] transition-colors cursor-pointer">
                        <i className="ri-link" /> {c.copy_link}
                      </button>
                      <button
                        onClick={() => { window.print(); }}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 border-t border-primary/10 text-sm text-primary hover:bg-[#F3F0E9] transition-colors cursor-pointer"
                      >
                        <i className="ri-file-pdf-2-line" /> {c.download_pdf}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="font-prata font-semibold text-primary text-xl mb-4">{c.related_heading_prefix} {categoryLabel(place.category)}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Link key={r.id} to={withReturnFrom(`/directory/place/${r.slug || r.id}`, currentPath)} className="group rounded-lg overflow-hidden border border-primary/10 hover:border-primary/25 transition-colors">
                    <div className="aspect-[4/5] overflow-hidden">
                      {amenityImage(r) ? (
                        <img src={amenityImage(r)} alt={r.name} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <NoImagePlaceholder compact />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-roboto font-semibold text-primary truncate group-hover:text-[#0D5959]">{r.name}</p>
                      <p className="text-xs text-[#636363] truncate">{r.neighbourhood_name || 'Nairobi'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}