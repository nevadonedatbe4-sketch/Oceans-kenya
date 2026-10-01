import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const MAX_REQUESTS_PER_WINDOW = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const TOKEN_TTL_MS = 20 * 60 * 1000; // 20 minutes

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function logSecurityEvent(supabaseAdmin: any, userId: string, action: string, meta: Record<string, unknown>) {
  try {
    await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      user_name: "system",
      action,
      module: "auth_security",
      metadata: meta,
    });
  } catch (e) {
    console.error("audit log failed:", e);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: { email?: string } = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const email = (payload.email || "").trim().toLowerCase();
  const genericMessage = "If an account exists for this email, a password reset link has been sent.";

  // Always respond identically regardless of whether the account exists —
  // protects against account enumeration on the forgot-password endpoint.
  if (!email || !email.includes("@")) {
    return json({ success: true, message: genericMessage }, 200);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── Rate limit: max N requests per IP within the window, plus a per-account
    // guard below. Prevents the endpoint from being used as an email-spam blast.
    const { count } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("id", { count: "exact", head: true })
      .eq("requested_ip", ip)
      .gte("created_at", new Date(Date.now() - WINDOW_MS).toISOString());

    if ((count ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
      return json({ success: true, message: genericMessage }, 200);
    }

    // Look up the account registered to this email, server-side + authoritative.
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, name, role, status")
      .eq("email", email)
      .maybeSingle();

    if (profileErr) {
      console.error("profile lookup failed:", profileErr);
      return json({ success: true, message: genericMessage }, 200);
    }

    // No account ⇒ generic success, no token created, no email sent.
    if (!profile) {
      return json({ success: true, message: genericMessage }, 200);
    }

    // Reuse-rate guard: don't issue a new token if a still-valid one exists.
    const { data: existing } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("id, used_at, revoked_at, expires_at")
      .eq("user_id", profile.user_id)
      .is("used_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // A valid token already exists — do not mint a new one; just re-send policy
      // keeps single-use semantics intact. We still return generic success.
      return json({ success: true, message: genericMessage }, 200);
    }

    // ── Generate a cryptographically secure one-time token; store only its hash.
    const token = generateToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

    const { error: insertErr } = await supabaseAdmin
      .from("password_reset_tokens")
      .insert({
        user_id: profile.user_id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        requested_ip: ip,
        requested_user_agent: userAgent.slice(0, 300),
      });

    if (insertErr) {
      console.error("token insert failed:", insertErr);
      return json({ success: true, message: genericMessage }, 200);
    }

    await logSecurityEvent(supabaseAdmin, profile.user_id, "password_reset_requested", { email });

    // Send through the central template engine so Email Management edits, the
    // Oceans-branded shell, central sender config and the delivery log all apply
    // here too. The generic response never changes, but every real outcome is
    // still recorded in the audit log so a missing send is always diagnosable.
    const origin = (req.headers.get("origin") || "https://oceans.co.ke").replace(/\/$/, "");
    const resetLink = `${origin}/reset-password?token=${token}`;

    try {
      const sendRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-templated-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          to: email,
          template_key: "password_reset",
          variables: {
            recipient_name: profile.name || email,
            reset_link: resetLink,
          },
          related_type: "password_reset",
          related_id: profile.user_id,
        }),
      });
      const sendResult = await sendRes.json().catch(() => null);

      if (sendRes.ok && sendResult?.status === "sent") {
        await logSecurityEvent(supabaseAdmin, profile.user_id, "password_reset_email_sent", { email });
      } else if (sendResult?.code === "EMAIL_NOT_CONFIGURED" || sendResult?.code === "EMAIL_DISABLED") {
        await logSecurityEvent(supabaseAdmin, profile.user_id, "password_reset_email_skipped", {
          reason: sendResult?.code || "not_configured",
          detail: sendResult?.error || null,
        });
      } else {
        await logSecurityEvent(supabaseAdmin, profile.user_id, "password_reset_email_failed", {
          email,
          detail: sendResult?.error || `send-templated-email returned ${sendRes.status}`,
        });
      }
    } catch (sendErr) {
      console.error("reset email dispatch failed:", sendErr);
      await logSecurityEvent(supabaseAdmin, profile.user_id, "password_reset_email_failed", {
        email,
        detail: sendErr instanceof Error ? sendErr.message : String(sendErr),
      });
    }

    return json({ success: true, message: genericMessage }, 200);
  } catch (err) {
    console.error("password reset request error:", err);
    return json({ success: true, message: genericMessage }, 200);
  }
});
