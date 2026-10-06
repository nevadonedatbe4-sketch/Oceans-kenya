import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { Loader2, CheckCircle2, XCircle, Save } from 'lucide-react';

interface AgentSocialLinksProps {
  agentId: string | null;
}

interface SocialField {
  key: string;
  label: string;
  placeholder: string;
  icon: string;
}

const FIELDS: SocialField[] = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…', icon: 'ri-facebook-circle-line' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…', icon: 'ri-instagram-line' },
  { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/…', icon: 'ri-twitter-x-line' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/…', icon: 'ri-linkedin-fill' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@…', icon: 'ri-tiktok-line' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/… or +254 7xx xxx xxx', icon: 'ri-whatsapp-line' },
  { key: 'website', label: 'Website', placeholder: 'https://…', icon: 'ri-global-line' },
];

export default function AgentSocialLinks({ agentId }: AgentSocialLinksProps) {
  const { agentProfile, loading } = useAgentProfile();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!agentProfile || loading) return;
    const next: Record<string, string> = {};
    for (const f of FIELDS) {
      next[f.key] = (agentProfile as any)[f.key] || '';
    }
    setValues(next);
     
  }, [agentProfile, loading]);

  const handleSave = async () => {
    if (!agentId) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, string | null> = {};
      for (const f of FIELDS) {
        payload[f.key] = values[f.key]?.trim() || null;
      }
      await supabase.from('agents').update(payload).eq('id', agentId);
      setMessage({ type: 'success', text: 'Your social links have been saved.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save social links.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#eef2f0] flex items-center justify-between">
        <div>
          <h3 className="font-roboto font-semibold text-[#1a1a2e]">Social & contact links</h3>
          <p className="text-sm text-gray-500 font-roboto mt-0.5">Add your public profiles — they show on your listing contact cards.</p>
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="flex items-center gap-2 text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              <i className={`${f.icon} text-accent text-base`} />
              {f.label}
            </label>
            <input
              value={values[f.key] || ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full px-3.5 py-2.5 rounded-md border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-gray-400"
            />
          </div>
        ))}
      </div>

      {message && (
        <div className={`mx-6 mb-4 flex items-start gap-2 text-sm px-4 py-3 rounded-lg font-roboto ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> : <XCircle size={16} className="mt-0.5 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      <div className="px-6 pb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-accent hover:bg-[#0a4a4a] text-white px-5 py-2.5 rounded-md text-sm font-roboto font-semibold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save social links'}
        </button>
      </div>
    </div>
  );
}