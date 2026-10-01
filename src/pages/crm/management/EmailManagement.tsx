import { useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import { addToast } from '@/pages/crm/components/CRMToast';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import type { EmailTemplate, EmailTemplateVersion } from '@/lib/emailTemplate';
import EmailTemplateList from './email/EmailTemplateList';
import EmailTemplateEditor from './email/EmailTemplateEditor';
import VersionHistoryPanel from './email/VersionHistoryPanel';
import TestSendModal from './email/TestSendModal';
import EmailSettingsModal from './email/EmailSettingsModal';
import EmailDeliveryLog from './email/EmailDeliveryLog';

export default function EmailManagement() {
  const {
    templates,
    settings,
    loading,
    error,
    refresh,
    saveTemplate,
    toggleActive,
    saveSettings,
    loadVersions,
    restoreVersion,
    sendTest,
  } = useEmailTemplates();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<'templates' | 'log'>('templates');

  // Select the first template once data arrives.
  useEffect(() => {
    if (!selectedKey && templates.length > 0) {
      setSelectedKey(templates[0].key);
    }
  }, [templates, selectedKey]);

  // Keep the draft in sync with the selected template.
  useEffect(() => {
    if (!selectedKey) {
      setDraft(null);
      return;
    }
    const found = templates.find((t) => t.key === selectedKey) || null;
    setDraft(found ? { ...found } : null);
  }, [selectedKey, templates]);

  const original = useMemo(
    () => templates.find((t) => t.key === selectedKey) || null,
    [templates, selectedKey],
  );

  const dirty = useMemo(() => {
    if (!draft || !original) return false;
    return (
      draft.name !== original.name ||
      (draft.subject || '') !== (original.subject || '') ||
      (draft.heading || '') !== (original.heading || '') ||
      (draft.body_html || '') !== (original.body_html || '') ||
      (draft.sender_name || '') !== (original.sender_name || '') ||
      (draft.reply_to || '') !== (original.reply_to || '')
    );
  }, [draft, original]);

  const handleChange = (patch: Partial<EmailTemplate>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    const ok = await saveTemplate(draft);
    setSaving(false);
    addToast(ok ? 'Template saved.' : 'Could not save the template.', ok ? 'success' : 'error');
  };

  const handleRestore = async (version: EmailTemplateVersion) => {
    if (!draft) return;
    const ok = await restoreVersion(draft, version);
    if (ok) {
      setDraft({ ...draft, subject: version.subject || draft.subject, heading: version.heading || '', body_html: version.body_html || '' });
      addToast('Version restored. Review and save.', 'success');
    } else {
      addToast('Could not restore that version.', 'error');
    }
    setVersionsOpen(false);
  };

  const handleToggleActive = async (tpl: EmailTemplate) => {
    await toggleActive(tpl);
  };

  const providerNote = settings.emails_enabled !== 'true';

  return (
    <ManagementLayout
      title="Email Management"
      description="Design, brand and send every Oceans email from one place."
      icon={<Mail size={20} className="text-[#0d5959]" />}
    >
      {/* Status + actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-roboto ${
            providerNote ? 'bg-amber-50 text-amber-700' : 'bg-[#1B4332]/8 text-[#1B4332]'
          }`}
        >
          <i className={providerNote ? 'ri-alert-line' : 'ri-checkbox-circle-line'}></i>
          <span>{providerNote ? 'Outbound email is currently turned off' : 'Outbound email is enabled'}</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 text-[13px] font-roboto text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1B4332] text-white text-[13px] font-roboto hover:bg-[#15382A] transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-settings-3-line"></i>
            Sender & branding
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-[13px] font-roboto mb-4">
          <i className="ri-error-warning-line mt-0.5"></i>
          <div className="flex-1">
            <p className="font-medium">Could not load email settings</p>
            <p className="text-[12px] mt-0.5">{error}</p>
          </div>
          <button onClick={refresh} className="px-3 py-1.5 rounded-md bg-white/70 text-red-600 text-[12px] cursor-pointer whitespace-nowrap">
            Retry
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1 mb-4 w-fit">
        <button
          onClick={() => setView('templates')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] font-roboto transition-colors cursor-pointer whitespace-nowrap ${
            view === 'templates' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <i className="ri-file-text-line"></i>
          Templates
        </button>
        <button
          onClick={() => setView('log')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] font-roboto transition-colors cursor-pointer whitespace-nowrap ${
            view === 'log' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <i className="ri-history-line"></i>
          Delivery log
        </button>
      </div>

      {view === 'log' ? (
        <EmailDeliveryLog />
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-5 min-h-[600px]">
          <div className="lg:w-[280px] shrink-0 lg:border-r lg:border-stone-100 lg:pr-4">
            <EmailTemplateList
              templates={templates}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              onToggleActive={handleToggleActive}
            />
          </div>

          <div className="flex-1 min-w-0">
            {draft ? (
              <EmailTemplateEditor
                draft={draft}
                settings={settings}
                dirty={dirty}
                saving={saving}
                onChange={handleChange}
                onSave={handleSave}
                onToggleActive={() => draft && handleToggleActive(draft)}
                onShowVersions={() => setVersionsOpen(true)}
                onTest={() => setTestOpen(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-24">
                <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-3">
                  <i className="ri-mail-open-line text-2xl text-stone-400"></i>
                </div>
                <p className="text-[14px] font-roboto text-stone-500">Select a template to edit</p>
              </div>
            )}
          </div>
        </div>
      )}

      {draft && (
        <>
          <VersionHistoryPanel
            template={draft}
            loadVersions={loadVersions}
            onRestore={handleRestore}
            onClose={() => setVersionsOpen(false)}
          />
          <TestSendModal
            open={testOpen}
            templateName={draft.name}
            defaultTo={settings.support_email}
            onClose={() => setTestOpen(false)}
            onSend={(to) =>
              sendTest({
                to,
                templateKey: draft.key,
                subject: draft.subject,
                heading: draft.heading || '',
                bodyHtml: draft.body_html,
              })
            }
          />
        </>
      )}

      <EmailSettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
      />
    </ManagementLayout>
  );
}