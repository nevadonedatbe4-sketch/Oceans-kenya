// OGroup Agent Counts — server-authoritative Inbox + Leads badge counts.
// The authenticated agent is derived ONLY from the JWT. No agent_id, user_id,
// or query parameter is ever accepted from the client to determine whose
// counts are returned. This prevents IDOR and cross-agent count leakage.
import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // ---- 1. Resolve the authenticated user from the JWT (server-side). ----
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return json(401, { error: 'Unauthorized' });
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return json(401, { error: 'Unauthorized' });
  const userId = user.id;

  try {
    // ---- 2. Resolve the agent record owned by this user (never from body). ----
    let { data: agent } = await admin
      .from('agents')
      .select('id, email, is_active')
      .eq('user_id', userId)
      .maybeSingle();
    // Fallback: match by email if the agent row isn't linked yet.
    if (!agent && user.email) {
      agent = await admin.from('agents').select('id, email, is_active').eq('email', user.email).maybeSingle();
    }

    // No agent row => zero badges. Never a global count.
    if (!agent) return json(200, { agentId: null, inboxUnread: 0, leadsUnread: 0 });

    const agentId = agent.id;

    // ---- 3. Inbox = unread, non-archived/non-spam/non-trashed enquiries. ----
    const inboxQ = admin
      .from('enquiries')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('is_read', false)
      .eq('is_archived', false)
      .eq('is_spam', false)
      .eq('is_trashed', false);

    // ---- 4. Leads = new/unread, non-archived/non-spam/non-trashed leads. ----
    const leadsQ = admin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('is_read', false)
      .eq('is_archived', false)
      .eq('is_spam', false)
      .eq('is_trashed', false);

    const [inboxRes, leadsRes] = await Promise.all([inboxQ, leadsQ]);
    if (inboxRes.error) return json(500, { error: inboxRes.error.message });
    if (leadsRes.error) return json(500, { error: leadsRes.error.message });

    return json(200, {
      agentId,
      inboxUnread: inboxRes.count ?? 0,
      leadsUnread: leadsRes.count ?? 0,
    });
  } catch (e: any) {
    return json(500, { error: e?.message || 'Server error' });
  }
});
