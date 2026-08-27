import { useEffect } from 'react';
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { AuthProvider } from "./hooks/AuthProvider";
import { CurrencyProvider } from "./hooks/CurrencyProvider";
import { useBrandTheme } from "./hooks/useBrandTheme";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// Catches Supabase password reset links that land on the wrong page.
// Supabase sometimes sends reset links to the root URL instead of the
// configured redirectTo. This redirects users to the actual update-password page
// while preserving the recovery hash params so Supabase can process them.
function RecoveryRedirect() {
  const location = useLocation();

  useEffect(() => {
    if (
      window.location.hash.includes('type=recovery') &&
      location.pathname !== '/crm/update-password'
    ) {
      const basePath = __BASE_PATH__ === '/' ? '' : __BASE_PATH__;
      window.location.replace(`${basePath}/crm/update-password${window.location.hash}`);
    }
  }, [location.pathname]);

  return null;
}

function ThemedApp() {
  // Applies brand colours from brand_settings to the root CSS variables
  // that Tailwind's primary/golden/accent tokens read from.
  useBrandTheme();
  return (
    <BrowserRouter basename={__BASE_PATH__}>
      <RecoveryRedirect />
      <ScrollToTop />
      <AppRoutes />
    </BrowserRouter>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <CurrencyProvider>
          <ThemedApp />
        </CurrencyProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}

export default App;