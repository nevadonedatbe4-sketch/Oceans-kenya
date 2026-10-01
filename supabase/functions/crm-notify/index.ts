import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Map a CRM event to the editable template key it should send through. */
const TEMPLATE_FOR_EVENT: Record<string, string> = {
  new_lead: "new_lead",
  new_message: "new_message",
  deal_created: "deal_created",
  deal_status: "deal_status_update",
  lead_assigned: "agent_assignment",
};

const DEAL_STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  negotiation: "Negotiation",
  offer: "Offer",
  due_diligence: "Due Diligence",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

interface Recipient {
  email: string;
  name: string;
}

/**
 * CRM notification router.
 *
 * Receives a business event, resolves who should be told, and sends the
 * matching template through the central `send-templated-email` engine so the
 * email is branded, logged and editable in Email Management.
 *
 * Events:
 *   new_lead      → assigned agent (or the admin team if unassigned)
 *   new_message   → assigned agent (or the admin team) when a client writes in
 *   deal_created  → the deal's agent
 *   deal_status   → the deal's agent
 *   lead_assigned → the agent the lead was assigned to
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const event = String(body.event || "");
  const templateKey = TEMPLATE_FOR_EVENT[event];
  if (!templateKey) {
    return json({ error: `Unknown event "${event}".`, code: "UNKNOWN_EVENT" }, 400);
  }

  let agentId: string | null = (body.agent_id as string) || null;
  let dealTitle = (body.deal_title as string) || "";
  let dealPrice = body.property_price != null ? String(body.property_price) : "";
  let dealStage = (body.deal_status as string) || "";
  let dealReference = (body.deal_reference as string) || "";
  let leadName = (body.lead_name as string) || "";
  let messagePreview = (body.message_preview as string) || "";
  const propertyTitle = (body.property_title as string) || "";
  const propertyLocation = (body.property_location as string) || "";
  const propertyUrl = (body.property_url as string) || "";

  // ── Hydrate from the record itself so the caller only needs to pass ids.
  if (body.deal_id) {
    const { data: deal } = await admin
      .from("deals")
      .select("title, price, agent_id, status")
      .eq("id", body.deal_id)
      .maybeSingle();
    if (deal) {
      if (!agentId) agentId = deal.agent_id || null;
      if (!dealTitle) dealTitle = deal.title || "";
      if (!dealPrice && deal.price != null) dealPrice = String(deal.price);
      if (!dealStage && deal.status) dealStage = deal.status;
      if (!dealReference && deal.id) dealReference = `OC-${String(deal.id).replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    }
  }

  if (body.lead_id) {
    const { data: lead } = await admin
      .from("leads")
      .select("agent_id, message, first_name, last_name")
      .eq("id", body.lead_id)
      .maybeSingle();
    if (lead) {
      if (!agentId && lead.agent_id) agentId = lead.agent_id;
      if (!leadName) leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
      if (!messagePreview) messagePreview = lead.message || "";
    }
  }

  // ── Resolve recipients (RLS-independent, service role).
  const recipients: Recipient[] = [];
  let agentDisplayName = "";

  if (agentId) {
    const { data: agent } = await admin
      .from("agents")
      .select("name, email, user_id")
      .eq("id", agentId)
      .maybeSingle();
    agentDisplayName = agent?.name || "";
    let email = (agent?.email || "").trim().toLowerCase();
    let name = agent?.name || "";
    if (!email && agent?.user_id) {
      const { data: prof } = await admin
        .from("profiles")
        .select("email, name")
        .eq("user_id", agent.user_id)
        .maybeSingle();
      email = (prof?.email || "").trim().toLowerCase();
      name = name || prof?.name || "";
    }
    if (email) recipients.push({ email, name: name || "there" });
  }

  // A new (unassigned) lead or message should still reach the office team.
  if ((event === "new_lead" || event === "new_message") && recipients.length === 0) {
    const { data: admins } = await admin
      .from("profiles")
      .select("email, name, role")
      .in("role", ["admin", "super_admin"])
      .not("email", "is", null);
    (admins || []).forEach((a: { email: string | null; name: string | null }) => {
      const email = (a.email || "").trim().toLowerCase();
      if (email) recipients.push({ email, name: a.name || "there" });
    });
  }

  if (recipients.length === 0) {
    return json({ success: true, sent: 0, skipped: "no recipient resolved" }, 200);
  }

  const buildVariables = (recipient: Recipient): Record<string, string> => {
    // Note: agency_name / support_email are injected centrally by the engine —
    // never pass them here or they would override the live settings with blanks.
    if (event === "new_lead") {
      return {
        recipient_name: recipient.name,
        lead_name: leadName || propertyTitle || "A new enquirer",
        property_title: propertyTitle,
        property_location: propertyLocation,
        property_url: propertyUrl,
        agent_name: agentDisplayName,
      };
    }
    if (event === "new_message") {
      return {
        recipient_name: recipient.name,
        lead_name: leadName || propertyTitle || "A client",
        message_preview: messagePreview,
        property_title: propertyTitle,
        property_url: propertyUrl,
        agent_name: agentDisplayName,
      };
    }
    if (event === "deal_created") {
      return {
        recipient_name: recipient.name,
        deal_reference: dealReference,
        property_title: dealTitle,
        property_price: dealPrice,
        property_url: propertyUrl,
        agent_name: agentDisplayName,
      };
    }
    if (event === "deal_status") {
      return {
        recipient_name: recipient.name,
        deal_reference: dealReference,
        deal_status: DEAL_STAGE_LABELS[dealStage] || dealStage,
        property_title: dealTitle,
        property_url: propertyUrl,
        agent_name: agentDisplayName,
      };
    }
    // lead_assigned
    return {
      recipient_name: recipient.name,
      agent_name: agentDisplayName,
      lead_name: leadName,
      property_title: propertyTitle,
      property_url: propertyUrl,
    };
  };

  const relatedType = event.startsWith("deal") ? "deal" : "lead";
  const relatedId = (body.deal_id as string) || (body.lead_id as string) || null;

  let sent = 0;
  for (const recipient of recipients) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-templated-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRole}`,
        },
        body: JSON.stringify({
          to: recipient.email,
          template_key: templateKey,
          variables: buildVariables(recipient),
          related_type: relatedType,
          related_id: relatedId,
        }),
      });
      if (res.ok) sent += 1;
      else console.error(`crm-notify send failed (${event}):`, res.status, await res.text());
    } catch (e) {
      console.error(`crm-notify send error (${event}):`, e);
    }
  }

  return json({ success: true, event, sent }, 200);
});
