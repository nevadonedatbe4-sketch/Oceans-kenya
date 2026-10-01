import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole, resolvePostLoginRoute } from '@/lib/authz';
import PageLoader from '@/components/feature/PageLoader';

interface PortalGuardProps {
  portal: 'agent' | 'admin';
  children: React.ReactNode;
}

/**
 * Centralized route authorization for the two portals.
 *
 * /agent/*  → authenticated + role=agent + status=active (pending agents see a
 *             dedicated "awaiting approval" screen, never the dashboard).
 * /admin/*  → authenticated + role=admin OR super_admin + not suspended.
 *
 * The guard NEVER mounts the wrapped portal shell until authentication and the
 * authoritative server-side role have fully resolved - so a mismatched session
 * can never cause a dashboard flash. Mismatched portals are routed through the
 * single authoritative resolver and the wrongly-initialized session is
 * terminated, so:
 *
 *   - an agent hitting /admin/* is denied + signed out → /agent/login (never
 *     the admin shell AND never the agent dashboard);
 *   - an admin/super_admin hitting /agent/* is denied → /admin/dashboard.
 *
 * The frontend only reflects these rules; the backend (RLS + edge functions)
 * is what actually enforces them on data. The authorised admin preview
 * (/admin/agents/:agentId/preview) is admin-side and is unaffected.
 */
export default function PortalGuard({ portal, children }: PortalGuardProps) {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  // Deny + terminate a brand-new session the wrong portal created, so it can
  // never quietly become a session in the other portal.
  useEffect(() => {
    if (loading || !user) return;
    if (portal === 'admin' && user.role === 'agent') {
      signOut();
    }
  }, [loading, user, portal, signOut]);

  // Do NOT render anything that looks like a portal until auth+role resolve.
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <PageLoader size={48} />
      </div>
    );
  }

  // Not authenticated → send to the correct gateway.
  if (!user) {
    return <Navigate to={portal === 'agent' ? '/agent/login' : '/admin/login'} replace state={{ from: location }} />;
  }

  if (portal === 'agent') {
    // Admins are never allowed into the agent portal → admin dashboard.
    if (isAdminRole(user.role)) {
      return <Navigate to={resolvePostLoginRoute(user, null, 'agent')} replace />;
    }
    // Pending agent → awaiting approval screen (no dashboard access).
    if (user.status === 'pending') {
      return <Navigate to="/agent/approval" replace />;
    }
    // Suspended, rejected, deletion-in-progress or deleted agents have no
    // dashboard access. They are bounced to the agent gateway.
    if (user.status !== 'active') {
      return <Navigate to="/agent/login" replace />;
    }
    // role=agent + active → allowed.
    if (user.role === 'agent') {
      return <>{children}</>;
    }
    return <Navigate to="/agent/login" replace />;
  }

  // ── ADMIN portal ──
  if (isAdminRole(user.role) && user.status !== 'suspended') {
    return <>{children}</>;
  }
  // An agent can never enter the admin portal. Deny + send to the AGENT
  // SIGN-IN page (never the agent dashboard). Session is terminated above.
  if (user.role === 'agent') {
    return <Navigate to="/agent/login" replace />;
  }
  return <Navigate to="/admin/login" replace />;
}