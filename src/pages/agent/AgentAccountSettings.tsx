import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase, supabaseUrl, supabaseKey } from '@/lib/supabase';
import { Trash2, ShieldCheck, Loader2, AlertTriangle, CheckCircle2, XCircle, UserRound, Share2, KeyRound, Users } from 'lucide-react';
import AgentProfileDetails from '@/pages/agent/components/AgentProfileDetails';
import AgentSocialLinks from '@/pages/agent/components/AgentSocialLinks';
import AgentSecurity from '@/pages/agent/components/AgentSecurity';

type TabKey = 'profile' | 'social' | 'security';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'profile', label: 'Profile', icon: <UserRound size={16} /> },
  { key: 'social', label: 'Social links', icon: <Share2 size={16} /> },
  { key: 'security', label: 'Security', icon: <KeyRound size={16} /> },
];

export default function AgentAccountSettings() {
  const { user } = useAuth();
  const { agentId } = useAgentProfile();
  const [active, setActive] = useState<TabKey>('profile');

  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const status = user?.status || 'active';

  const requestDeletion = async () => {
    setSubmitting(true);
    setMessage(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/request-account-deletion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      setMessage({ type: 'success', text: 'Your account deletion request was submitted. It awaits Supabase Admin approval.' });
      setConfirming(false);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to submit deletion request.' });
    } finally {
      setSubmitting(false);
    }
  };

  const statusView: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle2 size={14} /> },
    pending: { label: 'Awaiting approval', cls: 'bg-amber-100 text-amber-800', icon: <AlertTriangle size={14} /> },
    rejected: { label: 'Application rejected', cls: 'bg-red-100 text-red-800', icon: <XCircle size={14} /> },
    suspended: { label: 'Suspended', cls: 'bg-gray-100 text-gray-700', icon: <XCircle size={14} /> },
    deletion_requested: { label: 'Deletion awaiting approval', cls: 'bg-amber-100 text-amber-800', icon: <AlertTriangle size={14} /> },
    deletion_rejected: { label: 'Deletion request rejected', cls: 'bg-red-100 text-red-800', icon: <XCircle size={14} /> },
    deletion_approved: { label: 'Deletion approved', cls: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 size={14} /> },
    deleted: { label: 'Account deleted', cls: 'bg-gray-200 text-gray-700', icon: <XCircle size={14} /> },
  };

  const sv = statusView[status] || statusView.active;

  return (
    <div className="space-y-6">
      {/* Personal-only: this is the account holder's own profile, never a place for
          team/admin settings or roles — those live strictly in the admin portal. */}
      <div>
        <h1 className="font-roboto font-semibold text-xl text-[#1a1a2e]">My Profile</h1>
        <p className="text-sm text-gray-500 font-roboto mt-0.5">Your personal profile, links and security — managed by you alone.</p>
      </div>

      {/* Header with status */}
      <div className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden">
        <div className="p-6 flex items-center gap-4 border-b border-[#eef2f0]">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg font-roboto font-bold">{user?.name?.charAt(0).toUpperCase() || 'A'}</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-roboto font-semibold text-lg text-[#1a1a2e] truncate">{user?.name || 'Agent'}</h2>
            <p className="text-sm text-gray-500 font-roboto truncate">{user?.email}</p>
          </div>
          <span className={`ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-roboto font-semibold whitespace-nowrap ${sv.cls}`}>
            {sv.icon} {sv.label}
          </span>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap ${active === t.key ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active tab content */}
      {active === 'profile' && <AgentProfileDetails agentId={agentId} />}
      {active === 'social' && <AgentSocialLinks agentId={agentId} />}
      {active === 'security' && <AgentSecurity />}

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden">
        <div className="p-6 border-b border-[#eef2f0] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-roboto font-semibold text-[#1a1a2e]">Delete account</h3>
            <p className="text-sm text-gray-500 font-roboto">Permanent deletion requires Supabase Admin approval.</p>
          </div>
        </div>

        <div className="p-6">
          {['deletion_requested', 'deletion_approved', 'deletion_rejected', 'deleted'].includes(status) ? (
            <div className="space-y-4">
              {status === 'deletion_requested' && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-roboto font-semibold text-amber-800">Your account deletion request is awaiting approval.</p>
                    <p className="text-xs text-amber-700 mt-1 font-roboto">Nothing is deleted until an admin approves it. You can continue using the portal while it is pending.</p>
                  </div>
                </div>
              )}
              {status === 'deletion_rejected' && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                  <XCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-roboto font-semibold text-red-700">Your account deletion request was rejected.</p>
                    <p className="text-xs text-red-600 mt-1 font-roboto">Your account remains active. You may submit a new request if you wish.</p>
                  </div>
                </div>
              )}
              {(status === 'deletion_approved' || status === 'deleted') && (
                <div className="flex items-start gap-3 bg-gray-100 border border-gray-200 rounded-lg p-4">
                  <XCircle size={18} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-roboto font-semibold text-gray-600">Your account deletion has been approved and processed.</p>
                </div>
              )}
            </div>
          ) : confirming ? (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-roboto font-semibold text-red-700 mb-2">Are you sure?</p>
                <ul className="text-xs text-red-600 font-roboto space-y-1 list-disc pl-4">
                  <li>You will lose access to your profile and private account data.</li>
                  <li>Your listings, leads and enquiries will be detached where appropriate.</li>
                  <li>This cannot be undone once approved.</li>
                  <li>This only submits a request — an admin must review and approve it.</li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setConfirming(false)} disabled={submitting} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto font-semibold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap">Cancel</button>
                <button onClick={requestDeletion} disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-roboto font-semibold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {submitting ? 'Submitting request…' : 'Submit deletion request'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-4">
                <ShieldCheck size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600 font-roboto leading-relaxed">
                  Requesting deletion sends a request to your administrator. Your account is only permanently deleted after an
                  <span className="font-semibold"> admin </span> approves it. You can continue using your account until then.
                </p>
              </div>
              <button
                onClick={() => { setConfirming(true); setMessage(null); }}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-roboto font-semibold hover:bg-red-50 transition-all cursor-pointer whitespace-nowrap"
              >
                <Trash2 size={16} /> Request account deletion
              </button>
            </div>
          )}

          {message && (
            <div className={`mt-4 text-sm px-4 py-3 rounded-lg font-roboto ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}