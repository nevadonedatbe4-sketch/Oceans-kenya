import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface AboutStat {
  value: string;
  label: string;
}

export interface AboutCard {
  icon: string;
  title: string;
  desc: string;
}

export interface AboutTimelineItem {
  year: string;
  event: string;
}

export interface AboutPageContent {
  // Intro
  intro_eyebrow: string;
  intro_title: string;
  intro_image: string;
  intro_badge_value: string;
  intro_badge_label: string;
  intro_p1: string;
  intro_p2: string;
  intro_p3_lead: string;
  intro_p3_body: string;
  intro_btn1_label: string;
  intro_btn1_link: string;
  intro_btn2_label: string;
  intro_btn2_link: string;
  // Stats
  stats: AboutStat[];
  // Why choose
  why_eyebrow: string;
  why_heading: string;
  why_cards: AboutCard[];
  // Mission & vision
  mission_eyebrow: string;
  mission_heading: string;
  mission_bg_image: string;
  mission_label: string;
  mission_text: string;
  vision_label: string;
  vision_text: string;
  values: AboutCard[];
  // Story
  story_eyebrow: string;
  story_heading: string;
  story_p1: string;
  story_p2: string;
  story_image: string;
  story_badge_value: string;
  story_badge_label: string;
  timeline: AboutTimelineItem[];
  // CTA
  cta_eyebrow: string;
  cta_heading: string;
  cta_text: string;
  cta_btn1_label: string;
  cta_btn1_link: string;
  cta_btn2_label: string;
  cta_btn2_link: string;
}

const IMG = (p: string) => `https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/${p}`;

export const DEFAULT_ABOUT_CONTENT: AboutPageContent = {
  intro_eyebrow: 'Oceans Kenya',
  intro_title: 'About Oceans Kenya',
  intro_image: IMG('80654c03-86fa-4eb2-bc42-7d6b94688b6b_compressed_5016c457-f096-4879-8937-a60638aac297.webp'),
  intro_badge_value: 'Est. 2015',
  intro_badge_label: 'Nairobi, Kenya',
  intro_p1: 'Welcome to Oceans Kenya, where luxury meets lifestyle in the heart of Nairobi, Kenya!',
  intro_p2: "At Oceans, we don't just sell properties - we curate exceptional living experiences for the discerning middle-class to high-end individuals. Our passion for real estate goes beyond bricks and mortar; it's about creating homes that resonate with your aspirations and lifestyle.",
  intro_p3_lead: 'Why Oceans?',
  intro_p3_body: "Because we understand that your home is more than just a place - it's a reflection of your unique taste, personality, and the life you've worked hard to build. Whether you're seeking a chic urban apartment, a luxurious villa, or a stylish penthouse with panoramic views, Oceans Kenya is your gateway to the most exclusive and desirable properties in Nairobi.",
  intro_btn1_label: 'Browse Properties',
  intro_btn1_link: '/all-properties',
  intro_btn2_label: 'Contact Us',
  intro_btn2_link: '/contact',
  stats: [
    { value: '12+', label: 'Years of Excellence' },
    { value: '500+', label: 'Properties Sold' },
    { value: '98%', label: 'Client Satisfaction' },
    { value: '200+', label: 'Properties Managed' },
  ],
  why_eyebrow: 'The Oceans Difference',
  why_heading: 'Why Choose Oceans?',
  why_cards: [
    { icon: 'ri-home-heart-line', title: 'Your Home, Your Identity', desc: "We understand that your home is more than just a place - it's a reflection of your unique taste, personality, and the life you've worked hard to build." },
    { icon: 'ri-award-line', title: 'Unparalleled Excellence', desc: "Our commitment to excellence starts from the moment you step into our world. You'll experience a personalized approach to real estate that goes far beyond what you'd expect." },
    { icon: 'ri-map-pin-2-line', title: 'Nairobi Market Leaders', desc: "With over 12 years of deep expertise in Nairobi's premium property market, we know every neighbourhood, every price movement, and every opportunity." },
    { icon: 'ri-user-heart-line', title: 'Curated Living Experiences', desc: "At Oceans, we don't just sell properties - we curate exceptional living experiences for discerning individuals who expect nothing but the best." },
    { icon: 'ri-building-2-line', title: 'Exclusive Portfolio', desc: 'From chic urban apartments and luxurious villas to stylish penthouses with panoramic views, our portfolio represents the most exclusive and desirable properties across Nairobi.' },
    { icon: 'ri-shield-check-line', title: 'Trust & Transparency', desc: 'Every transaction we handle is conducted with complete transparency and honesty. Your interests come first - always. That\'s the Oceans promise.' },
  ],
  mission_eyebrow: 'Our Purpose',
  mission_heading: 'Our Mission & Vision',
  mission_bg_image: IMG('0551756e-243c-46c5-96d2-b607627173aa_compressed_oceans-ke-vip.webp'),
  mission_label: 'Mission',
  mission_text: 'To connect people with exceptional properties through honest advice, deep market knowledge, and a commitment to long-term relationships that extend far beyond the closing of any deal.',
  vision_label: 'Vision',
  vision_text: "To be Kenya's most respected and trusted property agency - known for integrity, innovation, and delivering outstanding results for every single client we serve.",
  values: [
    { icon: 'ri-shield-check-line', title: 'Integrity', desc: 'We operate with complete transparency and honesty in every transaction, every time.' },
    { icon: 'ri-award-line', title: 'Expertise', desc: 'Our team brings deep market knowledge and professional expertise to every deal.' },
    { icon: 'ri-user-heart-line', title: 'Client-First', desc: 'Your goals are our goals. We listen, advise, and deliver results that matter to you.' },
    { icon: 'ri-lightbulb-line', title: 'Innovation', desc: 'We continuously evolve our approach to deliver better outcomes for every client.' },
  ],
  story_eyebrow: 'Our Story',
  story_heading: 'From Humble Beginnings to Market Leaders',
  story_p1: 'Oceans Kenya was founded in 2015 with a vision to transform the property experience in Nairobi. Starting with a small team of dedicated agents and a handful of exceptional listings, we quickly built a reputation for honesty, expertise, and outstanding results.',
  story_p2: "Today, we are proud to be one of Nairobi's leading property agencies, with a portfolio spanning residential sales, lettings, property management, and new developments across the city's most sought-after neighbourhoods.",
  story_image: IMG('8dc23801-be18-42ec-beba-c8e4d0252b6d_compressed_nai.webp'),
  story_badge_value: 'Since 2015',
  story_badge_label: 'Serving Kenya',
  timeline: [
    { year: '2015', event: 'Oceans Kenya founded in Nairobi' },
    { year: '2016', event: 'Expanded to property management services' },
    { year: '2020', event: 'Launched New Projects division' },
    { year: '2024', event: '500+ properties sold & 200+ under management' },
  ],
  cta_eyebrow: 'Get Started Today',
  cta_heading: 'Ready to Find Your Perfect Property?',
  cta_text: "Whether you're buying, selling, or renting - our team of dedicated property professionals is here to help every step of the way. Contact us today for a free, no-obligation consultation.",
  cta_btn1_label: 'Browse Properties',
  cta_btn1_link: '/all-properties',
  cta_btn2_label: 'Contact Us',
  cta_btn2_link: '/contact',
};

const STATS_KEY = 'stats';
const WHY_KEY = 'why_cards';
const VALUES_KEY = 'values';
const TIMELINE_KEY = 'timeline';

let cache: AboutPageContent | null = null;
let inflight: Promise<AboutPageContent> | null = null;

function cloneDefaults(): AboutPageContent {
  return {
    ...DEFAULT_ABOUT_CONTENT,
    stats: DEFAULT_ABOUT_CONTENT.stats.map((s) => ({ ...s })),
    why_cards: DEFAULT_ABOUT_CONTENT.why_cards.map((c) => ({ ...c })),
    values: DEFAULT_ABOUT_CONTENT.values.map((c) => ({ ...c })),
    timeline: DEFAULT_ABOUT_CONTENT.timeline.map((t) => ({ ...t })),
  };
}

function parseCards(value: string): AboutCard[] | null {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed
        .map((b: { icon?: string; title?: string; desc?: string }) => ({
          icon: String(b.icon || '').trim(),
          title: String(b.title || '').trim(),
          desc: String(b.desc || '').trim(),
        }))
        .filter((b: AboutCard) => b.title || b.desc);
    }
  } catch { /* ignore */ }
  return null;
}

async function loadAboutContent(): Promise<AboutPageContent> {
  const map = cloneDefaults();
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_about_%');
  if (data) {
    data.forEach((r: { key: string; value: string | null }) => {
      if (r.value === null) return;
      const field = r.key.replace('page_about_', '');
      if (!(field in map)) return;
      if (field === STATS_KEY) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed) && parsed.length) {
            map.stats = parsed
              .map((s: { value?: string; label?: string }) => ({ value: String(s.value || '').trim(), label: String(s.label || '').trim() }))
              .filter((s: AboutStat) => s.value || s.label);
          }
        } catch { /* keep default */ }
        return;
      }
      if (field === WHY_KEY) { const c = parseCards(r.value); if (c) map.why_cards = c; return; }
      if (field === VALUES_KEY) { const c = parseCards(r.value); if (c) map.values = c; return; }
      if (field === TIMELINE_KEY) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed) && parsed.length) {
            map.timeline = parsed
              .map((t: { year?: string; event?: string }) => ({ year: String(t.year || '').trim(), event: String(t.event || '').trim() }))
              .filter((t: AboutTimelineItem) => t.year || t.event);
          }
        } catch { /* keep default */ }
        return;
      }
      (map as unknown as Record<string, unknown>)[field] = r.value;
    });
  }
  return map;
}

export function useAboutPageContent() {
  const [content, setContent] = useState<AboutPageContent>(cache || cloneDefaults());
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) { setContent(cache); setLoading(false); return; }
    if (!inflight) inflight = loadAboutContent();
    inflight
      .then((result) => {
        cache = result;
        if (active) { setContent(result); setLoading(false); }
      })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { content, loading };
}

export function invalidateAboutPageContentCache() {
  cache = null;
  inflight = null;
}