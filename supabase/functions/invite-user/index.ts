import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // SECURITY: the caller must be an authenticated admin. Without this check
    // anyone who learns the URL could POST {role:"super_admin"} and mint an
    // administrator, since this function runs with the service-role key.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, status")
      .eq("user_id", caller.id)
      .maybeSingle();
    const callerRole = callerProfile?.role;
    if (callerProfile?.status === "suspended" || (callerRole !== "admin" && callerRole !== "super_admin")) {
      return new Response(JSON.stringify({ error: "Forbidden: administrator privileges required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, name, role, title, phone, bio, photo_url } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const displayName = name || email.split("@")[0];
    const userRole = role || "agent";

    // SECURITY: never trust the requested role blindly. An admin may create
    // agents/editors; only a super_admin may create another admin/super_admin.
    const grantable = callerRole === "super_admin"
      ? ["agent", "editor", "admin", "super_admin"]
      : ["agent", "editor"];
    if (!grantable.includes(userRole)) {
      return new Response(JSON.stringify({ error: `You are not permitted to grant the '${userRole}' role.` }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Create auth user with email auto-confirmed
    const tempPassword = crypto.randomUUID().substring(0, 16) + "Aa1!";
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: displayName, role: userRole },
    });

    if (createError) {
      if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
        return new Response(JSON.stringify({ error: "A user with this email already exists" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.user.id;

    // Step 2: Create profile record
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: userId,
        email: email,
        name: displayName,
        role: userRole,
        status: "active",
      }, { onConflict: "user_id" });

    if (profileError) {
      return new Response(JSON.stringify({ error: "Failed to create profile: " + profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: If role is agent, create agent record
    if (userRole === "agent") {
      const { error: agentError } = await supabaseAdmin
        .from("agents")
        .upsert({
          user_id: userId,
          name: displayName,
          email: email,
          title: title || "Agent",
          phone: phone || null,
          bio: bio || null,
          photo_url: photo_url || null,
          is_active: true,
        }, { onConflict: "user_id" });

      if (agentError) {
        return new Response(JSON.stringify({ error: "Failed to create agent record: " + agentError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Step 4: Send the team invitation through the central template engine so it
    // is branded, logged in the delivery log, and editable in Email Management.
    // Fire-and-forget: a mail problem must never fail an account that was created.
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
            property_url: `${origin}/crm/login`,
          },
          related_type: "account",
          related_id: userId,
        }),
      });
      if (!res.ok) console.error("team invitation email failed:", res.status, await res.text());
    } catch (e) {
      console.error("team invitation email error:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: email,
        role: userRole,
        message: "User created successfully. They can sign in at /crm/login and use Forgot Password to set their password.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
