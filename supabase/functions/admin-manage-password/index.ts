import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ADMIN_ROLES = ["admin", "super_admin"];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return json({ error: "Not authenticated." }, 401);

    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    const caller = callerData?.user;
    if (callerErr || !caller) return json({ error: "Not authenticated." }, 401);

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, status, name, email")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!callerProfile || !ADMIN_ROLES.includes(callerProfile.role)) {
      return json({ error: "You do not have permission to manage passwords." }, 403);
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const action = String(body.action || "");
    const targetUserId = String(body.user_id || "");
    if (!targetUserId) return json({ error: "A target user is required." }, 400);

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id, email, role, status, name")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!target) return json({ error: "User not found." }, 404);

    const callerIsSuper = callerProfile.role === "super_admin";
    const targetIsPrivileged = ADMIN_ROLES.includes(target.role);
    if (targetIsPrivileged && !callerIsSuper) {
      return json({ error: "Only a Super Admin can manage administrator accounts." }, 403);
    }
    if (targetUserId === caller.id && action === "disable_account") {
      return json({ error: "You cannot disable your own account." }, 400);
    }

    const log = async (act: string, meta: Record<string, unknown> = {}) => {
      try {
        await supabaseAdmin.from("activity_logs").insert({
          user_id: caller.id,
          user_name: callerProfile.name || callerProfile.email || "admin",
          action: act,
          module: "auth_security",
          record_id: target.user_id,
          record_title: target.email,
          metadata: meta,
        });
      } catch (e) {
        console.error("audit log failed:", e);
      }
    };

    const safeSignOut = async () => {
      try {
        await supabaseAdmin.auth.admin.signOut(target.user_id, "global");
      } catch (e) {
        console.error("session revocation failed:", e);
      }
    };

    switch (action) {
      case "set_password": {
        const pw = String(body.new_password || "");
        if (pw.length < 8) {
          return json({ error: "Password must be at least 8 characters." }, 400);
        }
        const { error } = await supabaseAdmin.auth.admin.updateUserById(target.user_id, {
          password: pw,
        });
        if (error) {
          await log("admin_password_set_failed", { error: error.message });
          return json({ error: "Failed to set the password. Please try again." }, 500);
        }
        const revoke = body.revoke_sessions !== false;
        if (revoke) await safeSignOut();
        await log("admin_password_set", { revoked_sessions: revoke });
        return json({
          success: true,
          message: revoke
            ? "Password updated. The user can sign in with it now; all their other sessions were signed out."
            : "Password updated. The user can sign in with it now.",
        });
      }

      case "send_reset": {
        const origin = (req.headers.get("origin") || "https://oceans.co.ke").replace(/\/$/, "");
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email: target.email,
          options: { redirectTo: `${origin}/reset-password` },
        });
        if (linkErr || !linkData?.properties?.action_link) {
          await log("admin_reset_link_failed", { error: linkErr?.message });
          return json({ error: "Could not generate a reset link." }, 500);
        }
        const link = linkData.properties.action_link;

        const apiKey = Deno.env.get("RESEND_API_KEY");
        const fromDomain = Deno.env.get("RESEND_FROM_DOMAIN");
        if (!apiKey || !fromDomain) {
          await log("admin_reset_email_not_sent", { reason: "resend_not_configured" });
          return json({
            success: true,
            email_sent: false,
            message:
              "A reset link was generated, but email is not configured on the server, so nothing was sent. " +
              "Add RESEND_API_KEY and RESEND_FROM_DOMAIN in Supabase -> Edge Functions -> Secrets.",
          });
        }

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `Oceans <noreply@${fromDomain}>`,
              to: [target.email],
              subject: "Reset your Oceans password",
              html: `
                <div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;">
                  <h1 style="font-size:22px;font-weight:700;margin:0 0 20px;text-align:center;">Oceans</h1>
                  <div style="background:#fff;border:1px solid #e8e5df;border-radius:10px;padding:32px 28px;">
                    <h2 style="font-size:17px;font-weight:600;margin:0 0 12px;">Reset your password</h2>
                    <p style="font-size:14px;line-height:1.6;color:#555;margin:0 0 24px;">
                      An administrator requested a password reset for your Oceans account. Click below to choose a new password. This link expires in 60 minutes.
                    </p>
                    <a href="${link}" style="display:block;width:100%;background:#1a1a2e;color:#fff;text-align:center;padding:14px 0;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">Reset my password</a>
                    <p style="font-size:12px;color:#999;margin:20px 0 0;">If you didn't expect this, contact your administrator.</p>
                  </div>
                </div>`,
            }),
          });
          if (!res.ok) {
            const detail = await res.text();
            await log("admin_reset_email_failed", { status: res.status });
            return json({
              success: true,
              email_sent: false,
              message: `The email provider rejected the message (${res.status}). ${detail.slice(0, 200)}`,
            });
          }
          await log("admin_reset_email_sent", {});
          return json({ success: true, email_sent: true, message: `Reset link emailed to ${target.email}.` });
        } catch (e) {
          await log("admin_reset_email_failed", { error: e instanceof Error ? e.message : String(e) });
          return json({ success: true, email_sent: false, message: "Could not reach the email provider." });
        }
      }

      case "revoke_sessions": {
        await safeSignOut();
        await log("admin_sessions_revoked", {});
        return json({ success: true, message: "All active sessions have been signed out." });
      }

      case "disable_account": {
        await supabaseAdmin.from("profiles").update({ status: "suspended" }).eq("id", target.id);
        await safeSignOut();
        await log("admin_account_disabled", {});
        return json({ success: true, message: "Account disabled and all sessions signed out." });
      }

      case "enable_account": {
        await supabaseAdmin.from("profiles").update({ status: "active" }).eq("id", target.id);
        await log("admin_account_enabled", {});
        return json({ success: true, message: "Account re-activated." });
      }

      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (e) {
    console.error("admin-manage-password error:", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
