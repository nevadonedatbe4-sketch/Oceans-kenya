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
  agent_id?: string | null;
  user_id?: string | null;
}

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function normalizeContactType(type: string): string {
  const t = (type || "client").toLowerCase().trim();
  if (t.includes("landlord") || t.includes("let") || t.includes("landowner") || t.includes("owner")) return "landlord";
  if (t.includes("sell")) return "seller";
  if (t.includes("buy")) return "buyer";
  if (t.includes("vendor")) return "vendor";
  if (t.includes("partner") || t.includes("joint") || t.includes("invest")) return "partner";
  return "client";
}

function normalizeLeadSource(source: string): string {
  const s = (source || "website").toLowerCase().trim();
  if (s.includes("referral") || s.includes("recommend")) return "referral";
  if (s.includes("social") || s.includes("facebook") || s.includes("instagram") || s.includes("twitter") || s.includes("linkedin") || s.includes("tiktok") || s.includes("whatsapp")) return "social";
  if (s.includes("walk") || s.includes("in person") || s.includes("in_person") || s.includes("office") || s.includes("viewing")) return "walk_in";
  if (s.includes("phone") || s.includes("call") || s.includes("tel")) return "phone";
  if (s.includes("email") || s.includes("mail")) return "email";
  return "website";
}

function isJvSubmissionType(value?: string): boolean {
  return value === "landowner" || value === "jv_proposal" || value === "investor";
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  try {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    return data?.id || null;
  } catch {
    return null;
  }
}

async function resolveAgentFromListing(
  admin: ReturnType<typeof createClient>,
  listingId: string | null,
  requestedAgent: string | null | undefined,
): Promise<string | null> {
  if (listingId) {
    const { data: listing } = await admin
      .from("listings")
      .select("agent_id")
      .eq("id", listingId)
      .maybeSingle();
    if (listing?.agent_id) return String(listing.agent_id);
  }
  return requestedAgent ? String(requestedAgent) : null;
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

function personalize(text: string, fullName: string, firstName: string): string {
  return text
    .replace(/\{name\}/g, fullName)
    .replace(/\{first_name\}/g, firstName || fullName);
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

    const submissionType = payload.submission_type || null;
    const isJv = isJvSubmissionType(submissionType);

    // 1. Resolve agent from listing (or explicit attribution)
    const agent_id = await resolveAgentFromListing(supabaseAdmin, listing_id, payload.agent_id);

    // 2. Match / register the submitting user by email.
    let user_id: string | null = payload.user_id || null;
    if (!user_id) {
      user_id = await findUserByEmail(supabaseAdmin, email);
    }

    // 3. Upsert contact (dedupe by email, then phone)
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
        .update({ updated_at: now, last_contact_at: now, user_id: user_id || undefined })
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
          user_id: user_id || null,
        })
        .select("id")
        .single();
      if (contactErr) throw new Error("Contact insert failed: " + contactErr.message);
      contact_id = newContact.id;
    }

    // 4. Insert lead
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

    // 5. Insert enquiry
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

    // 6. Create the live JV / land / capital submission record so the brief
    //    appears immediately in the Joint Ventures desk (+ agent scoping).
    let submission_id: string | null = null;
    if (isJv) {
      const { data: newSub, error: subErr } = await supabaseAdmin
        .from("jv_submissions")
        .insert({
          full_name: fullName,
          phone,
          email,
          submission_type: submissionType,
          land_location: payload.land_location || null,
          land_size: payload.land_size || null,
          title_status: submissionType === "landowner" ? payload.title_status || null : null,
          preferred_structure: (submissionType === "landowner" || submissionType === "jv_proposal")
            ? payload.preferred_structure || null
            : null,
          budget_range: submissionType !== "landowner" ? payload.budget_range || null : null,
          preferred_location: submissionType === "investor" ? payload.preferred_location || null : null,
          preferred_use: submissionType !== "landowner" ? payload.preferred_use || null : null,
          timeline: submissionType !== "landowner" ? payload.timeline || null : null,
          message: payload.message ? payload.message.trim() || null : null,
          status: "new",
          source: "public",
          source_url,
          agent_id,
          user_id,
          contact_id,
        })
        .select("id")
        .single();
      if (subErr) throw new Error("Submission insert failed: " + subErr.message);
      submission_id = newSub.id;
    }

    // 7. Create conversation
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

    // 8. Create first conversation message (the customer's message)
    if (message) {
      await supabaseAdmin.from("conversation_messages").insert({
        conversation_id,
        sender_type: "customer",
        sender_name: fullName,
        body: message,
        delivery_status: "received",
      });
    }

    // Outbound emails hit Resend (1–3s each) and must NOT block the form
    // response — the lead/contact/enquiry are already saved above. Collect them
    // and let the platform finish them after the response is sent, so the
    // visitor sees "Sent!" immediately instead of waiting on the mail provider.
    const background: Promise<unknown>[] = [];

    // 9. Auto-response — acknowledge the lead while they wait for an agent.
    let auto_response_sent = false;
    const { data: autoRows } = await supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "auto_response_enabled",
        "auto_response_subject",
        "auto_response_message",
        "auto_response_sender_name",
      ]);

    const autoMap: Record<string, string> = {};
    (autoRows || []).forEach((r: { key: string; value: string | null }) => {
      autoMap[r.key] = r.value || "";
    });

    // Every submitter gets an acknowledgement. The admin-authored message
    // (Email Management) is used when present; otherwise a sensible default so
    // a confirmation always goes out. Disable only by explicitly setting
    // auto_response_enabled to "false".
    const autoDisabled = autoMap["auto_response_enabled"] === "false";
    const DEFAULT_AUTO_MESSAGE =
      "Thank you for getting in touch with Oceans. We've received your enquiry " +
      "and a member of our team will get back to you shortly.";
    const autoMessage = (autoMap["auto_response_message"] || "").trim() || DEFAULT_AUTO_MESSAGE;
    const autoSender = (autoMap["auto_response_sender_name"] || "Oceans Kenya").trim();

    if (!autoDisabled) {
      const autoBody = personalize(autoMessage, fullName, first_name);

      await supabaseAdmin.from("conversation_messages").insert({
        conversation_id,
        sender_type: "system",
        sender_name: autoSender,
        body: autoBody,
        delivery_status: "delivered",
      });
      auto_response_sent = true;

      // Route the acknowledgement through the central template engine so it uses
      // the Oceans-branded shell, central sender config and the delivery log —
      // and so edits in Email Management apply here too. The admin-authored
      // message is still injected as {{message_preview}}. Sent in the background.
      background.push(
        (async () => {
          try {
            const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-templated-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                to: email,
                template_key: "enquiry_auto_response",
                variables: {
                  recipient_name: fullName,
                  lead_name: fullName,
                  message_preview: autoBody,
                  property_title: property_title || "",
                  property_url: source_url || "https://oceans.co.ke",
                },
                related_type: "enquiry",
                related_id: enquiry_id,
              }),
            });
            if (!res.ok) {
              console.error("Auto-response email failed:", res.status, await res.text());
            }
          } catch (emailErr) {
            console.error("Auto-response email error:", emailErr);
          }
        })()
      );
    }

    // 10. Create notification for the assigned agent (or the general queue)
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
      link: "/admin/joint-ventures?tab=submissions",
      is_read: false,
    });

    // 11. Email the assigned agent (or the office team if unassigned) through the
    //     central template engine, so the notification is editable and logged.
    //     A brand-new enquirer triggers the "New Lead" template; a returning
    //     enquirer (an existing contact writing in again) triggers the
    //     "New Message" template — one email per submission, never two.
    const notifyEvent = existing ? "new_message" : "new_lead";
    background.push(
      (async () => {
        try {
          const notifyRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-notify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              event: notifyEvent,
              agent_id,
              lead_id,
              lead_name: fullName,
              message_preview: message,
              property_title,
              property_location: payload.land_location || payload.preferred_location || "",
              property_url: source_url || req.headers.get("origin") || "",
            }),
          });
          if (!notifyRes.ok) {
            console.error(`crm-notify (${notifyEvent}) failed:`, notifyRes.status, await notifyRes.text());
          }
        } catch (notifyErr) {
          console.error("crm-notify error:", notifyErr);
        }
      })()
    );

    // Hand the queued emails to the platform so they complete AFTER the response
    // is returned (Supabase keeps the worker alive for waitUntil tasks). If the
    // runtime doesn't expose waitUntil (e.g. local `supabase serve`), fall back
    // to awaiting them so nothing is dropped — only local dev pays that latency.
    const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
    if (edgeRuntime?.waitUntil) {
      background.forEach((p) => edgeRuntime.waitUntil!(p));
    } else {
      await Promise.allSettled(background);
    }

    return new Response(
      JSON.stringify({
        success: true,
        contact_id,
        lead_id,
        enquiry_id,
        conversation_id,
        agent_id,
        user_id,
        submission_id,
        auto_response_sent,
      }),
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
