import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { resolvePostLoginRoute, type Role, type AccountStatus } from '@/lib/authz';

/**
 * Agent pending-approval screen.
 * Shown when an agent's account status is 'pending'.
 * A pending agent can NEVER reach /agent/dashboard — the guard sends them here.
 */
export default function AgentPending() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [refreshBatch, setRefreshBatch] = useState(0);

  // Once approved (or if an admin/super_admin lands here by mistake), the app
  // routes them through the single authoritative resolver.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/agent/login', { replace: true });
      return;
    }
    navigate(resolvePostLoginRoute(user), { replace: true });
  }, [user, loading, navigate, refreshBatch]);

  const checkAgain = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status, role')
        .eq('user_id', session.user.id)
        .maybeSingle();
      // Re-resolve from the backend profile, never from stale client state.
      if (profile) {
        const role: Role =
          profile.role === 'admin' || profile.role === 'super_admin' ? profile.role : 'agent';
        const recognized: AccountStatus[] = [
          'pending', 'active', 'suspended', 'rejected',
          'deletion_requested', 'deletion_rejected', 'deletion_approved', 'deleted',
        ];
        const status: AccountStatus = (recognized as string[]).includes(profile.status)
          ? (profile.status as AccountStatus)
          : 'active';
        const dest = resolvePostLoginRoute({ id: session.user.id, email: session.user.email || '', role, status });
        if (dest !== '/agent/approval') {
          navigate(dest, { replace: true });
          return;
        }
      }
    }
    setRefreshBatch((n) => n + 1);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/agent/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f4f3ee] to-[#e9f2ef] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f4f3ee] to-[#e9f2ef] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-lg p-8 md:p-10">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <i className="ri-hourglass-2-line text-accent text-3xl" />
          </div>
          <p className="text-xs font-roboto font-semibold uppercase tracking-[0.18em] text-accent mb-2">Agent Portal</p>
          <h1 className="text-2xl font-roboto font-bold text-[#1a1a2e] mb-2">Awaiting approval</h1>
          <p className="text-sm text-gray-600 font-roboto leading-relaxed">
            Your account is awaiting administrator approval.
            <br />
            You&apos;ll be able to sign in to your agent dashboard once an administrator reviews and approves your application.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 rounded-md bg-[#f4f3ee] px-4 py-3">
            <i className="ri-time-line text-gray-400" />
            <span className="text-sm text-gray-600 font-roboto">Review is usually completed within 1 business day</span>
          </div>

          <div className="mt-5 rounded-md border border-[#e4e2dc] bg-[#fbfaf7] p-4 text-left">
            <p className="text-[11px] font-roboto font-semibold uppercase tracking-[0.14em] text-gray-400 mb-2">
              Signed in as
            </p>
            <p className="text-sm font-roboto font-semibold text-[#1a1a2e] break-all mb-3">
              {user?.email || '—'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent px-2.5 py-1 text-[11px] font-roboto font-semibold uppercase tracking-wide">
                <i className="ri-user-3-line" />
                {user?.role || 'unknown'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent px-2.5 py-1 text-[11px] font-roboto font-semibold uppercase tracking-wide">
                <i className="ri-time-line" />
                {user?.status || 'unknown'}
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-roboto leading-relaxed">
              If this is not the account you expected, sign out and switch accounts below.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={checkAgain}
              className="w-full bg-accent hover:bg-accent/90 text-white py-3 rounded-md text-sm font-roboto font-semibold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap"
            >
              Check status again
            </button>
            <button
              onClick={handleSignOut}
              className="w-full border border-[#e4e2dc] bg-white hover:bg-[#f4f3ee] text-[#1a1a2e] py-3 rounded-md text-sm font-roboto font-semibold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap"
            >
              Sign out &amp; switch account
            </button>
            <Link
              to="/"
              className="w-full py-2 text-sm text-gray-500 hover:text-accent transition-colors font-roboto cursor-pointer"
            >
              Return to website
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}