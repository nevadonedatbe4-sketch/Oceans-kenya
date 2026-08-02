import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNavLinks } from '@/hooks/useNavLinks';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useCurrency } from '@/hooks/useCurrency';

type Currency = 'KES' | 'USD' | 'GBP' | 'EUR' | 'UGX' | 'AED' | 'ZAR';
const FALLBACK_CURRENCIES: { code: Currency; label: string }[] = [
  { code: 'KES', label: 'KSh (KES)' },
  { code: 'USD', label: '$ (USD)' },
  { code: 'GBP', label: '\u00a3 (GBP)' },
  { code: 'EUR', label: '\u20ac (EUR)' },
];

function CurrencyDropdown({
  currency,
  setCurrency,
  open,
  setOpen,
  buttonRef,
  availableCurrencies,
}: {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  buttonRef: React.RefObject<HTMLDivElement | null>;
  availableCurrencies: { code: Currency; label: string }[];
}) {
  useEffect(() => {
    if (!open) return;
    const handleDocClick = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [open, setOpen, buttonRef]);

  if (!open) return null;

  return (
    <div className="absolute top-full right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg min-w-[150px] py-1 z-50 overflow-hidden">
      {availableCurrencies.map((c) => (
        <button
          key={c.code}
          onClick={() => { setCurrency(c.code); setOpen(false); }}
          className={`w-full text-left px-4 py-2.5 text-sm font-roboto hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap ${currency === c.code ? 'text-primary font-semibold bg-primary/5' : 'text-gray-700'}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { links: navLinks, loading: navLoading } = useNavLinks();
  const { site, getSite } = useSiteSettings();
  const { currency, setCurrency, currencies } = useCurrency();

  // Build dropdown list — use DB-enabled currencies, fallback to hardcoded list while loading
  const dropdownCurrencies: { code: Currency; label: string }[] = currencies.length > 0
    ? currencies.map((c) => ({
        code: c.code as Currency,
        label: `${c.symbol} (${c.code})`,
      }))
    : FALLBACK_CURRENCIES;

  const [desktopCurrencyOpen, setDesktopCurrencyOpen] = useState(false);
  const [mobileCurrencyOpen, setMobileCurrencyOpen] = useState(false);
  const desktopCurrencyRef = useRef<HTMLDivElement>(null);
  const mobileCurrencyRef = useRef<HTMLDivElement>(null);

  const [scrolled, setScrolled] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const companyRef = useRef<HTMLDivElement>(null);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setCompanyOpen(false);
      }
      // Close any open dynamic dropdowns when clicking outside
      Object.entries(dropdownRefs.current).forEach(([id, ref]) => {
        if (ref && !ref.contains(e.target as Node)) {
          setOpenDropdowns((prev) => ({ ...prev, [id]: false }));
        }
      });
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const siteName = site.site_name || 'Oceans Kenya';
  const contactPhone = site.contact_phone || '+254(0)712345678';
  const contactEmail = site.contact_email || 'info@oceans.co.ke';
  const logoUrl = site.logo_url || 'https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/b5c367b8-0348-44ab-b81a-83abfed5503c_favicaon-1-1024x887.png?v=5d2f68fc83a460dece14c00261f8d058';

  // Component settings
  const stickyNavbar = getSite('sticky_navbar') !== 'false';
  const transparentNavbar = getSite('transparent_navbar') === 'true';
  const showPhone = getSite('nav_show_phone') !== 'false';
  const showCTA = getSite('nav_show_cta') === 'true';
  const ctaLabel = getSite('nav_cta_label') || 'Get Valuation';
  const ctaLink = getSite('nav_cta_link') || '/landlords';

  const isHome = location.pathname === '/';
  const useTransparent = transparentNavbar && isHome && !scrolled;

  const navBgClass = useTransparent ? 'bg-transparent' : 'bg-primary';
  const topBarClass = useTransparent ? 'bg-black/40 border-white/5' : 'bg-black border-white/10';

  // Split nav links: group "About Us" and "Contact" into "Connect" dropdown
  const companyLabels = ['about us', 'about', 'contact', 'contact us'];
  const companyLinks = navLinks.filter((l) => companyLabels.includes(l.label.toLowerCase().trim()));
  // Filter out Residential Property from nav
  const filteredNavLinks = navLinks.filter((l) => !['residential property', 'commercial property'].includes(l.label.toLowerCase().trim()));
  // Links with children become their own dropdowns
  const dropdownLinks = filteredNavLinks.filter((l) => l.children && l.children.length > 0 && !companyLabels.includes(l.label.toLowerCase().trim()));
  // Flat links (no children, not in company group)
  const mainLinks = filteredNavLinks.filter((l) => !companyLabels.includes(l.label.toLowerCase().trim()) && (!l.children || l.children.length === 0));

  return (
    <div className={`top-0 left-0 right-0 z-50 ${stickyNavbar ? 'fixed' : 'relative'}`}>
      {/* Top bar */}
      <div className={`hidden md:block transition-colors duration-300 ${topBarClass}`}>
        <div className="flex items-center justify-end px-6 md:px-10 py-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-6">
              {showPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="flex items-center gap-1.5 text-white/75 hover:text-golden text-sm font-roboto font-medium transition-colors cursor-pointer whitespace-nowrap leading-[1.5] tracking-[0]"
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-phone-line text-sm"></i>
                  </span>
                  {contactPhone}
                </a>
              )}
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-1.5 text-white/75 hover:text-golden text-sm font-roboto font-medium transition-colors cursor-pointer whitespace-nowrap leading-[1.5] tracking-[0]"
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-mail-line text-sm"></i>
                </span>
                {contactEmail}
              </a>
            </div>
            <div className="relative" ref={desktopCurrencyRef}>
              <button
                onClick={() => setDesktopCurrencyOpen(!desktopCurrencyOpen)}
                className="flex items-center gap-2 cursor-pointer whitespace-nowrap select-none text-white hover:text-golden transition-colors"
                aria-label={`Current currency: ${currency}. Click to switch.`}
              >
                <span className="font-semibold text-sm">{currency}</span>
                <span className={`text-base text-golden transition-transform duration-300 ${desktopCurrencyOpen ? 'rotate-180' : ''}`}>&#9662;</span>
              </button>
              <CurrencyDropdown
                currency={currency}
                setCurrency={setCurrency}
                open={desktopCurrencyOpen}
                setOpen={setDesktopCurrencyOpen}
                buttonRef={desktopCurrencyRef}
                availableCurrencies={dropdownCurrencies}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className={`transition-all duration-300 ${navBgClass} ${useTransparent ? '' : 'shadow-md'}`}>
        <div className="flex items-center justify-between px-4 md:px-6 lg:px-10 py-3">
          <Link
            to="/"
            aria-label={`Go to ${siteName} homepage`}
            className="flex items-center gap-2.5 cursor-pointer flex-shrink-0 hover:opacity-90 transition-opacity"
          >
            <img
              alt={siteName}
              className="w-16 h-16 md:w-20 md:h-20 object-contain"
              src={logoUrl}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0">
            {navLoading ? (
              <div className="h-4 w-32 bg-white/20 animate-pulse rounded" />
            ) : (
              <>
                {mainLinks.map((link) => (
                  <Link
                    key={link.id}
                    to={link.href}
                    className="px-4 py-2 transition-colors cursor-pointer whitespace-nowrap text-white/85 hover:text-golden text-sm font-medium capitalize tracking-[0.05em]"
                  >
                    {link.label}
                  </Link>
                ))}
                {dropdownLinks.map((link) => (
                  <div
                    key={link.id}
                    className="relative"
                    ref={(el) => { dropdownRefs.current[link.id] = el; }}
                  >
                    <button
                      onClick={() => setOpenDropdowns((prev) => ({ ...prev, [link.id]: !prev[link.id] }))}
                      className="px-4 py-2 transition-colors cursor-pointer whitespace-nowrap text-white/85 hover:text-golden text-sm font-medium capitalize tracking-[0.05em] flex items-center gap-2"
                    >
                      {link.label}
                      <span className={`text-base ml-0.5 text-golden transition-transform duration-300 ${openDropdowns[link.id] ? 'rotate-180' : ''}`}>&#9662;</span>
                    </button>
                    {openDropdowns[link.id] && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg min-w-[220px] py-1 z-50">
                        {link.children.map((child) => (
                          <Link
                            key={child.id}
                            to={child.href}
                            className="block px-4 py-2.5 text-sm font-roboto text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
                            onClick={() => setOpenDropdowns((prev) => ({ ...prev, [link.id]: false }))}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {companyLinks.length > 0 && (
                  <div className="relative" ref={companyRef}>
                    <button
                      onClick={() => setCompanyOpen(!companyOpen)}
                      className="px-4 py-2 transition-colors cursor-pointer whitespace-nowrap text-white/85 hover:text-golden text-sm font-medium capitalize tracking-[0.05em] flex items-center gap-2"
                    >
                      Connect
                      <span className={`text-base ml-0.5 text-golden transition-transform duration-300 ${companyOpen ? 'rotate-180' : ''}`}>&#9662;</span>
                    </button>
                    {companyOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg min-w-[160px] py-1 z-50">
                        {companyLinks.map((link) => (
                          <Link
                            key={link.id}
                            to={link.href}
                            className="block px-4 py-2.5 text-sm font-roboto text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
                            onClick={() => setCompanyOpen(false)}
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {showCTA && (
              <Link
                to={ctaLink}
                className="ml-3 px-5 py-2.5 bg-golden text-white text-xs font-semibold capitalize tracking-wider hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                {ctaLabel}
              </Link>
            )}
          </nav>

          {/* Mobile header controls */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="relative" ref={mobileCurrencyRef}>
              <button
                onClick={() => setMobileCurrencyOpen(!mobileCurrencyOpen)}
                className="flex items-center gap-2 cursor-pointer whitespace-nowrap select-none text-white hover:text-golden transition-colors"
                aria-label={`Current currency: ${currency}. Click to switch.`}
              >
                <span className="font-semibold text-sm">{currency}</span>
                <span className={`text-base text-golden transition-transform duration-300 ${mobileCurrencyOpen ? 'rotate-180' : ''}`}>&#9662;</span>
              </button>
              <CurrencyDropdown
                currency={currency}
                setCurrency={setCurrency}
                open={mobileCurrencyOpen}
                setOpen={setMobileCurrencyOpen}
                buttonRef={mobileCurrencyRef}
                availableCurrencies={dropdownCurrencies}
              />
            </div>
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
          <div className={`lg:hidden border-t border-white/10 px-4 pb-4 ${navBgClass}`}>
            <nav className="flex flex-col gap-1">
              {mainLinks.map((link) => (
                <Link
                  key={link.id}
                  to={link.href}
                  className="px-4 py-3 transition-colors cursor-pointer whitespace-nowrap text-white/85 hover:text-golden text-sm font-medium capitalize tracking-[0.05em] border-b border-white/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {dropdownLinks.map((link) => (
                <div key={link.id} className="border-b border-white/5">
                  <button
                    onClick={() => setOpenDropdowns((prev) => ({ ...prev, [link.id]: !prev[link.id] }))}
                    className="w-full px-4 py-3 flex items-center justify-between cursor-pointer whitespace-nowrap text-white/85 hover:text-golden text-sm font-medium capitalize tracking-[0.05em]"
                  >
                    {link.label}
                    <span className={`text-base text-golden transition-transform duration-300 ${openDropdowns[link.id] ? 'rotate-180' : ''}`}>&#9662;</span>
                  </button>
                  {openDropdowns[link.id] && (
                    <div className="pb-2 pl-6 flex flex-col gap-1">
                      {link.children.map((child) => (
                        <Link
                          key={child.id}
                          to={child.href}
                          className="px-2 py-2 transition-colors cursor-pointer whitespace-nowrap text-white/70 hover:text-golden text-sm font-medium capitalize tracking-[0.05em]"
                          onClick={() => { setMobileMenuOpen(false); setOpenDropdowns((prev) => ({ ...prev, [link.id]: false })); }}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {companyLinks.length > 0 && (
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-white/60 text-xs font-medium capitalize tracking-[0.05em] mb-2">Connect</p>
                  <div className="flex flex-col gap-1">
                    {companyLinks.map((link) => (
                      <Link
                        key={link.id}
                        to={link.href}
                        className="px-2 py-2 transition-colors cursor-pointer whitespace-nowrap text-white/85 hover:text-golden text-sm font-medium capitalize tracking-[0.05em]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {showCTA && (
                <Link
                  to={ctaLink}
                  className="px-4 py-3 bg-golden text-white text-xs font-semibold capitalize tracking-wider text-center mt-2 cursor-pointer whitespace-nowrap"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {ctaLabel}
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}