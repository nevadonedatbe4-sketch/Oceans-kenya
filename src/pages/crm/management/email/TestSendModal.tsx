import { useEffect, useState } from 'react';

interface TestSendModalProps {
  open: boolean;
  templateName: string;
  defaultTo: string;
  onClose: () => void;
  onSend: (to: string) => Promise<{ ok: boolean; message: string }>;
}

export default function TestSendModal({
  open,
  templateName,
  defaultTo,
  onClose,
  onSend,
}: TestSendModalProps) {
  const [email, setEmail] = useState(defaultTo);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      setEmail(defaultTo);
      setResult(null);
      setSending(false);
    }
  }, [open, defaultTo]);

  if (!open) return null;

  const handleSend = async () => {
    if (!email.trim() || !email.includes('@')) {
      setResult({ ok: false, message: 'Enter a valid email address.' });
      return;
    }
    setSending(true);
    setResult(null);
    const res = await onSend(email.trim());
    setResult(res);
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
          <div className="w-9 h-9 rounded-lg bg-[#1B4332]/10 flex items-center justify-center shrink-0">
            <i className="ri-send-plane-line text-[#1B4332]"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-jost font-semibold text-stone-800">Send a test email</h3>
            <p className="text-[12px] font-roboto text-stone-400 truncate">{templateName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer">
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-[13px] font-roboto text-stone-500 leading-relaxed">
            We will render the current content with sample data and send it through your configured
            email service. Nothing is stored against a lead.
          </p>
          <div className="space-y-1.5">
            <label className="block text-[12px] font-roboto font-semibold text-stone-500 uppercase tracking-[0.1em]">
              Send to
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-[13px] font-roboto focus:outline-none focus:border-[#1B4332]"
            />
          </div>

          {result && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-[12px] font-roboto leading-relaxed ${
                result.ok ? 'bg-[#1B4332]/8 text-[#1B4332]' : 'bg-red-50 text-red-600'
              }`}
            >
              <i className={`${result.ok ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} mt-0.5 shrink-0`}></i>
              <span>{result.message}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-stone-100 bg-stone-50/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-roboto text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            Close
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B4332] text-white text-[13px] font-roboto transition-colors hover:bg-[#15382A] disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <i className="ri-send-plane-line"></i>
                Send test
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}