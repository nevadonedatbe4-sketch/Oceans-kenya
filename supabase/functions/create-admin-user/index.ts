import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireAdmin, canGrantRole, serviceClient } from "../_shared/auth.ts";

// Restrict CORS to known origins. "*" would let any website drive this
// privileged endpoint from a victim's authenticated browser.
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

serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const json = (body: Record<string, unknown>, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const supabaseAdmin = serviceClient();

  // The caller must be an authenticated admin. Without this, the function was
  // an unauthenticated admin-account factory (audit finding C-3).
  const auth = await requireAdmin(req, supabaseAdmin, cors);
  if ("error" in auth) return auth.error;

  try {
    const { email, password, name, role } = await req.json();

    if (!email || !password) {
      return json({ error: "Email and password required" }, 400);
    }
    if (typeof password !== "string" || password.length < 12) {
      return json({ error: "Password must be at least 12 characters." }, 400);
    }

    // The role comes from the client, so it must be one this caller is
    // allowed to grant. An admin cannot mint another admin; only a
    // super_admin can. Never trust the requested role blindly.
    const requestedRole = role || "agent";
    if (!canGrantRole(auth.caller.role, requestedRole)) {
      return json({ error: `You are not permitted to create a '${requestedRole}' account.` }, 403);
    }

    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || email.split("@")[0], role: requestedRole },
    });

    if (createError) return json({ error: createError.message }, 400);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: authUser.user.id,
        email,
        name: name || email.split("@")[0],
        role: requestedRole,
        status: "active",
      });

    if (profileError) return json({ error: profileError.message }, 400);

    return json({ success: true, user_id: authUser.user.id, message: "User created successfully" }, 200);
  } catch (_e) {
    // Do not leak internal error detail to the client.
    console.error("create-admin-user failed:", _e);
    return json({ error: "Internal error creating user." }, 500);
  }
});
