/**
 * Code defaults for every backend-editable page that is driven by the shared
 * `usePageContent` hook. Each object's keys map 1:1 to `site_settings` rows
 * stored as `page_<namespace>_<field>`.
 *
 * These values are IDENTICAL to the copy that is live today, so nothing changes
 * visually until an editor saves a change.
 */

/* ── Neighbourhood Detail (every /neighbourhood/:slug page) ───────────── */
export const DEFAULT_NEIGH_DETAIL = {
  hero_badge_suffix: 'Properties Available',
  hero_title_suffix: 'Area Guide',
  notfound_title: 'Neighbourhood Not Found',
  notfound_text: 'We could not find the neighbourhood you are looking for.',
  notfound_button: 'View All Neighbourhoods',
  listings_eyebrow: 'Properties',
  listings_heading_prefix: 'Active Listings in',
  view_all_label: 'View All',
  tab_sale: 'For Sale',
  tab_rent: 'To Let',
  empty_sale_title: 'No Properties For Sale',
  empty_rent_title: 'No Properties To Let',
  empty_text_suffix: 'Register your interest to be notified first.',
  empty_button: 'Register Interest',
  location_heading: 'Location',
  nearby_heading: 'Explore Nearby Areas',
  nearby_property_word: 'Properties',
  strip_heading: 'Neighbouring areas',
  strip_desc_prefix: 'Search live homes in the areas around',
  strip_desc_suffix: 'each one opens its own filtered results.',
  cta_title_prefix: 'Talk to an Agent About',
  cta_text: 'Our agents know this area inside out - from the best streets and schools to off-market opportunities. Let us match you with the perfect property in this neighbourhood.',
  cta_button: 'Speak to an Agent',
  compare_heading: 'How Nairobi Neighbourhoods Compare',
  compare_sub: 'Quick reference for the top 6 neighbourhoods - at a glance.',
  this_page_label: '(this page)',
  sidebar_eyebrow: 'At a glance',
  sidebar_heading: 'Overview & Vibe',
  sidebar_button_prefix: 'View All',
  sidebar_button_suffix: 'Listings',
};

/* ── Living in Nairobi (/living-in-nairobi) ───────────────────────────── */
export const DEFAULT_NAIROBI_LIFE = {
  hero_badge: 'Living in Nairobi',
  hero_title: 'Your Guide to Life in Nairobi',
  hero_subtitle: 'Schools, restaurants, malls, healthcare and more - researched by neighbourhood, connected to the properties we list.',
  updated_label: 'Last updated:',
  updated_value: 'August 2026',
  intro_text: 'Eight living guides, powered by live amenity data - counts update automatically as we add schools, restaurants and more.',
  intro_link: 'Compare neighbourhoods',
  loading_text: 'Loading guides...',
  error_title: 'Something went wrong',
  retry_button: 'Try again',
  empty_title: 'No guides yet',
  empty_text: 'Check back soon - our living guides are on the way.',
  card_badge: 'Living in Nairobi',
  card_read_label: 'Read guide',
  cta_title: 'Not sure which neighbourhood fits you?',
  cta_text: 'Compare schools, restaurants, malls and healthcare side by side - then browse the properties that match.',
  cta_primary: 'Compare Neighbourhoods',
  cta_secondary: 'Browse Properties',
};

/* ── Schools (/schools) ───────────────────────────────────────────────── */
export const DEFAULT_SCHOOLS = {
  hero_title: 'Schools in Nairobi',
  hero_subtitle: "International, Montessori, and university options across every neighbourhood - find your family's fit.",
  search_placeholder: 'Search schools, areas or curriculums',
  all_types_label: 'All schools',
  all_areas_label: 'All areas',
  all_levels_label: 'All levels',
  all_curriculums_label: 'All curriculums',
  filters_label: 'Filters',
  active_label: 'Active',
  reset_label: 'Reset',
  showing_word: 'Showing',
  schools_word: 'schools',
  by_neighbourhood_title: 'Schools by Neighbourhood',
  all_neighbourhoods_label: 'All neighbourhoods',
  types_title: 'School Types',
  schools_count_word: 'schools',
  photo_coming_label: 'Photo coming soon',
  address_suffix: 'Nairobi',
  from_cbd_label: 'from CBD',
  established_prefix: 'Est.',
  students_word: 'students',
  properties_nearby: 'Properties nearby',
  view_school: 'View school',
  empty_title: 'No schools found',
  empty_text_filtered: 'Try widening your filters or clearing them to see every school.',
  empty_text_default: 'Try adjusting your filters or search query',
  clear_filters: 'Clear all filters',
  error_title: 'Something went wrong',
  retry_button: 'Try again',
  cta_title: 'Looking for a family home?',
  cta_text: 'Find properties near the best schools in Nairobi',
  cta_button: 'Browse rentals',
};

/* ── Blog Detail (every /blog/:slug page) ─────────────────────────────── */
export const DEFAULT_BLOG_DETAIL = {
  loading_text: 'Loading article...',
  notfound_title: 'Article Not Found',
  notfound_text: 'We could not find the blog post you are looking for.',
  notfound_button: 'Back to Neighbourhoods & Guides',
  back_label: 'Back to Neighbourhoods & Guides',
  default_author: 'Oceans Kenya',
  related_heading: 'Related Area Guides',
  guide_suffix: 'Guide',
  cta_title: 'Need Personalised Neighbourhood Advice?',
  cta_text: "Our agents live and breathe Nairobi's neighbourhoods. Tell us what matters to you - schools, commute, budget, lifestyle - and we'll match you with the perfect area.",
  cta_button: 'Talk to an Agent',
  seo_description: 'Read the latest neighbourhood and property guide from Oceans Kenya.',
};

/* ── Legal & Support (all six legal routes) ───────────────────────────── */
export const DEFAULT_LEGAL = {
  contact_prompt: 'Need to speak with our team directly?',
  contact_button: 'Contact Us',
  notfound_title: 'Page Not Found',
  notfound_link: 'Return home',
  // privacy-policy
  privacy_title: 'Privacy Policy',
  privacy_eyebrow: 'Legal',
  privacy_meta_title: 'Privacy Policy | Oceans Kenya',
  privacy_meta_description:
    'How Oceans Kenya collects, uses, stores and protects your personal information when you browse properties, enquire or subscribe.',
  privacy_intro:
    'This Privacy Policy explains how Oceans Kenya ("we", "us") collects, uses and safeguards the personal information you share when you use our website, search for property, contact an agent or subscribe to our updates.',
  // terms-conditions
  terms_title: 'Terms & Conditions',
  terms_eyebrow: 'Legal',
  terms_meta_title: 'Terms & Conditions | Oceans Kenya',
  terms_meta_description:
    'The terms governing your use of the Oceans Kenya website, property listings and estate agency services in Nairobi and across Kenya.',
  terms_intro:
    'These Terms & Conditions govern your access to and use of the Oceans Kenya website and the property information, listings and services made available through it. By using the site you agree to these terms.',
  // cookie-policy
  cookie_title: 'Cookie Policy',
  cookie_eyebrow: 'Legal',
  cookie_meta_title: 'Cookie Policy | Oceans Kenya',
  cookie_meta_description:
    'How Oceans Kenya uses cookies and similar technologies to keep the site working, remember your preferences and improve your property search.',
  cookie_intro:
    'This Cookie Policy explains how Oceans Kenya uses cookies and similar technologies when you visit our website, and how you can manage them.',
  // disclaimer
  disclaimer_title: 'Disclaimer',
  disclaimer_eyebrow: 'Legal',
  disclaimer_meta_title: 'Disclaimer | Oceans Kenya',
  disclaimer_meta_description:
    'Important information about the accuracy of property listings, prices and information published on the Oceans Kenya website.',
  disclaimer_intro:
    'The information published on the Oceans Kenya website is provided for general guidance only. While we strive for accuracy, we make no warranties as to the completeness or reliability of any listing or content.',
  // help-center
  help_title: 'Help Center',
  help_eyebrow: 'Support',
  help_meta_title: 'Help Center | Oceans Kenya',
  help_meta_description:
    'Answers to common questions about searching property, contacting agents, listing a home and using the Oceans Kenya website.',
  help_intro:
    'Need a hand? The Help Center answers the questions we hear most often. If you cannot find what you need, our team is only a message away.',
  // report-a-listing
  report_title: 'Report a Listing',
  report_eyebrow: 'Support',
  report_meta_title: 'Report a Listing | Oceans Kenya',
  report_meta_description:
    'Report an inaccurate, suspicious or duplicate property listing on Oceans Kenya so our team can review and correct it.',
  report_intro:
    'If you believe a listing is inaccurate, misleading, duplicated or suspicious, please tell us. Reports help us keep the platform trustworthy for everyone.',
};

/* ── Commute Time (/commute-time) ─────────────────────────────────────── */
export const DEFAULT_COMMUTE = {
  hero_title: 'Commute Time Search',
  hero_subtitle: 'Find properties near your workplace or daily destination.',
  live_note: 'Times are calculated using live traffic data.',
  straight_note: 'Distances are straight-line from listing coordinates.',
  results_heading_prefix: 'Results for',
  calculating_text: 'Calculating distances...',
  list_label: 'List',
  map_label: 'Map',
  call_label: 'Call',
  email_label: 'Email',
  preview_label: 'Preview',
  rent_label: 'To rent',
  sale_label: 'For sale',
  distance_unavailable: 'Distance unavailable',
  map_heading_prefix: 'Map -',
  popular_destinations: 'Popular Destinations',
  tips_title: 'Commute Tips',
  api_key_note: 'Straight-line distances shown. Add a Google Maps API key for real driving times.',
  fallback_title: 'No exact matches',
  fallback_text: 'Nothing falls within your chosen time window. Showing the closest properties instead.',
  no_results_title: 'No properties found',
  no_results_text: 'Try extending your time range or choosing a different destination',
  error_title: 'Could not load properties',
  try_again: 'Try Again',
  tips: [
    { icon: 'ri-time-line', text: 'Morning peak hours in Nairobi are 7:00 - 9:00 AM' },
    { icon: 'ri-road-map-line', text: 'Mombasa Road and Thika Road experience the heaviest traffic' },
    { icon: 'ri-bus-line', text: 'Matatus are the fastest public transport option on most routes' },
  ],
};

/* ── Estate Agent template (every estate-agent route) ─────────────────── */
export const DEFAULT_ESTATE_AGENT = {
  hero_subtitle_prefix: 'Premium real estate expertise in',
  hero_subtitle_suffix: 'Nairobi - delivered with local mastery.',
  hero_button_primary: 'View',
  hero_button_primary_suffix: 'Homes',
  hero_button_secondary: 'Speak to an Agent',
  intro_heading_prefix: 'Why',
  intro_heading_suffix: 'home buyers choose Oceans Kenya',
  properties_heading_prefix: 'Properties Best Served by Our Agents -',
  results_word: 'results',
  empty_title: 'No properties hosted here yet',
  empty_text_prefix: 'New premium',
  empty_text_suffix: 'listings arrive regularly. Register your interest to be contacted first.',
  empty_button: 'Register Interest',
  faq_heading: 'Frequently Asked Questions',
  related_heading_prefix: 'Expert Guidance in',
  load_more: 'Load More Homes',
  loading_label: 'Loading…',
  cta_title_prefix: 'Trusted Estate Agents in',
  cta_text_prefix: 'Whether you are buying, selling or investing in',
  cta_text_suffix: 'our local agents are ready to deliver a seamless, confidential experience from start to finish.',
  cta_button: 'Contact an Agent',
  notfound_title: 'Page Not Found',
  notfound_text: 'This estate agency page could not be found.',
  notfound_button: 'Browse Nairobi Property',
};

/* ── Area Guide template (every area-guide route) ─────────────────────── */
export const DEFAULT_AREA_GUIDE = {
  hero_subtitle_prefix: 'Everything you need to know about',
  hero_subtitle_suffix: 'schools, malls, lifestyle and the market.',
  hero_button_view: 'View',
  hero_button_view_suffix: 'Homes',
  hero_button_ask: 'Ask About',
  about_heading_prefix: 'About',
  about_heading_suffix: 'Nairobi',
  life_eyebrow: 'Life around here',
  life_heading_prefix: 'Everyday Life in',
  life_full_directory: 'Full Directory',
  results_word: 'results',
  empty_title: 'No properties available yet',
  empty_text_prefix: 'New premium',
  empty_text_suffix: 'listings arrive regularly. Explore the area search or register your interest to be contacted first.',
  empty_search_label: 'Search',
  empty_register: 'Register Interest',
  load_more: 'Load More Homes',
  faq_heading: 'Frequently Asked Questions',
  related_heading_prefix: 'Explore More in',
  sidebar_eyebrow: 'At a glance',
  sidebar_heading_suffix: 'Quick Facts',
  sidebar_best_for: 'Families · Professionals · Investors',
  sidebar_drive_label: 'Drive to CBD',
  cta_title_prefix: 'Ready to Call',
  cta_title_suffix: 'Home?',
  cta_text_prefix: 'Our local agents know',
  cta_text_suffix: 'inside out - from the best streets and schools to off-market opportunities. Let us match you with the perfect property in this neighbourhood.',
  cta_button: 'Contact an Agent',
  notfound_title: 'Guide Not Found',
  notfound_text: 'This premium area guide could not be found.',
  notfound_button: 'Browse Nairobi Property',
};

/* ── Place Detail template (every /directory/place/:id page) ──────────── */
export const DEFAULT_PLACE_DETAIL = {
  loading_title: 'Loading place...',
  notfound_title: 'Place not available',
  notfound_text: "This place may be draft, unpublished, or no longer listed. Browse the Directory to explore everything that's available.",
  notfound_button: 'Back to Directory',
  no_image_label: 'No verified image available',
  about_heading: 'About',
  services_heading: 'Services Offered',
  price_range_heading: 'Price Range',
  location_label: 'Location',
  hours_label: 'Opening Hours',
  phone_label: 'Phone',
  email_label: 'Email',
  features_heading: 'Features',
  gallery_heading: 'Gallery',
  reviews_heading: 'Reviews',
  no_reviews_text: 'No reviews yet - be the first to review.',
  from_google_label: 'From Google Reviews',
  write_review_heading: 'Write a review',
  rating_label: 'Your rating',
  name_label: 'Your name',
  name_placeholder: 'e.g. Wanjiku M.',
  review_label: 'Your review',
  review_placeholder: 'Share what you experienced…',
  moderated_note: 'Reviews are moderated before publishing.',
  submit_review: 'Submit review',
  submitting: 'Submitting…',
  quick_facts: 'Quick facts',
  category_label: 'Category',
  type_label: 'Type',
  price_fact_label: 'Price range',
  area_label: 'Area',
  views_label: 'Views',
  visit_website: 'Visit Website',
  get_directions: 'Get Directions',
  call_button: 'Call',
  share_button: 'Share',
  copy_link: 'Copy link',
  download_pdf: 'Download / Share as PDF',
  related_heading_prefix: 'More in',
  verified_visitor: 'Verified visitor',
};

/* ── Night Life (/night-life) ─────────────────────────────────────────── */
export const DEFAULT_NIGHTLIFE = {
  hero_badge: 'After Dark',
  hero_title: 'Night Life in Nairobi',
  hero_subtitle: 'From thumping nightclubs and rooftop sundowners to cocktail lounges, casinos, karaoke and late-night eats - discover the city after dark and filter it your way.',
  hero_button_primary: 'Browse the line-up',
  hero_button_secondary: 'Full Directory',
  stat_spots: 'Night Spots',
  stat_areas: 'Areas Covered',
  stat_clubs: 'Clubs & Lounges',
  stat_casinos: 'Casinos',
  intro_heading: 'Find your kind of night',
  intro_sub: 'Filter by vibe, area, price and rating to build the perfect night out across Nairobi.',
  showing_word: 'Showing',
  spot_word: 'night spot',
  clear_all: 'Clear all',
  load_more_prefix: 'Load more',
  remaining_word: 'remaining',
  error_title: 'Unable to load night spots',
  retry_button: 'Try again',
  empty_title: 'Nothing matches that yet',
  empty_text_filtered: 'Try widening your filters - clear a couple and the night comes back to life.',
  empty_text_default: 'Night Life venues are being added regularly. Check back soon for the full line-up.',
  reset_filters: 'Reset filters',
  cta_title: 'Live where the night never ends',
  cta_text: 'Homes in Westlands, Kilimani and the city centre put you minutes from the best bars, clubs and late-night kitchens.',
  cta_primary: 'Explore Neighbourhoods',
  cta_secondary: 'Browse Rentals',
};

/**
 * Builds the flat `page_legal_*` defaults from the LEGAL_PAGES record, folding
 * each page's paragraphs into a single editable `body` string (paragraphs
 * separated by a blank line). Keeps a single source of truth for legal copy.
 */
export function buildLegalDefaults(
  pages: Record<string, { sections: { heading: string; body: string[] }[] }>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...DEFAULT_LEGAL };
  Object.entries(pages).forEach(([key, def]) => {
    const k = key.replace(/-/g, '_');
    out[`${k}_sections`] = def.sections.map((s) => ({ heading: s.heading, body: s.body.join('\n\n') }));
  });
  return out;
}