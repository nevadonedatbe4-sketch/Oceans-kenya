import { useEffect, useState } from 'react';
import type { EmailTemplate, EmailTemplateVersion } from '@/lib/emailTemplate';

interface VersionHistoryPanelProps {
  template: EmailTemplate;
  loadVersions: (key: string) => Promise<EmailTemplateVersion[]>;
  onRestore: (version: EmailTemplateVersion) => void;
  onClose: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function VersionHistoryPanel({
  template,
  loadVersions,
  onRestore,
  onClose,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<EmailTemplateVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadVersions(template.key).then((rows) => {
      if (active) {
        setVersions(rows);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [template.key, loadVersions]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
          <div className="w-9 h-9 rounded-lg bg-[#1B4332]/10 flex items-center justify-center shrink-0">
            <i className="ri-history-line text-[#1B4332]"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-jost font-semibold text-stone-800">Version history</h3>
            <p className="text-[12px] font-roboto text-stone-400 truncate">{template.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer">
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && versions.length === 0 && (
            <p className="text-[13px] font-roboto text-stone-400 text-center py-12">
              No saved versions yet. Save a change and it will appear here.
            </p>
          )}
          {versions.map((v) => (
            <div key={v.id} className="border border-stone-200/70 rounded-lg p-3.5 hover:border-[#1B4332]/30 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#1B4332]/8 text-[#1B4332] text-[11px] font-roboto font-semibold">
                  v{v.version}
                </span>
                <span className="text-[11px] font-roboto text-stone-400">{formatDate(v.created_at)}</span>
                {v.changed_by_name && (
                  <span className="text-[11px] font-roboto text-stone-400 ml-auto truncate max-w-[140px]">by {v.changed_by_name}</span>
                )}
              </div>
              <p className="text-[12px] font-roboto text-stone-600 truncate mb-2">{v.subject || 'No subject'}</p>
              <button
                onClick={() => onRestore(v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stone-200 text-[12px] font-roboto text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-arrow-go-back-line text-xs"></i>
                Restore this version
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}