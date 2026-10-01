import { useEffect, useState } from 'react';
import type { EmailSettings } from '@/lib/emailTemplate';

interface EmailSettingsModalProps {
  open: boolean;
  settings: EmailSettings;
  onClose: () => void;
  onSave: (next: Partial<EmailSettings>) => Promise<boolean>;
}

export default function EmailSettingsModal({ open, settings, onClose, onSave }: EmailSettingsModalProps) {
  const [form, setForm] = useState<EmailSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(settings);
      setSaved(false);
    }
  }, [open, settings]);

  if (!open) return null;

  const set = (key: keyof EmailSettings, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => onClose(), 700);
    }
  };

  const label = 'block text-[12px] font-roboto font-semibold text-stone-500 uppercase tracking-[0.1em]';
  const input =
    'w-full px-3 py-2.5 border border-stone-200 rounded-lg text-[13px] font-roboto focus:outline-none focus:border-[#1B4332] bg-white';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
          <div className="w-9 h-9 rounded-lg bg-[#1B4332]/10 flex items-center justify-center shrink-0">
            <i className="ri-settings-3-line text-[#1B4332]"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-jost font-semibold text-stone-800">Sender & branding</h3>
            <p className="text-[12px] font-roboto text-stone-400">
              Central configuration applied to every Oceans email.
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer">
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-stone-200/70 bg-stone-50/60">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-roboto font-medium text-stone-800">Outbound email enabled</p>
              <p className="text-[12px] font-roboto text-stone-400 mt-0.5">
                When off, no CRM emails are sent (test sends still work).
              </p>
            </div>
            <button
              type="button"
              onClick={() => set('emails_enabled', form.emails_enabled === 'true' ? 'false' : 'true')}
              className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer ${
                form.emails_enabled === 'true' ? 'bg-[#1B4332]' : 'bg-stone-300'
              }`}
            >
              <span
                className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all ${
                  form.emails_enabled === 'true' ? 'left-[calc(100%-21px)]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={label}>Agency / company name</label>
              <input type="text" value={form.agency_name} onChange={(e) => set('agency_name', e.target.value)} className={input} />
            </div>
            <div className="space-y-1.5">
              <label className={label}>Sender display name</label>
              <input type="text" value={form.sender_name} onChange={(e) => set('sender_name', e.target.value)} className={input} />
            </div>
            <div className="space-y-1.5">
              <label className={label}>Sender local part</label>
              <input type="text" value={form.sender_local_part} onChange={(e) => set('sender_local_part', e.target.value)} className={input} placeholder="noreply" />
              <p className="text-[11px] font-roboto text-stone-400">
                Combined with your verified domain, e.g. {form.sender_local_part || 'noreply'}@yourdomain.com
              </p>
            </div>
            <div className="space-y-1.5">
              <label className={label}>Reply-to address</label>
              <input type="email" value={form.reply_to} onChange={(e) => set('reply_to', e.target.value)} className={input} placeholder="Leave blank for default" />
            </div>
            <div className="space-y-1.5">
              <label className={label}>Support email</label>
              <input type="email" value={form.support_email} onChange={(e) => set('support_email', e.target.value)} className={input} />
            </div>
            <div className="space-y-1.5">
              <label className={label}>Logo URL</label>
              <input type="text" value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} className={input} placeholder="https://..." />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={label}>Brand colour</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.brand_color} onChange={(e) => set('brand_color', e.target.value)} className="w-10 h-10 rounded border border-stone-200 cursor-pointer" />
                <input type="text" value={form.brand_color} onChange={(e) => set('brand_color', e.target.value)} className={input} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={label}>Accent colour</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accent_color} onChange={(e) => set('accent_color', e.target.value)} className="w-10 h-10 rounded border border-stone-200 cursor-pointer" />
                <input type="text" value={form.accent_color} onChange={(e) => set('accent_color', e.target.value)} className={input} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={label}>Email signature</label>
            <input type="text" value={form.signature} onChange={(e) => set('signature', e.target.value)} className={input} />
          </div>

          <div className="space-y-1.5">
            <label className={label}>Footer text</label>
            <textarea
              value={form.footer_text}
              onChange={(e) => set('footer_text', e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-[13px] font-roboto focus:outline-none focus:border-[#1B4332] bg-white resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-stone-100 bg-stone-50/60">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-roboto text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer whitespace-nowrap">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B4332] text-white text-[13px] font-roboto transition-colors hover:bg-[#15382A] disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : saved ? <i className="ri-check-line"></i> : <i className="ri-save-line"></i>}
            {saved ? 'Saved' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  );
}