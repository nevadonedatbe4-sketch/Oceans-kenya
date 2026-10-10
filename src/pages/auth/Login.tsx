import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { resolvePostLoginRoute } from '@/lib/authz';
import BrandLogo from '@/components/feature/BrandLogo';
import { Eye, EyeOff, LogIn } from 'lucide-react';

/**
 * UNIFIED sign-in — one gateway for every account.
 *
 * Agents and admins sign in through the SAME form. The destination is decided
 * entirely by the account's authoritative server-side role + status via
 * resolvePostLoginRoute (no `entryPortal`, so the URL never influences access):
 *
 *   admin / super_admin        → /admin/dashboard
 *   agent + active (approved)  → /agent/dashboard
 *   agent + pending            → /agent/approval
 *   agent + suspended/rejected → back to the sign-in gateway (no portal access)
 *
 * The PortalGuard on each portal still enforces access on the destination, and
 * RLS + edge functions enforce it on the data. Public registration always
 * creates a pending AGENT (signup-complete forces role='agent'); an admin later
 * promotes the account — there is no admin self-registration.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, sessionNotice, dismissSessionNotice } = useAuth();
  // Guards against a duplicate submit (double-click / Enter+click) firing two
  // authentication requests before React re-renders the disabled state.
  const submittingRef = useRef(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  useEffect(() => {
    // A restored session goes straight through; a MANUAL sign-in is allowed
    // ~1s to initialise (button shows "Signing in…") before we hand over.
    if (!user || loading) return;
    navigate(resolvePostLoginRoute(user, from), { replace: true });
  }, [user, loading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message || 'Invalid credentials');
      submittingRef.current = false;
      setLoading(false);
      return;
    }
    // Credentials confirmed. Allow ~1s for the auth/session state to initialise
    // while "Signing in…" stays on screen, then the effect above hands over to
    // the correct portal for this account's role.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    submittingRef.current = false;
    setLoading(false);
  };

  const inputCls =
    'w-full px-4 py-3 border border-[#e4e2dc] bg-[#fbfaf7] rounded-md text-sm font-roboto focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-[#1a1a2e]';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071a33] via-[#0a2342] to-[#071a33] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <BrandLogo className="h-11 w-auto object-contain" />
          </div>
          <p className="text-xs font-roboto font-semibold uppercase tracking-[0.18em] text-golden mb-1">Oceans Portal</p>
          <h1 className="text-2xl font-roboto font-bold text-white mb-1">Sign in</h1>
          <p className="text-sm text-white/70 font-roboto">Access your workspace — you&apos;ll be taken to the right dashboard for your role</p>
        </div>

        <div className="bg-white rounded-lg p-8 md:p-10">
          {sessionNotice && (
            <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
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
          {error && <div className="bg-[#fef2f2] text-[#dc2626] text-sm px-4 py-3 rounded-md mb-6 font-roboto">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@oceanske.com" />
            </div>
            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-10`} placeholder="Enter password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Link to="/agent/forgot-password" className="text-xs font-roboto text-gray-500 hover:text-accent transition-colors cursor-pointer">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent/90 text-white py-3 rounded-md text-sm font-roboto font-semibold uppercase tracking-wide transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap">
              <LogIn size={16} />
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6 font-roboto">
            Need an account?{' '}
            <Link to="/agent/signup" className="text-accent hover:text-accent/80 transition-colors cursor-pointer">Apply here</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 font-roboto">
          <Link to="/" className="text-white/70 hover:text-white transition-colors cursor-pointer">← Back to website</Link>
        </p>
      </div>
    </div>
  );
}
