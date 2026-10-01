import { useRef, useState } from 'react';
import {
  buildEmailShell,
  CATEGORY_LABEL,
  renderTemplate,
  SAMPLE_VARS,
  type EmailSettings,
  type EmailTemplate,
} from '@/lib/emailTemplate';
import EmailPreview from './EmailPreview';
import VariableChips from './VariableChips';

interface EmailTemplateEditorProps {
  draft: EmailTemplate;
  settings: EmailSettings;
  dirty: boolean;
  saving: boolean;
  onChange: (patch: Partial<EmailTemplate>) => void;
  onSave: () => void;
  onToggleActive: () => void;
  onShowVersions: () => void;
  onTest: () => void;
}

type Field = 'subject' | 'heading' | 'body';

export default function EmailTemplateEditor({
  draft,
  settings,
  dirty,
  saving,
  onChange,
  onSave,
  onToggleActive,
  onShowVersions,
  onTest,
}: EmailTemplateEditorProps) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [showSender, setShowSender] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<Field>('body');

  const insertToken = (token: string) => {
    const snippet = `{{${token}}}`;
    const field = lastField.current;

    if (field === 'subject' && subjectRef.current) {
      const el = subjectRef.current;
      const next = el.value.slice(0, el.selectionStart || 0) + snippet + el.value.slice(el.selectionEnd || 0);
      onChange({ subject: next });
      requestAnimationFrame(() => {
        el.focus();
        const pos = (el.selectionStart || 0) + snippet.length;
        el.setSelectionRange(pos, pos);
      });
    } else if (field === 'heading' && headingRef.current) {
      const el = headingRef.current;
      const next = el.value.slice(0, el.selectionStart || 0) + snippet + el.value.slice(el.selectionEnd || 0);
      onChange({ heading: next });
      requestAnimationFrame(() => {
        el.focus();
        const pos = (el.selectionStart || 0) + snippet.length;
        el.setSelectionRange(pos, pos);
      });
    } else if (bodyRef.current) {
      const el = bodyRef.current;
      const next = el.value.slice(0, el.selectionStart || 0) + snippet + el.value.slice(el.selectionEnd || 0);
      onChange({ body_html: next });
      requestAnimationFrame(() => {
        el.focus();
        const pos = (el.selectionStart || 0) + snippet.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      onChange({ body_html: (draft.body_html || '') + snippet });
    }
  };

  const mergedVars = {
    company_name: settings.agency_name,
    agency_name: settings.agency_name,
    support_email: settings.support_email,
    ...SAMPLE_VARS,
  };
  const previewSubject = renderTemplate(draft.subject, mergedVars);
  const previewHtml = buildEmailShell({
    settings,
    heading: renderTemplate(draft.heading || '', mergedVars),
    bodyHtml: renderTemplate(draft.body_html || '', mergedVars),
    subject: previewSubject,
  });

  const label = 'block text-[12px] font-roboto font-semibold text-stone-500 uppercase tracking-[0.1em]';
  const input =
    'w-full px-3 py-2.5 border border-stone-200 rounded-lg text-[13px] font-roboto focus:outline-none focus:border-[#1B4332] bg-white';

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-stone-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-[17px] font-prata text-stone-800 truncate">{draft.name}</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-[11px] font-roboto whitespace-nowrap">
              {CATEGORY_LABEL(draft.category)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleActive}
              className="flex items-center gap-1.5 text-[12px] font-roboto text-stone-500 hover:text-stone-700 cursor-pointer whitespace-nowrap"
            >
              <i className={draft.is_active ? 'ri-toggle-fill text-lg text-[#1B4332]' : 'ri-toggle-line text-lg text-stone-300'}></i>
              {draft.is_active ? 'Active' : 'Inactive'}
            </button>
            <span className="text-[12px] font-roboto text-stone-400">{`{{${draft.key}}}`}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onShowVersions}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 text-[13px] font-roboto text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-history-line"></i>
            History
          </button>
          <button
            onClick={onTest}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 text-[13px] font-roboto text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-send-plane-line"></i>
            Test
          </button>
          <button
            onClick={onSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1B4332] text-white text-[13px] font-roboto transition-colors hover:bg-[#15382A] disabled:opacity-40 cursor-pointer whitespace-nowrap"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <i className="ri-save-line"></i>}
            {dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1 my-4 w-fit">
        <button
          onClick={() => setTab('edit')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] font-roboto transition-colors cursor-pointer whitespace-nowrap ${
            tab === 'edit' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <i className="ri-edit-line"></i>
          Content
        </button>
        <button
          onClick={() => setTab('preview')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] font-roboto transition-colors cursor-pointer whitespace-nowrap ${
            tab === 'preview' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <i className="ri-eye-line"></i>
          Preview
        </button>
      </div>

      {tab === 'edit' ? (
        <div className="space-y-5 flex-1 overflow-y-auto custom-editor-scroll pr-1 pb-4">
          {draft.description && (
            <p className="text-[13px] font-roboto text-stone-500 leading-relaxed">{draft.description}</p>
          )}

          <div className="space-y-1.5">
            <label className={label}>Subject line</label>
            <input
              ref={subjectRef}
              type="text"
              value={draft.subject}
              onFocus={() => { lastField.current = 'subject'; }}
              onChange={(e) => onChange({ subject: e.target.value })}
              className={input}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-1.5">
            <label className={label}>Heading</label>
            <input
              ref={headingRef}
              type="text"
              value={draft.heading || ''}
              onFocus={() => { lastField.current = 'heading'; }}
              onChange={(e) => onChange({ heading: e.target.value })}
              className={input}
              placeholder="Heading shown at the top of the email"
            />
          </div>

          <div className="space-y-1.5">
            <label className={label}>Body content (HTML)</label>
            <textarea
              ref={bodyRef}
              value={draft.body_html}
              onFocus={() => { lastField.current = 'body'; }}
              onChange={(e) => onChange({ body_html: e.target.value })}
              rows={14}
              spellCheck={false}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-[12.5px] leading-relaxed font-mono focus:outline-none focus:border-[#1B4332] bg-white resize-y"
              placeholder="<p>Your content here...</p>"
            />
            <p className="text-[11px] font-roboto text-stone-400">
              Standard HTML is supported. Use the variables below to insert dynamic values.
            </p>
          </div>

          <VariableChips text={`${draft.subject} ${draft.heading || ''} ${draft.body_html}`} onInsert={insertToken} />

          {/* Sender overrides */}
          <div className="rounded-lg border border-stone-200/70 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSender((s) => !s)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-stone-50/60 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <i className="ri-user-settings-line text-stone-500 text-sm"></i>
              <span className="text-[13px] font-roboto font-medium text-stone-700">Sender overrides</span>
              <span className="text-[11px] font-roboto text-stone-400 ml-auto">Optional</span>
              <i className={`ri-arrow-down-s-line text-stone-400 transition-transform ${showSender ? 'rotate-180' : ''}`}></i>
            </button>
            {showSender && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-stone-100 bg-white">
                <div className="space-y-1.5">
                  <label className={label}>Sender name</label>
                  <input
                    type="text"
                    value={draft.sender_name || ''}
                    onChange={(e) => onChange({ sender_name: e.target.value })}
                    className={input}
                    placeholder={settings.sender_name}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={label}>Reply-to address</label>
                  <input
                    type="email"
                    value={draft.reply_to || ''}
                    onChange={(e) => onChange({ reply_to: e.target.value })}
                    className={input}
                    placeholder={settings.reply_to || 'Leave blank for default'}
                  />
                </div>
                <p className="sm:col-span-2 text-[11px] font-roboto text-stone-400 leading-relaxed">
                  Sender addresses must be on a domain verified with your email provider. Leave blank to use
                  the central Oceans sender configuration.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <EmailPreview subject={previewSubject} html={previewHtml} />
        </div>
      )}

      <style>{`
        .custom-editor-scroll::-webkit-scrollbar { width: 6px; }
        .custom-editor-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-editor-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 3px; }
      `}</style>
    </div>
  );
}