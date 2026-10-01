import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseUrl, supabaseKey } from '@/lib/supabase';
import BrandLogo from '@/components/feature/BrandLogo';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

/**
 * Agent self-service signup — PUBLIC.
 * - The applicant can NEVER choose their own role.
 * - The role is always 'agent' and the account status is always 'pending'.
 * - A pending agent cannot reach the dashboard until an admin approves them.
 */
export default function AgentSignup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/agent/approval', { replace: true });
    };
    checkSession();
  }, [navigate]);

  const createProfile = async (userId: string, displayName: string, emailAddress: string) => {
    // Call the signup-complete edge function which FORCES role='agent',
    // status='pending'. No client value can override it.
    const res = await fetch(`${supabaseUrl}/functions/v1/signup-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
      },
      body: JSON.stringify({ name: displayName, user_id: userId, email: emailAddress }),
    });
    return res;
  };

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

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // metadata carries the applicant's name only — no role field is sent.
      options: { data: { name: name.trim() } },
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

    // Write the profile row (forced agent + pending) via the edge function.
    if (data?.user) {
      try {
        await createProfile(data.user.id, name.trim(), email.trim());
      } catch (profileErr) {
        console.error('Profile creation failed:', profileErr);
      }
    }

    // Show the pending-approval screen immediately.
    setLoading(false);
    navigate('/agent/approval', { replace: true });
  };

  const inputCls =
    'w-full px-4 py-3 border border-[#e4e2dc] bg-[#fbfaf7] rounded-md text-sm font-roboto focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-[#1a1a2e]';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b282a] via-[#0d302c] to-[#0b282a] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Distinct AGENT portal mark — clearly not the admin portal */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <BrandLogo className="h-11 w-auto object-contain" />
          </div>
          <p className="text-sm font-roboto font-extrabold uppercase tracking-[0.18em] text-emerald-200 mb-1">Agent Portal</p>
          <h1 className="text-2xl font-roboto font-bold text-white mb-1">Join our agent team</h1>
          <p className="text-sm text-emerald-100/90 font-roboto">
            Apply for an agent account. An administrator approves every application.
          </p>
        </div>

        <div className="bg-white rounded-lg p-8 md:p-10">
          {error && (
            <div className="bg-[#fef2f2] text-[#dc2626] text-sm px-4 py-3 rounded-md mb-6 font-roboto">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-roboto font-bold text-gray-900 mb-1.5">Full name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-roboto font-bold text-gray-900 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-roboto font-bold text-gray-900 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} className={`${inputCls} pr-10`} placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-roboto font-bold text-gray-900 mb-1.5">Confirm password</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} className={`${inputCls} pr-10`} placeholder="Re-enter password" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="bg-accent/5 border border-accent/15 rounded-md p-3">
              <p className="text-sm text-gray-600 font-roboto leading-relaxed">
                <i className="ri-shield-check-line text-accent inline mr-1" />
                By applying you agree to be reviewed by an administrator. Your account stays inactive until approved.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-white py-3 rounded-md text-sm font-roboto font-black uppercase tracking-wide transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <UserPlus size={16} />
              {loading ? 'Submitting application...' : 'Apply for agent account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6 font-roboto">
            Already an approved agent?{' '}
            <Link to="/agent/login" className="text-accent hover:text-accent/80 transition-colors cursor-pointer">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 font-roboto">
          <Link to="/" className="text-emerald-200/80 hover:text-white transition-colors cursor-pointer">← Back to website</Link>
        </p>
      </div>
    </div>
  );
}