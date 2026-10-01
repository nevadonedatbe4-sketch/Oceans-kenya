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

    const { name } = await req.json();

    // SECURITY: role is ALWAYS forced to 'agent' and status to 'pending'.
    // Client can never self-select admin/super_admin or self-approve.
    const userId = user.id;
    const userEmail = user.email || "";
    const displayName = name || userEmail.split("@")[0] || "User";

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: userId,
        email: userEmail,
        name: displayName,
        role: "agent",
        status: "pending",
      }, { onConflict: "user_id" });

    if (profileError) {
      return new Response(JSON.stringify({ error: "Failed to create profile: " + profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingAgent } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingAgent) {
      await supabaseAdmin
        .from("agents")
        .upsert({
          user_id: userId,
          name: displayName,
          email: userEmail,
          title: "Agent",
          is_active: true,
        }, { onConflict: "user_id" });
    }

    // Welcome email — sent through the central template engine so it is branded,
    // logged in the delivery log, and editable in Email Management.
    // Fire-and-forget: a mail problem must never fail a completed signup.
    if (userEmail) {
      try {
        const origin = (req.headers.get("origin") || "https://oceanske.com").replace(/\/$/, "");
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-templated-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            to: userEmail,
            template_key: "welcome",
            variables: {
              recipient_name: displayName,
              property_url: origin,
            },
            related_type: "account",
            related_id: userId,
          }),
        });
        if (!res.ok) console.error("welcome email failed:", res.status, await res.text());
      } catch (e) {
        console.error("welcome email error:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, role: "agent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
