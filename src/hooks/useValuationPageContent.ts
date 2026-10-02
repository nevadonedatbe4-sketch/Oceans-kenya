import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ValStat { value: string; label: string; }
export interface ValStep { icon: string; step: string; title: string; desc: string; }
export interface ValWhy { icon: string; title: string; desc: string; }
export interface ValFaq { q: string; a: string; }

export interface ValuationPageContent {
  hero_eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  hero_bg_image: string;
  hero_btn1_label: string;
  hero_badge_value: string;
  hero_badge_label: string;
  stats: ValStat[];
  process_eyebrow: string;
  process_title: string;
  process_text: string;
  steps: ValStep[];
  why_eyebrow: string;
  why_title: string;
  why: ValWhy[];
  faq_eyebrow: string;
  faq_title: string;
  faqs: ValFaq[];
  cta_eyebrow: string;
  cta_title: string;
  cta_text: string;
  cta_bg_image: string;
  cta_btn1_label: string;
  cta_btn2_label: string;
  // Visibility
  show_stats: boolean;
  show_process: boolean;
  show_why: boolean;
  show_faq: boolean;
  show_cta: boolean;
}

export const DEFAULT_VALUATION_CONTENT: ValuationPageContent = {
  hero_eyebrow: 'Free Property Valuation',
  hero_title: 'Know What Your Property Is Worth',
  hero_subtitle: "Get a free, no-obligation valuation from Nairobi's leading estate agents. Our experienced valuers understand the local market and will give you an accurate, honest assessment.",
  hero_bg_image: 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/hero-bg-1776885671058.JPG',
  hero_btn1_label: 'Call for a Valuation',
  hero_badge_value: '98% Accuracy',
  hero_badge_label: 'On Final Sale Price',
  stats: [
    { value: '500+', label: 'Properties Valued' },
    { value: '98%', label: 'Valuation Accuracy' },
    { value: '48h', label: 'Report Turnaround' },
    { value: '100%', label: 'Free & No Obligation' },
  ],
  process_eyebrow: 'How It Works',
  process_title: 'Our Valuation Process',
  process_text: 'Four simple steps to an accurate, transparent property valuation.',
  steps: [
    { icon: 'ri-phone-line', step: '1', title: 'Book an Appointment', desc: 'Call or message us to schedule a free, no-obligation valuation at a time that suits you.' },
    { icon: 'ri-search-eye-line', step: '2', title: 'On-Site Assessment', desc: 'One of our experienced valuers visits your property, takes measurements, notes features, and photographs.' },
    { icon: 'ri-file-chart-line', step: '3', title: 'Market Analysis', desc: "We analyse comparable sales and current market conditions to determine your property's accurate value." },
    { icon: 'ri-survey-line', step: '4', title: 'Detailed Report', desc: 'You receive a comprehensive valuation report with our recommended listing price and marketing strategy.' },
  ],
  why_eyebrow: 'Why Choose Us',
  why_title: 'Why Get a Valuation From Oceans?',
  why: [
    { icon: 'ri-map-pin-2-line', title: 'Local Market Expertise', desc: "With 12+ years in Nairobi's premium property market, we know every neighbourhood's true value. We don't guess - we analyse real data from recent comparable sales." },
    { icon: 'ri-shield-check-line', title: 'Honest, Not Flattering', desc: 'Some agents inflate valuations to win your business. We give you the real number - backed by evidence - so your property sells at the right price, not a fantasy one.' },
    { icon: 'ri-bar-chart-2-line', title: 'No Strings Attached', desc: "Our valuation is completely free with zero obligation. You get a professional report. If you choose not to list with us, that's entirely fine." },
  ],
  faq_eyebrow: 'Common Questions',
  faq_title: 'Frequently Asked Questions',
  faqs: [
    { q: 'How much does a valuation cost?', a: 'Absolutely nothing. Our property valuations are completely free with no obligation to list your property with us.' },
    { q: 'How long does a valuation take?', a: 'The on-site visit typically takes 30-60 minutes depending on the property size. You will receive your full report within 48 hours.' },
    { q: 'What do I need to prepare?', a: 'Just be available to show us around! Having recent utility bills, title deeds, and any renovation receipts handy is helpful but not required.' },
    { q: 'Is the valuation binding?', a: "No. The valuation is an expert opinion of your property's current market value. You are under no obligation to sell or list with us afterwards." },
  ],
  cta_eyebrow: "Ready to Know Your Property's Worth?",
  cta_title: 'Book Your Free Valuation Today',
  cta_text: 'Our team of experienced valuers is ready to give you an honest, accurate assessment. No cost, no pressure, no obligation.',
  cta_bg_image: '',
  cta_btn1_label: 'Call Now',
  cta_btn2_label: 'Send an Enquiry',
  show_stats: true,
  show_process: true,
  show_why: true,
  show_faq: true,
  show_cta: true,
};

const JSON_LIST_KEYS: (keyof ValuationPageContent)[] = ['stats', 'steps', 'why', 'faqs'];
const BOOLEAN_KEYS: (keyof ValuationPageContent)[] = [
  'show_stats', 'show_process', 'show_why', 'show_faq', 'show_cta',
];

let cache: ValuationPageContent | null = null;
let inflight: Promise<ValuationPageContent> | null = null;

function cloneDefaults(): ValuationPageContent {
  return JSON.parse(JSON.stringify(DEFAULT_VALUATION_CONTENT));
}

async function loadContent(): Promise<ValuationPageContent> {
  const map = cloneDefaults();
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_valuation_%');
  if (data) {
    data.forEach((r: { key: string; value: string | null }) => {
      if (r.value === null) return;
      const field = r.key.replace('page_valuation_', '') as keyof ValuationPageContent;
      if (!(field in map)) return;
      if (JSON_LIST_KEYS.includes(field)) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed)) (map as unknown as Record<string, unknown>)[field] = parsed;
        } catch { /* keep default */ }
        return;
      }
      if (BOOLEAN_KEYS.includes(field)) {
        (map as unknown as Record<string, unknown>)[field] = r.value === 'true';
      } else {
        (map as unknown as Record<string, unknown>)[field] = r.value;
      }
    });
  }
  return map;
}

export function useValuationPageContent() {
  const [content, setContent] = useState<ValuationPageContent>(cache || cloneDefaults());
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) { setContent(cache); setLoading(false); return; }
    if (!inflight) inflight = loadContent();
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

export function invalidateValuationPageContentCache() {
  cache = null;
  inflight = null;
}