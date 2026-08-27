import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireAdmin, canGrantRole, serviceClient } from "../_shared/auth.ts";

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

  const json = (body: Record<string, unknown>, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const supabaseAdmin = serviceClient();

    // Only an authenticated admin may invite users. Previously this function
    // had no caller check and trusted a client-supplied role, so anyone could
    // POST {role:"super_admin"} and mint an admin (audit finding, same class
    // as C-3).
    const auth = await requireAdmin(req, supabaseAdmin, cors);
    if ("error" in auth) return auth.error;

    const { email, name, role, title, phone, bio, photo_url } = await req.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "A valid email is required" }, 400);
    }

    const displayName = name || email.split("@")[0];
    const userRole = role || "agent";
    if (!canGrantRole(auth.caller.role, userRole)) {
      return json({ error: `You are not permitted to grant the '${userRole}' role.` }, 403);
    }

    // Create auth user with a throwaway password; they set their own via the
    // Forgot Password flow. Full UUID for entropy.
    const tempPassword = crypto.randomUUID() + "Aa1!";
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: displayName, role: userRole },
    });

    if (createError) {
      if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
        return json({ error: "A user with this email already exists" }, 409);
      }
      return json({ error: createError.message }, 400);
    }

    const userId = authUser.user.id;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: userId, email, name: displayName, role: userRole, status: "active" }, { onConflict: "user_id" });

    if (profileError) return json({ error: "Failed to create profile: " + profileError.message }, 400);

    if (userRole === "agent") {
      const { error: agentError } = await supabaseAdmin
        .from("agents")
        .upsert({
          user_id: userId,
          name: displayName,
          email,
          title: title || "Agent",
          phone: phone || null,
          bio: bio || null,
          photo_url: photo_url || null,
          is_active: true,
        }, { onConflict: "user_id" });

      if (agentError) return json({ error: "Failed to create agent record: " + agentError.message }, 400);
    }

    return json({
      success: true,
      user_id: userId,
      email,
      role: userRole,
      message: "User created successfully. They can sign in at /crm/login and use Forgot Password to set their password.",
    }, 200);
  } catch (_e) {
    console.error("invite-user failed:", _e);
    return json({ error: "Internal error inviting user." }, 500);
  }
});
