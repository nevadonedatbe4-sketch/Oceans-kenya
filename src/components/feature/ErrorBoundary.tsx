import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * App-wide error boundary.
 *
 * Catches render-time crashes anywhere below it and shows a calm, friendly
 * recovery screen instead of a blank white page. The technical detail is logged
 * to the console for diagnosis but is never shown to the user.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the real detail for diagnosis — just never surface it to the user.
    console.error('[ErrorBoundary] Unhandled render error:', error, info.componentStack);

    // Deploy version-skew: a session that loaded just before a redeploy can mix
    // old and new hashed chunks, producing "failed to fetch dynamically imported
    // module", "Loading chunk … failed", a duplicate react-router ("You cannot
    // render a <Router> inside another <Router>") or a broken reconcile
    // ("removeChild … not a child"). A single reload pulls one consistent build.
    // Guard with a timestamp so a genuine, persistent bug still shows the UI
    // (we only auto-reload once per ~20s window, never in a loop).
    const msg = `${error?.name || ''} ${error?.message || String(error)}`;
    const isStaleBundle =
      /dynamically imported module|Loading chunk|Importing a module script failed|<Router> inside another|removeChild|ChunkLoadError/i.test(msg);
    if (isStaleBundle) {
      try {
        const KEY = 'oceans:auto-reloaded-at';
        const last = Number(sessionStorage.getItem(KEY) || 0);
        if (Date.now() - last > 20000) {
          sessionStorage.setItem(KEY, String(Date.now()));
          window.location.reload();
        }
      } catch {
        /* sessionStorage unavailable — fall through to the recovery UI */
      }
    }
  }

  private handleReload = () => {
    // A deliberate reload should always be allowed to re-attempt a clean fetch.
    try { sessionStorage.removeItem('oceans:auto-reloaded-at'); } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center bg-white rounded-lg p-8 md:p-10 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={28} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-roboto font-bold text-[#1a1a2e] mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 font-roboto leading-relaxed mb-6">
            We hit an unexpected problem while loading this page. Reloading usually
            fixes it — if it keeps happening, please try again a little later.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-md text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap"
            >
              <RotateCcw size={15} />
              Reload the page
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 text-sm font-roboto text-gray-500 hover:text-primary transition-colors cursor-pointer"
            >
              Go to homepage
            </a>
          </div>
        </div>
      </div>
    );
  }
}
