import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useFooterSettings } from '@/hooks/useFooterSettings';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const defaultImportantLinks = [
  { label: 'Buy Property', href: '/buy' },
  { label: 'Rent Property', href: '/rent' },
  { label: 'Neighbourhoods', href: '/neighbourhoods' },
  { label: 'New Developments', href: '/new-developments' },
  { label: 'Landlords', href: '/landlords' },
  { label: 'Blog & Guides', href: '/blog' },
  { label: 'Contact Us', href: '/contact' },
];

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const { getValue, loading } = useFooterSettings();
  const { site } = useSiteSettings();

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

  const handleNewsletterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterStatus('submitting');
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    fetch('https://readdy.ai/api/form/d85jb2up8k35tp9sb19g', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData as any).toString(),
    })
      .then(() => {
        setNewsletterStatus('success');
        setNewsletterEmail('');
      })
      .catch(() => setNewsletterStatus('idle'));
  };

  if (loading) {
    return (
      <footer className="bg-primary text-white">
        <div className="py-14 px-6 md:px-10">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-full bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-white/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-primary text-white">
      {/* Main footer */}
      <div className="py-14 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <h4 className="text-white font-prata text-base mb-5">About Us</h4>
            <p className="text-white/60 text-sm font-roboto leading-relaxed">
              {aboutText}
            </p>
          </div>

          <div>
            <h4 className="text-white font-prata text-base mb-5">Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-white/60 text-sm font-roboto">
                <span className="mt-0.5 text-golden">
                  <i className="ri-map-pin-line"></i>
                </span>
                <span>{address}</span>
              </div>
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2 text-white/60 text-sm font-roboto hover:text-golden transition-colors cursor-pointer"
              >
                <span className="text-golden">
                  <i className="ri-phone-line"></i>
                </span>
                {phone}
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 text-white/60 text-sm font-roboto hover:text-golden transition-colors cursor-pointer"
              >
                <span className="text-golden">
                  <i className="ri-mail-line"></i>
                </span>
                {email}
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-prata text-base mb-5">Important Links</h4>
            <ul className="space-y-2">
              {importantLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="flex items-center gap-2 text-white/60 text-sm font-roboto hover:text-golden transition-colors cursor-pointer"
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
            <h4 className="text-white font-prata text-base mb-5">Sign Up for Our Newsletter</h4>
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
                className="flex-1 bg-white border border-white/20 rounded-sm px-3 py-2 text-sm font-roboto text-primary placeholder:text-gray-400 focus:outline-none focus:border-golden"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'submitting'}
                className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-sm text-sm font-roboto font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                {newsletterStatus === 'submitting' ? '...' : 'Go'}
              </button>
            </form>
            {newsletterStatus === 'success' && (
              <p className="text-green-400 text-xs font-roboto mt-2">Thanks for subscribing!</p>
            )}
            <p className="text-white/50 text-xs font-roboto mt-3">
              {footerTagline}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4">
          <img
            alt={siteName}
            className="h-12 w-auto object-contain opacity-80"
            src={logoUrl}
          />
          <p className="text-white/40 text-xs font-roboto text-center">
            &copy; {copyrightYear} {siteName}. All rights reserved.
          </p>
          <Link
            to="/crm/login"
            className="text-white/15 hover:text-white/40 text-[10px] font-roboto transition-colors cursor-pointer tracking-widest"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}