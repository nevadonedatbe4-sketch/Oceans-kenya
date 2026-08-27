import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serviceClient } from "../_shared/auth.ts";

const ALLOWED_ORIGINS = [
  "https://oceans-kenya.vercel.app",
  "https://oceanske.com",
  "https://www.oceanske.com",
  "http://localhost:3000",
];

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

// The lowest-privilege role. Self-service profile completion may NEVER grant
// anything above this. Elevated roles are assigned only by an admin through
// invite-user / create-admin-user, which check the caller's own role.
const DEFAULT_ROLE = "agent";

serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const json = (body: Record<string, unknown>, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const supabaseAdmin = serviceClient();

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Not authenticated" }, 401);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return json({ error: "Invalid token" }, 401);

    // Intentionally ignore any client-supplied `role`. A user completing their
    // own signup cannot choose their privilege level (audit finding C-2).
    const { name } = await req.json().catch(() => ({}));
    const displayName = name || user.email?.split("@")[0] || "User";
    const userEmail = user.email || "";

    // Never overwrite an existing role: if a profile already exists (e.g. an
    // admin pre-provisioned this account), leave its role untouched.
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = existing?.role || DEFAULT_ROLE;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: user.id, email: userEmail, name: displayName, role, status: "active" }, { onConflict: "user_id" });

    if (profileError) return json({ error: "Failed to create profile: " + profileError.message }, 400);

    if (role === "agent") {
      const { data: existingAgent } = await supabaseAdmin
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingAgent) {
        await supabaseAdmin
          .from("agents")
          .upsert({ user_id: user.id, name: displayName, email: userEmail, title: "Agent", is_active: true }, { onConflict: "user_id" });
      }
    }

    return json({ success: true, user_id: user.id, role }, 200);
  } catch (_e) {
    console.error("signup-complete failed:", _e);
    return json({ error: "Internal error." }, 500);
  }
});
