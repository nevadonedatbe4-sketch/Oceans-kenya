import { useState } from 'react';

interface ForwardModalProps {
  subject: string;
  originalSender: string;
  body: string;
  onClose: () => void;
  onForward: (recipientEmail: string, note: string) => Promise<void>;
}

export default function ForwardModal({ subject, originalSender, body, onClose, onForward }: ForwardModalProps) {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    setSending(true);
    setError('');
    try {
      await onForward(email.trim(), note.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to forward message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-background-200">
          <h3 className="text-base font-semibold text-foreground-900">Forward message</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 cursor-pointer"
          >
            <i className="ri-close-line text-foreground-600 text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
              To <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2.5 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
              Original message
            </label>
            <div className="bg-background-50 rounded-lg p-3 border border-background-200">
              <p className="text-xs font-semibold text-foreground-900">{subject || 'No subject'}</p>
              <p className="text-[11px] text-foreground-500 mt-0.5">From: {originalSender || 'Unknown'}</p>
              <p className="text-xs text-foreground-700 mt-2 line-clamp-4 whitespace-pre-wrap">{body || 'No message'}</p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
              Add a note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Add a note to the recipient..."
              className="w-full px-3 py-2.5 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 bg-white resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <i className="ri-error-warning-line" /> {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-background-200 rounded-lg text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={sending || !email.trim()}
              className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {sending ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-1" /> Sending...
                </>
              ) : (
                <>
                  <i className="ri-send-plane-fill mr-1" /> Forward
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}