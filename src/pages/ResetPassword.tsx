import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, KeyRound, CheckCircle, Loader2, AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';

type Stage = 'checking' | 'form' | 'invalid' | 'success';

/**
 * Password reset page (/reset-password).
 *
 * Uses Supabase Auth's native recovery flow. The link in the recovery email
 * (sent via the dashboard SMTP) establishes a short-lived recovery session when
 * it lands here; we then set the new password with supabase.auth.updateUser and
 * sign out everywhere so the account must re-authenticate with the new password.
 * The unified /login page then routes the user to the right dashboard by role.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [stage, setStage] = useState<Stage>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState({ length: false });

  useEffect(() => {
    let settled = false;
    const markReady = () => {
      if (!settled) {
        settled = true;
        setStage('form');
      }
    };

    // The recovery link establishes a Supabase session (detectSessionInUrl) and
    // fires PASSWORD_RECOVERY — which can happen just before or just after this
    // component mounts, so we both subscribe to the event and check the current
    // session, with a brief grace period for the URL-hash exchange to complete.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) markReady();
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        markReady();
        return;
      }
      setTimeout(async () => {
        if (settled) return;
        const { data: again } = await supabase.auth.getSession();
        if (again.session) markReady();
        else setStage('invalid');
      }, 1500);
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  const handlePasswordChange = (v: string) => {
    setPassword(v);
    setChecks({ length: v.length >= 8 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        setError(updErr.message || 'Unable to reset your password. Please request a new reset link.');
        setLoading(false);
        return;
      }
      // Password changed. Sign out everywhere (global) so the recovery session
      // and any other devices must re-authenticate with the new password. Route
      // it through useAuth so it's treated as an intentional sign-out and the
      // login page doesn't show a misleading "session expired" notice.
      try { await signOut(); } catch { /* ignore */ }
      setStage('success');
    } catch {
      setError('Could not reach the reset service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full px-4 py-3 border border-gray-200 bg-white rounded-md text-sm font-roboto focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-[#1a1a2e]';

  // ── Checking ──
  if (stage === 'checking') {
    return (
      <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-sm text-gray-500 font-roboto">Verifying your reset link…</p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired / used ──
  if (stage === 'invalid') {
    return (
      <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg p-8 md:p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h1 className="text-xl font-roboto font-bold text-[#1a1a2e] mb-2">Link invalid or expired</h1>
            <p className="text-sm text-gray-500 font-roboto leading-relaxed mb-6">
              This password reset link is invalid or has expired. It may have already
              been used, or too much time has passed. Please request a new one.
            </p>
            <Link
              to="/agent/forgot-password"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-md text-sm font-roboto font-semibold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap"
            >
              <RotateCcw size={15} />
              Request a new reset link
            </Link>
            <div className="mt-5">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-roboto text-gray-500 hover:text-primary transition-colors cursor-pointer"
              >
                <ArrowLeft size={12} />
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (stage === 'success') {
    return (
      <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg p-8 md:p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h1 className="text-xl font-roboto font-bold text-[#1a1a2e] mb-2">Password changed</h1>
            <p className="text-sm text-gray-500 font-roboto mb-3">
              Your password has been changed successfully. Your other sign-in sessions
              have been signed out.
            </p>
            <p className="text-xs text-gray-400 font-roboto mb-6">
              Please sign in with your new password.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md text-sm font-roboto font-semibold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap"
            >
              <KeyRound size={16} />
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Valid recovery session → enter a new password ──
  return (
    <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="ri-lock-password-line text-golden text-xl" />
            </div>
            <h1 className="text-2xl font-roboto font-bold text-[#1a1a2e] mb-1">Create New Password</h1>
            <p className="text-sm text-gray-500 font-roboto">Choose a strong new password for your account</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-md mb-6 font-roboto">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={`${inputCls} pr-10`}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <i className={`${checks.length ? 'ri-checkbox-circle-fill text-green-600' : 'ri-checkbox-blank-circle-line text-gray-300'}`} />
                <span className={`text-xs font-roboto ${checks.length ? 'text-green-700' : 'text-gray-400'}`}>
                  At least 8 characters
                </span>
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
                  className={`${inputCls} pr-10`}
                  placeholder="Re-enter password"
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
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-md text-sm font-roboto font-bold uppercase tracking-wide transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <KeyRound size={16} />
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link
              to="/agent/forgot-password"
              className="inline-flex items-center gap-2 text-xs font-roboto text-gray-500 hover:text-primary transition-colors cursor-pointer"
            >
              <ArrowLeft size={12} />
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
