import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface LandlordsStat {
  value: string;
  label: string;
}

export interface LandlordsCard {
  icon: string;
  title: string;
  desc: string;
}

export interface LandlordsStep {
  icon: string;
  step: number;
  title: string;
  desc: string;
}

export interface LandlordsFaq {
  q: string;
  a: string;
}

export interface LandlordsInfoRow {
  icon: string;
  label: string;
  value: string;
}

export interface LandlordsPageContent {
  // Hero
  hero_image: string;
  hero_eyebrow: string;
  hero_line1: string;
  hero_line2: string;
  hero_line3: string;
  hero_paragraph: string;
  hero_btn1_label: string;
  hero_btn2_label: string;
  hero_badge_title: string;
  hero_badge_label: string;
  hero_form_anchor: string;
  // Stats
  stats: LandlordsStat[];
  // Commitment
  commit_eyebrow: string;
  commit_heading: string;
  commit_p1: string;
  commit_p2: string;
  commit_image: string;
  commit_badge_value: string;
  commit_badge_label: string;
  // Services
  services_eyebrow: string;
  services_heading: string;
  services_text: string;
  services: LandlordsCard[];
  // Packages
  packages_eyebrow: string;
  packages_heading: string;
  packages_text: string;
  pkg1_icon: string;
  pkg1_title: string;
  pkg1_desc: string;
  pkg1_features: string[];
  pkg1_button: string;
  pkg2_badge: string;
  pkg2_icon: string;
  pkg2_title: string;
  pkg2_desc: string;
  pkg2_features: string[];
  pkg2_button: string;
  // How it works
  how_eyebrow: string;
  how_heading: string;
  how_steps: LandlordsStep[];
  // Why us
  why_eyebrow: string;
  why_heading: string;
  why_cards: LandlordsCard[];
  // FAQ
  faq_eyebrow: string;
  faq_heading: string;
  faqs: LandlordsFaq[];
  // Guarantees
  guarantees: LandlordsCard[];
  // Form block
  form_image: string;
  form_eyebrow: string;
  form_heading: string;
  form_text: string;
  form_info: LandlordsInfoRow[];
  form_submit_label: string;
  form_success_title: string;
  form_success_text: string;
  form_footnote: string;
}

export const DEFAULT_LANDLORDS_CONTENT: LandlordsPageContent = {
  hero_image: 'https://storage.helloreaddy.io/project_files/842d3b8a-5d73-416c-bead-c20132299a10/032138db-4dc5-4351-aec1-dd314054e4f1_compressed_1eddba3ee07e2d149416c3f58cbb60cc.webp',
  hero_eyebrow: 'For Landlords & Property Owners',
  hero_line1: 'Let or Sell Your',
  hero_line2: 'Property With',
  hero_line3: 'Confidence',
  hero_paragraph: "Nairobi's most trusted letting and management agency. We find quality tenants fast, collect your rent reliably, and protect your investment for the long term.",
  hero_btn1_label: 'List My Property',
  hero_btn2_label: 'Free Valuation',
  hero_badge_title: '#1 Letting Agency',
  hero_badge_label: 'Nairobi, Kenya',
  hero_form_anchor: '#landlord-form',
  stats: [
    { value: '200+', label: 'Properties Managed' },
    { value: '98%', label: 'Occupancy Rate' },
    { value: '10+', label: 'Years Experience' },
    { value: '21 days', label: 'Avg. Time to Let' },
  ],
  commit_eyebrow: 'Our Commitment',
  commit_heading: 'Your Property Is Our Priority',
  commit_p1: "At Oceans Kenya, we understand that your property is more than an asset - it's a significant investment. Our dedicated landlord team treats every property as if it were their own: maximising returns, minimising voids, and ensuring every tenancy runs smoothly.",
  commit_p2: "With deep roots in Nairobi's premium property market, we have the network, experience, and systems to consistently deliver outstanding results for landlords across Karen, Westlands, Kilimani, and beyond.",
  commit_image: 'https://storage.helloreaddy.io/project_files/842d3b8a-5d73-416c-bead-c20132299a10/032138db-4dc5-4351-aec1-dd314054e4f1_compressed_1eddba3ee07e2d149416c3f58cbb60cc.webp',
  commit_badge_value: '98%',
  commit_badge_label: 'Occupancy Rate',
  services_eyebrow: 'Our Services',
  services_heading: 'Our Landlord Services',
  services_text: 'Everything you need to let and manage your property with confidence.',
  services: [
    { icon: 'ri-user-search-line', title: 'Tenant Finding', desc: 'We market your property across all major platforms and our own database of pre-qualified tenants.' },
    { icon: 'ri-home-gear-line', title: 'Full Management', desc: 'We handle everything - from tenant vetting to maintenance coordination and rent collection.' },
    { icon: 'ri-money-dollar-circle-line', title: 'Rent Collection', desc: 'Reliable monthly rent collection with detailed statements and direct bank transfers.' },
    { icon: 'ri-tools-line', title: 'Property Maintenance', desc: 'Trusted contractor network for repairs, inspections, and property upkeep.' },
  ],
  packages_eyebrow: 'Service Options',
  packages_heading: 'Choose the Right Service for You',
  packages_text: 'Whether you want us to find the tenant and step back, or have us manage everything end-to-end, we have a package that fits.',
  pkg1_icon: 'ri-key-2-line',
  pkg1_title: 'Let Only',
  pkg1_desc: 'Ideal for landlords who prefer hands-on management after tenant placement.',
  pkg1_features: ['Professional property photography', 'Listings on all major portals', 'Tenant viewings & vetting', 'Tenancy agreement preparation', 'Deposit handling & registration', 'Handover & key release'],
  pkg1_button: 'Request Let Only',
  pkg2_badge: 'Most Popular',
  pkg2_icon: 'ri-building-4-line',
  pkg2_title: 'Full Management',
  pkg2_desc: 'Complete peace of mind - we handle everything from first listing to ongoing tenancy.',
  pkg2_features: ['Everything in Let Only, plus:', 'Monthly rent collection', 'Detailed income statements', 'Maintenance & repair coordination', 'Periodic property inspections', 'Tenant dispute resolution', 'Annual compliance review', 'Dedicated account manager'],
  pkg2_button: 'Request Full Management',
  how_eyebrow: 'How It Works',
  how_heading: 'How It Works',
  how_steps: [
    { icon: 'ri-phone-line', step: 1, title: 'Free Valuation', desc: 'We assess your property and provide a free, no-obligation rental valuation.' },
    { icon: 'ri-search-eye-line', step: 2, title: 'Property Listing', desc: 'Professional photography and listing across all major platforms within 48 hours.' },
    { icon: 'ri-camera-line', step: 3, title: 'Tenant Vetting', desc: 'Thorough background checks, employment verification, and reference screening.' },
    { icon: 'ri-user-received-2-line', step: 4, title: 'Move In', desc: 'Tenancy agreement, deposit collection, and smooth move-in coordination.' },
  ],
  why_eyebrow: 'Why Us',
  why_heading: 'Why Landlords Choose Us',
  why_cards: [
    { icon: 'ri-bar-chart-2-line', title: 'Maximum Returns', desc: 'We price your property correctly from day one to maximise your rental income.' },
    { icon: 'ri-time-line', title: 'Minimum Voids', desc: 'Our proactive approach means your property is rarely empty between tenancies.' },
    { icon: 'ri-eye-line', title: 'Full Transparency', desc: 'Monthly statements, online portal access, and 24/7 communication with your dedicated manager.' },
  ],
  faq_eyebrow: 'Common Questions',
  faq_heading: 'Frequently Asked Questions',
  faqs: [
    { q: 'How much does it cost to let my property?', a: "Our fees vary depending on the service level. For Let Only, we charge a one-time fee equivalent to one month's rent. For Full Management, we charge a monthly percentage of the rental income. Contact us for a bespoke quote." },
    { q: 'How long does it take to find a tenant?', a: 'On average, we find a qualified tenant within 21 days of listing. This can vary based on property type, location, and rental price.' },
    { q: 'Do you handle maintenance and repairs?', a: "Yes, under our Full Management service we coordinate all maintenance and repairs using our trusted contractor network. You'll be notified and have approval for all significant works." },
    { q: "What happens if a tenant doesn't pay rent?", a: 'We have robust procedures to chase outstanding rent. We also offer a Rent Guarantee scheme - ask us for details on this additional protection.' },
    { q: 'Can I use your tenant-finding service only?', a: 'Absolutely. Our Let Only service covers everything up to finding and placing the tenant. After that, you take over management yourself.' },
  ],
  guarantees: [
    { icon: 'ri-calendar-check-line', title: 'No Let, No Fee', desc: 'You only pay when we successfully place a tenant. Zero risk, zero upfront cost.' },
    { icon: 'ri-shield-check-line', title: 'Fully Vetted Tenants', desc: 'Every applicant undergoes background checks, employment verification, and reference screening.' },
    { icon: 'ri-money-dollar-circle-line', title: 'Rent Guarantee Option', desc: 'Ask about our rent guarantee scheme - we pay you whether or not the tenant does.' },
  ],
  form_image: 'https://storage.helloreaddy.io/project_files/842d3b8a-5d73-416c-bead-c20132299a10/7e1ae572-8d93-4598-a1fb-e49d9066583a_compressed_6763327f26245b63a5c7ce2e32ec8cf5.webp',
  form_eyebrow: 'Get Started',
  form_heading: "Let's Talk About Your Property",
  form_text: 'Fill in the short form and one of our dedicated landlord specialists will be in touch within 24 hours to discuss how we can maximise your rental return.',
  form_info: [
    { icon: 'ri-phone-line', label: 'Call Us Directly', value: '+254 181 408 186' },
    { icon: 'ri-mail-line', label: 'Email Us', value: 'ask@oceanske.com' },
    { icon: 'ri-map-pin-2-line', label: 'Visit Our Office', value: 'Plot 9, Mandera Rd, Nairobi' },
    { icon: 'ri-time-line', label: 'Office Hours', value: 'Mon - Fri: 8:30am - 5:30pm' },
  ],
  form_submit_label: 'Submit',
  form_success_title: 'Enquiry sent successfully!',
  form_success_text: "Thank you - we'll be in touch within 24 hours. No need to send it again.",
  form_footnote: 'We respond within 24 hours. No obligation, no pressure.',
};

const STATS_KEY = 'stats';
const SERVICES_KEY = 'services';
const HOW_KEY = 'how_steps';
const WHY_KEY = 'why_cards';
const FAQ_KEY = 'faqs';
const GUAR_KEY = 'guarantees';
const INFO_KEY = 'form_info';
const PKG1_KEY = 'pkg1_features';
const PKG2_KEY = 'pkg2_features';

let cache: LandlordsPageContent | null = null;
let inflight: Promise<LandlordsPageContent> | null = null;

function cloneDefaults(): LandlordsPageContent {
  return {
    ...DEFAULT_LANDLORDS_CONTENT,
    stats: DEFAULT_LANDLORDS_CONTENT.stats.map((s) => ({ ...s })),
    services: DEFAULT_LANDLORDS_CONTENT.services.map((s) => ({ ...s })),
    how_steps: DEFAULT_LANDLORDS_CONTENT.how_steps.map((s) => ({ ...s })),
    why_cards: DEFAULT_LANDLORDS_CONTENT.why_cards.map((s) => ({ ...s })),
    faqs: DEFAULT_LANDLORDS_CONTENT.faqs.map((s) => ({ ...s })),
    guarantees: DEFAULT_LANDLORDS_CONTENT.guarantees.map((s) => ({ ...s })),
    form_info: DEFAULT_LANDLORDS_CONTENT.form_info.map((s) => ({ ...s })),
    pkg1_features: [...DEFAULT_LANDLORDS_CONTENT.pkg1_features],
    pkg2_features: [...DEFAULT_LANDLORDS_CONTENT.pkg2_features],
  };
}

function parseStringList(value: string): string[] | null {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
  } catch { /* ignore */ }
  return null;
}

async function loadLandlordsContent(): Promise<LandlordsPageContent> {
  const map = cloneDefaults();
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_landlords_%');
  if (data) {
    data.forEach((r: { key: string; value: string | null }) => {
      if (r.value === null) return;
      const field = r.key.replace('page_landlords_', '');
      if (!(field in map)) return;
      let parsed: unknown = null;
      if (field === STATS_KEY || field === SERVICES_KEY || field === HOW_KEY || field === WHY_KEY || field === FAQ_KEY || field === GUAR_KEY || field === INFO_KEY) {
        try { parsed = JSON.parse(r.value); } catch { parsed = null; }
        if (Array.isArray(parsed) && parsed.length) {
          (map as unknown as Record<string, unknown>)[field] = parsed;
        }
        return;
      }
      if (field === PKG1_KEY || field === PKG2_KEY) {
        const list = parseStringList(r.value);
        if (list) (map as unknown as Record<string, unknown>)[field] = list;
        return;
      }
      (map as unknown as Record<string, unknown>)[field] = r.value;
    });
  }
  return map;
}

export function useLandlordsPageContent() {
  const [content, setContent] = useState<LandlordsPageContent>(cache || cloneDefaults());
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) { setContent(cache); setLoading(false); return; }
    if (!inflight) inflight = loadLandlordsContent();
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

export function invalidateLandlordsPageContentCache() {
  cache = null;
  inflight = null;
}