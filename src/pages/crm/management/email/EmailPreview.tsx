import { useState } from 'react';

interface EmailPreviewProps {
  subject: string;
  html: string;
}

/**
 * Renders a real email document inside a sandboxed iframe so what you see here
 * is exactly what the recipient receives. Uses `srcDoc` (no external document).
 */
export default function EmailPreview({ subject, html }: EmailPreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-roboto text-stone-400 uppercase tracking-[0.14em]">Subject</p>
          <p className="text-[13px] font-roboto font-semibold text-stone-800 truncate">{subject || 'No subject'}</p>
        </div>
        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1 shrink-0">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-roboto transition-colors cursor-pointer whitespace-nowrap ${
              device === 'desktop' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <i className="ri-computer-line text-sm"></i>
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-roboto transition-colors cursor-pointer whitespace-nowrap ${
              device === 'mobile' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <i className="ri-smartphone-line text-sm"></i>
            Mobile
          </button>
        </div>
      </div>

      <div className="flex-1 bg-stone-100/70 rounded-lg border border-stone-200/70 p-4 mt-3 overflow-hidden">
        <div className="mx-auto transition-all duration-300" style={{ width: device === 'mobile' ? 375 : '100%' }}>
          <iframe
            title="Email preview"
            srcDoc={html}
            sandbox=""
            className="w-full bg-white rounded-lg border border-stone-200"
            style={{ height: device === 'mobile' ? 640 : 560 }}
          />
        </div>
      </div>
    </div>
  );
}