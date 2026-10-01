import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  EMAIL_SETTINGS_DEFAULTS,
  type EmailSettings,
  type EmailTemplate,
  type EmailTemplateVersion,
} from '@/lib/emailTemplate';

interface UseEmailTemplatesResult {
  templates: EmailTemplate[];
  settings: EmailSettings;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  saveTemplate: (tpl: EmailTemplate) => Promise<boolean>;
  toggleActive: (tpl: EmailTemplate) => Promise<void>;
  toggleSettingsFlag: (key: 'emails_enabled') => Promise<void>;
  saveSettings: (next: Partial<EmailSettings>) => Promise<boolean>;
  loadVersions: (key: string) => Promise<EmailTemplateVersion[]>;
  restoreVersion: (tpl: EmailTemplate, version: EmailTemplateVersion) => Promise<boolean>;
  sendTest: (payload: {
    to: string;
    templateKey?: string;
    subject?: string;
    heading?: string;
    bodyHtml?: string;
    variables?: Record<string, string>;
  }) => Promise<{ ok: boolean; message: string }>;
}

export function useEmailTemplates(): UseEmailTemplatesResult {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [settings, setSettings] = useState<EmailSettings>(EMAIL_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tplRes, setRes] = await Promise.all([
        supabase.from('email_templates').select('*').order('sort_order', { ascending: true }),
        supabase.from('email_settings').select('key, value'),
      ]);

      if (tplRes.error) throw tplRes.error;
      if (setRes.error) throw setRes.error;

      setTemplates((tplRes.data as EmailTemplate[]) || []);

      const merged: EmailSettings = { ...EMAIL_SETTINGS_DEFAULTS };
      (setRes.data || []).forEach((row: { key: string; value: string | null }) => {
        if (row.key in merged && row.value !== null) {
          (merged as unknown as Record<string, string>)[row.key] = row.value;
        }
      });
      setSettings(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load email settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const currentUserName = useCallback(async (): Promise<string> => {
    try {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email || '';
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', data.user?.id || '')
        .maybeSingle();
      return profile?.name || email || 'Administrator';
    } catch {
      return 'Administrator';
    }
  }, []);

  const saveTemplate = useCallback(async (tpl: EmailTemplate): Promise<boolean> => {
    try {
      const { error: updErr } = await supabase
        .from('email_templates')
        .update({
          name: tpl.name,
          subject: tpl.subject,
          heading: tpl.heading,
          body_html: tpl.body_html,
          body_text: tpl.body_text,
          sender_name: tpl.sender_name,
          reply_to: tpl.reply_to,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tpl.id);
      if (updErr) throw updErr;

      // Snapshot the saved content as a new version for restore.
      const { data: lastVersion } = await supabase
        .from('email_template_versions')
        .select('version')
        .eq('template_key', tpl.key)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVersion = (lastVersion?.version || 0) + 1;
      const changedBy = await currentUserName();

      await supabase.from('email_template_versions').insert({
        template_key: tpl.key,
        subject: tpl.subject,
        heading: tpl.heading,
        body_html: tpl.body_html,
        version: nextVersion,
        changed_by_name: changedBy,
      });

      setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? { ...t, ...tpl } : t)));
      return true;
    } catch (err) {
      console.error('saveTemplate failed:', err);
      return false;
    }
  }, [currentUserName]);

  const toggleActive = useCallback(async (tpl: EmailTemplate) => {
    const next = !tpl.is_active;
    setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? { ...t, is_active: next } : t)));
    const { error: err } = await supabase
      .from('email_templates')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', tpl.id);
    if (err) {
      console.error('toggleActive failed:', err);
      setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? { ...t, is_active: tpl.is_active } : t)));
    }
  }, []);

  const saveSettings = useCallback(async (next: Partial<EmailSettings>): Promise<boolean> => {
    try {
      const rows = Object.entries(next).map(([key, value]) => ({
        key,
        value: value === undefined || value === null ? '' : String(value),
        updated_at: new Date().toISOString(),
      }));
      const { error: err } = await supabase.from('email_settings').upsert(rows, { onConflict: 'key' });
      if (err) throw err;
      setSettings((prev) => ({ ...prev, ...next }));
      return true;
    } catch (err) {
      console.error('saveSettings failed:', err);
      return false;
    }
  }, []);

  const toggleSettingsFlag = useCallback(async (key: 'emails_enabled') => {
    const next = settings[key] === 'true' ? 'false' : 'true';
    await saveSettings({ [key]: next } as Partial<EmailSettings>);
  }, [settings, saveSettings]);

  const loadVersions = useCallback(async (key: string): Promise<EmailTemplateVersion[]> => {
    try {
      const { data, error: err } = await supabase
        .from('email_template_versions')
        .select('*')
        .eq('template_key', key)
        .order('version', { ascending: false })
        .limit(15);
      if (err) throw err;
      return (data as EmailTemplateVersion[]) || [];
    } catch (err) {
      console.error('loadVersions failed:', err);
      return [];
    }
  }, []);

  const restoreVersion = useCallback(async (tpl: EmailTemplate, version: EmailTemplateVersion): Promise<boolean> => {
    return saveTemplate({
      ...tpl,
      subject: version.subject || tpl.subject,
      heading: version.heading || '',
      body_html: version.body_html || '',
    });
  }, [saveTemplate]);

  const sendTest = useCallback(async (payload: {
    to: string;
    templateKey?: string;
    subject?: string;
    heading?: string;
    bodyHtml?: string;
    variables?: Record<string, string>;
  }): Promise<{ ok: boolean; message: string }> => {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('send-templated-email', {
        body: {
          to: payload.to,
          template_key: payload.templateKey,
          subject: payload.subject,
          heading: payload.heading,
          body_html: payload.bodyHtml,
          variables: payload.variables,
          test: true,
        },
      });
      if (fnErr) {
        let message = fnErr.message;
        try {
          const ctx = (fnErr as unknown as { context?: { json?: () => Promise<unknown> } }).context;
          if (ctx && typeof ctx.json === 'function') {
            const parsed = (await ctx.json()) as { error?: string };
            if (parsed?.error) message = parsed.error;
          }
        } catch {
          // keep the generic message
        }
        return { ok: false, message };
      }
      if (data && data.success === true) {
        return { ok: true, message: 'Test email accepted by the provider.' };
      }
      return { ok: false, message: data?.error || 'The email could not be sent.' };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Network error while sending.' };
    }
  }, []);

  return {
    templates,
    settings,
    loading,
    error,
    refresh,
    saveTemplate,
    toggleActive,
    toggleSettingsFlag,
    saveSettings,
    loadVersions,
    restoreVersion,
    sendTest,
  };
}