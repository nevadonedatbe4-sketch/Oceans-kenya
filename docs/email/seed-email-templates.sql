-- ============================================================================
-- Oceans Kenya — email template seed
-- ============================================================================
--
-- The email engine (send-templated-email) renders a row from `email_templates`
-- by `key`, injecting {{tokens}}, and wraps heading + body_html in the shared
-- branded shell. These are the templates every automated email needs; without
-- the matching row, that email fails with TEMPLATE_NOT_FOUND.
--
-- body_html is INNER content only (the shell adds <html>, logo, footer).
-- Use {{token}} placeholders — unknown tokens render empty.
--
-- Safe to run repeatedly: ON CONFLICT (key) DO NOTHING preserves any edits
-- made later in Email Management. To RESET a template to this version, delete
-- its row first, then re-run.
--
-- Apply: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================================

insert into public.email_templates (key, subject, heading, body_html, is_active) values

-- 1. Visitor acknowledgement for every website form submission (crm-ingest).
('enquiry_auto_response',
 'We received your enquiry — Oceans',
 'Thank you, {{recipient_name}}',
 '<p>Thank you for getting in touch with Oceans. We have received your enquiry and a member of our team will respond shortly.</p>'
 || '<p style="margin-top:16px;padding:12px 16px;background:#F7F9F9;border-left:3px solid #C9A84A;">{{message_preview}}</p>'
 || '<p style="margin-top:16px;">Regarding: <strong>{{property_title}}</strong></p>'
 || '<p style="margin-top:16px;"><a href="{{property_url}}">View on our website</a></p>',
 true),

-- 2. New lead notification to the assigned agent / office (crm-notify new_lead).
('new_lead',
 'New lead: {{lead_name}}',
 'New lead received',
 '<p>Hi {{recipient_name}},</p>'
 || '<p><strong>{{lead_name}}</strong> just submitted an enquiry.</p>'
 || '<p>Property: <strong>{{property_title}}</strong><br/>Location: {{property_location}}</p>'
 || '<p style="margin-top:16px;"><a href="{{crm_url}}">Open in the CRM</a></p>',
 true),

-- 3. New message from an existing contact (crm-notify new_message).
('new_message',
 'New message from {{lead_name}}',
 'New message received',
 '<p>Hi {{recipient_name}},</p>'
 || '<p><strong>{{lead_name}}</strong> sent a new message:</p>'
 || '<p style="margin-top:12px;padding:12px 16px;background:#F7F9F9;border-left:3px solid #C9A84A;">{{message_preview}}</p>'
 || '<p style="margin-top:16px;">Regarding: <strong>{{property_title}}</strong></p>'
 || '<p style="margin-top:16px;"><a href="{{crm_url}}">Reply in the CRM</a></p>',
 true),

-- 4. Deal created (crm-notify deal_created).
('deal_created',
 'New deal: {{deal_reference}}',
 'A new deal was created',
 '<p>Hi {{recipient_name}},</p>'
 || '<p>Deal <strong>{{deal_reference}}</strong> has been created.</p>'
 || '<p>Property: <strong>{{property_title}}</strong><br/>Value: {{property_price}}</p>'
 || '<p style="margin-top:16px;"><a href="{{crm_url}}">Open the deal</a></p>',
 true),

-- 5. Deal status change (crm-notify deal_status).
('deal_status_update',
 'Deal {{deal_reference}} is now {{deal_status}}',
 'Deal status updated',
 '<p>Hi {{recipient_name}},</p>'
 || '<p>Deal <strong>{{deal_reference}}</strong> ({{property_title}}) moved to <strong>{{deal_status}}</strong>.</p>'
 || '<p style="margin-top:16px;"><a href="{{crm_url}}">View the deal</a></p>',
 true),

-- 6. Lead assigned to an agent (crm-notify lead_assigned).
('agent_assignment',
 'You have been assigned a lead: {{lead_name}}',
 'A lead was assigned to you',
 '<p>Hi {{recipient_name}},</p>'
 || '<p>{{agent_name}} assigned you a lead: <strong>{{lead_name}}</strong>.</p>'
 || '<p>Property: <strong>{{property_title}}</strong></p>'
 || '<p style="margin-top:16px;"><a href="{{crm_url}}">Open in the CRM</a></p>',
 true),

-- 7. Team invitation (invite-user, create-admin-user). property_url = login URL.
('team_invitation',
 'You have been invited to the Oceans team',
 'Welcome to the team, {{recipient_name}}',
 '<p>An account has been created for you on the Oceans platform.</p>'
 || '<p>To set your password, go to the sign-in page and use <strong>Forgot password</strong> with this email address.</p>'
 || '<p style="margin-top:16px;"><a href="{{property_url}}">Go to sign in</a></p>',
 true),

-- 8. Welcome email after signup completes (signup-complete). property_url = site.
('welcome',
 'Welcome to Oceans',
 'Welcome, {{recipient_name}}',
 '<p>Your Oceans account is ready.</p>'
 || '<p style="margin-top:16px;"><a href="{{property_url}}">Visit Oceans</a></p>',
 true),

-- 9. Password reset (password-reset-request). reset_link is single-use + expiring.
('password_reset',
 'Reset your Oceans password',
 'Password reset request',
 '<p>Hi {{recipient_name}},</p>'
 || '<p>We received a request to reset your Oceans password. Click below to choose a new one. '
 || 'This link can be used once and expires shortly.</p>'
 || '<p style="margin-top:20px;"><a href="{{reset_link}}" '
 || 'style="display:inline-block;padding:12px 22px;background:#1B4332;color:#ffffff;text-decoration:none;border-radius:6px;">Reset password</a></p>'
 || '<p style="margin-top:20px;color:#6b7280;font-size:13px;">If you did not request this, you can safely ignore this email — your password will not change.</p>',
 true)

on conflict (key) do nothing;

-- ============================================================================
-- OPTIONAL — sender identity. The engine falls back to built-in defaults when
-- email_settings is empty; set these to brand the sender and reply-to.
-- sender_local_part + RESEND_FROM_DOMAIN form the From address
-- (e.g. noreply@your-domain). Uncomment and edit to apply.
-- ============================================================================
-- insert into public.email_settings (key, value) values
--   ('agency_name',       'Oceans'),
--   ('sender_name',       'Oceans'),
--   ('sender_local_part', 'noreply'),
--   ('reply_to',          'ask@oceanske.com'),
--   ('support_email',     'ask@oceanske.com'),
--   ('emails_enabled',    'true')
-- on conflict (key) do update set value = excluded.value;
