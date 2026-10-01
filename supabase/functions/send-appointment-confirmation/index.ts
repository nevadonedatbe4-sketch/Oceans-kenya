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

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface EmailSettings {
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

const SETTING_DEFAULTS: EmailSettings = {
  agency_name: "Oceans",
  sender_name: "Oceans",
  sender_local_part: "noreply",
  reply_to: "",
  support_email: "",
  signature: "Oceans",
  footer_text: "This email was sent by Oceans.",
  brand_color: "#0F3D3E",
  accent_color: "#0F766E",
  logo_url: "",
  emails_enabled: "true",
};

type EmailEvent = "confirmation" | "rescheduled" | "cancelled" | "reassigned";

function fmtDate(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: tz,
    });
  } catch {
    return new Date(iso).toDateString();
  }
}

function fmtTime(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  } catch {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
}

function buildShell(settings: EmailSettings, heading: string, bodyHtml: string): string {
  const brand = settings.brand_color || "#0F3D3E";
  const year = new Date().getFullYear();
  const logo = settings.logo_url
    ? `<img src="${esc(settings.logo_url)}" alt="${esc(settings.agency_name)}" style="height:36px;display:block;margin:0 auto;" />`
    : `<span style="font-size:20px;font-weight:700;color:${brand};letter-spacing:0.06em;">${esc(settings.agency_name.toUpperCase())}</span>`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F6F5F2;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F5F2;">
<tr><td align="center" style="padding:30px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="text-align:center;padding:4px 0 20px;">${logo}</td></tr>
<tr><td style="background:#ffffff;border:1px solid #E7E4DC;border-radius:12px;padding:30px 26px;">
${heading ? `<h1 style="font-size:18px;color:#12211A;margin:0 0 14px;">${esc(heading)}</h1>` : ""}
${bodyHtml}
</td></tr>
<tr><td style="text-align:center;padding:20px 8px 0;font-size:11px;line-height:1.7;color:#9AA39D;">
${esc(settings.signature)}<div style="margin-top:6px;">${esc(settings.footer_text)}</div>
<div style="margin-top:8px;">© ${year} ${esc(settings.agency_name)}. All rights reserved.</div>
</td></tr>
</table></td></tr></table></body></html>`;
}

function row(label: string, value: string): string {
  if (!value) return "";
  return `<tr><td style="padding:6px 0;font-size:12px;color:#8A938C;width:130px;vertical-align:top;">${esc(label)}</td><td style="padding:6px 0;font-size:14px;color:#12211A;font-weight:600;">${esc(value)}</td></tr>`;
}

function btn(href: string, label: string, color: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;margin:4px 6px 4px 0;padding:10px 18px;background:${color};color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">${esc(label)}</a>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: {
    appointment_id?: string;
    event?: EmailEvent;
    actor_id?: string;
    previous_starts_at?: string;
    site_url?: string;
  } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const appointmentId = payload.appointment_id;
  const event: EmailEvent = payload.event || "confirmation";
  if (!appointmentId) return json({ error: "appointment_id is required." }, 400);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let callerId: string | null = null;
  if (token) {
    const { data: userData } = await anonClient.auth.getUser(token);
    callerId = userData?.user?.id || null;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: appt, error: apptErr } = await admin
    .from("og_appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();
  if (apptErr || !appt) return json({ error: "Appointment not found." }, 404);

  const tz: string = appt.timezone || "Africa/Nairobi";

  let settings: EmailSettings = { ...SETTING_DEFAULTS };
  try {
    const { data } = await admin.from("email_settings").select("key, value");
    (data || []).forEach((r: { key: string; value: string | null }) => {
      if (r.key in settings && r.value !== null) {
        (settings as unknown as Record<string, string>)[r.key] = r.value;
      }
    });
  } catch (e) {
    console.error("email_settings load failed:", e);
  }

  const site: Record<string, string> = {};
  try {
    const { data } = await admin.from("site_settings").select("key, value");
    (data || []).forEach((r: { key: string; value: string | null }) => {
      if (r.value) site[r.key] = r.value;
    });
  } catch (e) {
    console.error("site_settings load failed:", e);
  }

  const companyName = settings.agency_name || site.site_name || "Oceans";
  const companyAddress = site.address || "";
  const companyPhone = site.phone || site.contact_phone || "";
  const companyEmail = settings.support_email || site.email || site.contact_email || "";
  const companyWebsite = site.website || payload.site_url || "";
  const brand = settings.brand_color || "#0F3D3E";

  let property: { title?: string; slug?: string; location?: string; neighbourhood?: string; address?: string; cover_image?: string; main_image?: string; property_type?: string } | null = null;
  if (appt.property_id) {
    const { data } = await admin
      .from("listings")
      .select("title, slug, location, neighbourhood, address, cover_image, main_image, property_type")
      .eq("id", appt.property_id)
      .maybeSingle();
    property = data || null;
  }
  const propertyTitle = property?.title || appt.property_title || "the property";
  const propertyAddress = property?.address || property?.location || appt.location_text || property?.neighbourhood || "";
  const propertyImage = property?.cover_image || property?.main_image || "";
  const propertyUrl = property?.slug && companyWebsite ? `${companyWebsite.replace(/\/$/, "")}/property/${property.slug}` : "";

  let agent: { name?: string; email?: string; phone?: string } | null = null;
  if (appt.assigned_user_id) {
    const { data } = await admin
      .from("profiles")
      .select("name, email, phone")
      .eq("user_id", appt.assigned_user_id)
      .maybeSingle();
    agent = data || null;
  }

  let creator: { name?: string; role?: string } | null = null;
  if (appt.created_by) {
    const { data } = await admin
      .from("profiles")
      .select("name, role")
      .eq("user_id", appt.created_by)
      .maybeSingle();
    creator = data || null;
  }

  const contactIds: string[] = Array.isArray(appt.contact_ids) ? appt.contact_ids : [];
  let contacts: { id: string; name?: string; first_name?: string; last_name?: string; email?: string; phone?: string }[] = [];
  if (contactIds.length) {
    const { data } = await admin
      .from("contacts")
      .select("id, name, first_name, last_name, email, phone")
      .in("id", contactIds);
    contacts = data || [];
  }
  const applicantEmails = contacts
    .map((c) => ({
      email: (c.email || "").trim(),
      name: c.first_name || c.name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "there",
      phone: c.phone || "",
    }))
    .filter((c) => c.email);

  const dateLabel = fmtDate(appt.starts_at, tz);
  const startLabel = fmtTime(appt.starts_at, tz);
  const endLabel = fmtTime(appt.ends_at, tz);
  const agentName = agent?.name || "your viewing agent";
  const isViewing = appt.kind === "viewing";

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromDomain = Deno.env.get("RESEND_FROM_DOMAIN");
  const configured = !!resendApiKey && !!fromDomain;
  const fromEmail = `${settings.sender_local_part || "noreply"}@${fromDomain || ""}`;
  const configuredError = !resendApiKey
    ? "Email is not configured (missing RESEND_API_KEY)."
    : !fromDomain
    ? "Email is not configured (missing RESEND_FROM_DOMAIN)."
    : "";

  const record = async (
    recipientType: "applicant" | "agent",
    recipientEmail: string | null,
    recipientName: string,
    subject: string,
    status: string,
    error?: string,
  ) => {
    try {
      await admin.from("og_appointment_emails").insert({
        appointment_id: appointmentId,
        event,
        recipient_type: recipientType,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        subject,
        status,
        error: error || null,
        sent_at: status === "sent" ? new Date().toISOString() : null,
        created_by: callerId,
      });
    } catch (e) {
      console.error("og_appointment_emails insert failed:", e);
    }
  };

  const sendOne = async (to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${settings.sender_name || companyName} <${fromEmail}>`,
          to: [to],
          subject,
          html,
          ...(settings.reply_to ? { reply_to: settings.reply_to } : {}),
        }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const raw = await res.text();
      let parsed: { message?: string; name?: string } | null = null;
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
      if (!res.ok) return { ok: false, error: parsed?.message || parsed?.name || raw.slice(0, 200) };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  const results: { recipient: string; type: string; email: string | null; status: string; error?: string }[] = [];

  if (!configured) {
    for (const a of applicantEmails) {
      await record("applicant", a.email, a.name, "Appointment", "failed", configuredError);
      results.push({ recipient: a.name, type: "applicant", email: a.email, status: "failed", error: configuredError });
    }
    if (agent?.email) {
      await record("agent", agent.email, agent.name || "Agent", "Appointment", "failed", configuredError);
      results.push({ recipient: agent.name || "Agent", type: "agent", email: agent.email, status: "failed", error: configuredError });
    }
    return json({ success: false, configured: false, error: configuredError, results }, 200);
  }

  for (const a of applicantEmails) {
    const subject = event === "cancelled"
      ? `Appointment Cancelled — ${propertyTitle}`
      : event === "rescheduled"
      ? `Viewing Rescheduled — ${propertyTitle}`
      : `Viewing Confirmation — ${propertyTitle}`;

    const body = `
      <p style="font-size:14px;color:#3A463F;line-height:1.6;margin:0 0 14px;">Dear ${esc(a.name)},</p>
      ${event === "cancelled"
        ? `<p style="font-size:14px;color:#3A463F;line-height:1.6;margin:0 0 14px;">Your appointment for <strong>${esc(propertyTitle)}</strong> has been cancelled.</p>`
        : event === "rescheduled"
        ? `<p style="font-size:14px;color:#3A463F;line-height:1.6;margin:0 0 14px;">Your viewing has been rearranged. ${payload.previous_starts_at ? `It was previously <strong>${esc(fmtDate(payload.previous_starts_at, tz))} at ${esc(fmtTime(payload.previous_starts_at, tz))}</strong>.` : ""}</p>`
        : `<p style="font-size:14px;color:#3A463F;line-height:1.6;margin:0 0 14px;">Your viewing has been booked for:</p>`}
      <h2 style="font-size:16px;color:#12211A;margin:0 0 12px;">${esc(propertyTitle)}</h2>
      ${propertyImage ? `<img src="${esc(propertyImage)}" alt="${esc(propertyTitle)}" style="width:100%;max-width:500px;border-radius:10px;margin-bottom:14px;" />` : ""}
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
        ${row("Date", dateLabel)}
        ${row("Time", `${startLabel} – ${endLabel}`)}
        ${row("Viewing agent", agentName)}
        ${row("Contact", agent?.phone || companyPhone)}
        ${row("Email", agent?.email || companyEmail)}
        ${propertyAddress ? row("Address", propertyAddress) : ""}
      </table>
      <p style="font-size:13px;color:#6B7A70;line-height:1.6;margin:0 0 16px;">${esc(agentName)} will be accompanying you. If you are unable to attend or wish to rearrange this appointment, please contact us.</p>
      ${propertyUrl ? btn(propertyUrl, "View Property", brand) : ""}
      ${companyWebsite ? btn(companyWebsite, "Manage Appointment", settings.accent_color || brand) : ""}
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #EDEAE3;font-size:12px;color:#8A938C;line-height:1.7;">
        <strong style="color:#3A463F;">${esc(companyName)}</strong><br />
        ${companyAddress ? `${esc(companyAddress)}<br />` : ""}
        ${companyPhone ? `${esc(companyPhone)}<br />` : ""}
        ${companyEmail ? `${esc(companyEmail)}<br />` : ""}
        ${companyWebsite ? esc(companyWebsite) : ""}
      </div>`;

    const html = buildShell(settings, event === "cancelled" ? "Appointment Cancelled" : "Appointment Confirmation", body);
    const sent = await sendOne(a.email, subject, html);
    await record("applicant", a.email, a.name, subject, sent.ok ? "sent" : "failed", sent.error);
    results.push({ recipient: a.name, type: "applicant", email: a.email, status: sent.ok ? "sent" : "failed", error: sent.error });
  }

  if (agent?.email) {
    const createdByLabel = creator?.name
      ? `${creator.name}${creator.role && creator.role !== "agent" ? " — Appointment Setter" : ""}`
      : "System";
    const subject = `New ${isViewing ? "Viewing " : ""}Appointment — ${propertyTitle} — ${dateLabel} ${startLabel}`;
    const body = `
      <p style="font-size:14px;color:#3A463F;line-height:1.6;margin:0 0 14px;">Hi ${esc((agent.name || "there").split(" ")[0])},</p>
      <p style="font-size:14px;color:#3A463F;line-height:1.6;margin:0 0 14px;">A new ${isViewing ? "viewing" : "appointment"} has been scheduled and assigned to you.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
        ${row("Property", propertyTitle)}
        ${propertyAddress ? row("Address", propertyAddress) : ""}
        ${row("Date", dateLabel)}
        ${row("Time", `${startLabel} – ${endLabel}`)}
        ${row("Applicant", contacts[0]?.name || appt.client_name || "—")}
        ${row("Phone", contacts[0]?.phone || appt.client_phone || "—")}
        ${row("Email", contacts[0]?.email || appt.client_email || "—")}
        ${row("Created by", createdByLabel)}
        ${row("Status", String(appt.status || "scheduled"))}
      </table>
      ${propertyUrl ? btn(propertyUrl, "View Property", brand) : ""}
      ${companyWebsite ? btn(`${companyWebsite.replace(/\/$/, "")}/agent/calendar`, "View Appointment", settings.accent_color || brand) : ""}`;
    const html = buildShell(settings, "Appointment assigned", body);
    const sent = await sendOne(agent.email, subject, html);
    await record("agent", agent.email, agent.name || "Agent", subject, sent.ok ? "sent" : "failed", sent.error);
    results.push({ recipient: agent.name || "Agent", type: "agent", email: agent.email, status: sent.ok ? "sent" : "failed", error: sent.error });
  } else {
    results.push({ recipient: "Assigned agent", type: "agent", email: null, status: "skipped", error: "No email address on file." });
  }

  return json({ success: true, configured: true, results }, 200);
});
