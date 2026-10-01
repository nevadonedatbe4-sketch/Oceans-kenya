import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@3.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromDomain = Deno.env.get("RESEND_FROM_DOMAIN");

  if (!resendApiKey || !fromDomain) {
    console.error("Missing Resend configuration");
    return json({
      error: "Email service is not configured. An administrator must add RESEND_API_KEY and RESEND_FROM_DOMAIN in the Supabase Dashboard under Edge Function Secrets.",
      code: "RESEND_NOT_CONFIGURED",
    }, 503);
  }

  let payload: { to?: string; subject?: string; senderName?: string; body?: string; note?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request body.", code: "INVALID_BODY" }, 400);
  }

  const to = (payload.to || "").trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return json({ error: "A valid recipient email address is required.", code: "INVALID_EMAIL" }, 400);
  }

  const subject = payload.subject || "No subject";
  const senderName = payload.senderName || "Unknown";
  const body = payload.body || "";
  const note = payload.note || "";

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  try {
    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from: `Oceans <noreply@${fromDomain}>`,
      to,
      subject: `Fwd: ${subject}`,
      html: `
        <div style="max-width:520px;margin:0 auto;padding:28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;">
          ${
            note
              ? `<div style="background:#f4f4f2;border-left:3px solid #0d5959;padding:12px 16px;border-radius:6px;margin-bottom:20px;font-size:14px;line-height:1.5;color:#333;">${esc(note)}</div>`
              : ""
          }
          <div style="background:#ffffff;border:1px solid #e8e5df;border-radius:10px;padding:24px;">
            <p style="font-size:12px;color:#999;margin:0 0 8px;">Forwarded message — from ${esc(senderName)}</p>
            <h2 style="font-size:16px;font-weight:600;color:#1a1a2e;margin:0 0 12px;">${esc(subject)}</h2>
            <div style="font-size:14px;line-height:1.6;color:#444;white-space:pre-wrap;">${esc(body)}</div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend send failed:", error);
      return json({
        error: "Failed to forward email via Resend. Please verify your sending domain.",
        code: "RESEND_SEND_FAILED",
      }, 502);
    }

    return json({ success: true, id: data?.id ?? null }, 200);
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({
      error: "Something went wrong while forwarding. Please try again.",
      code: "UNEXPECTED",
    }, 500);
  }
});
