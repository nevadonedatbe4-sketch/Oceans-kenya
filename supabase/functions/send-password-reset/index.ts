import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

  let payload: { email?: string; diagnostic?: boolean } = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  // ---- DIAGNOSTIC MODE: report configuration without sending ----
  if (payload.diagnostic === true) {
    return json({
      diagnostic: true,
      resendApiKeyConfigured: Boolean(resendApiKey),
      resendFromDomainConfigured: Boolean(fromDomain),
      supabaseUrlConfigured: Boolean(Deno.env.get("SUPABASE_URL")),
      serviceRoleConfigured: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
    }, 200);
  }

  // ---- LOUD CONFIG CHECK: fail immediately with a clear message ----
  const missing: string[] = [];
  if (!resendApiKey) missing.push("RESEND_API_KEY");
  if (!fromDomain) missing.push("RESEND_FROM_DOMAIN");
  if (missing.length > 0) {
    console.error("Missing Resend configuration:", missing.join(", "));
    return json({
      error: `Email service is not configured. Missing secret(s): ${missing.join(", ")}. ` +
        `An administrator must add these in the Supabase Dashboard under Edge Function Secrets.`,
      code: "RESEND_NOT_CONFIGURED",
      missing,
    }, 503);
  }

  const email = (payload.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return json({ error: "A valid email address is required.", code: "INVALID_EMAIL" }, 400);
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const origin = req.headers.get("origin") || "https://oceans.co.ke";
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/crm/update-password` },
    });

    if (linkError) {
      console.error("generateLink failed:", linkError);
      return json({
        error: "Unable to generate reset link. Please try again.",
        code: "GENERATE_LINK_FAILED",
        detail: linkError.message,
      }, 500);
    }

    const recoveryLink = linkData.properties?.action_link;
    if (!recoveryLink) {
      return json({ error: "Unable to generate reset link.", code: "NO_LINK" }, 500);
    }

    const resend = new Resend(resendApiKey);
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: `Oceans <noreply@${fromDomain}>`,
      to: email,
      subject: "Reset your Oceans password",
      html: `
        <div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;">
          <div style="text-align:center;margin-bottom:28px;">
            <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0;">Oceans</h1>
          </div>
          <div style="background:#ffffff;border:1px solid #e8e5df;border-radius:10px;padding:32px 28px;">
            <h2 style="font-size:17px;font-weight:600;color:#1a1a2e;margin:0 0 12px;">Reset your password</h2>
            <p style="font-size:14px;line-height:1.6;color:#555;margin:0 0 24px;">
              Someone requested a password reset for your Oceans account. Click the button below to set a new password. This link expires in 60 minutes.
            </p>
            <a href="${recoveryLink}" style="display:block;width:100%;background:#1a1a2e;color:#ffffff;text-align:center;padding:14px 0;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:24px;">
              Reset my password
            </a>
            <p style="font-size:12px;line-height:1.5;color:#999;margin:0 0 8px;">
              If you didn't request this, you can safely ignore this email.
            </p>
            <p style="font-size:12px;line-height:1.5;color:#bbb;margin:0;">
              Button not working? Copy this link:<br/>
              <a href="${recoveryLink}" style="color:#999;word-break:break-all;">${recoveryLink}</a>
            </p>
          </div>
        </div>
      `,
    });

    if (sendError) {
      console.error("Resend send failed:", sendError);
      return json({
        error: "Failed to send email via Resend. Please verify your sending domain.",
        code: "RESEND_SEND_FAILED",
        detail: typeof sendError === "object" ? JSON.stringify(sendError) : String(sendError),
      }, 502);
    }

    return json({ success: true, id: sendData?.id ?? null }, 200);
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({
      error: "Something went wrong. Please try again.",
      code: "UNEXPECTED",
      detail: err instanceof Error ? err.message : String(err),
    }, 500);
  }
});