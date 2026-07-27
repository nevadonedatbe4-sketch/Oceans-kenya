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
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get the authenticated user from the JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, role } = await req.json();
    const displayName = name || user.email?.split("@")[0] || "User";
    const userRole = role || "agent";
    const userEmail = user.email || "";

    // Always upsert the profile to ensure role is set correctly
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: user.id,
        email: userEmail,
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

    // If role is agent, also create agent record
    if (userRole === "agent") {
      const { data: existingAgent } = await supabaseAdmin
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingAgent) {
        await supabaseAdmin
          .from("agents")
          .upsert({
            user_id: user.id,
            name: displayName,
            email: userEmail,
            title: "Agent",
            is_active: true,
          }, { onConflict: "user_id" });
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: user.id, role: userRole }),
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
