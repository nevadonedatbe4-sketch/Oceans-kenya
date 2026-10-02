import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface CommStat { value: string; label: string; }
export interface CommService { icon: string; title: string; desc: string; }
export interface CommPackage { badge: string; title: string; desc: string; items: string[]; button: string; highlight: boolean; }
export interface CommStep { icon: string; step: string; title: string; desc: string; }
export interface CommWhy { icon: string; title: string; desc: string; }
export interface CommFaq { q: string; a: string; }
export interface CommGuarantee { icon: string; title: string; desc: string; }
export interface CommContactInfo { icon: string; label: string; value: string; }

export interface CommercialAdvertisingPageContent {
  hero_eyebrow: string;
  hero_title: string;
  hero_text: string;
  hero_btn1_label: string;
  hero_btn2_label: string;
  hero_badge_value: string;
  hero_badge_label: string;
  stats: CommStat[];
  commit_eyebrow: string;
  commit_title: string;
  commit_p1: string;
  commit_p2: string;
  commit_image: string;
  commit_badge_value: string;
  commit_badge_label: string;
  services_eyebrow: string;
  services_title: string;
  services_text: string;
  services: CommService[];
  packages_eyebrow: string;
  packages_title: string;
  packages_text: string;
  packages: CommPackage[];
  how_eyebrow: string;
  how_title: string;
  steps: CommStep[];
  why_eyebrow: string;
  why_title: string;
  why: CommWhy[];
  faq_eyebrow: string;
  faq_title: string;
  faqs: CommFaq[];
  guarantees: CommGuarantee[];
  browse_title: string;
  browse_text: string;
  browse_btn1_label: string;
  browse_btn2_label: string;
  form_eyebrow: string;
  form_title: string;
  form_text: string;
  form_image: string;
  contact_info: CommContactInfo[];
  form_note: string;
  // Visibility
  show_stats: boolean;
  show_commit: boolean;
  show_services: boolean;
  show_packages: boolean;
  show_how: boolean;
  show_why: boolean;
  show_faq: boolean;
  show_guarantees: boolean;
  show_browse: boolean;
}

export const DEFAULT_COMMERCIAL_ADVERTISING_CONTENT: CommercialAdvertisingPageContent = {
  hero_eyebrow: 'Commercial Property Advertising',
  hero_title: 'Advertise Your Commercial Property With Us',
  hero_text: "Nairobi's leading commercial property agency. We connect office, retail, and industrial properties with the right tenants and investors - fast.",
  hero_btn1_label: 'Advertise Now',
  hero_btn2_label: 'Free Valuation',
  hero_badge_value: '#1 Commercial Agency',
  hero_badge_label: 'Nairobi, Kenya',
  stats: [
    { value: '150+', label: 'Commercial Properties' },
    { value: '95%', label: 'Occupancy Rate' },
    { value: '10+', label: 'Years Experience' },
    { value: '45 days', label: 'Avg. Time to Let' },
  ],
  commit_eyebrow: 'Our Commitment',
  commit_title: 'Your Commercial Property Is Our Business',
  commit_p1: "At Oceans Kenya, we understand commercial real estate. From prime office space in Westlands to retail units in Kilimani and industrial warehouses on Mombasa Road - our dedicated commercial team knows the market inside out.",
  commit_p2: "With extensive connections across Nairobi's business community and multinational occupiers, we have the reach to connect your property with the right buyer or tenant at the right price.",
  commit_image: 'https://storage.helloreaddy.io/project_files/842d3b8a-5d73-416c-bead-c20132299a10/6024823c-febc-44de-97fd-a3b18207d1e3_compressed_1.webp',
  commit_badge_value: '95%',
  commit_badge_label: 'Occupancy Rate',
  services_eyebrow: 'Our Services',
  services_title: 'Commercial Property Services',
  services_text: 'Comprehensive solutions for commercial property owners and investors.',
  services: [
    { icon: 'ri-building-2-line', title: 'Commercial Sales', desc: 'We market your commercial property to qualified investors and businesses across Kenya and East Africa.' },
    { icon: 'ri-store-2-line', title: 'Commercial Lettings', desc: 'Find reliable corporate tenants for your office, retail, or industrial space with our extensive network.' },
    { icon: 'ri-bar-chart-box-line', title: 'Market Valuation', desc: 'Expert commercial property valuation based on current market data, comparable evidence, and local expertise.' },
    { icon: 'ri-file-list-3-line', title: 'Transaction Management', desc: 'Full support through the entire transaction - from heads of terms to completion and handover.' },
  ],
  packages_eyebrow: 'Service Options',
  packages_title: 'Choose How You Want to Advertise',
  packages_text: 'Whether selling or letting, we have a package tailored to your commercial property goals.',
  packages: [
    {
      badge: '',
      title: 'Let Only',
      desc: 'Ideal for landlords who prefer to manage their commercial property after tenant placement.',
      items: ['Professional property photography', 'Listings on all major commercial portals', 'Corporate tenant viewings & vetting', 'Lease agreement preparation', 'Deposit handling & registration', 'Handover & key release'],
      button: 'Enquire About Let Only',
      highlight: false,
    },
    {
      badge: 'Most Popular',
      title: 'Full Sale / Let Management',
      desc: 'Complete peace of mind - we handle everything from marketing to transaction completion.',
      items: ['Everything in Let Only, plus:', 'Targeted investor and occupier outreach', 'Negotiation and heads of terms', 'Legal coordination through completion', 'Periodic market reviews', 'Rent review and lease renewal management', 'Dedicated commercial account manager'],
      button: 'Enquire About Full Management',
      highlight: true,
    },
  ],
  how_eyebrow: 'How It Works',
  how_title: 'How It Works',
  steps: [
    { icon: 'ri-phone-line', step: '1', title: 'Initial Consultation', desc: 'We discuss your commercial property, goals, and timeline - free, no obligation.' },
    { icon: 'ri-search-eye-line', step: '2', title: 'Professional Marketing', desc: 'Professional photography, floor plans, and listing across all major commercial property platforms.' },
    { icon: 'ri-user-received-2-line', step: '3', title: 'Tenant & Buyer Matching', desc: 'We match your property with our database of pre-qualified corporate tenants and investors.' },
    { icon: 'ri-hand-coin-line', step: '4', title: 'Close the Deal', desc: 'Negotiation support, lease or sale agreement, and smooth handover coordination.' },
  ],
  why_eyebrow: 'Why Us',
  why_title: 'Why Choose Us for Commercial Property',
  why: [
    { icon: 'ri-global-line', title: 'Market Reach', desc: 'Access to local, regional, and international commercial property investors and occupiers.' },
    { icon: 'ri-team-line', title: 'Expert Team', desc: "Dedicated commercial property specialists with deep knowledge of Nairobi's office, retail, and industrial markets." },
    { icon: 'ri-speed-line', title: 'Fast Results', desc: 'Our targeted approach means commercial properties are matched quickly with the right tenants or buyers.' },
  ],
  faq_eyebrow: 'Common Questions',
  faq_title: 'Frequently Asked Questions',
  faqs: [
    { q: 'What types of commercial property do you handle?', a: 'We handle all commercial property types including offices, retail shops, warehouses, industrial units, mixed-use buildings, and commercial land across Nairobi and surrounding areas.' },
    { q: 'How much does it cost to advertise my commercial property?', a: 'Our fees vary depending on the service. For commercial lettings, we charge a percentage of the annual rent. For sales, a competitive commission based on the sale price. Contact us for a tailored quote.' },
    { q: 'How long does it take to let or sell a commercial property?', a: 'Timescales vary by property type and market conditions, but our average time to let a commercial property is 45-60 days. Sales typically complete within 90-120 days.' },
    { q: 'Do you handle lease negotiations?', a: 'Yes, we manage the full leasing process including heads of terms, lease negotiations, rent reviews, and break clauses to ensure the best outcome for you.' },
    { q: 'Can you value my commercial property?', a: 'Absolutely. We provide free, no-obligation commercial property valuations based on thorough market analysis and comparable evidence.' },
  ],
  guarantees: [
    { icon: 'ri-calendar-check-line', title: 'No Let, No Fee', desc: 'You only pay when we successfully place a tenant or complete a sale.' },
    { icon: 'ri-shield-check-line', title: 'Vetted Occupiers', desc: 'All prospective tenants and buyers are thoroughly financially and professionally screened.' },
    { icon: 'ri-line-chart-line', title: 'Maximum Value', desc: 'We price and position your property to achieve the best possible return in the market.' },
  ],
  browse_title: 'Looking for Commercial Property?',
  browse_text: 'Browse our current commercial property listings - offices, retail spaces, warehouses, and more.',
  browse_btn1_label: 'Commercial To Rent',
  browse_btn2_label: 'Commercial For Sale',
  form_eyebrow: 'Get Started',
  form_title: "Let's Talk About Your Commercial Property",
  form_text: 'Fill in the short form and one of our commercial property specialists will be in touch within 24 hours to discuss how we can help you let or sell your property.',
  form_image: 'https://storage.helloreaddy.io/project_files/842d3b8a-5d73-416c-bead-c20132299a10/8adf385b-e2fd-423a-8a89-0bf4d0141b31_compressed_5.webp',
  contact_info: [
    { icon: 'ri-phone-line', label: 'Call Us Directly', value: '+254 181 408 186' },
    { icon: 'ri-mail-line', label: 'Email Us', value: 'sales@oceanske.com' },
    { icon: 'ri-map-pin-2-line', label: 'Visit Our Office', value: 'Plot 9, Mandera Rd, Nairobi' },
    { icon: 'ri-time-line', label: 'Office Hours', value: 'Mon - Fri: 8:30am - 5:30pm' },
  ],
  form_note: 'We respond within 24 hours. No obligation, no pressure.',
  show_stats: true,
  show_commit: true,
  show_services: true,
  show_packages: true,
  show_how: true,
  show_why: true,
  show_faq: true,
  show_guarantees: true,
  show_browse: true,
};

const JSON_LIST_KEYS: (keyof CommercialAdvertisingPageContent)[] = [
  'stats', 'services', 'packages', 'steps', 'why', 'faqs', 'guarantees', 'contact_info',
];

const BOOLEAN_KEYS: (keyof CommercialAdvertisingPageContent)[] = [
  'show_stats', 'show_commit', 'show_services', 'show_packages', 'show_how',
  'show_why', 'show_faq', 'show_guarantees', 'show_browse',
];

let cache: CommercialAdvertisingPageContent | null = null;
let inflight: Promise<CommercialAdvertisingPageContent> | null = null;

function cloneDefaults(): CommercialAdvertisingPageContent {
  return JSON.parse(JSON.stringify(DEFAULT_COMMERCIAL_ADVERTISING_CONTENT));
}

async function loadContent(): Promise<CommercialAdvertisingPageContent> {
  const map = cloneDefaults();
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_commadv_%');
  if (data) {
    data.forEach((r: { key: string; value: string | null }) => {
      if (r.value === null) return;
      const field = r.key.replace('page_commadv_', '') as keyof CommercialAdvertisingPageContent;
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

export function useCommercialAdvertisingPageContent() {
  const [content, setContent] = useState<CommercialAdvertisingPageContent>(cache || cloneDefaults());
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

export function invalidateCommercialAdvertisingPageContentCache() {
  cache = null;
  inflight = null;
}