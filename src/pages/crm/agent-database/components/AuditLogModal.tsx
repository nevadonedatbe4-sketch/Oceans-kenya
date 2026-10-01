import { useEffect, useState } from 'react';
import type { AuditEntry } from '../types';
import { useAgentDatabase } from '@/hooks/useAgentDatabase';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Created profile',
  updated: 'Edited profile',
  viewed: 'Viewed profile',
  deleted: 'Deleted profile',
  converted: 'Converted to agent',
  exported: 'Exported data',
  imported: 'Imported via CSV',
  status_changed: 'Changed status',
};

export default function AuditLogModal({ open, onClose }: Props) {
  const { fetchAudit } = useAgentDatabase();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetchAudit()
      .then(setEntries)
      .catch((e) => setError(e?.message || 'Failed to load audit log'))
      .finally(() => setLoading(false));
  }, [open, fetchAudit]);

  if (!open) return null;

  const fmt = (d: string) =>
    new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0] shrink-0">
          <div className="flex items-center gap-2">
            <i className="ri-history-line text-[#0d5959] text-lg" />
            <h2 className="font-jost text-base font-semibold text-[#1a1a1a]">Audit Trail</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
            <i className="ri-close-line text-gray-400 text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#0d5959] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm font-roboto text-red-600">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center mx-auto mb-3">
                <i className="ri-history-line text-[#0d5959] text-xl" />
              </div>
              <p className="text-sm font-roboto text-[#9ca3af]">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => {
                const name = (e.details as any)?.name || '—';
                return (
                  <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#f7f8fa]">
                    <div className="w-8 h-8 rounded-full bg-[#0d5959]/10 flex items-center justify-center flex-shrink-0">
                      <i className="ri-file-list-3-line text-[#0d5959] text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-roboto text-[#1a1a1a]">
                        <span className="font-semibold">{ACTION_LABELS[e.action] || e.action}</span>{' '}
                        <span className="text-[#0d5959]">— {name}</span>
                      </p>
                      <p className="text-xs font-roboto text-[#9ca3af] mt-0.5">
                        {e.actor_email || 'Unknown'} · {fmt(e.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}