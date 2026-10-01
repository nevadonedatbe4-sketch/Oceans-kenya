import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function esc(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface Settings {
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

const SETTING_DEFAULTS: Settings = {
  agency_name: "Oceans",
  sender_name: "Oceans",
  sender_local_part: "noreply",
  reply_to: "",
  support_email: "ask@oceanske.com",
  signature: "Oceans — Property, Land & Joint Ventures",
  footer_text: "This email was sent by Oceans.",
  brand_color: "#1B4332",
  accent_color: "#C9A84A",
  logo_url: "",
  emails_enabled: "true",
};

/** Replace {{variable}} tokens with HTML-escaped values. Unknown tokens render empty. */
function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? "" : esc(String(value));
  });
}

/** Oceans-branded email shell. Branding is centralised here so every template stays consistent. */
function buildShell(opts: {
  settings: Settings;
  heading: string;
  bodyHtml: string;
  previewText: string;
}): string {
  const { settings, heading, bodyHtml, previewText } = opts;
  const brand = settings.brand_color || "#1B4332";
  const year = new Date().getFullYear();
  const logo = settings.logo_url
    ? `<img src="${esc(settings.logo_url)}" alt="${esc(settings.agency_name)}" style="height:34px;margin:0 auto 6px;display:block;" />`
    : `<span style="font-size:22px;font-weight:700;color:${brand};letter-spacing:0.04em;">${esc(settings.agency_name.toUpperCase())}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(settings.agency_name)}</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;">
<div style="display:none;font-size:1px;color:#FAF8F4;max-height:0;overflow:hidden;">${esc(previewText)}</div>
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
            ${heading ? `<h1 style="font-size:19px;font-weight:700;color:#12211A;margin:0 0 16px;">${esc(heading)}</h1>` : ""}
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding:22px 8px 0;font-size:11px;line-height:1.7;color:#9AA39D;">
            ${esc(settings.signature)}
            <div style="margin-top:8px;">${esc(settings.footer_text)}</div>
            <div style="margin-top:10px;">© ${year} ${esc(settings.agency_name)}. All rights reserved.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: {
    to?: string;
    template_key?: string;
    variables?: Record<string, string>;
    subject?: string;
    heading?: string;
    body_html?: string;
    related_type?: string;
    related_id?: string;
    test?: boolean;
  } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const to = (payload.to || "").trim().toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return json({ error: "A valid recipient email is required.", code: "INVALID_EMAIL" }, 400);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromDomain = Deno.env.get("RESEND_FROM_DOMAIN");

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Load central sender configuration.
  let settings: Settings = { ...SETTING_DEFAULTS };
  try {
    const { data } = await supabaseAdmin.from("email_settings").select("key, value");
    if (data) {
      data.forEach((row: { key: string; value: string | null }) => {
        if (row.key in settings && row.value !== null) {
          (settings as unknown as Record<string, string>)[row.key] = row.value;
        }
      });
    }
  } catch (e) {
    console.error("email_settings load failed:", e);
  }

  // Resolve content: either from the saved template, or inline overrides (used by the live preview test).
  let subject = payload.subject || "";
  let heading = payload.heading || "";
  let bodyHtml = payload.body_html || "";
  let templateKey = payload.template_key || "";
  let isActive = true;

  if (templateKey) {
    const { data: tpl, error } = await supabaseAdmin
      .from("email_templates")
      .select("subject, heading, body_html, sender_name, reply_to, is_active")
      .eq("key", templateKey)
      .maybeSingle();

    if (error) {
      console.error("template load failed:", error);
    }
    if (tpl) {
      isActive = tpl.is_active !== false;
      if (!subject) subject = tpl.subject || "";
      if (!heading) heading = tpl.heading || "";
      if (!bodyHtml) bodyHtml = tpl.body_html || "";
      if (tpl.sender_name) settings.sender_name = tpl.sender_name;
      if (tpl.reply_to) settings.reply_to = tpl.reply_to;
    } else if (!subject || !bodyHtml) {
      return json({ error: `Template "${templateKey}" was not found.`, code: "TEMPLATE_NOT_FOUND" }, 404);
    }
  }

  const vars: Record<string, string> = {
    company_name: settings.agency_name,
    agency_name: settings.agency_name,
    support_email: settings.support_email,
    site_url: fromDomain ? `https://${fromDomain}` : "",
    crm_url: fromDomain ? `https://${fromDomain}/admin/pipeline` : "",
    ...(payload.variables || {}),
  };

  // Build a preview/dummy value for any token that has no supplied value, so a
  // test send never ships literal "{{token}}" placeholders to a recipient.
  const SAMPLE: Record<string, string> = {
    recipient_name: "Alex Mwangi",
    agent_name: "Grace Otieno",
    lead_name: "Alex Mwangi",
    property_title: "4 Bed Villa in Kilimani",
    property_location: "Kilimani, Nairobi",
    property_price: "KES 85,000,000",
    property_url: "https://oceans.co.ke",
    deal_reference: "OC-1042",
    deal_status: "In Progress",
    crm_url: "https://oceanske.com/admin/pipeline",
    site_url: "https://oceanske.com",
    listing_reference: "OC-8821",
    reset_link: "https://oceans.co.ke/reset-password",
    verification_code: "482913",
    message_preview: "I would like to arrange a viewing this week.",
  };
  const resolvedVars: Record<string, string> = { ...SAMPLE, ...vars };

  const finalSubject = render(subject || "A message from Oceans", resolvedVars);
  const finalHeading = render(heading, resolvedVars);
  const finalBody = render(bodyHtml, resolvedVars);

  const fromEmail = `${settings.sender_local_part || "noreply"}@${fromDomain || ""}`;

  // ── Log the attempt first (status queued), then update to the final outcome.
  let logId: string | null = null;
  try {
    const { data: logRow } = await supabaseAdmin
      .from("email_log")
      .insert({
        direction: "outbound",
        to_email: to,
        from_email: fromEmail,
        subject: finalSubject,
        template: templateKey || (payload.test ? "test" : "custom"),
        status: "queued",
        related_type: payload.related_type || null,
        related_id: payload.related_id || null,
        metadata: payload.test ? { test: true } : null,
      })
      .select("id")
      .single();
    logId = logRow?.id || null;
  } catch (e) {
    console.error("email_log insert failed:", e);
  }

  const finalize = async (status: string, error?: string, providerId?: string) => {
    if (!logId) return;
    try {
      await supabaseAdmin
        .from("email_log")
        .update({ status, error: error || null, provider_message_id: providerId || null })
        .eq("id", logId);
    } catch (e) {
      console.error("email_log update failed:", e);
    }
  };

  // ── Configuration guard.
  if (!resendApiKey || !fromDomain) {
    const missing = [
      !resendApiKey ? "RESEND_API_KEY" : null,
      !fromDomain ? "RESEND_FROM_DOMAIN" : null,
    ].filter(Boolean).join(", ");
    await finalize("failed", `Email not configured. Missing secret(s): ${missing}.`);
    return json({
      error: `Email service is not configured. Add ${missing} in the Supabase Dashboard under Edge Function Secrets.`,
      code: "EMAIL_NOT_CONFIGURED",
      missing,
      log_id: logId,
    }, 503);
  }

  if (settings.emails_enabled !== "true" && !payload.test) {
    await finalize("failed", "Outbound email is disabled in Email Management settings.");
    return json({ error: "Outbound email is turned off in Email Management settings.", code: "EMAIL_DISABLED" }, 409);
  }

  if (templateKey && !isActive && !payload.test) {
    await finalize("failed", "Template is inactive.");
    return json({ error: "This email template is turned off.", code: "TEMPLATE_INACTIVE" }, 409);
  }

  const html = buildShell({
    settings,
    heading: finalHeading,
    bodyHtml: finalBody,
    previewText: finalSubject,
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${settings.sender_name} <${fromEmail}>`,
        to: [to],
        subject: finalSubject,
        html,
        ...(settings.reply_to ? { reply_to: settings.reply_to } : {}),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const raw = await res.text();
    let parsed: { id?: string; message?: string; name?: string } | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      const detail = parsed?.message || parsed?.name || raw.slice(0, 300);
      await finalize("failed", `Provider rejected: ${detail}`);
      return json({ error: `Failed to send email: ${detail}`, code: "PROVIDER_REJECTED", log_id: logId }, 502);
    }

    // "sent" = accepted by the email provider (not yet confirmed delivered).
    await finalize("sent", undefined, parsed?.id);
    return json({ success: true, id: parsed?.id || null, status: "sent", log_id: logId }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await finalize("failed", msg);
    return json({ error: `Email send failed: ${msg}`, code: "SEND_FAILED", log_id: logId }, 500);
  }
});
