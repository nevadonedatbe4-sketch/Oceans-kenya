import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }

    // Only an existing SUPER ADMIN may create administrative accounts.
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (callerProfile?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin required" }), { status: 403, headers: corsHeaders });
    }

    const { email, password, name, role } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), { status: 400, headers: corsHeaders });
    }
    // Only admin / super_admin may be created, never agent — and never elevated past super_admin.
    const userRole = role === "super_admin" ? "super_admin" : "admin";
    const displayName = name || email.split("@")[0];

    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: displayName },
    });
    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders });
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: authUser.user.id,
        email: email,
        name: displayName,
        role: userRole,
        status: "active",
      }, { onConflict: "user_id" });
    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: corsHeaders });
    }

    // Send the team invitation through the central template engine so it is
    // branded, logged in the delivery log, and editable in Email Management.
    // Fire-and-forget: a mail problem must never fail a created account.
    try {
      const origin = (req.headers.get("origin") || "https://oceanske.com").replace(/\/$/, "");
      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-templated-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          to: email,
          template_key: "team_invitation",
          variables: {
            recipient_name: displayName,
            property_url: `${origin}/admin/login`,
          },
          related_type: "account",
          related_id: authUser.user.id,
        }),
      });
      if (!res.ok) console.error("team invitation email failed:", res.status, await res.text());
    } catch (e) {
      console.error("team invitation email error:", e);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: authUser.user.id, role: userRole, message: "User created successfully" }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
