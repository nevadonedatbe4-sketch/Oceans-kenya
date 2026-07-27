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

    const { email, name, role, title, phone, bio, photo_url } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const displayName = name || email.split("@")[0];
    const userRole = role || "agent";

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
