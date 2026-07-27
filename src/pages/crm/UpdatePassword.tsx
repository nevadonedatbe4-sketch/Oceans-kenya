import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Lock, CheckCircle, Loader2, ArrowLeft, KeyRound } from 'lucide-react';

type Step = 'check' | 'code' | 'password' | 'success' | 'expired';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillEmail = (location.state as { email?: string })?.email || '';

  // Step management
  const [step, setStep] = useState<Step>('check');
  const [email, setEmail] = useState(prefillEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Refs for code input fields (6 digits)
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // On mount, check if we already have a recovery session (link-based flow)
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (session) {
          // We have a valid recovery session — user clicked the link and it worked
          setEmail(session.user.email || '');
          setStep('password');
        } else {
          // Check URL hash for recovery params
          const hash = window.location.hash;
          if (hash.includes('type=recovery') && hash.includes('access_token=')) {
            // Supabase SDK should auto-exchange. Wait a beat and re-check.
            setTimeout(async () => {
              if (cancelled) return;
              const { data: { session: s2 } } = await supabase.auth.getSession();
              if (s2) {
                setEmail(s2.user.email || '');
                setStep('password');
              } else {
                setStep('code');
              }
            }, 800);
          } else {
            // No session and no hash — go to code entry
            setStep('code');
          }
        }
      } catch {
        if (!cancelled) setStep('code');
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // Handle code input (auto-tab between 6 digits)
  const handleCodeDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const digits = code.split('');
    digits[index] = value;
    const newCode = digits.join('').slice(0, 6);
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setCode(pasted);
    // Focus the last-filled or next empty input
    const focusIdx = Math.min(pasted.length, 5);
    codeInputRefs.current[focusIdx]?.focus();
  };

  // Verify code with Supabase
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: 'recovery',
      });

      if (verifyError) {
        const msg = verifyError.message.toLowerCase();
        if (msg.includes('expired')) {
          setError('This code has expired. Please request a new one.');
        } else if (msg.includes('invalid')) {
          setError('Invalid code. Please check and try again.');
        } else {
          setError(verifyError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        setStep('password');
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Set new password
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in both fields.');
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

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message || 'Failed to update password. The reset session may have expired.');
        setLoading(false);
        return;
      }

      setStep('success');
      setTimeout(() => {
        navigate('/crm/dashboard', { replace: true });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }

    setResending(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/crm/update-password`,
    });

    if (resetError) {
      const msg = resetError.message.toLowerCase();
      if (msg.includes('rate') || msg.includes('too many')) {
        setError('Too many attempts. Please wait a moment.');
      } else {
        setError('Unable to resend. Please check the email address.');
      }
    }

    setResending(false);
  };

  // ----- RENDER: Checking state -----
  if (step === 'check') {
    return (
      <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center px-4">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  // ----- RENDER: Success -----
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg p-8 md:p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h1 className="text-xl font-roboto font-bold text-[#1a1a2e] mb-2">Password updated</h1>
            <p className="text-sm text-gray-500 font-roboto">
              Your password has been changed. Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ----- RENDER: Code entry step -----
  if (step === 'code') {
    return (
      <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg p-8 md:p-10">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                <img
                  src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/b5c367b8-0348-44ab-b81a-83abfed5503c_favicaon-1-1024x887.png?v=5d2f68fc83a460dece14c00261f8d058"
                  alt="Oceans"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <h1 className="text-2xl font-roboto font-bold text-[#1a1a2e] mb-1">Check your email</h1>
              <p className="text-sm text-gray-500 font-roboto">
                We sent a 6-digit reset code to your email. Enter it below.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md mb-5 font-roboto">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-5">
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
                <label className="block text-sm font-roboto text-gray-700 mb-2">Reset code</label>
                <div className="flex gap-2 justify-center" onPaste={handleCodePaste}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      ref={(el) => { codeInputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={code[i] || ''}
                      onChange={(e) => handleCodeDigit(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      className="w-12 h-14 border border-gray-200 rounded-md text-center text-lg font-roboto font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full bg-[#0d1f2d] hover:bg-[#0d5959] text-white py-3 rounded-md text-sm font-roboto tracking-wide uppercase transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    Verify code
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-5 space-y-3">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="text-xs font-roboto text-gray-500 hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
              >
                {resending ? 'Resending...' : "Didn't get a code? Resend"}
              </button>
            </div>

            <div className="text-center mt-4">
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

  // ----- RENDER: Password entry step -----
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
            <h1 className="text-2xl font-roboto font-bold text-[#1a1a2e] mb-1">Set new password</h1>
            <p className="text-sm text-gray-500 font-roboto">
              {email ? `For ${email}` : 'Enter a new password for your account'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md mb-6 font-roboto">
              {error}
            </div>
          )}

          <form onSubmit={handleSetPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-roboto text-gray-700 mb-1.5">New password</label>
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
              className="w-full bg-[#0d1f2d] hover:bg-[#0d5959] text-white py-3 rounded-md text-sm font-roboto tracking-wide uppercase transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Lock size={16} />
              {loading ? 'Updating...' : 'Set new password'}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link
              to="/crm/login"
              className="text-xs font-roboto text-gray-500 hover:text-primary transition-colors cursor-pointer"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}