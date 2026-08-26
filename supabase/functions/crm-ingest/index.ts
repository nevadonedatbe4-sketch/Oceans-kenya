import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

interface EnquiryPayload {
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  message?: string;
  subject?: string;
  type?: string;
  tags?: string[];
  source?: string;
  form_name?: string;
  source_url?: string;
  listing_id?: string;
  property_title?: string;
  notes?: string;
  submission_type?: string;
  land_location?: string;
  land_size?: string;
  title_status?: string;
  preferred_structure?: string;
  budget_range?: string;
  preferred_location?: string;
  preferred_use?: string;
  timeline?: string;
}

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

// contacts.type CHECK constraint allows only these values:
// client | landlord | buyer | seller | vendor | partner
function normalizeContactType(type: string): string {
  const t = (type || "client").toLowerCase().trim();
  if (t.includes("landlord") || t.includes("let") || t.includes("landowner") || t.includes("owner")) return "landlord";
  if (t.includes("sell")) return "seller";
  if (t.includes("buy")) return "buyer";
  if (t.includes("vendor")) return "vendor";
  if (t.includes("partner") || t.includes("joint") || t.includes("invest")) return "partner";
  return "client";
}

// leads.source CHECK constraint allows only these values:
// website | referral | social | walk_in | phone | email
function normalizeLeadSource(source: string): string {
  const s = (source || "website").toLowerCase().trim();
  if (s.includes("referral") || s.includes("recommend")) return "referral";
  if (s.includes("social") || s.includes("facebook") || s.includes("instagram") || s.includes("twitter") || s.includes("linkedin") || s.includes("tiktok") || s.includes("whatsapp")) return "social";
  if (s.includes("walk") || s.includes("in person") || s.includes("in_person") || s.includes("office") || s.includes("viewing")) return "walk_in";
  if (s.includes("phone") || s.includes("call") || s.includes("tel")) return "phone";
  if (s.includes("email") || s.includes("mail")) return "email";
  return "website";
}

const FIELD_LABELS: Record<string, string> = {
  submission_type: "Submission type",
  land_location: "Land location",
  land_size: "Land size",
  title_status: "Title status",
  preferred_structure: "Preferred structure",
  budget_range: "Budget range",
  preferred_location: "Preferred location",
  preferred_use: "Preferred use",
  timeline: "Timeline",
};

function composeMessage(payload: EnquiryPayload): string {
  if (payload.message && payload.message.trim()) return payload.message.trim();
  const lines: string[] = [];
  Object.keys(FIELD_LABELS).forEach((k) => {
    const v = (payload as unknown as Record<string, unknown>)[k];
    if (v && String(v).trim()) lines.push(`${FIELD_LABELS[k]}: ${String(v).trim()}`);
  });
  if (!lines.length && payload.notes && payload.notes.trim()) return payload.notes.trim();
  return lines.join("\n");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const payload: EnquiryPayload = await req.json();

    const email = (payload.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ success: false, error: "A valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawName = (payload.name || payload.full_name || "").trim();
    const first_name = (payload.first_name || "").trim() || (rawName ? splitName(rawName).first : "");
    const last_name = (payload.last_name || "").trim() || (rawName ? splitName(rawName).last : "");
    const fullName = [first_name, last_name].filter(Boolean).join(" ") || email.split("@")[0];

    const phone = (payload.phone || "").trim() || null;
    const message = composeMessage(payload);
    const subject = (payload.subject || "").trim() || payload.property_title || "New enquiry";
    const sourceRaw = (payload.source || "Website").trim();
    const leadSource = normalizeLeadSource(sourceRaw);
    const form_name = (payload.form_name || "website-form").trim();
    const source_url = payload.source_url || null;
    const listing_id = payload.listing_id || null;
    const property_title = payload.property_title || null;
    const contactType = normalizeContactType(payload.type || "client");
    const tags = Array.isArray(payload.tags) ? payload.tags : payload.tags ? [payload.tags] : [];

    // 1. Resolve agent from listing
    let agent_id: string | null = null;
    if (listing_id) {
      const { data: listing } = await supabaseAdmin
        .from("listings")
        .select("agent_id")
        .eq("id", listing_id)
        .maybeSingle();
      agent_id = listing?.agent_id || null;
    }

    // 2. Upsert contact (dedupe by email, then phone)
    let contact_id: string | null = null;
    const { data: existingByEmail } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    let existing = existingByEmail;
    if (!existing && phone) {
      const { data: byPhone } = await supabaseAdmin
        .from("contacts")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      existing = byPhone;
    }

    const now = new Date().toISOString();
    if (existing) {
      contact_id = existing.id;
      await supabaseAdmin
        .from("contacts")
        .update({ updated_at: now, last_contact_at: now })
        .eq("id", contact_id);
    } else {
      const { data: newContact, error: contactErr } = await supabaseAdmin
        .from("contacts")
        .insert({
          name: fullName,
          email,
          phone,
          type: contactType,
          tags,
          source: sourceRaw,
          first_name,
          last_name,
          last_contact_at: now,
        })
        .select("id")
        .single();
      if (contactErr) throw new Error("Contact insert failed: " + contactErr.message);
      contact_id = newContact.id;
    }

    // 3. Insert lead
    const { data: newLead, error: leadErr } = await supabaseAdmin
      .from("leads")
      .insert({
        first_name: first_name || "Unknown",
        last_name: last_name || "",
        email,
        phone,
        message,
        status: "new",
        source: leadSource,
        priority: "normal",
        is_read: false,
        is_starred: false,
        is_important: false,
        is_archived: false,
        is_spam: false,
        reply_status: "awaiting_reply",
        source_url,
        form_name,
        contact_id,
        listing_id,
        agent_id,
        last_activity_at: now,
      })
      .select("id")
      .single();
    if (leadErr) throw new Error("Lead insert failed: " + leadErr.message);
    const lead_id = newLead.id;

    // 4. Insert enquiry
    const { data: newEnquiry, error: enquiryErr } = await supabaseAdmin
      .from("enquiries")
      .insert({
        contact_id,
        lead_id,
        first_name: first_name || null,
        last_name: last_name || null,
        email,
        phone,
        message,
        subject,
        source: sourceRaw,
        form_name,
        source_url,
        listing_id,
        property_title,
        agent_id,
        status: "new",
        priority: "normal",
        is_read: false,
        is_starred: false,
        is_important: false,
        assigned_at: agent_id ? now : null,
      })
      .select("id")
      .single();
    if (enquiryErr) throw new Error("Enquiry insert failed: " + enquiryErr.message);
    const enquiry_id = newEnquiry.id;

    // 5. Create conversation
    const { data: newConv, error: convErr } = await supabaseAdmin
      .from("conversations")
      .insert({
        contact_id,
        lead_id,
        enquiry_id,
        subject,
        status: "open",
        agent_id,
      })
      .select("id")
      .single();
    if (convErr) throw new Error("Conversation insert failed: " + convErr.message);
    const conversation_id = newConv.id;

    // 6. Create first conversation message (the customer's message)
    if (message) {
      await supabaseAdmin.from("conversation_messages").insert({
        conversation_id,
        sender_type: "customer",
        sender_name: fullName,
        body: message,
        delivery_status: "received",
      });
    }

    // 7. Create notification for the assigned agent (or the general queue)
    let recipient_id: string | null = null;
    if (agent_id) {
      const { data: agent } = await supabaseAdmin
        .from("agents")
        .select("user_id")
        .eq("id", agent_id)
        .maybeSingle();
      recipient_id = agent?.user_id || null;
    }
    await supabaseAdmin.from("notifications").insert({
      recipient_id,
      type: "new_enquiry",
      title: "New enquiry received",
      body: `${fullName} submitted a ${form_name.replace(/-/g, " ")} enquiry${property_title ? ` about "${property_title}"` : ""}`,
      lead_id,
      enquiry_id,
      contact_id,
      link: "/crm/inbox",
      is_read: false,
    });

    return new Response(
      JSON.stringify({ success: true, contact_id, lead_id, enquiry_id, conversation_id, agent_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("crm-ingest error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
