import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import AgentDashboardView from './AgentDashboardView';

/**
 * AGENT PORTAL — the signed-in agent's own dashboard. Delegates to the shared
 * AgentDashboardView so the agent portal and the Super Admin preview always
 * render the exact same workspace.
 */
export default function AgentDashboard() {
  const { user } = useAuth();
  const { agentId } = useAgentProfile();
  const firstName = (user?.name || 'Agent').split(/\s+/)[0];

  return (
    <AgentDashboardView
      agentId={agentId}
      agentUserId={user?.id ?? null}
      displayName={firstName}
    />
  );
}