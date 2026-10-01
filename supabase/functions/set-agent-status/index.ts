import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

const ALLOWED_STATUSES = ["active", "rejected", "suspended", "pending"];

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Send an account-lifecycle email through the central template engine so it is
 * branded, logged and editable in Email Management. Failures are swallowed
 * (logged only) — a notification problem must never break a status change.
 */
async function sendAccountEmail(
  supabaseUrl: string,
  serviceRole: string,
  templateKey: string,
  to: string,
  variables: Record<string, string>,
  relatedId?: string,
) {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-templated-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRole}`,
      },
      body: JSON.stringify({
        to,
        template_key: templateKey,
        variables,
        related_type: "account",
        related_id: relatedId || null,
      }),
    });
    if (!res.ok) console.error(`account email (${templateKey}) failed:`, res.status, await res.text());
  } catch (e) {
    console.error(`account email (${templateKey}) error:`, e);
  }
}

// Server-side authorization + status change for agent accounts.
// The browser NEVER decides whether the caller may act; this function derives
// the caller's role from the authenticated token and only permits
// admin / super_admin to change agent status. action is validated to a fixed
// allow-list so no arbitrary status or role mutation is possible.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Not authenticated" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return json({ error: "Invalid token" }, 401);
    }

    // Resolve caller role from profiles (authoritative).
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const callerRole = callerProfile?.role;
    if (callerRole !== "admin" && callerRole !== "super_admin") {
      return json({ error: "Forbidden" }, 403);
    }

    const { targetUserId, action } = await req.json();

    if (!targetUserId) {
      return json({ error: "targetUserId is required" }, 400);
    }

    // Never allow an admin to act on their own account via this agent workflow.
    if (targetUserId === user.id) {
      return json({ error: "You cannot manage your own account here" }, 400);
    }

    // Target account email/name — needed for every notification below.
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, name")
      .eq("user_id", targetUserId)
      .maybeSingle();

    // ── Resend verification: issue a fresh code and email it via the editable
    //    "Account Verification" template. Does not change account status.
    if (action === "resend_verification") {
      if (!targetProfile?.email) {
        return json({ error: "That account has no email on file." }, 400);
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: codeErr } = await supabaseAdmin
        .from("profiles")
        .update({ verification_code: code, verification_expires_at: expires })
        .eq("user_id", targetUserId);
      if (codeErr) {
        return json({ error: "Failed to issue a verification code: " + codeErr.message }, 400);
      }
      await sendAccountEmail(supabaseUrl, serviceRole, "account_verification", targetProfile.email, {
        recipient_name: targetProfile.name || "",
        verification_code: code,
      }, targetUserId);
      await supabaseAdmin.from("activity_logs").insert({
        module: "agents",
        action: "agent_resend_verification",
        actor_id: user.id,
        actor_email: user.email || null,
        user_name: null,
        record_id: targetUserId,
        result: "success",
      });
      return json({ success: true, action: "resend_verification" });
    }

    const map: Record<string, { status: string; isActive: boolean }> = {
      approve: { status: "active", isActive: true },
      reject: { status: "rejected", isActive: false },
      suspend: { status: "suspended", isActive: false },
      trigger_review: { status: "pending", isActive: true },
    };

    const target = map[action];
    if (!target) {
      return json({ error: "Invalid action" }, 400);
    }
    if (!ALLOWED_STATUSES.includes(target.status)) {
      return json({ error: "Status not permitted" }, 400);
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ status: target.status })
      .eq("user_id", targetUserId);

    if (profileError) {
      return json({ error: "Failed to update profile: " + profileError.message }, 400);
    }

    await supabaseAdmin
      .from("agents")
      .update({ is_active: target.isActive })
      .eq("user_id", targetUserId);

    // Notify the account holder where an editable template exists.
    if (targetProfile?.email) {
      if (action === "approve") {
        await sendAccountEmail(supabaseUrl, serviceRole, "account_activation", targetProfile.email, {
          recipient_name: targetProfile.name || "",
        }, targetUserId);
      } else if (action === "suspend") {
        await sendAccountEmail(supabaseUrl, serviceRole, "account_suspension", targetProfile.email, {
          recipient_name: targetProfile.name || "",
        }, targetUserId);
      }
    }

    // Audit trail.
    await supabaseAdmin.from("activity_logs").insert({
      module: "agents",
      action: `agent_${action}`,
      actor_id: user.id,
      actor_email: user.email || null,
      user_name: null,
      record_id: targetUserId,
      result: "success",
    });

    return json({ success: true, status: target.status });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
