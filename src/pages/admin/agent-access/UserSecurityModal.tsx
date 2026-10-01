import { useState } from 'react';
import { supabase, supabaseUrl, supabaseKey } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import {
  KeyRound,
  Mail,
  LogOut,
  ShieldCheck,
  X,
  Loader2,
  Eye,
  EyeOff,
  Wand2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export interface SecurityUser {
  user_id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
}

interface Props {
  user: SecurityUser;
  onClose: () => void;
  onDone?: () => void;
}

const ENDPOINT = `${supabaseUrl}/functions/v1/admin-manage-password`;

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  agent: 'Agent',
};

function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = chars.length; i < 14; i += 1) chars.push(pick(all));
  return chars.sort(() => Math.random() - 0.5).join('');
}

/**
 * Administrative security controls for a single user.
 * Passwords are never read or displayed — only set/reset via the auth provider.
 */
export default function UserSecurityModal({ user, onClose, onDone }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [revokeOnSet, setRevokeOnSet] = useState(true);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const displayName = user.name || user.email;

  const call = async (
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<{ success?: boolean; email_sent?: boolean; message?: string; error?: string }> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, user_id: user.user_id, ...payload }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || 'Request failed. Please try again.');
    return json || {};
  };

  const runAction = async (action: string, payload: Record<string, unknown> = {}, key: string) => {
    setBusy(key);
    setResult(null);
    try {
      const data = await call(action, payload);
      const text = data.message || 'Done.';
      setResult({ ok: true, text });
      showToast(text, data.email_sent === false ? 'info' : 'success');
      onDone?.();
      return data;
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Something went wrong.';
      setResult({ ok: false, text });
      showToast(text, 'error');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 8) {
      setResult({ ok: false, text: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setResult({ ok: false, text: 'The two passwords do not match.' });
      return;
    }
    const data = await runAction(
      'set_password',
      { new_password: newPassword, revoke_sessions: revokeOnSet },
      'set',
    );
    if (data) {
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const strong = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001731]/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#102a4f] rounded-2xl w-full max-w-lg border border-white/[0.08] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center">
              <ShieldCheck size={17} className="text-teal" />
            </div>
            <div>
              <h2 className="font-jost text-lg font-bold text-white">Security &amp; Access</h2>
              <p className="text-xs font-roboto text-white/40">{displayName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/[0.06] rounded-lg cursor-pointer text-white/30 hover:text-white transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-7 space-y-6">
          {/* Identity */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 text-sm font-roboto space-y-1">
            <p className="text-white/60"><span className="text-white/35">Email:</span> {user.email}</p>
            <p className="text-white/60"><span className="text-white/35">Role:</span> {ROLE_LABELS[user.role] || user.role}</p>
            <p className="text-white/60"><span className="text-white/35">Status:</span> {user.status}</p>
          </div>

          {/* Password is never visible — reassure the admin */}
          <div className="flex items-start gap-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] p-3.5">
            <KeyRound size={15} className="text-teal mt-0.5 flex-shrink-0" />
            <p className="text-xs font-roboto text-white/45 leading-relaxed">
              Passwords are stored securely by the authentication provider and can never be viewed.
              You can only set a new one or send the user a secure reset link.
            </p>
          </div>

          {result && (
            <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm font-roboto ${
              result.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200' : 'bg-red-500/10 border border-red-500/20 text-red-200'
            }`}>
              {result.ok ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />}
              <span>{result.text}</span>
            </div>
          )}

          {/* Set a new password */}
          <div className="space-y-3">
            <h3 className="text-xs font-roboto text-white/40 uppercase tracking-[0.15em] font-semibold">Set a new password</h3>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                className="w-full pl-4 pr-24 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm font-roboto text-white placeholder:text-white/25 focus:outline-none focus:border-teal/40 transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setNewPassword(generateStrongPassword())}
                  title="Generate a strong password"
                  className="p-2 rounded-md text-white/40 hover:text-teal hover:bg-white/[0.06] cursor-pointer transition-all"
                >
                  <Wand2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? 'Hide' : 'Show'}
                  className="p-2 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] cursor-pointer transition-all"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm font-roboto text-white placeholder:text-white/25 focus:outline-none focus:border-teal/40 transition-all"
            />
            {newPassword.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <div className={`h-full transition-all ${strong ? 'w-full bg-emerald-400' : newPassword.length >= 8 ? 'w-2/3 bg-amber-400' : 'w-1/3 bg-red-400'}`} />
                </div>
                <span className={`text-xs font-roboto ${strong ? 'text-emerald-300' : newPassword.length >= 8 ? 'text-amber-300' : 'text-red-300'}`}>
                  {strong ? 'Strong' : newPassword.length >= 8 ? 'Fair' : 'Weak'}
                </span>
              </div>
            )}
            <label className="flex items-center gap-2 text-xs font-roboto text-white/50 cursor-pointer">
              <input
                type="checkbox"
                checked={revokeOnSet}
                onChange={(e) => setRevokeOnSet(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/[0.04] text-teal focus:ring-teal"
              />
              Sign the user out of all devices after changing the password
            </label>
            <button
              onClick={handleSetPassword}
              disabled={busy === 'set' || !newPassword}
              className="w-full flex items-center justify-center gap-2 bg-teal hover:bg-teal/90 text-[#001731] py-3 rounded-lg text-sm font-roboto font-bold transition-all cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              {busy === 'set' ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {busy === 'set' ? 'Updating…' : 'Set New Password'}
            </button>
          </div>

          {/* Email a reset link */}
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <h3 className="text-xs font-roboto text-white/40 uppercase tracking-[0.15em] font-semibold">Recovery &amp; sessions</h3>
            <button
              onClick={() => runAction('send_reset', {}, 'reset')}
              disabled={busy === 'reset'}
              className="w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white py-3 rounded-lg text-sm font-roboto font-semibold transition-all cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              {busy === 'reset' ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {busy === 'reset' ? 'Sending…' : 'Email a reset link'}
            </button>
            <button
              onClick={() => runAction('revoke_sessions', {}, 'revoke')}
              disabled={busy === 'revoke'}
              className="w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white py-3 rounded-lg text-sm font-roboto font-semibold transition-all cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              {busy === 'revoke' ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              {busy === 'revoke' ? 'Signing out…' : 'Sign out of all devices'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}