import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, supabaseUrl, supabaseKey } from '@/lib/supabase';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

type DiagResult = {
  resendApiKeyConfigured: boolean;
  resendFromDomainConfigured: boolean;
  supabaseUrlConfigured: boolean;
  serviceRoleConfigured: boolean;
};

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');

  // Diagnostic state
  const [diagLoading, setDiagLoading] = useState(false);
  const [diag, setDiag] = useState<DiagResult | null>(null);
  const [diagError, setDiagError] = useState('');

  const fnUrl = `${supabaseUrl}/functions/v1/send-password-reset`;

  const runDiagnostic = async () => {
    setDiagLoading(true);
    setDiagError('');
    setDiag(null);
    try {
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ diagnostic: true }),
      });
      const data = await res.json();
      if (data && data.diagnostic) {
        setDiag({
          resendApiKeyConfigured: Boolean(data.resendApiKeyConfigured),
          resendFromDomainConfigured: Boolean(data.resendFromDomainConfigured),
          supabaseUrlConfigured: Boolean(data.supabaseUrlConfigured),
          serviceRoleConfigured: Boolean(data.serviceRoleConfigured),
        });
      } else {
        setDiagError('Unexpected response from the email service.');
      }
    } catch {
      setDiagError('Could not reach the email service function.');
    }
    setDiagLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorDetail('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    // NO silent fallback. If the email service is not configured or fails,
    // we surface the exact error loudly instead of pretending it worked.
    try {
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setSent(true);
      } else {
        const code = data.code as string | undefined;
        if (code === 'RESEND_NOT_CONFIGURED') {
          const missing = Array.isArray(data.missing) ? data.missing.join(', ') : 'RESEND_API_KEY, RESEND_FROM_DOMAIN';
          setError('Email service is not set up yet.');
          setErrorDetail(
            `Missing configuration: ${missing}. An administrator needs to add these in the Supabase Dashboard under Edge Function Secrets. Run the check below to confirm.`
          );
        } else if (code === 'RESEND_SEND_FAILED') {
          setError('The email service rejected the send.');
          setErrorDetail('This usually means the Resend sending domain is not verified. Verify your domain in Resend, then try again.');
        } else if (code === 'INVALID_EMAIL') {
          setError('Please enter a valid email address.');
        } else {
          setError(data.error || 'Unable to send reset email. Please try again.');
          if (data.detail) setErrorDetail(String(data.detail));
        }
        // Auto-run diagnostic so the exact problem is visible immediately
        runDiagnostic();
      }
    } catch (err) {
      setError('Could not reach the email service. Please try again.');
      setErrorDetail(err instanceof Error ? err.message : String(err));
      runDiagnostic();
    }

    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg p-8 md:p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h1 className="text-xl font-roboto font-bold text-[#1a1a2e] mb-2">Check your email</h1>
            <p className="text-sm text-gray-500 font-roboto mb-3">
              We&apos;ve sent a password reset link to <strong>{email}</strong>.
            </p>
            <p className="text-xs text-gray-400 font-roboto mb-6">
              Click the link in the email to set a new password. If you don&apos;t see it, check your spam folder.
            </p>

            <Link
              to="/crm/login"
              className="inline-flex items-center gap-2 text-sm font-roboto text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center px-4 py-10">
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
            <h1 className="text-2xl font-roboto font-bold text-[#1a1a2e] mb-1">Reset Password</h1>
            <p className="text-sm text-gray-500 font-roboto">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-md mb-6 font-roboto">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{error}</p>
                  {errorDetail && <p className="text-xs text-red-600/80 mt-1 leading-relaxed">{errorDetail}</p>}
                </div>
              </div>
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
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-md text-sm font-roboto tracking-wide uppercase transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail size={16} />
                  Send Reset Link
                </>
              )}
            </button>
          </form>

          {/* Email service health check */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <button
              type="button"
              onClick={runDiagnostic}
              disabled={diagLoading}
              className="text-xs font-roboto text-gray-500 hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {diagLoading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
              {diagLoading ? 'Checking email service...' : 'Check email service status'}
            </button>

            {diagError && (
              <p className="text-xs text-red-600 font-roboto mt-2">{diagError}</p>
            )}

            {diag && (
              <div className="mt-3 bg-gray-50 rounded-md p-3 space-y-2">
                <DiagRow label="Resend API key" ok={diag.resendApiKeyConfigured} />
                <DiagRow label="Resend sending domain" ok={diag.resendFromDomainConfigured} />
                <DiagRow label="Supabase admin access" ok={diag.serviceRoleConfigured} />
                {(!diag.resendApiKeyConfigured || !diag.resendFromDomainConfigured) && (
                  <p className="text-xs text-amber-700 font-roboto leading-relaxed pt-1 border-t border-gray-200 mt-2">
                    Add the missing secrets in your Supabase Dashboard → Edge Functions → Secrets,
                    then run this check again.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="text-center mt-6">
            <Link
              to="/crm/login"
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

function DiagRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-roboto text-gray-600">{label}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-xs font-roboto text-green-600">
          <ShieldCheck size={13} /> Configured
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-roboto text-red-600">
          <ShieldAlert size={13} /> Missing
        </span>
      )}
    </div>
  );
}