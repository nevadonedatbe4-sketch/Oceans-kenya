import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, ShieldCheck, Pencil, Building2, Users } from 'lucide-react';
import AgentDashboardView from '@/pages/agent/AgentDashboardView';
import AgentProfileEditModal, { type AgentProfileRecord } from '@/pages/admin/components/AgentProfileEditModal';

interface Counts {
  inboxUnread: number;
  leadsUnread: number;
}

/**
 * Read-only Agent dashboard PREVIEW for Admin / Super Admin.
 *
 * This renders the agent's REAL workspace exactly as the agent sees it — the
 * same AgentDashboardView the Agent Portal uses — populated with the selected
 * agent's own scoped data. The authenticated role never changes (no
 * impersonation), and every action inside the preview points at the matching
 * Admin editor so a super admin can view AND edit that agent's data.
 */
export default function AgentDashboardPreview() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<AgentProfileRecord | null>(null);
  const [counts, setCounts] = useState<Counts | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!agentId) {
      setError('No agent specified.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: agentErr } = await supabase
        .from('agents')
        .select('id, name, email, title, phone, location, website, avatar_url, bio, is_active, user_id, created_at')
        .eq('id', agentId)
        .maybeSingle();
      if (agentErr) throw new Error(agentErr.message);
      if (!data) {
        setAgent(null);
        setLoading(false);
        return;
      }
      setAgent(data as AgentProfileRecord);

      // Real unread counts (same rule the Agent Portal badges use) so the
      // workspace tiles match what the agent actually sees.
      const [leadRes, enquiryRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agentId)
          .eq('is_read', false)
          .eq('is_trashed', false)
          .eq('is_spam', false)
          .eq('is_archived', false),
        supabase
          .from('enquiries')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agentId)
          .eq('is_read', false)
          .eq('is_trashed', false)
          .eq('is_spam', false)
          .eq('is_archived', false),
      ]);
      setCounts({ inboxUnread: enquiryRes.count ?? 0, leadsUnread: leadRes.count ?? 0 });
    } catch (e: any) {
      setError(e?.message || 'Failed to load the agent preview');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#0d5959] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-400 font-roboto">{error}</p>
        <button onClick={load} className="mt-3 px-4 py-2 bg-[#0d5959] text-white rounded-lg text-sm cursor-pointer">Retry</button>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-14 h-14 rounded-xl bg-[#0d5959]/20 flex items-center justify-center mx-auto mb-3">
          <i className="ri-user-settings-line text-[#5eead4] text-xl" />
        </div>
        <p className="text-sm font-roboto text-[#9ca3af] font-medium">Agent not found</p>
        <Link to="/admin/agents" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0d5959] text-white rounded-lg text-sm cursor-pointer">
          <ArrowLeft size={16} /> Back to agents
        </Link>
      </div>
    );
  }

  const firstName = (agent.name || 'Agent').split(/\s+/)[0];

  return (
    <div className="space-y-5">
      {/* Preview banner */}
      <div className="bg-[#c8a45c] text-[#001731] rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 border border-[#e0c483]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="w-9 h-9 rounded-lg bg-[#001731] text-[#c8a45c] flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} />
          </span>
          <div className="min-w-0">
            <p className="font-roboto font-bold text-sm uppercase tracking-widest">Agent Dashboard Preview</p>
            <p className="text-xs font-roboto text-[#001731]/80 truncate">
              Viewing: <span className="font-semibold">{agent.name}</span> · Role: Agent · Read-only preview — you are not logged in as this agent
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/agents')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#001731] text-white text-sm font-roboto font-semibold hover:opacity-90 transition-all cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft size={16} /> Exit Preview
        </button>
      </div>

      {/* Edit actions — super admin can act on this agent's own data */}
      <div className="bg-[#012144] border border-[#1c3a5e] rounded-xl px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-[#c8a45c]/15 text-[#c8a45c] flex items-center justify-center flex-shrink-0">
            <Pencil size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-roboto font-semibold text-white">Manage this agent&apos;s data</p>
            <p className="text-[11px] font-roboto text-[#8b98ab] truncate">Jump straight into the Admin editors, scoped to {firstName}.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/admin/listings?agent=${agent.id}`}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-roboto font-semibold bg-transparent text-white border border-white/25 hover:border-white hover:bg-white/5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Building2 size={14} /> Manage listings
          </Link>
          <Link
            to={`/admin/leads?agent=${agent.id}`}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-roboto font-semibold bg-transparent text-white border border-white/25 hover:border-white hover:bg-white/5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Users size={14} /> Manage leads
          </Link>
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-roboto font-semibold bg-[#00ddb4] text-[#001731] hover:opacity-90 transition-all cursor-pointer whitespace-nowrap"
          >
            <Pencil size={14} /> Edit profile
          </button>
        </div>
      </div>

      {/* The agent's real workspace, rendered read-only with their own data */}
      <AgentDashboardView
        agentId={agent.id}
        agentUserId={agent.user_id}
        displayName={firstName}
        preview
        countsOverride={counts}
        onEditProfile={() => setEditOpen(true)}
      />

      <AgentProfileEditModal
        open={editOpen}
        agent={agent}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => setAgent(updated)}
      />
    </div>
  );
}