import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info, svix-id, svix-timestamp, svix-signature",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Map a Resend event type to the status we store on the log row. */
const STATUS_FOR_EVENT: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.complained": "complained",
  "email.bounced": "bounced",
  "email.failed": "failed",
  "email.opened": "opened",
  "email.clicked": "clicked",
};

const HARD_FAILURES = ["bounced", "complained", "failed"];

/**
 * Decide the new status without letting engagement or softer events overwrite a
 * hard failure, and without letting "opened/clicked" hide a clean delivery.
 */
function resolveStatus(current: string | null, incoming: string): string {
  const cur = (current || "").toLowerCase();
  if (HARD_FAILURES.includes(incoming)) return incoming;
  if (HARD_FAILURES.includes(cur)) return cur;
  if (incoming === "opened" || incoming === "clicked") return cur || "sent";
  const order: Record<string, number> = { queued: 0, sent: 1, delayed: 1, delivered: 2 };
  return (order[incoming] ?? 0) >= (order[cur] ?? -1) ? incoming : cur;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(buf: ArrayBuffer): string {
  const arr = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

/** Verify the Svix signature Resend sends. Returns false on any problem. */
async function verifySvix(secret: string, headers: Headers, rawBody: string): Promise<boolean> {
  try {
    const id = headers.get("svix-id");
    const timestamp = headers.get("svix-timestamp");
    const signatureHeader = headers.get("svix-signature");
    if (!id || !timestamp || !signatureHeader) return false;

    // Reject stale deliveries (5-minute tolerance) to blunt replay attacks.
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

    const keyB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const key = await crypto.subtle.importKey(
      "raw",
      base64ToBytes(keyB64),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signed = `${id}.${timestamp}.${rawBody}`;
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
    const expected = bytesToBase64(sig);

    return signatureHeader.split(" ").some((part) => {
      const value = part.includes(",") ? part.split(",")[1] : part;
      return value === expected;
    });
  } catch (e) {
    console.error("svix verify error:", e);
    return false;
  }
}

/**
 * Resend delivery-tracking webhook.
 *
 * Resend POSTs an event here whenever a message is delivered, bounces, is
 * marked as spam, etc. We match the provider message id against email_log and
 * move the row from "sent" to its real outcome. If RESEND_WEBHOOK_SECRET is set
 * the signature is verified; otherwise the request is accepted (the endpoint
 * slug is unguessable, but setting the secret is strongly recommended).
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const rawBody = await req.text();

  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (webhookSecret) {
    const valid = await verifySvix(webhookSecret, req.headers, rawBody);
    if (!valid) return json({ error: "Invalid signature" }, 401);
  }

  let event: {
    type?: string;
    data?: {
      email_id?: string;
      id?: string;
      bounce?: { message?: string; description?: string };
      failed?: { reason?: string };
    };
  } | null = null;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const type = String(event?.type || "");
  const emailId = event?.data?.email_id || event?.data?.id || null;
  if (!emailId) return json({ received: true, skipped: "no email id in payload" }, 200);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: rows } = await supabaseAdmin
    .from("email_log")
    .select("id, status, metadata")
    .eq("provider_message_id", emailId)
    .limit(1);

  const row = rows && rows[0];
  if (!row) return json({ received: true, matched: 0 }, 200);

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { last_event: type, updated_at: now };

  const incoming = STATUS_FOR_EVENT[type];
  if (incoming) update.status = resolveStatus(row.status, incoming);

  if (type === "email.delivered") update.delivered_at = now;
  if (type === "email.bounced") {
    update.bounced_at = now;
    update.error = event?.data?.bounce?.message || event?.data?.bounce?.description || "The address bounced.";
  }
  if (type === "email.failed") {
    update.error = event?.data?.failed?.reason || "The provider reported a delivery failure.";
  }
  if (type === "email.complained") {
    update.error = "The recipient marked this email as spam.";
  }

  if (type === "email.opened" || type === "email.clicked") {
    const meta = (row.metadata && typeof row.metadata === "object")
      ? { ...(row.metadata as Record<string, unknown>) }
      : {};
    const key = type === "email.opened" ? "opened_count" : "clicked_count";
    meta[key] = (Number(meta[key]) || 0) + 1;
    meta.last_event_type = type;
    update.metadata = meta;
  }

  try {
    const { error } = await supabaseAdmin.from("email_log").update(update).eq("id", row.id);
    if (error) return json({ received: true, error: error.message }, 200);
  } catch (e) {
    console.error("email_log update failed:", e);
  }

  return json({ received: true, matched: 1, event: type, status: update.status ?? row.status }, 200);
});
