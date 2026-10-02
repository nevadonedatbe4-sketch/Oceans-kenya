import { useEffect, Suspense } from 'react';
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
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
import { ChatNotificationCenter } from "./pages/agent/ogroup/components/ChatNotificationCenter";
import { QuickSetProvider } from "./pages/agent/ogroup/QuickSetProvider";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// No Supabase recovery-hash redirect is needed: password resets go through
// the secure token-based flow (single-use, hashed, expiring) using the
// /reset-password page, not the legacy recovery link.

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