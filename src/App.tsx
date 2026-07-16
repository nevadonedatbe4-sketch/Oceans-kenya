import { useEffect } from 'react';
import { BrowserRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { AuthProvider } from "./hooks/useAuth";
import { CurrencyProvider } from "./hooks/useCurrency";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <CurrencyProvider>
          <BrowserRouter basename={__BASE_PATH__}>
            <ScrollToTop />
            <AppRoutes />
          </BrowserRouter>
        </CurrencyProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}

export default App;