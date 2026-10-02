import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ContactQuickLink {
  icon: string;
  label: string;
  link: string;
}

export interface ContactHour {
  day: string;
  hours: string;
}

export interface ContactPageContent {
  // Hero
  hero_eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  // Quick links strip
  quick_links: ContactQuickLink[];
  // Form block
  form_eyebrow: string;
  form_heading: string;
  form_text: string;
  form_footnote: string;
  // Sidebar
  sidebar_eyebrow: string;
  sidebar_heading: string;
  office_image: string;
  open_status_label: string;
  hours_heading: string;
  hours: ContactHour[];
  details_heading: string;
  email_heading: string;
  social_heading: string;
  valuation_title: string;
  valuation_text: string;
  // Find our office
  find_eyebrow: string;
  find_heading: string;
  find_address_title: string;
  find_getting_title: string;
  find_getting_text: string;
  find_book_title: string;
  find_book_text: string;
  find_book_button: string;
}

export const DEFAULT_CONTACT_PAGE_CONTENT: ContactPageContent = {
  hero_eyebrow: "We're Here to Help",
  hero_title: 'Get In Touch',
  hero_subtitle: "Whether you're buying, selling, renting, or just have a question - our team is ready and happy to help.",
  hero_image: 'https://storage.helloreaddy.io/project_files/842d3b8a-5d73-416c-bead-c20132299a10/081993bb-66d8-410a-a65c-8ed076d89add_compressed_69e72d7c66bbc8a88ac31d12985aa0f4.webp',
  quick_links: [
    { icon: 'ri-building-2-line', label: 'Browse Properties For Sale', link: '/buy' },
    { icon: 'ri-key-2-line', label: 'Properties To Rent', link: '/rent' },
    { icon: 'ri-home-heart-line', label: 'Landlord Services', link: '/landlords' },
    { icon: 'ri-bar-chart-2-line', label: 'Free Valuation', link: '/valuation' },
  ],
  form_eyebrow: 'Send a Message',
  form_heading: 'How Can We Help You?',
  form_text: 'Fill in the form below and one of our agents will be in touch within 24 hours. For urgent matters, call us directly.',
  form_footnote: 'We respond to all enquiries within 24 hours during business days.',
  sidebar_eyebrow: 'Our Details',
  sidebar_heading: 'Visit or Call Us',
  office_image: 'https://storage.helloreaddy.io/project_files/842d3b8a-5d73-416c-bead-c20132299a10/7e1ae572-8d93-4598-a1fb-e49d9066583a_compressed_6763327f26245b63a5c7ce2e32ec8cf5.webp',
  open_status_label: "We're Open Now",
  hours_heading: 'Office Hours',
  hours: [
    { day: 'Monday', hours: '8:00 AM - 4:00 PM' },
    { day: 'Tuesday', hours: '8:00 AM - 4:00 PM' },
    { day: 'Wednesday', hours: '8:00 AM - 4:00 PM' },
    { day: 'Thursday', hours: '8:00 AM - 4:00 PM' },
    { day: 'Friday', hours: '8:00 AM - 4:00 PM' },
    { day: 'Saturday', hours: '9:00 AM - 4:00 PM' },
    { day: 'Sunday', hours: 'Closed' },
  ],
  details_heading: 'Get In Touch',
  email_heading: 'Email Us',
  social_heading: 'Follow Us',
  valuation_title: 'Free Property Valuation',
  valuation_text: "Know your property's worth →",
  find_eyebrow: 'Our Location',
  find_heading: 'Find Our Office',
  find_address_title: 'Our Address',
  find_getting_title: 'Getting Here',
  find_getting_text: 'We are located on Mandera Rd. Ample parking is available on-site. 10 minutes from Nairobi City Centre.',
  find_book_title: 'Book a Meeting',
  find_book_text: 'Prefer a face-to-face consultation? Call ahead to book a time with one of our property specialists.',
  find_book_button: 'Get in Touch',
};

const QUICK_LINKS_KEY = 'quick_links';
const HOURS_KEY = 'hours';

let cache: ContactPageContent | null = null;
let inflight: Promise<ContactPageContent> | null = null;

function cloneDefaults(): ContactPageContent {
  return {
    ...DEFAULT_CONTACT_PAGE_CONTENT,
    quick_links: DEFAULT_CONTACT_PAGE_CONTENT.quick_links.map((l) => ({ ...l })),
    hours: DEFAULT_CONTACT_PAGE_CONTENT.hours.map((h) => ({ ...h })),
  };
}

async function loadContactContent(): Promise<ContactPageContent> {
  const map = cloneDefaults();
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_contact_page_%');
  if (data) {
    data.forEach((r: { key: string; value: string | null }) => {
      if (r.value === null) return;
      const field = r.key.replace('page_contact_page_', '');
      if (!(field in map)) return;
      if (field === QUICK_LINKS_KEY) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed) && parsed.length) {
            map.quick_links = parsed
              .map((l: { icon?: string; label?: string; link?: string }) => ({ icon: String(l.icon || '').trim(), label: String(l.label || '').trim(), link: String(l.link || '').trim() }))
              .filter((l: ContactQuickLink) => l.label);
          }
        } catch { /* keep default */ }
        return;
      }
      if (field === HOURS_KEY) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed) && parsed.length) {
            map.hours = parsed
              .map((h: { day?: string; hours?: string }) => ({ day: String(h.day || '').trim(), hours: String(h.hours || '').trim() }))
              .filter((h: ContactHour) => h.day);
          }
        } catch { /* keep default */ }
        return;
      }
      (map as unknown as Record<string, unknown>)[field] = r.value;
    });
  }
  return map;
}

export function useContactPageContent() {
  const [content, setContent] = useState<ContactPageContent>(cache || cloneDefaults());
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) { setContent(cache); setLoading(false); return; }
    if (!inflight) inflight = loadContactContent();
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

export function invalidateContactPageContentCache() {
  cache = null;
  inflight = null;
}