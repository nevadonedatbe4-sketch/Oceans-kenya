import { useState } from 'react';
import { Link } from 'react-router-dom';
import usePortalBase from '@/hooks/usePortalBase';
import { supabaseUrl, supabaseKey } from '@/lib/supabase';
import BrandLogo from '@/components/feature/BrandLogo';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

const fnUrl = `${supabaseUrl}/functions/v1/password-reset-request`;

/**
 * Shared "Forgot Password" page for both portals (/agent/forgot-password and
 * /admin/forgot-password).
 *
 * Security: the endpoint ALWAYS answers with the same generic response whether
 * or not the account exists, so the caller can never enumerate registered
 * addresses. The reset token is generated server-side, stored hashed, is
 * single-use and expires after 20 minutes.
 */
export default function ForgotPassword() {
  const portalBase = usePortalBase();
  const isAgent = portalBase === '/agent';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Mirror each portal's sign-in screen so the whole flow feels continuous.
  const theme = isAgent
    ? {
        page: 'bg-gradient-to-b from-[#0b282a] via-[#0d302c] to-[#0b282a]',
        label: 'text-emerald-200',
        sub: 'text-emerald-100/90',
        footerLink: 'text-emerald-200/80 hover:text-white',
        backLink: 'text-emerald-200/80 hover:text-white',
        input:
          'border-[#e4e2dc] bg-[#fbfaf7] focus:border-accent focus:ring-accent/20',
        button: 'bg-accent hover:bg-accent/90',
      }
    : {
        page: 'bg-[#0a1b34]',
        label: 'text-golden',
        sub: 'text-gray-400',
        footerLink: 'text-gray-500 hover:text-golden',
        backLink: 'text-golden hover:text-white',
        input:
          'border-[#e4e2dc] bg-[#fbfaf7] focus:border-primary focus:ring-primary/20',
        button: 'bg-primary hover:bg-[#002349]',
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ email: email.trim() }),
      });

      // Always show the same generic confirmation — no account-enumeration info.
      const data = await res.json().catch(() => null);
      if (data && data.success === false && typeof data.error === 'string') {
        setError(data.error);
      } else {
        setSent(true);
      }
    } catch {
      // Never reveal anything; behave like the generic "check your email".
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen ${theme.page} flex items-center justify-center px-4 py-10`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <BrandLogo className="h-11 w-auto object-contain" />
          </div>
          <p className={`text-xs font-roboto font-semibold uppercase tracking-[0.18em] mb-1 ${theme.label}`}>
            {isAgent ? 'Agent Portal' : 'Admin Gateway'}
          </p>
          <h1 className="text-2xl font-roboto font-bold text-white mb-1">
            {sent ? 'Check your email' : 'Reset password'}
          </h1>
          <p className={`text-sm font-roboto ${theme.sub}`}>
            {sent
              ? 'We have sent you a secure reset link'
              : 'Enter your email and we\u2019ll send you a reset link'}
          </p>
        </div>

        <div className="bg-white rounded-lg p-8 md:p-10">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <p className="text-sm text-gray-500 font-roboto mb-3">
                If an account exists for this email, a password reset link has been sent.
              </p>
              <p className="text-xs text-gray-400 font-roboto mb-6">
                The link expires in 20 minutes and can only be used once. Check your spam folder if you don&apos;t see it.
              </p>

              <Link
                to={`${portalBase}/login`}
                className="inline-flex items-center gap-2 text-sm font-roboto text-gray-500 hover:text-primary transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-md mb-6 font-roboto">
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
                    className={`w-full px-4 py-3 border rounded-md text-sm font-roboto focus:outline-none focus:ring-1 transition-all text-[#1a1a2e] ${theme.input}`}
                    placeholder={isAgent ? 'agent@oceanske.com' : 'admin@oceanske.com'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${theme.button} text-white py-3 rounded-md text-sm font-roboto font-semibold uppercase tracking-wide transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-6">
                <Link
                  to={`${portalBase}/login`}
                  className="inline-flex items-center gap-2 text-xs font-roboto text-gray-500 hover:text-primary transition-colors cursor-pointer"
                >
                  <ArrowLeft size={12} />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6 font-roboto">
          <Link to="/" className={`transition-colors cursor-pointer ${theme.footerLink}`}>← Back to website</Link>
        </p>
      </div>
    </div>
  );
}