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

  let payload: { token?: string; new_password?: string; validate?: boolean } = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const token = (payload.token || "").trim();
  const invalidMsg = "This password reset link is invalid or has expired. Please request a new one.";

  if (!token) {
    return json({ error: invalidMsg, code: "INVALID_TOKEN", valid: false }, 400);
  }

  const tokenHash = await hashToken(token);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Find the token by its hash. Only the hash is stored — never the raw token.
  const { data: record, error: findErr } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("id, user_id, used_at, revoked_at, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  const isValid =
    !findErr &&
    !!record &&
    record.used_at === null &&
    record.revoked_at === null &&
    new Date(record.expires_at).getTime() > Date.now();

  // ── VALIDATE-ONLY (page opens): report validity without consuming. ──
  if (payload.validate === true) {
    if (!isValid) {
      if (record && !findErr) {
        const status = record.used_at ? "reused" : record.revoked_at ? "revoked" : "expired";
        await logSecurityEvent(supabaseAdmin, record.user_id, `password_reset_token_${status}`, {});
      }
      return json({ error: invalidMsg, code: "INVALID_TOKEN", valid: false }, 400);
    }
    // Return authoritative role so the reset page can route to the right portal.
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", record.user_id)
      .maybeSingle();
    return json({ valid: true, role: prof?.role || "agent" }, 200);
  }

  // ── ACTUAL RESET ──
  const newPassword = payload.new_password || "";
  if (!isValid) {
    if (record && !findErr) {
      const status = record.used_at ? "reused" : record.revoked_at ? "revoked" : "expired";
      await logSecurityEvent(supabaseAdmin, record.user_id, `password_reset_token_${status}`, {});
    }
    return json({ error: invalidMsg, code: "INVALID_TOKEN", valid: false }, 400);
  }

  if (newPassword.length < 8) {
    await logSecurityEvent(supabaseAdmin, record.user_id, "password_reset_weak_attempt", {});
    return json({ error: "Password must be at least 8 characters.", code: "WEAK_PASSWORD" }, 400);
  }

  // ── Atomic one-time consumption: mark used only if still unused. ──
  const { data: consumed, error: consumeErr } = await supabaseAdmin
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", record.id)
    .is("used_at", null)
    .select("id");

  if (consumeErr || !consumed || consumed.length === 0) {
    // Lost the race — the token was already used by a concurrent request.
    await logSecurityEvent(supabaseAdmin, record.user_id, "password_reset_token_reused", {});
    return json({ error: invalidMsg, code: "INVALID_TOKEN", valid: false }, 400);
  }

  // ── Update the password server-side (never client-side). ──
  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(record.user_id, {
    password: newPassword,
  });

  if (updateErr) {
    console.error("password update failed:", updateErr);
    await logSecurityEvent(supabaseAdmin, record.user_id, "password_change_failed", {});
    return json({ error: "Something went wrong. Please request a new reset link.", code: "UPDATE_FAILED" }, 500);
  }

  // ── Revoke existing sessions so a stored/stolen session can't survive. ──
  try {
    await supabaseAdmin.auth.admin.signOut(record.user_id, "global");
    await logSecurityEvent(supabaseAdmin, record.user_id, "password_reset_sessions_revoked", {});
  } catch (e) {
    console.error("session revocation failed:", e);
  }

  await logSecurityEvent(supabaseAdmin, record.user_id, "password_changed", {});

  // Authoritative role for correct post-reset redirect.
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", record.user_id)
    .maybeSingle();

  return json({ success: true, role: prof?.role || "agent" }, 200);
});
