// Shared authorization guard for privileged edge functions.
//
// These functions run with the service-role key, which bypasses RLS entirely.
// A service-role function with no caller check is a public administrative
// endpoint: anyone who learns its URL can create users, escalate roles, or
// read/write any table. Every such function must therefore prove that the
// *caller* is an authenticated admin before doing privileged work.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const ADMIN_ROLES = ["admin", "super_admin"] as const;

export interface Caller {
  id: string;
  email: string;
  role: string;
}

// Roles a caller is allowed to grant. An admin may create agents/editors;
// only a super_admin may mint another admin/super_admin. Anything not listed
// is rejected, so a client cannot invent a role.
const GRANTABLE: Record<string, string[]> = {
  super_admin: ["agent", "editor", "admin", "super_admin"],
  admin: ["agent", "editor"],
};

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Resolve and authorize the caller from the request's Bearer token.
 * Returns the caller on success, or a ready-to-return Response on failure.
 * The role is read from the profiles table (the server-side source of truth),
 * never from the JWT's user_metadata, which the user can influence at signup.
 */
export async function requireAdmin(
  req: Request,
  admin: SupabaseClient,
  cors: Record<string, string>,
): Promise<{ caller: Caller } | { error: Response }> {
  const fail = (status: number, message: string) => ({
    error: new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    }),
  });

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return fail(401, "Authentication required.");

  const { data: { user }, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !user) return fail(401, "Invalid or expired session.");

  const { data: profile } = await admin
    .from("profiles")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || profile.status === "suspended") {
    return fail(403, "Account not active.");
  }
  if (!ADMIN_ROLES.includes(profile.role)) {
    return fail(403, "Administrator privileges required.");
  }

  return { caller: { id: user.id, email: user.email || "", role: profile.role } };
}

/**
 * Whether `callerRole` is permitted to grant `requestedRole`.
 * Callers must pass this before writing any role a client supplied.
 */
export function canGrantRole(callerRole: string, requestedRole: string): boolean {
  return (GRANTABLE[callerRole] || []).includes(requestedRole);
}
