import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, LogIn } from 'lucide-react';

function getFriendlyError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid email') || msg.includes('invalid password')) {
    return 'Incorrect email or password.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please check your email to confirm your account before signing in.';
  }
  if (msg.includes('deactivated') || msg.includes('suspended')) {
    return 'Your account has been deactivated. Please contact your administrator.';
  }
  if (msg.includes('no account found')) {
    return 'No account found. Please contact your administrator.';
  }
  if (msg.includes('rate') || msg.includes('too many')) {
    return 'Too many attempts. Please try again in a few minutes.';
  }
  return 'An unexpected error occurred. Please try again.';
}

export default function CRMLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signIn } = useAuth();

  useEffect(() => {
    if (user) {
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';
      navigate(isAdmin ? '/admin-dashboard' : '/agent-dashboard', { replace: true });
      return;
    }

    // Detect recovery flow from URL hash (e.g. #access_token=...&type=recovery)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      navigate('/crm/update-password', { replace: true });
      return;
    }

    // Also check if user has a valid recovery session but no profile yet
    const checkRecoverySession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/crm/update-password', { replace: true });
      }
    };
    checkRecoverySession();
  }, [user, navigate]);

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
      setError(getFriendlyError(signInError.message || 'Invalid credentials'));
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <img
                src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/b5c367b8-0348-44ab-b81a-83abfed5503c_favicaon-1-1024x887.png?v=5d2f68fc83a460dece14c00261f8d058"
                alt="Oceans"
                className="w-8 h-8 object-contain"
              />
            </div>
            <h1 className="text-2xl font-roboto font-bold text-[#1a1a2e] mb-1">Admin Portal</h1>
            <p className="text-sm text-gray-500 font-roboto">Sign in to manage your real estate business</p>
          </div>

          {error && (
            <div className="bg-[#fef2f2] text-[#dc2626] text-sm px-4 py-3 rounded-md mb-6 font-roboto">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                placeholder="admin@oceans.co.ke"
              />
            </div>

            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all pr-10"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/crm/forgot-password"
                className="text-xs font-roboto text-gray-500 hover:text-primary transition-colors cursor-pointer"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-md text-sm font-roboto tracking-wide uppercase transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <LogIn size={16} />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6 font-roboto">
            Don&apos;t have an account?{' '}
            <Link
              to="/crm/signup"
              className="text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}