import { useState } from 'react';
import { supabase, supabaseUrl, supabaseKey } from '@/lib/supabase';
import { Loader2, KeyRound, ShieldCheck, CheckCircle2, XCircle, Eye, EyeOff, Mail } from 'lucide-react';

export default function AgentSecurity() {
  const [current, setCurrent] = useState('');
  const [nextPass, setNextPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const changePassword = async () => {
    setMessage(null);
    if (nextPass.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (nextPass !== confirm) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nextPass });
      if (error) throw new Error(error.message);
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setCurrent('');
      setNextPass('');
      setConfirm('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to update password.' });
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    setSendingReset(true);
    setMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const email = sessionData.session?.user?.email;
      const res = await fetch(`${supabaseUrl}/functions/v1/password-reset-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok && json && json.success === false) throw new Error(json?.error || `Request failed (${res.status})`);
      setMessage({ type: 'success', text: 'If an account exists for this email, a password reset link has been sent.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to send reset email.' });
    } finally {
      setSendingReset(false);
    }
  };

  const inputCls = 'w-full px-3.5 py-2.5 rounded-md border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-gray-400';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#eef2f0] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
            <KeyRound size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="font-roboto font-semibold text-[#1a1a2e]">Change password</h3>
            <p className="text-sm text-gray-500 font-roboto">Use this form to set a new password while you are signed in.</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Current password</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Your current password" className={`${inputCls} pr-10`} />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New password</label>
            <input type={show ? 'text' : 'password'} value={nextPass} onChange={(e) => setNextPass(e.target.value)} placeholder="At least 8 characters" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirm new password</label>
            <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" className={inputCls} />
          </div>

          {message && (
            <div className={`flex items-start gap-2 text-sm px-4 py-3 rounded-lg font-roboto ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> : <XCircle size={16} className="mt-0.5 flex-shrink-0" />}
              {message.text}
            </div>
          )}

          <button
            onClick={changePassword}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-accent hover:bg-[#0a4a4a] text-white px-5 py-2.5 rounded-md text-sm font-roboto font-semibold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {saving ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#eef2f0] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Mail size={18} className="text-emerald-700" />
          </div>
          <div>
            <h3 className="font-roboto font-semibold text-[#1a1a2e]">Reset password by email</h3>
            <p className="text-sm text-gray-500 font-roboto">Forget your password? Send yourself a secure reset link.</p>
          </div>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 flex-1">
            <ShieldCheck size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600 font-roboto leading-relaxed">The link expires shortly and lets you set a fresh password after verification.</p>
          </div>
          <button
            onClick={sendReset}
            disabled={sendingReset}
            className="inline-flex items-center gap-2 border border-emerald-200 text-emerald-700 px-5 py-2.5 rounded-md text-sm font-roboto font-semibold hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap flex-shrink-0"
          >
            {sendingReset ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            {sendingReset ? 'Sending…' : 'Email me a reset link'}
          </button>
        </div>
      </div>
    </div>
  );
}