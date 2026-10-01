import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { Save, X } from 'lucide-react';

export interface AgentProfileRecord {
  id: string;
  name: string;
  email: string;
  title: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
  user_id: string | null;
  created_at: string | null;
}

interface AgentProfileEditModalProps {
  open: boolean;
  agent: AgentProfileRecord | null;
  onClose: () => void;
  onSaved: (updated: AgentProfileRecord) => void;
}

interface FormState {
  name: string;
  title: string;
  phone: string;
  location: string;
  website: string;
  avatar_url: string;
  bio: string;
  is_active: boolean;
}

const EMPTY: FormState = { name: '', title: '', phone: '', location: '', website: '', avatar_url: '', bio: '', is_active: true };

/**
 * Super-admin editor for an agent's own profile record (the `agents` table).
 * Opened from the read-only Agent Dashboard preview so a super admin can fix
 * an agent's details without impersonating them.
 */
export default function AgentProfileEditModal({ open, agent, onClose, onSaved }: AgentProfileEditModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !agent) return;
    setForm({
      name: agent.name || '',
      title: agent.title || '',
      phone: agent.phone || '',
      location: agent.location || '',
      website: agent.website || '',
      avatar_url: agent.avatar_url || '',
      bio: agent.bio || '',
      is_active: agent.is_active,
    });
    setError(null);
  }, [open, agent]);

  if (!open || !agent) return null;

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const patch = {
      name: form.name.trim(),
      title: form.title.trim() || null,
      phone: form.phone.trim() || null,
      location: form.location.trim() || null,
      website: form.website.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      bio: form.bio.trim() || null,
      is_active: form.is_active,
    };
    const { data, error: err } = await supabase
      .from('agents')
      .update(patch)
      .eq('id', agent.id)
      .select('*')
      .maybeSingle();
    setSaving(false);
    if (err) {
      setError(err.message || 'Could not save the profile.');
      return;
    }
    addToast('Agent profile updated', 'success');
    onSaved((data as AgentProfileRecord) || { ...agent, ...patch });
    onClose();
  };

  const field = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30';
  const labelCls = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h3 className="font-roboto font-bold text-[#1a1a2e]">Edit agent profile</h3>
            <p className="text-xs text-gray-400 font-roboto mt-0.5">Update this agent&apos;s own record — they&apos;ll see the change immediately.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all cursor-pointer" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg font-roboto">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Full name</label>
              <input type="text" value={form.name} onChange={(e) => update({ name: e.target.value })} className={field} placeholder="Jane Doe" />
            </div>
            <div>
              <label className={labelCls}>Title / role</label>
              <input type="text" value={form.title} onChange={(e) => update({ title: e.target.value })} className={field} placeholder="Sales Agent" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email (login)</label>
              <input type="email" value={agent.email} readOnly className={`${field} bg-gray-50 text-gray-400 cursor-not-allowed`} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => update({ phone: e.target.value })} className={field} placeholder="+254 712 345 678" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Location</label>
              <input type="text" value={form.location} onChange={(e) => update({ location: e.target.value })} className={field} placeholder="Nairobi, Kenya" />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input type="text" value={form.website} onChange={(e) => update({ website: e.target.value })} className={field} placeholder="https://…" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Avatar image URL</label>
            <input type="text" value={form.avatar_url} onChange={(e) => update({ avatar_url: e.target.value })} className={field} placeholder="https://…" />
          </div>

          <div>
            <label className={labelCls}>Bio</label>
            <textarea value={form.bio} onChange={(e) => update({ bio: e.target.value })} maxLength={500} className={`${field} min-h-[90px] resize-none`} placeholder="Short profile summary…" />
            <p className="text-[10px] text-gray-400 mt-1">{form.bio.length}/500</p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => update({ is_active: !form.is_active })}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}
              aria-pressed={form.is_active}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm font-roboto text-[#374151]">Profile active (visible as an agent)</span>
          </label>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto font-semibold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}