import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole, resolvePostLoginRoute } from '@/lib/authz';
import BrandLogo from '@/components/feature/BrandLogo';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

/**
 * ADMIN gateway — PRIVATE. No signup, no role selector, no public admin
 * registration. Only an existing admin / super_admin may use it.
 *
 * Security contract (never render the wrong portal, ever):
 *  - While authentication/role resolution is pending, we render ONLY the
 *    sign-in screen — never a dashboard, never a portal shell.
 *  - The moment the authoritative role resolves it is compared against the
 *    entry gateway. A non-admin who authenticates here is DENIED the admin
 *    portal, their freshly-created session is TERMINATED so it can never
 *    silently become an agent session, and they are sent to the AGENT
 *    SIGN-IN page (/agent/login) — never the agent dashboard.
 */
export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [agentDetected, setAgentDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signIn, signOut, sessionNotice, dismissSessionNotice } = useAuth();
  // Guards against a duplicate submit (e.g. double-click / Enter+click) firing
  // two authentication requests before React re-renders the disabled state.
  const submittingRef = useRef(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  // Only act on a PRE-EXISTING session when it is definitively an admin —
  // i.e. an already-approved administrator reopening the gateway goes straight
  // in. A non-admin session is NEVER used to boot the visitor away from the
  // form, because that would lock an approved admin out and it would be decide
  // on an old session instead of the credentials being typed.
  useEffect(() => {
    // Never auto-hop while a manual sign-in is still initialising. A restored
    // session (already signed in) still flows straight through.
    if (authLoading || loading || !user) return;
    if (isAdminRole(user.role)) {
      navigate(resolvePostLoginRoute(user, from, 'admin'), { replace: true });
    }
  }, [user, authLoading, loading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError('');
    setAgentDetected(false);
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    // Decide on the real credentials just submitted, not any existing session.
    const { error: signInError, role } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message || 'Invalid credentials');
      submittingRef.current = false;
      setLoading(false);
      return;
    }

    // Credentials are valid. The account's AUTHORITATIVE role decides the
    // outcome — the gateway URL never overrides the account's real role.
    if (isAdminRole(role)) {
      // Give the authentication/session state ~1s to initialise while the
      // button shows "Signing in…", then hand over to the dashboard. This is
      // pure session setup - it is NOT a punch-in and triggers no attendance.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate('/admin/dashboard', { replace: true });
      submittingRef.current = false;
      setLoading(false);
      return;
    }

    // The email genuinely belongs to an agent. Terminate the incorrectly
    // initiated admin session and offer a one-click jump to the AGENT SIGN-IN
    // page — never the admin dashboard and never the agent dashboard. We do
    // NOT auto-redirect, so the user stays in control and the guidance is
    // always visible instead of flashing past.
    setError('');
    setAgentDetected(true);
    await signOut();
    submittingRef.current = false;
    setLoading(false);
  };

  const goToAgentPortal = () => {
    // Explicit action: leave the admin gateway and land on the agent sign-in.
    signOut().finally(() => navigate('/agent/login', { replace: true }));
  };

  const inputCls =
    'w-full px-4 py-3 border border-[#e4e2dc] bg-[#fbfaf7] rounded-md text-sm font-roboto focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-[#1a1a2e]';

  return (
    <div className="min-h-screen bg-[#0a1b34] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <BrandLogo className="h-12 w-auto object-contain" />
          </div>
          <p className="text-xs font-roboto font-extrabold uppercase tracking-[0.18em] text-golden mb-1">Admin Gateway</p>
          <h1 className="text-2xl font-roboto font-bold text-white mb-1">Restricted access</h1>
          <p className="text-sm text-gray-400 font-roboto">Authorized administrators only</p>
        </div>

        <div className="bg-[#0d2340] border border-[#1c3a5e] rounded-lg p-8 md:p-10">
          <div className="mb-6 flex items-start gap-3 rounded-md bg-[#012144] p-3">
            <i className="ri-lock-2-line text-golden mt-0.5" />
            <p className="text-xs text-gray-300 font-roboto leading-relaxed">
              This is a private area. There is no public registration. If you are not an existing administrator you will not gain access.
            </p>
          </div>

          {sessionNotice && (
            <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 px-4 py-3">
              <i className="ri-time-line text-amber-600 mt-0.5" />
              <p className="flex-1 text-sm font-roboto text-amber-800 leading-relaxed">{sessionNotice}</p>
              <button
                type="button"
                onClick={dismissSessionNotice}
                aria-label="Dismiss notice"
                className="text-amber-600 hover:text-amber-800 transition-colors cursor-pointer"
              >
                <i className="ri-close-line" />
              </button>
            </div>
          )}

          {agentDetected && (
            <div className="mb-6 rounded-lg border border-golden/40 bg-[#012144] p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 shrink-0 rounded-full bg-golden/15 flex items-center justify-center">
                  <i className="ri-user-star-line text-golden text-lg" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-roboto font-bold text-white">Agent account detected</p>
                  <p className="mt-1 text-xs text-gray-300 font-roboto leading-relaxed">
                    <span className="font-semibold text-golden">{email}</span> belongs to an agent account, so it can&apos;t open the admin area. Head over to the Agent Portal to sign in.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={goToAgentPortal}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-golden hover:bg-golden/90 text-[#0a1b34] py-3 text-sm font-roboto font-black uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap"
              >
                <i className="ri-arrow-right-line" />
                Continue to Agent Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgentDetected(false);
                  setPassword('');
                }}
                className="mt-2 w-full py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors font-roboto cursor-pointer"
              >
                Use a different admin account
              </button>
            </div>
          )}

          {error && (
            <div className="bg-[#fef2f2] text-[#dc2626] text-sm px-4 py-3 rounded-md mb-6 font-roboto">
              <div className="flex items-start gap-2">
                <i className="ri-error-warning-line mt-0.5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-roboto font-bold text-gray-100 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); if (agentDetected) setAgentDetected(false); }} className={inputCls} placeholder="admin@oceanske.com" />
            </div>
            <div>
              <label className="block text-sm font-roboto font-bold text-gray-100 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => { setPassword(e.target.value); if (agentDetected) setAgentDetected(false); }} className={`${inputCls} pr-10`} placeholder="Enter password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Link to="/admin/forgot-password" className="text-xs font-roboto text-gray-400 hover:text-golden transition-colors cursor-pointer">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-[#002349] text-white py-3 rounded-md text-sm font-roboto font-black uppercase tracking-wide transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap">
              <ShieldCheck size={16} />
              {loading ? 'Signing in…' : 'Access admin area'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6 font-roboto">
          <Link to="/" className="hover:text-golden transition-colors cursor-pointer">← Back to website</Link>
        </p>
      </div>
    </div>
  );
}