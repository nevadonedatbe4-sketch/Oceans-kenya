import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface JvStat {
  value: string;
  label: string;
}

export interface JvService {
  code: string;
  title: string;
  desc: string;
}

export interface JointVenturesPageContent {
  // Hero
  hero_eyebrow: string;
  hero_line1: string;
  hero_line2: string;
  hero_line3: string;
  hero_paragraph: string;
  hero_button1: string;
  hero_button2: string;
  // Live figures
  figures_label: string;
  figures_currency: string;
  figures: JvStat[];
  // Search block
  search_eyebrow: string;
  search_heading: string;
  // Land feed
  land_eyebrow: string;
  land_heading: string;
  land_subtitle: string;
  land_tab_all: string;
  land_tab_outright: string;
  land_tab_jv: string;
  // How it works
  how_eyebrow: string;
  how_heading: string;
  how_intro: string;
  landowner_badge: string;
  landowner_heading: string;
  landowner_button: string;
  landowner_steps: string[];
  investor_badge: string;
  investor_heading: string;
  investor_button: string;
  investor_steps: string[];
  // Services
  services_eyebrow: string;
  services_heading: string;
  services_subtitle: string;
  services: JvService[];
  // Projects
  projects_eyebrow: string;
  projects_heading: string;
  projects_subtitle: string;
  // Request desk
  request_eyebrow: string;
  request_heading: string;
  request_paragraph: string;
  request_tab_landowner: string;
  request_tab_investor: string;
  // FAQ
  faq_eyebrow: string;
  faq_heading: string;
  // CTA
  cta_eyebrow: string;
  cta_heading: string;
  cta_paragraph: string;
  cta_button1: string;
  cta_button2: string;
}

export const DEFAULT_JV_CONTENT: JointVenturesPageContent = {
  hero_eyebrow: 'Joint Venture & Land Investment Desk',
  hero_line1: 'Land is the asset.',
  hero_line2: 'The right partner is',
  hero_line3: 'the return.',
  hero_paragraph: 'Post your land and find capital, or submit a brief and find a plot. Oceans Kenya matches landowners with investors for joint ventures - and lists prime land available for outright purchase across Nairobi and beyond.',
  hero_button1: 'I Own Land',
  hero_button2: 'I Have Capital',
  figures_label: 'JV Desk - Live Figures',
  figures_currency: 'KES/ Usd',
  figures: [
    { value: '100+', label: 'Acres currently under JV negotiation' },
    { value: '28', label: 'Active investor briefs on file' },
    { value: '12', label: 'Areas with listed opportunities' },
  ],
  search_eyebrow: 'Land & Joint Venture Search',
  search_heading: 'Search land & joint venture opportunities',
  land_eyebrow: 'Land & Plots',
  land_heading: 'Land on the desk today.',
  land_subtitle: 'A live feed of open joint venture land opportunities, pulled directly from our listings database.',
  land_tab_all: 'All opportunities',
  land_tab_outright: 'Outright purchase',
  land_tab_jv: 'Joint venture',
  how_eyebrow: 'How It Works',
  how_heading: 'Two starting points, one deal room.',
  how_intro: 'Whichever side of the table you sit on, every request lands with our JV desk, gets verified, and is matched by location, acreage and structure before any introduction is made.',
  landowner_badge: 'Landowner',
  landowner_heading: 'Bring the land, find the capital.',
  landowner_button: 'Post land brief',
  landowner_steps: [
    'Tell us where the land is, its size and title status.',
    'Choose a structure - revenue share, equity split, lease-to-JV, or outright sale.',
    'We verify title and shortlist matched investors.',
    'You review offers and choose who you work with.',
  ],
  investor_badge: 'Investor',
  investor_heading: 'Bring the capital, find the land.',
  investor_button: 'Submit investment brief',
  investor_steps: [
    'Tell us your budget, target districts and preferred use.',
    'We search verified landowner briefs and live listings.',
    'Receive a shortlist with title status and site notes.',
    'Structure the JV or purchase directly, your call.',
  ],
  services_eyebrow: 'Full-Service Desk',
  services_heading: 'What the Desk Handles',
  services_subtitle: 'We do not just make introductions. We carry every joint venture from first handshake to final sale.',
  services: [
    { code: 'SVC/01', title: 'Land Sourcing & Acquisition', desc: 'We identify, verify and secure development-ready parcels with clean titles, proper zoning and access to infrastructure.' },
    { code: 'SVC/02', title: 'Investment Structuring', desc: 'Tailored JV frameworks that balance risk and reward - from SPV creation to shareholder agreements and profit-sharing models.' },
    { code: 'SVC/03', title: 'Development & Project Management', desc: 'End-to-end oversight from design brief to contractor selection, milestone tracking, quality control and handover.' },
    { code: 'SVC/04', title: 'Market Analysis & Feasibility', desc: 'Demand studies, competitive pricing analysis, absorption forecasts and scenario modelling to validate every project before ground breaks.' },
    { code: 'SVC/05', title: 'Financing & Capital Raising', desc: 'Debt structuring, equity introductions, mezzanine financing and institutional partnerships to close funding gaps.' },
    { code: 'SVC/06', title: 'Legal & Regulatory Compliance', desc: 'Title verification, NEMA approvals, county permits, building plan approvals and ongoing compliance throughout the project lifecycle.' },
  ],
  projects_eyebrow: 'Development Projects',
  projects_heading: 'Projects Seeking Partners',
  projects_subtitle: 'Verified developments currently open for joint venture - each with approved plans, verified titles and a clear capital ask.',
  request_eyebrow: 'Submit a Request',
  request_heading: 'Open a file with the JV desk.',
  request_paragraph: 'Fill in whichever side applies to you. A member of the Oceans Kenya land team reviews every submission and responds within 48 hours.',
  request_tab_landowner: 'I Own Land',
  request_tab_investor: 'I Have Capital',
  faq_eyebrow: 'Questions',
  faq_heading: 'Frequently Asked',
  cta_eyebrow: 'Ready to Partner?',
  cta_heading: "Let's Build Something Worthwhile",
  cta_paragraph: "Whether you hold land or capital, our desk is built to structure deals that work for every partner. Submit a brief and let's talk.",
  cta_button1: 'Submit a Brief',
  cta_button2: 'Speak to the Desk',
};

const STRING_LIST_KEYS: (keyof JointVenturesPageContent)[] = [
  'landowner_steps', 'investor_steps',
];

let cache: JointVenturesPageContent | null = null;
let inflight: Promise<JointVenturesPageContent> | null = null;

function cloneDefaults(): JointVenturesPageContent {
  return {
    ...DEFAULT_JV_CONTENT,
    figures: DEFAULT_JV_CONTENT.figures.map((f) => ({ ...f })),
    landowner_steps: [...DEFAULT_JV_CONTENT.landowner_steps],
    investor_steps: [...DEFAULT_JV_CONTENT.investor_steps],
    services: DEFAULT_JV_CONTENT.services.map((s) => ({ ...s })),
  };
}

async function loadJvContent(): Promise<JointVenturesPageContent> {
  const map = cloneDefaults();
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_jv_%');
  if (data) {
    data.forEach((r: { key: string; value: string | null }) => {
      if (r.value === null) return;
      const field = r.key.replace('page_jv_', '') as keyof JointVenturesPageContent;
      if (!(field in map)) return;
      if (field === 'figures') {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed) && parsed.length) {
            (map as unknown as Record<string, unknown>).figures = parsed
              .map((v: { value?: string; label?: string }) => ({ value: String(v.value || '').trim(), label: String(v.label || '').trim() }));
          }
        } catch { /* keep default */ }
        return;
      }
      if (field === 'services') {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed) && parsed.length) {
            (map as unknown as Record<string, unknown>).services = parsed
              .map((v: { code?: string; title?: string; desc?: string }) => ({ code: String(v.code || '').trim(), title: String(v.title || '').trim(), desc: String(v.desc || '').trim() }))
              .filter((v: JvService) => v.title || v.desc);
          }
        } catch { /* keep default */ }
        return;
      }
      if (STRING_LIST_KEYS.includes(field)) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed)) {
            (map as unknown as Record<string, unknown>)[field] = parsed.map((v) => String(v).trim()).filter(Boolean);
          }
        } catch { /* keep default */ }
        return;
      }
      (map as unknown as Record<string, unknown>)[field] = r.value;
    });
  }
  return map;
}

export function useJointVenturesPageContent() {
  const [content, setContent] = useState<JointVenturesPageContent>(cache || cloneDefaults());
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) { setContent(cache); setLoading(false); return; }
    if (!inflight) inflight = loadJvContent();
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

export function invalidateJointVenturesPageContentCache() {
  cache = null;
  inflight = null;
}