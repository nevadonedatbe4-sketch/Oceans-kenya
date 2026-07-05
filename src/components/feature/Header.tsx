import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavLinks } from '@/hooks/useNavLinks';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useCurrency } from '@/hooks/useCurrency';

type Currency = 'KES' | 'USD' | 'GBP' | 'EUR' | 'UGX';
const CURRENCIES: { code: Currency; label: string }[] = [
  { code: 'KES', label: 'KSh (KES)' },
  { code: 'USD', label: '$ (USD)' },
  { code: 'GBP', label: '£ (GBP)' },
  { code: 'EUR', label: '€ (EUR)' },
  { code: 'UGX', label: 'UGX' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { links: navLinks, loading: navLoading } = useNavLinks();
  const { site, social } = useSiteSettings();

  const { currency, setCurrency } = useCurrency();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setCurrencyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const siteName = site.site_name || 'Oceans Kenya';
  const contactPhone = site.contact_phone || '+254(0)712345678';
  const contactEmail = site.contact_email || 'info@oceans.co.ke';
  const logoUrl = site.logo_url || 'https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/b5c367b8-0348-44ab-b81a-83abfed5503c_favicaon-1-1024x887.png?v=5d2f68fc83a460dece14c00261f8d058';

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Top bar */}
      <div className="hidden md:block bg-black border-b border-white/10">
        <div className="flex items-center justify-end px-6 md:px-10 py-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-6">
              <a
                href={`tel:${contactPhone}`}
                className="flex items-center gap-1.5 text-white/75 hover:text-golden text-xs font-roboto transition-colors cursor-pointer whitespace-nowrap"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-phone-line text-xs"></i>
                </span>
                {contactPhone}
              </a>
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-1.5 text-white/75 hover:text-golden text-xs font-roboto transition-colors cursor-pointer whitespace-nowrap"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-mail-line text-xs"></i>
                </span>
                {contactEmail}
              </a>
            </div>
            <div className="w-px h-4 bg-white/20"></div>
            <div className="relative" ref={currencyRef}>
              <button
                onClick={() => setCurrencyOpen(!currencyOpen)}
                className="flex items-center gap-1 cursor-pointer whitespace-nowrap select-none text-white hover:text-golden transition-colors"
                aria-label={`Current currency: ${currency}. Click to switch.`}
              >
                <span className="font-semibold text-xs">{currency}</span>
                <span className="text-[10px] ml-0.5">&#9662;</span>
              </button>
              {currencyOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg min-w-[130px] py-1 z-50">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setCurrency(c.code); setCurrencyOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-roboto hover:bg-gray-50 transition-colors cursor-pointer ${currency === c.code ? 'text-primary font-semibold' : 'text-gray-600'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a
              href="/crm/login"
              className="text-xs text-white/75 hover:text-golden transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-login-box-line text-xs"></i>
              </span>
              Login
            </a>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="bg-primary transition-shadow duration-200 shadow-md">
        <div className="flex items-center justify-between px-4 md:px-6 lg:px-10 py-3">
          <Link
            to="/"
            aria-label={`Go to ${siteName} homepage`}
            className="flex items-center gap-2.5 cursor-pointer flex-shrink-0 hover:opacity-90 transition-opacity"
          >
            <img
              alt={siteName}
              className="w-8 h-8 md:w-9 md:h-9 object-contain"
              src={logoUrl}
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-0">
            {navLoading ? (
              <div className="h-4 w-32 bg-white/20 animate-pulse rounded" />
            ) : (
              navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-4 py-2 transition-colors cursor-pointer whitespace-nowrap text-white/85 hover:text-golden text-sm"
                >
                  {link.label}
                </Link>
              ))
            )}
          </nav>

          <div className="flex items-center gap-3 lg:hidden">
            <div className="relative">
              <button
                onClick={() => setCurrencyOpen(!currencyOpen)}
                className="flex items-center gap-1 cursor-pointer whitespace-nowrap select-none text-white hover:text-golden transition-colors"
                aria-label={`Current currency: ${currency}. Click to switch.`}
              >
                <span className="font-semibold text-xs">{currency}</span>
                <span className="text-[10px] ml-0.5">&#9662;</span>
              </button>
              {currencyOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg min-w-[130px] py-1 z-50">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setCurrency(c.code); setCurrencyOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-roboto hover:bg-gray-50 transition-colors cursor-pointer ${currency === c.code ? 'text-primary font-semibold' : 'text-gray-600'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a
              href="/crm/login"
              className="text-white/75 hover:text-golden transition-colors"
            >
              <span className="w-8 h-8 flex items-center justify-center">
                <i className="ri-login-box-line text-lg"></i>
              </span>
            </a>
            <button
              className="flex items-center justify-center w-10 h-10 rounded-md cursor-pointer text-white"
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <i className={`text-2xl ${mobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'}`}></i>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-primary border-t border-white/10 px-4 pb-4">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-4 py-3 transition-colors cursor-pointer whitespace-nowrap text-white/85 hover:text-golden text-sm border-b border-white/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}