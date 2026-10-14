import { useEffect, Suspense } from 'react';
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { AuthProvider } from "./hooks/useAuth";
import { GlobalPresenceProvider } from "./hooks/useGlobalPresence";
import { CurrencyProvider } from "./hooks/useCurrency";
import { useBrandTheme } from "./hooks/useBrandTheme";
import { useCardTheme } from "./hooks/useCardTheme";
import { useTypography } from "./hooks/useTypography";
import PageLoader from "./components/feature/PageLoader";
import { installRoutePrefetch } from "./router/prefetch";
import { primeAreaCentres } from "./lib/areaGeo";
import { ChatNotificationCenter } from "./pages/agent/ogroup/components/ChatNotificationCenter";
import { QuickSetProvider } from "./pages/agent/ogroup/QuickSetProvider";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// Password reset uses Supabase's native recovery email. Supabase verifies the
// link and redirects to the configured target with the recovery session in the
// URL hash, firing PASSWORD_RECOVERY. If the dashboard's Site-URL fallback drops
// the user somewhere other than the reset page (e.g. the homepage, when the
// precise /reset-password URL isn't in the Redirect-URLs allow-list), bounce
// them to the reset form — the recovery session persists so the form picks it up.
function RecoveryRedirect() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const goReset = () => {
      if (window.location.pathname.replace(/\/$/, '').endsWith('/reset-password')) return;
      navigate('/reset-password', { replace: true });
    };

    // Catch the token still in the URL hash on first load (before supabase-js
    // consumes it), and the PASSWORD_RECOVERY event (when it fires after mount).
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery')) goReset();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') goReset();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}

// Warms a route's chunk on link hover/focus so the on-demand load usually
// finishes before the click lands.
function RoutePrefetch() {
  useEffect(() => installRoutePrefetch(__BASE_PATH__), []);
  return null;
}

// Loads the admin-managed area coordinates/landmarks from the database ONCE and
// registers them as the site-wide distance source of truth, so Buy / Rent /
// All Properties / SEO pages all measure against the same live data.
function AreaGeoPrime() {
  useEffect(() => { primeAreaCentres(); }, []);
  return null;
}

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <PageLoader size={48} text="Loading page..." />
    </div>
  );
}

function ThemedApp() {
  // Applies brand colours from brand_settings to the root CSS variables
  // that Tailwind's primary/golden/accent tokens read from.
  useBrandTheme();
  useCardTheme();
  // Applies typography_settings (Management → Typography) to the root CSS
  // variables the base stylesheet + Tailwind font utilities consume.
  useTypography();
  return (
    <BrowserRouter basename={__BASE_PATH__}>
      <ScrollToTop />
      <RecoveryRedirect />
      <RoutePrefetch />
      <AreaGeoPrime />
      <ChatNotificationCenter />
      <QuickSetProvider>
        <Suspense fallback={<RouteFallback />}>
          <AppRoutes />
        </Suspense>
      </QuickSetProvider>
    </BrowserRouter>
  );
}

/**
 * ONE global presence system for the whole authenticated session.
 *
 * GlobalPresenceProvider sits ABOVE all routes, so presence starts the instant
 * a user is authenticated and survives every navigation (dashboard, CRM,
 * public site, Chat) until they sign out. No layout, page or component owns it.
 */
function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <GlobalPresenceProvider>
          <CurrencyProvider>
            <ThemedApp />
          </CurrencyProvider>
        </GlobalPresenceProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}

export default App;