import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { resolvePostLoginRoute } from '@/lib/authz';
import BrandLogo from '@/components/feature/BrandLogo';
import { Eye, EyeOff, LogIn } from 'lucide-react';

/**
 * AGENT gateway — public sign-in for approved agents only.
 * An admin / super_admin who supplies valid credentials here is NEVER
 * allowed into the agent portal: the resolver immediately routes them
 * to /admin/dashboard. Pending agents go to /agent/approval.
 */
export default function AgentLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn } = useAuth();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  useEffect(() => {
    // A restored session goes straight through, but a MANUAL sign-in is allowed
    // ~1s to initialise (button shows "Signing in…") before we hand over.
    if (!user || loading) return;
    navigate(resolvePostLoginRoute(user, from), { replace: true });
  }, [user, loading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message || 'Invalid credentials');
      setLoading(false);
      return;
    }
    // Credentials confirmed. Allow ~1s for the authentication/session state to
    // initialise while "Signing in…" stays on screen. Signing in is separate
    // from attendance - nothing is punched in here.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const inputCls =
    'w-full px-4 py-3 border border-[#e4e2dc] bg-[#fbfaf7] rounded-md text-sm font-roboto focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-[#1a1a2e]';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b282a] via-[#0d302c] to-[#0b282a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <BrandLogo className="h-11 w-auto object-contain" />
          </div>
          <p className="text-xs font-roboto font-semibold uppercase tracking-[0.18em] text-emerald-200 mb-1">Agent Portal</p>
          <h1 className="text-2xl font-roboto font-bold text-white mb-1">Agent sign in</h1>
          <p className="text-sm text-emerald-100/90 font-roboto">Access your listing, leads and performance workspace</p>
        </div>

        <div className="bg-white rounded-lg p-8 md:p-10">
          {error && <div className="bg-[#fef2f2] text-[#dc2626] text-sm px-4 py-3 rounded-md mb-6 font-roboto">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="agent@oceanske.com" />
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
            Need an agent account?{' '}
            <Link to="/agent/signup" className="text-accent hover:text-accent/80 transition-colors cursor-pointer">Apply here</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 font-roboto">
          <Link to="/" className="text-emerald-200/80 hover:text-white transition-colors cursor-pointer">← Back to website</Link>
        </p>
      </div>
    </div>
  );
}