import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, supabaseUrl, supabaseKey } from '@/lib/supabase';
import type { Role } from '@/lib/authz';
import { Eye, EyeOff, KeyRound, CheckCircle, Loader2, AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';

type Stage = 'checking' | 'form' | 'invalid' | 'success';

const fnUrl = `${supabaseUrl}/functions/v1/password-reset-confirm`;

function portalBaseFor(role: Role): string {
  return role === 'admin' || role === 'super_admin' ? '/admin' : '/agent';
}

function portalLoginFor(role: Role): string {
  return `${portalBaseFor(role)}/login`;
}

/**
 * Secure password reset page (/reset-password?token=...).
 *
 * - Validates the one-time token against the server BEFORE showing any form,
 *   so an invalid/expired/used token is never hidden behind a password form.
 * - The token itself is never stored client-side or in the URL path - only in
 *   the query string, and only the hash lives server-side.
 * - Successful reset routes the user to the SIGN-IN page of the portal their
 *   account actually belongs to (role comes from the server). Never a dashboard.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [stage, setStage] = useState<Stage>('checking');
  // Which portal this reset belongs to. Defaults to the portal carried in the
  // link, then gets upgraded by the authoritative role the server returns.
  const [role, setRole] = useState<Role>(() => (searchParams.get('portal') === 'admin' ? 'admin' : 'agent'));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState({ length: false });

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      if (!token) {
        if (!cancelled) setStage('invalid');
        return;
      }
      setStage('checking');
      try {
        const res = await fetch(fnUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ token, validate: true }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data.valid) {
          setRole((data.role as Role) || 'agent');
          setStage('form');
        } else {
          // Even an invalid/expired link may carry the account's role (when the
          // token record still exists) — use it so the fallback links land in
          // the right portal instead of always the agent flow.
          if (data?.role) setRole(data.role as Role);
          setStage('invalid');
        }
      } catch {
        if (!cancelled) setStage('invalid');
      }
    };

    validate();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data.success) {
        setRole((data.role as Role) || 'agent');
        // The server just revoked ALL of this account's sessions. Clear any
        // session this tab is still holding so we don't keep a now-invalid
        // token in client storage after a successful reset.
        try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
        setStage('success');
      } else {
        setError(
          (typeof data.error === 'string' && data.error) ||
            'Unable to reset your password. Please request a new reset link.',
        );
        if (data.code === 'INVALID_TOKEN') {
          if (data.role) setRole(data.role as Role);
          setStage('invalid');
        }
      }
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
              to={`${portalBaseFor(role)}/forgot-password`}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-md text-sm font-roboto font-semibold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap"
            >
              <RotateCcw size={15} />
              Request a new reset link
            </Link>
            <div className="mt-5">
              <Link
                to={portalLoginFor(role)}
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
              onClick={() => navigate(portalLoginFor(role), { replace: true })}
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

  // ── Valid token → enter a new password ──
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
              to={`${portalBaseFor(role)}/forgot-password`}
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