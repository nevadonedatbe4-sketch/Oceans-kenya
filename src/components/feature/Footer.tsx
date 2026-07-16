import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useFooterSettings } from '@/hooks/useFooterSettings';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { neighborhoods } from '@/mocks/neighborhoods';

const defaultImportantLinks = [
  { label: 'Buy Property', href: '/buy' },
  { label: 'Rent Property', href: '/rent' },
  { label: 'Neighbourhoods', href: '/neighbourhoods' },
  { label: 'New Projects', href: '/new-developments' },
  { label: 'Landlords', href: '/landlords' },
  { label: 'Blog & Guides', href: '/neighbourhoods' },
  { label: 'Contact Us', href: '/contact' },
];

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const { status: newsletterStatus, error: newsletterError, submitToContacts, reset } = useFormSubmit();
  const { getValue, loading } = useFooterSettings();
  const { site, getSite } = useSiteSettings();

  const footerLinksJson = getValue('important_links_json');
  const importantLinks = footerLinksJson
    ? (JSON.parse(footerLinksJson) as Array<{ label: string; href: string }>)
    : defaultImportantLinks;

  const aboutText = getValue('about_text') || 'Welcome to Oceans Kenya, your trusted partner in Nairobi real estate excellence. With integrity, innovation, and client satisfaction at our core, we bring unmatched experience to Kenya\'s dynamic property market.';
  const address = getValue('address') || site.address || 'Riverside Drive, Westlands, Nairobi, Kenya';
  const phone = getValue('phone') || site.contact_phone || '+254(0)712345678';
  const email = getValue('email') || site.contact_email || 'info@oceans.co.ke';
  const footerTagline = getValue('tagline') || 'Oceans Kenya — Your Trusted Real Estate Agents in Nairobi.';
  const logoUrl = getValue('logo_url') || site.logo_url || 'https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/55202c71-05ff-4d5d-a3e9-edf3986c0610_ceans-logo-main.webp?v=89ffc16e7b8bb77db0fda233ffe29e3b';
  const siteName = site.site_name || 'Oceans Kenya';
  const copyrightYear = new Date().getFullYear();

  // Component settings from site_settings
  const footerShowLogo = getSite('footer_show_logo') !== 'false';
  const footerShowSocial = getSite('footer_show_social') === 'true';
  const footerShowNewsletter = getSite('footer_show_newsletter') !== 'false';
  const footerColumns = getSite('footer_columns') || '4';
  const footerBg = getSite('footer_background') || '#0C1A2F';
  const footerTextColor = getSite('footer_text_color') || '#FFFFFF';

  const areaNeighbourhoods = neighborhoods.filter(n => n.is_published).slice(0, 8);

  const colClass = {
    '2': 'md:grid-cols-2',
    '3': 'md:grid-cols-3',
    '4': 'md:grid-cols-2 lg:grid-cols-5',
    '5': 'md:grid-cols-3 lg:grid-cols-5',
  }[footerColumns] || 'md:grid-cols-2 lg:grid-cols-5';

  const handleNewsletterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

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
        <div className="py-14 px-6 md:px-10">
          <div className={`max-w-6xl mx-auto grid grid-cols-1 ${colClass} gap-10`}>
            {Array.from({ length: Number(footerColumns) }).map((_, i) => (
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

  return (
    <footer className="text-white" style={{ backgroundColor: footerBg }}>
      {/* Main footer */}
      <div className="py-14 px-6 md:px-10">
        <div className={`max-w-6xl mx-auto grid grid-cols-1 ${colClass} gap-10`}>
          <div>
            <h4 className="text-sm font-roboto font-bold mb-5" style={textStyle}>About Us</h4>
            <p className="text-sm font-roboto leading-relaxed" style={{ ...mutedStyle, lineHeight: '1.5' }}>
              {aboutText}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-roboto font-bold mb-5" style={textStyle}>Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm font-roboto" style={mutedStyle}>
                <span className="mt-0.5 text-golden">
                  <i className="ri-map-pin-line"></i>
                </span>
                <span>{address}</span>
              </div>
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2 text-sm font-roboto hover:text-golden transition-colors cursor-pointer"
                style={mutedStyle}
              >
                <span className="text-golden">
                  <i className="ri-phone-line"></i>
                </span>
                {phone}
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 text-sm font-roboto hover:text-golden transition-colors cursor-pointer"
                style={mutedStyle}
              >
                <span className="text-golden">
                  <i className="ri-mail-line"></i>
                </span>
                {email}
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-roboto font-bold mb-5" style={textStyle}>Important Links</h4>
            <ul className="space-y-2">
              {importantLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="flex items-center gap-2 text-sm font-roboto hover:text-golden transition-colors cursor-pointer"
                    style={mutedStyle}
                  >
                    <span className="text-golden">
                      <i className="ri-arrow-right-s-line"></i>
                    </span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-roboto font-bold mb-5" style={textStyle}>Areas</h4>
            <ul className="space-y-2">
              {areaNeighbourhoods.map((area) => (
                <li key={area.id}>
                  <Link
                    to={`/neighbourhood/${area.slug}`}
                    className="flex items-center gap-2 text-sm font-roboto hover:text-golden transition-colors cursor-pointer"
                    style={mutedStyle}
                  >
                    <span className="text-golden">
                      <i className="ri-map-pin-line"></i>
                    </span>
                    {area.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {footerShowNewsletter && (
            <div>
              <h4 className="text-sm font-roboto font-bold mb-5" style={textStyle}>Sign Up for Our Newsletter</h4>
              <form
                data-readdy-form="true"
                onSubmit={handleNewsletterSubmit}
                className="flex gap-2"
              >
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="flex-1 rounded-sm px-3 py-2 text-sm font-roboto focus:outline-none focus:border-white/40"
                  style={{ borderColor: `${footerTextColor}1A`, color: '#FFFFFF', backgroundColor: `${footerTextColor}0D` }}
                />
                <button
                  type="submit"
                  disabled={newsletterStatus === 'submitting'}
                  className="px-4 py-2 rounded-sm text-sm font-roboto font-medium transition-colors cursor-pointer whitespace-nowrap"
                  style={{ backgroundColor: '#0D5959', color: '#FFFFFF' }}
                >
                  {newsletterStatus === 'submitting' ? '...' : 'Go'}
                </button>
              </form>
              {newsletterStatus === 'success' && (
                <p className="text-green-400 text-xs font-roboto mt-2">Thanks for subscribing!</p>
              )}
              {newsletterStatus === 'error' && (
                <p className="text-red-400 text-xs font-roboto mt-2">{newsletterError}</p>
              )}
              <p className="text-xs font-roboto mt-3" style={faintStyle}>
                {footerTagline}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t py-8 px-6" style={{ borderColor: `${footerTextColor}14`, backgroundColor: '#091524' }}>
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4">
          {footerShowLogo && (
            <img
              alt={siteName}
              className="h-16 md:h-20 w-auto object-contain opacity-80"
              src={logoUrl}
            />
          )}
          <p className="text-xs font-roboto text-center" style={faintStyle}>
            &copy; {copyrightYear} {siteName}. All rights reserved.
          </p>
          {footerShowSocial && (
            <div className="flex items-center gap-3">
              {[
                { icon: 'ri-facebook-fill', href: 'https://www.facebook.com/oceanskenya', label: 'Facebook' },
                { icon: 'ri-instagram-line', href: 'https://www.instagram.com/oceans_estateagents', label: 'Instagram' },
                { icon: 'ri-linkedin-fill', href: 'https://www.linkedin.com/company/oceans-estate-agents', label: 'LinkedIn' },
                { icon: 'ri-youtube-fill', href: 'https://www.youtube.com/@oceanskenya', label: 'YouTube' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="nofollow noreferrer"
                  aria-label={s.label}
                  className="w-7 h-7 flex items-center justify-center hover:text-golden transition-colors"
                  style={faintStyle}
                >
                  <i className={`${s.icon} text-sm`}></i>
                </a>
              ))}
            </div>
          )}
          <Link
            to="/crm/login"
            className="text-[10px] font-roboto transition-colors cursor-pointer tracking-widest hover:text-white/40"
            style={{ color: `${footerTextColor}26` }}
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}