import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
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

  try {
    const { email, password, name, role } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), { status: 400 });
    }

    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || email.split("@")[0], role: role || "admin" },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: authUser.user.id,
        email: email,
        name: name || email.split("@")[0],
        role: role || "admin",
        status: "active",
      });

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400 });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: authUser.user.id, message: "User created successfully" }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
