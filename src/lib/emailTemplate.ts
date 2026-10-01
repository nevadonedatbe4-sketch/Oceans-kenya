export interface EmailSettings {
  agency_name: string;
  sender_name: string;
  sender_local_part: string;
  reply_to: string;
  support_email: string;
  signature: string;
  footer_text: string;
  brand_color: string;
  accent_color: string;
  logo_url: string;
  emails_enabled: string;
}

export const EMAIL_SETTINGS_DEFAULTS: EmailSettings = {
  agency_name: 'Oceans',
  sender_name: 'Oceans',
  sender_local_part: 'noreply',
  reply_to: '',
  support_email: 'ask@oceanske.com',
  signature: 'Oceans - Property, Land & Joint Ventures',
  footer_text: 'This email was sent by Oceans. Please do not reply directly to this automated message.',
  brand_color: '#1B4332',
  accent_color: '#C9A84A',
  logo_url: '',
  emails_enabled: 'true',
};

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string | null;
  subject: string;
  heading: string | null;
  body_html: string;
  body_text: string | null;
  sender_name: string | null;
  sender_email: string | null;
  reply_to: string | null;
  variables: string[] | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  updated_at: string;
}

export interface EmailTemplateVersion {
  id: string;
  template_key: string;
  subject: string | null;
  heading: string | null;
  body_html: string | null;
  version: number;
  changed_by_name: string | null;
  created_at: string;
}

export interface EmailVariable {
  token: string;
  label: string;
  description: string;
}

/** Every dynamic token supported by the template engine. */
export const EMAIL_VARIABLES: EmailVariable[] = [
  { token: 'recipient_name', label: 'Recipient name', description: 'Full name of the person receiving the email' },
  { token: 'agent_name', label: 'Agent name', description: 'The assigned agent or team member' },
  { token: 'agency_name', label: 'Agency name', description: 'The agency / organisation name' },
  { token: 'company_name', label: 'Company name', description: 'Your company display name' },
  { token: 'lead_name', label: 'Lead name', description: 'Name of the enquiring lead' },
  { token: 'property_title', label: 'Property title', description: 'Title of the related property' },
  { token: 'property_url', label: 'Property link', description: 'Link to the property or CRM record' },
  { token: 'crm_url', label: 'CRM link', description: 'Link to the deal / CRM pipeline in your dashboard' },
  { token: 'site_url', label: 'Website link', description: 'Your website home page' },
  { token: 'property_location', label: 'Property location', description: 'Area / neighbourhood of the property' },
  { token: 'property_price', label: 'Property price', description: 'Formatted price of the property' },
  { token: 'listing_reference', label: 'Listing reference', description: 'Your internal listing reference' },
  { token: 'deal_reference', label: 'Deal reference', description: 'Reference for a deal or transaction' },
  { token: 'deal_status', label: 'Deal status', description: 'Current stage of the deal' },
  { token: 'message_preview', label: 'Message', description: 'A short message or notification body' },
  { token: 'reset_link', label: 'Reset link', description: 'Secure password reset link' },
  { token: 'verification_code', label: 'Verification code', description: 'One-time account verification code' },
  { token: 'support_email', label: 'Support email', description: 'Your support email address' },
];

export interface EmailCategoryMeta {
  key: string;
  label: string;
  icon: string;
}

export const EMAIL_CATEGORIES: EmailCategoryMeta[] = [
  { key: 'account', label: 'Account & Access', icon: 'ri-shield-user-line' },
  { key: 'leads', label: 'Leads & Enquiries', icon: 'ri-user-heart-line' },
  { key: 'deals', label: 'Deals & Transactions', icon: 'ri-hand-coin-line' },
  { key: 'messages', label: 'Messages', icon: 'ri-chat-3-line' },
  { key: 'team', label: 'Team & Invitations', icon: 'ri-team-line' },
  { key: 'system', label: 'System Notifications', icon: 'ri-notification-3-line' },
  { key: 'marketing', label: 'Marketing', icon: 'ri-megaphone-line' },
  { key: 'general', label: 'General', icon: 'ri-mail-line' },
];

export const CATEGORY_LABEL = (key: string): string =>
  EMAIL_CATEGORIES.find((c) => c.key === key)?.label || 'General';

/** Values used to preview / test-render a template without real data. */
export const SAMPLE_VARS: Record<string, string> = {
  recipient_name: 'Alex Mwangi',
  agent_name: 'Grace Otieno',
  lead_name: 'Alex Mwangi',
  property_title: '4 Bed Villa in Kilimani',
  property_location: 'Kilimani, Nairobi',
  property_price: 'KES 85,000,000',
  property_url: 'https://oceanske.com',
  deal_reference: 'OC-1042',
  deal_status: 'In Progress',
  crm_url: 'https://oceanske.com/admin/pipeline',
  site_url: 'https://oceanske.com',
  listing_reference: 'OC-8821',
  reset_link: 'https://oceanske.com/reset-password',
  verification_code: '482913',
  message_preview: 'I would like to arrange a viewing this week.',
};

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Replace {{token}} placeholders, HTML-escaping the inserted values. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return (template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? '' : escapeHtml(String(value));
  });
}

/** Extract the set of tokens used in a piece of template text. */
export function extractTokens(text: string): string[] {
  const found = new Set<string>();
  (text || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, name: string) => {
    found.add(name);
    return _m;
  });
  return Array.from(found);
}

/**
 * Full Oceans-branded email shell for preview. Mirrors the server-side shell in
 * the send-templated-email edge function exactly so previews match reality.
 */
export function buildEmailShell(opts: {
  settings: EmailSettings;
  heading: string;
  bodyHtml: string;
  subject: string;
}): string {
  const { settings, heading, bodyHtml, subject } = opts;
  const brand = settings.brand_color || '#1B4332';
  const year = new Date().getFullYear();
  const logo = settings.logo_url
    ? `<img src="${escapeHtml(settings.logo_url)}" alt="${escapeHtml(settings.agency_name)}" style="height:34px;margin:0 auto 6px;display:block;" />`
    : `<span style="font-size:22px;font-weight:700;color:${brand};letter-spacing:0.04em;">${escapeHtml(settings.agency_name.toUpperCase())}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(settings.agency_name)}</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;">
<div style="display:none;font-size:1px;color:#FAF8F4;max-height:0;overflow:hidden;">${escapeHtml(subject)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F4;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="text-align:center;padding:4px 0 22px;">
            ${logo}
            <div style="font-size:11px;color:#9AA39D;letter-spacing:0.18em;text-transform:uppercase;margin-top:6px;">Property · Land · Joint Ventures</div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #ECE8DF;border-radius:12px;padding:32px 28px;">
            ${heading ? `<h1 style="font-size:19px;font-weight:700;color:#12211A;margin:0 0 16px;">${escapeHtml(heading)}</h1>` : ''}
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding:22px 8px 0;font-size:11px;line-height:1.7;color:#9AA39D;">
            ${escapeHtml(settings.signature)}
            <div style="margin-top:8px;">${escapeHtml(settings.footer_text)}</div>
            <div style="margin-top:10px;">© ${year} ${escapeHtml(settings.agency_name)}. All rights reserved.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Convenience: render a full preview document for a template. */
export function renderPreview(
  template: Pick<EmailTemplate, 'subject' | 'heading' | 'body_html'>,
  settings: EmailSettings,
  vars: Record<string, string> = SAMPLE_VARS,
): { subject: string; html: string } {
  const merged = {
    company_name: settings.agency_name,
    agency_name: settings.agency_name,
    support_email: settings.support_email,
    ...vars,
  };
  const subject = renderTemplate(template.subject || '', merged);
  const heading = renderTemplate(template.heading || '', merged);
  const body = renderTemplate(template.body_html || '', merged);
  return {
    subject,
    html: buildEmailShell({ settings, heading, bodyHtml: body, subject }),
  };
}