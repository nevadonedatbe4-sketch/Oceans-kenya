import { useState, useRef, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFooterSettings } from '@/hooks/useFooterSettings';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { useFooterData } from '@/hooks/useFooterData';
import {
  FOOTER_SEARCH_LINKS,
  FOOTER_COMPANY_LINKS,
  FOOTER_RESOURCE_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_POPULAR_SEARCHES,
  DEFAULT_FOOTER_BOTTOM_LINKS,
  parseFooterColumns,
  parseFooterLinks,
  type FooterLink,
} from '@/lib/footerLinks';
import { formatPhoneDisplay, toTelHref } from '@/lib/contactDefaults';
import { FALLBACK_LOGO } from '@/lib/brandDefaults';

interface ColumnProps {
  title: string;
  links: FooterLink[];
  textStyle: React.CSSProperties;
  mutedStyle: React.CSSProperties;
}

// Columns longer than this fold behind a per-column "See more"; shorter ones render in full.
const COLUMN_VISIBLE_LIMIT = 6;

function FooterColumn({ title, links, textStyle, mutedStyle }: ColumnProps) {
  const [expanded, setExpanded] = useState(false);
  const hasLinks = !!links && links.length > 0;
  const collapsible = hasLinks && links.length > COLUMN_VISIBLE_LIMIT;
  const visibleLinks = collapsible && !expanded ? links.slice(0, COLUMN_VISIBLE_LIMIT) : links;

  if (!hasLinks) return null;

  return (
    <div>
      <h4 className="text-sm font-roboto font-bold mb-4 tracking-wide uppercase" style={textStyle}>
        {title}
      </h4>
      <ul className="space-y-2">
        {visibleLinks.map((link) => (
          <li key={`${link.label}-${link.href}`}>
            <Link
              to={link.href}
              className="text-sm font-roboto leading-snug transition-colors hover:text-golden hover:underline decoration-golden decoration-1 underline-offset-4 cursor-pointer"
              style={mutedStyle}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center gap-1 text-xs font-roboto font-semibold transition-colors hover:text-golden cursor-pointer"
          style={mutedStyle}
        >
          {expanded ? 'See less' : 'See more'}
          <i className={expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}></i>
        </button>
      )}
    </div>
  );
}

export default function Footer() {
  const navigate = useNavigate();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const { status: newsletterStatus, error: newsletterError, submitToContacts } = useFormSubmit();
  const { getValue, loading } = useFooterSettings();
  const { site, getSite, getBrand, social } = useSiteSettings();
  const { areas, typeLinks } = useFooterData();

  // Hidden admin backdoor: double-tap / double-click the copyright year.
  const yearTapRef = useRef(0);
  const handleYearTap = () => {
    const now = Date.now();
    if (now - yearTapRef.current < 350) {
      yearTapRef.current = 0;
      navigate('/admin/login');
    } else {
      yearTapRef.current = now;
    }
  };

  // Map platform name -> Remix icon (matches admin Social Media manager)
  const socialIcon = (platform: string): string => {
    switch (platform.toLowerCase()) {
      case 'facebook': return 'ri-facebook-fill';
      case 'instagram': return 'ri-instagram-line';
      case 'tiktok': return 'ri-linkedin-fill';
      case 'linkedin': return 'ri-linkedin-fill';
      case 'youtube': return 'ri-youtube-fill';
      case 'twitter': case 'x': return 'ri-twitter-x-fill';
      case 'whatsapp': return 'ri-whatsapp-line';
      default: return 'ri-global-line';
    }
  };

  // Social links come purely from admin settings (Social Media tab) - only the
  // ones enabled for the footer are shown.
  const footerSocials = (social || [])
    .filter((s) => s.show_in_footer && s.url && s.url.trim())
    .map((s) => ({ icon: socialIcon(s.platform), href: s.url as string, label: s.platform }));

  const aboutText = getValue('about_text');
  const seoIntro = getValue('seo_intro');
  const address = getValue('address') || site.address;
  const phone = getValue('phone') || site.contact_phone;
  const email = getValue('email') || site.contact_email;
  const footerTagline = getValue('tagline');
  const logoUrl = getValue('logo_url') || site.logo_url || getBrand('footer_logo') || getBrand('main_logo') || FALLBACK_LOGO;
  const siteName = site.site_name || 'Oceans Kenya';
  const copyrightYear = new Date().getFullYear();

  // Footer component settings - footer_settings takes precedence, then site_settings fallback.
  const footerShowLogo = getValue('show_logo') ? getValue('show_logo') !== 'false' : getSite('footer_show_logo') !== 'false';
  const footerShowSocial = getValue('show_social') ? getValue('show_social') === 'true' : getSite('footer_show_social') === 'true';
  const footerShowNewsletter = getValue('show_newsletter') ? getValue('show_newsletter') !== 'false' : getSite('footer_show_newsletter') !== 'false';
  const footerBg = getValue('background') || getSite('footer_background') || '#0C1A2F';
  const footerTextColor = getValue('text_color') || getSite('footer_text_color') || '#FFFFFF';
  const newsletterHeading = getValue('newsletter_heading') || 'Sign Up for Our Newsletter';
  const bottomLinks = parseFooterLinks(getValue('bottom_links_json')) || DEFAULT_FOOTER_BOTTOM_LINKS;

  const handleNewsletterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    // Anti-spam honeypot check
    const formEl = e.currentTarget as HTMLFormElement;
    const honeypot = ((new FormData(formEl).get('company_alt') as string) || '').trim();
    if (honeypot) {
      setNewsletterEmail('');
      return;
    }

    const success = await submitToContacts({
      name: 'Newsletter Subscriber',
      email: newsletterEmail,
      type: 'newsletter',
      tags: ['newsletter'],
    });

    if (success) {
      setNewsletterEmail('');
    }
  };

  if (loading) {
    return (
      <footer className="text-white" style={{ backgroundColor: footerBg }}>
        <div className="py-8 md:py-14 px-4 md:px-10">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-5 w-24 rounded animate-pulse" style={{ backgroundColor: `${footerTextColor}10` }} />
                <div className="h-3 w-full rounded animate-pulse" style={{ backgroundColor: `${footerTextColor}10` }} />
                <div className="h-3 w-3/4 rounded animate-pulse" style={{ backgroundColor: `${footerTextColor}10` }} />
              </div>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  const textStyle = { color: footerTextColor };
  const mutedStyle = { color: `${footerTextColor}99` };
  const faintStyle = { color: `${footerTextColor}66` };
  const borderStyle = { borderColor: `${footerTextColor}1A` };

  const contactEmails = [
    { label: 'General Inquiries', value: getValue('email_general') || getSite('email_general') || email },
    { label: 'Sales', value: getValue('email_sales') || getSite('email_sales') },
    { label: 'Rentals', value: getValue('email_rentals') || getSite('email_rentals') },
    { label: 'Ventures', value: getValue('email_ventures') || getSite('email_ventures') },
  ].filter((e) => e.value && e.value.trim());

  // Column structure comes from the admin editor when set; otherwise the dynamic defaults.
  const footerColumns = parseFooterColumns(getValue('columns_json')) || [
    { title: 'Property Search', links: FOOTER_SEARCH_LINKS },
    { title: 'Property Types', links: typeLinks },
    { title: 'Popular Locations', links: areas },
    { title: 'Popular Searches', links: FOOTER_POPULAR_SEARCHES },
    { title: 'Company', links: FOOTER_COMPANY_LINKS },
    { title: 'Resources', links: FOOTER_RESOURCE_LINKS },
    { title: 'Legal & Support', links: FOOTER_LEGAL_LINKS },
  ];

  return (
    <footer className="text-white" style={{ backgroundColor: footerBg }}>
      {/* ── Brand / intro band ─────────────────────────────────── */}
      <div className="px-4 md:px-10 pt-10 md:pt-14 pb-10 border-b" style={borderStyle}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            {footerShowLogo && (
              <img
                alt={siteName}
                className="h-14 md:h-16 w-auto object-contain mb-5"
                src={logoUrl}
              />
            )}
            <h3 className="text-base font-roboto font-bold mb-3" style={textStyle}>
              {siteName}
            </h3>
            {aboutText && (
              <p className="text-sm font-roboto leading-relaxed mb-4" style={mutedStyle}>
                {aboutText}
              </p>
            )}

            {/* Long SEO / coverage copy - the only folded content in the footer */}
            {seoIntro && (
              <details className="group">
                <summary
                  className="inline-flex items-center gap-2 text-xs font-roboto font-semibold tracking-widest uppercase cursor-pointer list-none"
                  style={faintStyle}
                >
                  <i className="ri-information-line"></i>
                  About our coverage
                  <i className="ri-arrow-down-s-line group-open:rotate-180 transition-transform"></i>
                </summary>
                <p className="text-sm font-roboto leading-relaxed max-w-3xl mt-3" style={faintStyle}>
                  {seoIntro}
                </p>
              </details>
            )}
          </div>

          <div>
            <h4 className="text-sm font-roboto font-bold mb-4 tracking-wide uppercase" style={textStyle}>
              Contact Us
            </h4>
            <div className="space-y-3">
              {address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-sm font-roboto hover:text-golden transition-colors cursor-pointer"
                  style={mutedStyle}
                >
                  <span className="mt-0.5 w-4 h-4 flex items-center justify-center text-golden shrink-0">
                    <i className="ri-map-pin-line"></i>
                  </span>
                  <span>{address}</span>
                </a>
              )}
              {phone && (
                <a
                  href={toTelHref(phone)}
                  className="flex items-center gap-2 text-sm font-roboto hover:text-golden transition-colors cursor-pointer"
                  style={mutedStyle}
                >
                  <span className="w-4 h-4 flex items-center justify-center text-golden shrink-0">
                    <i className="ri-phone-line"></i>
                  </span>
                  {formatPhoneDisplay(phone)}
                </a>
              )}
              {contactEmails.map((em) => (
                <a
                  key={em.label}
                  href={`mailto:${em.value}`}
                  className="flex items-center gap-2 text-sm font-roboto hover:text-golden transition-colors cursor-pointer"
                  style={mutedStyle}
                >
                  <span className="w-4 h-4 flex items-center justify-center text-golden shrink-0">
                    <i className="ri-mail-line"></i>
                  </span>
                  <span className="truncate">
                    <span style={textStyle}>{em.label}: </span>
                    {em.value}
                  </span>
                </a>
              ))}
            </div>

            {footerShowSocial && footerSocials.length > 0 && (
              <div className="flex items-center gap-3 mt-5">
                {footerSocials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="nofollow noreferrer"
                    aria-label={s.label}
                    className="w-8 h-8 flex items-center justify-center rounded-full border transition-colors hover:text-golden capitalize"
                    style={{ ...faintStyle, borderColor: `${footerTextColor}26` }}
                  >
                    <i className={`${s.icon} text-sm`}></i>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Link columns (always visible; long columns fold individually) ─ */}
      <div className="px-4 md:px-10 py-8 md:py-10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-10">
          {footerColumns.map((col) => (
            <FooterColumn key={col.title} title={col.title} links={col.links} textStyle={textStyle} mutedStyle={mutedStyle} />
          ))}
        </div>
      </div>

      {/* ── Newsletter band ───────────────────────────────────── */}
      {footerShowNewsletter && (
        <div className="px-4 md:px-10 pb-10 border-t pt-8" style={borderStyle}>
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <h4 className="text-base font-roboto font-bold mb-1.5" style={textStyle}>
                {newsletterHeading}
              </h4>
              {footerTagline && (
                <p className="text-sm font-roboto" style={faintStyle}>
                  {footerTagline}
                </p>
              )}
            </div>
            <form
              data-readdy-form="true"
              onSubmit={handleNewsletterSubmit}
              className="w-full lg:w-auto flex flex-col sm:flex-row gap-3"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="Enter your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 lg:w-80 rounded-md px-4 py-3 text-sm font-roboto focus:outline-none border-2"
                style={{ borderColor: `${footerTextColor}40`, color: '#1a1a1a', backgroundColor: '#FFFFFF' }}
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'submitting' || newsletterStatus === 'success'}
                className="px-6 py-3 rounded-md text-sm font-roboto font-semibold transition-colors cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: 'rgb(var(--color-accent) / 1)', color: '#FFFFFF' }}
              >
                {newsletterStatus === 'submitting' ? '...' : newsletterStatus === 'success' ? 'Subscribed' : 'Subscribe'}
              </button>
              <input type="text" name="company_alt" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly className="footer-hp-field" />
            </form>
          </div>
          {newsletterStatus === 'success' && (
            <p className="max-w-7xl mx-auto text-green-400 text-sm font-roboto mt-3">Thanks for subscribing! You&apos;re all set.</p>
          )}
          {newsletterStatus === 'error' && (
            <p className="max-w-7xl mx-auto text-red-400 text-sm font-roboto mt-3">{newsletterError}</p>
          )}
        </div>
      )}

      {/* ── Bottom bar ────────────────────────────────────────── */}
      <div className="border-t pt-6 pb-16 sm:pb-6 px-6" style={{ borderColor: `${footerTextColor}14`, backgroundColor: '#091524' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:pr-20 md:pr-24">
          <p className="text-xs font-roboto text-center sm:text-left" style={faintStyle}>
            &copy; <span onClick={handleYearTap} className="select-none" style={faintStyle}>{copyrightYear}</span> {siteName}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {bottomLinks.map((link) =>
              /^https?:\/\//.test(link.href) ? (
                <a
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-roboto transition-colors hover:text-golden cursor-pointer"
                  style={faintStyle}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={`${link.label}-${link.href}`}
                  to={link.href}
                  className="text-xs font-roboto transition-colors hover:text-golden cursor-pointer"
                  style={faintStyle}
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}