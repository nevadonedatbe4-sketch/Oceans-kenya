import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Loader2, UserPlus, UserCog, Shield } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'agent' | 'admin'>('agent');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/crm/dashboard', { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), role },
      },
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setError('An account with this email already exists.');
      } else if (msg.includes('rate') || msg.includes('too many')) {
        setError('Too many attempts. Please try again in a few minutes.');
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setLoading(false);
      setError('Account created but sign-in failed. Please go to the login page.');
      return;
    }

    setLoading(false);
    navigate('/crm/dashboard?welcome=1', { replace: true });
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
            <h1 className="text-2xl font-roboto font-bold text-[#1a1a2e] mb-1">Create account</h1>
            <p className="text-sm text-gray-500 font-roboto">Join the Oceans Kenya team</p>
          </div>

          {error && (
            <div className="bg-[#fef2f2] text-[#dc2626] text-sm px-4 py-3 rounded-md mb-6 font-roboto">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-2">Account type</label>
              <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => setRole('agent')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap ${
                    role === 'agent'
                      ? 'bg-white text-[#1a1a1a] font-medium shadow-sm'
                      : 'text-[#9ca3af] hover:text-[#636363]'
                  }`}
                >
                  <UserCog size={16} />
                  Agent
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap ${
                    role === 'admin'
                      ? 'bg-white text-[#1a1a1a] font-medium shadow-sm'
                      : 'text-[#9ca3af] hover:text-[#636363]'
                  }`}
                >
                  <Shield size={16} />
                  Admin
                </button>
              </div>
              <p className="text-xs text-gray-500 font-roboto mt-1.5">
                {role === 'admin'
                  ? 'Full access to manage listings, team, and settings.'
                  : 'Access to assigned listings and leads.'}
              </p>
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
                  placeholder="Min. 8 characters"
                  minLength={8}
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

            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-1.5">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all pr-10"
                  placeholder="Re-enter password"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-md text-sm font-roboto tracking-wide uppercase transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Create account
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-xs text-gray-500 font-roboto">
              Already have an account?{' '}
              <Link
                to="/crm/login"
                className="text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}