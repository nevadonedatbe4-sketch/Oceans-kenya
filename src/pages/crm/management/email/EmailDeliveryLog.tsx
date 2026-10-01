import { useCallback, useEffect, useState } from 'react';
import { supabase, supabaseUrl } from '@/lib/supabase';

interface LogRow {
  id: string;
  direction: string | null;
  to_email: string | null;
  from_email: string | null;
  subject: string | null;
  template: string | null;
  status: string | null;
  error: string | null;
  last_event: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<string, { label: string; className: string; icon: string }> = {
  sent: { label: 'Sent', className: 'bg-[#1B4332]/10 text-[#1B4332]', icon: 'ri-send-plane-line' },
  queued: { label: 'Queued', className: 'bg-stone-100 text-stone-500', icon: 'ri-time-line' },
  delayed: { label: 'Delayed', className: 'bg-amber-50 text-amber-700', icon: 'ri-hourglass-line' },
  delivered: { label: 'Delivered', className: 'bg-[#1B4332]/10 text-[#1B4332]', icon: 'ri-check-double-line' },
  opened: { label: 'Opened', className: 'bg-[#1B4332]/10 text-[#1B4332]', icon: 'ri-mail-open-line' },
  clicked: { label: 'Clicked', className: 'bg-[#1B4332]/10 text-[#1B4332]', icon: 'ri-cursor-line' },
  complained: { label: 'Spam', className: 'bg-red-50 text-red-600', icon: 'ri-spam-2-line' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-600', icon: 'ri-error-warning-line' },
  bounced: { label: 'Bounced', className: 'bg-red-50 text-red-600', icon: 'ri-arrow-go-back-line' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-600', icon: 'ri-close-circle-line' },
};

function statusMeta(status: string | null) {
  return STATUS_STYLE[(status || '').toLowerCase()] || {
    label: status || 'Unknown',
    className: 'bg-stone-100 text-stone-500',
    icon: 'ri-question-line',
  };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Live delivery log for every outbound email attempt. "Sent" means the provider
 * accepted the message; delivery-tracking webhooks upgrade that to "Delivered",
 * "Bounced", "Spam" and engagement states so nothing is a mystery.
 */
export default function EmailDeliveryLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const webhookUrl = `${supabaseUrl}/functions/v1/resend-webhook`;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('email_log')
        .select('id, direction, to_email, from_email, subject, template, status, error, last_event, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (err) throw err;
      setRows((data as LogRow[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load the email log.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const trackingCard = (
    <div className="border border-stone-200/70 rounded-xl p-4 mb-4 bg-stone-50/50">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#1B4332]/10 flex items-center justify-center flex-shrink-0">
          <i className="ri-radar-line text-[#1B4332]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[13px] font-roboto font-semibold text-stone-800">Delivery tracking</h4>
            <button
              onClick={() => setShowSetup((v) => !v)}
              className="text-[12px] font-roboto text-stone-500 hover:text-stone-700 cursor-pointer whitespace-nowrap"
            >
              {showSetup ? 'Hide setup' : 'How to enable'}
            </button>
          </div>
          <p className="text-[12px] font-roboto text-stone-500 mt-0.5">
            Connect this endpoint in Resend to record delivered, bounced and spam outcomes.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate text-[11px] font-mono text-stone-600 bg-white border border-stone-200 rounded-md px-2.5 py-1.5">
              {webhookUrl}
            </code>
            <button
              onClick={copyWebhook}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1B4332] text-white text-[12px] font-roboto hover:bg-[#153529] transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'}></i>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {showSetup && (
            <ol className="mt-3 space-y-1.5 text-[12px] font-roboto text-stone-500 list-decimal list-inside">
              <li>In Resend, open <span className="text-stone-700">Webhooks</span> and add this endpoint URL.</li>
              <li>Subscribe to delivered, bounced, complained, delayed and failed events.</li>
              <li>Copy the signing secret into your Supabase project under <span className="text-stone-700">Edge Functions → Secrets</span> as <span className="font-mono text-stone-700">RESEND_WEBHOOK_SECRET</span>.</li>
              <li>Send a test — its status here will update within seconds.</li>
            </ol>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div>
        {trackingCard}
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {trackingCard}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-[13px] font-roboto">
          <i className="ri-error-warning-line mt-0.5"></i>
          <div className="flex-1">
            <p className="font-medium">Could not load the delivery log</p>
            <p className="text-[12px] mt-0.5">{error}</p>
          </div>
          <button onClick={load} className="px-3 py-1.5 rounded-md bg-white/70 text-red-600 text-[12px] cursor-pointer whitespace-nowrap">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {trackingCard}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[15px] font-prata text-stone-800">Delivery log</h3>
          <p className="text-[12px] font-roboto text-stone-400 mt-0.5">
            Every outbound email and its live provider status. Most recent first.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 text-[13px] font-roboto text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-refresh-line"></i>
          Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-stone-200/70 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-3">
            <i className="ri-inbox-archive-line text-2xl text-stone-400"></i>
          </div>
          <p className="text-[14px] font-roboto text-stone-500">No emails have been sent yet</p>
          <p className="text-[12px] font-roboto text-stone-400 mt-1">Send a test to see it appear here.</p>
        </div>
      ) : (
        <div className="border border-stone-200/70 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-100">
                  <th className="text-left px-4 py-3 text-[11px] font-roboto font-semibold text-stone-400 uppercase tracking-[0.1em]">When</th>
                  <th className="text-left px-4 py-3 text-[11px] font-roboto font-semibold text-stone-400 uppercase tracking-[0.1em]">Recipient</th>
                  <th className="text-left px-4 py-3 text-[11px] font-roboto font-semibold text-stone-400 uppercase tracking-[0.1em]">Subject</th>
                  <th className="text-left px-4 py-3 text-[11px] font-roboto font-semibold text-stone-400 uppercase tracking-[0.1em]">Template</th>
                  <th className="text-left px-4 py-3 text-[11px] font-roboto font-semibold text-stone-400 uppercase tracking-[0.1em]">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const meta = statusMeta(row.status);
                  return (
                    <tr key={row.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/40 transition-colors">
                      <td className="px-4 py-3 text-[12px] font-roboto text-stone-500 whitespace-nowrap">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-3 text-[12px] font-roboto text-stone-700 max-w-[180px] truncate">{row.to_email || '—'}</td>
                      <td className="px-4 py-3 text-[12px] font-roboto text-stone-700 max-w-[220px] truncate">{row.subject || '—'}</td>
                      <td className="px-4 py-3 text-[12px] font-roboto text-stone-400 whitespace-nowrap">{row.template || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-roboto font-medium ${meta.className}`}>
                          <i className={meta.icon}></i>
                          {meta.label}
                        </span>
                        {row.last_event && (
                          <p className="text-[10px] font-roboto text-stone-400 mt-1">{row.last_event}</p>
                        )}
                        {row.error && (
                          <p className="text-[11px] font-roboto text-stone-400 mt-1 max-w-[240px] truncate" title={row.error}>
                            {row.error}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}