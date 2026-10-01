import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserRound, Users, KeyRound, MailPlus, ShieldCheck,
} from 'lucide-react';
import AgentsTab from '@/pages/admin/agent-access/AgentsTab';
import UsersAccessPanel, { type UsersAccessTab } from '@/pages/admin/agent-access/UsersAccessPanel';

type TabKey = 'agents' | UsersAccessTab;

const TABS: { key: TabKey; label: string; Icon: any }[] = [
  { key: 'agents', label: 'Agents', Icon: UserRound },
  { key: 'users', label: 'Users', Icon: Users },
  { key: 'roles', label: 'Roles & Permissions', Icon: KeyRound },
  { key: 'invitations', label: 'Invitations & Access', Icon: MailPlus },
];

const TAB_TO_QUERY: Record<string, string> = {
  agents: 'agents',
  users: 'users',
  roles: 'roles',
  invitations: 'invitations',
};

/**
 * AGENTS & ACCESS — consolidated host for agent accounts, team users,
 * roles & permissions and invitations. One page, four tabs.
 */
export default function AgentManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const validTabs: TabKey[] = ['agents', 'users', 'roles', 'invitations'];
  const activeTab: TabKey = validTabs.includes(tabParam as TabKey) ? (tabParam as TabKey) : 'agents';

  const setActiveTab = (t: TabKey) => {
    setSearchParams(t === 'agents' ? {} : { tab: t }, { replace: true });
  };

  const refreshKey = activeTab === 'agents' ? 'agents' : TAB_TO_QUERY[activeTab];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal/15 flex items-center justify-center">
            <ShieldCheck size={20} className="text-teal" />
          </div>
          <div>
            <h2 className="font-jost text-2xl font-bold text-white">Agents &amp; Access</h2>
            <p className="text-sm text-white/40 font-roboto mt-0.5">
              Manage agent accounts, team users, permissions and invitations in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07] w-full sm:w-auto inline-flex">
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-roboto font-medium transition-all cursor-pointer whitespace-nowrap ${
                isActive ? 'bg-teal text-[#001731] font-semibold' : 'text-white/60 hover:text-white'
              }`}
            >
              <t.Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      {activeTab === 'agents' && (
        <AgentsTab key={refreshKey} />
      )}
      {activeTab === 'users' && (
        <UsersAccessPanel key={refreshKey} activeTab="users" />
      )}
      {activeTab === 'roles' && (
        <UsersAccessPanel key={refreshKey} activeTab="roles" />
      )}
      {activeTab === 'invitations' && (
        <UsersAccessPanel key={refreshKey} activeTab="invitations" />
      )}
    </div>
  );
}