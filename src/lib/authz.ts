// ─────────────────────────────────────────────────────────────
// SINGLE AUTHORITATIVE AUTHORIZATION LAYER
// Everything that decides "who can do what" lives here.
// The frontend uses this to REFLECT permissions; the backend
// (RLS + edge functions) is what actually ENFORCES them.
// Do NOT scatter `if (user.role === ...)` checks across pages.
// ─────────────────────────────────────────────────────────────

export type Role = 'agent' | 'admin' | 'super_admin';
export type AccountStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'rejected'
  | 'deletion_requested'
  | 'deletion_rejected'
  | 'deletion_approved'
  | 'deleted';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  status: AccountStatus;
  name?: string;
  avatar?: string;
}

// The three canonical roles. No other dashboards/roles exist.
export const ROLES: Role[] = ['agent', 'admin', 'super_admin'];

/** True for any administrative account (admin inherits, super_admin elevated). */
export function isAdminRole(role?: string | null): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function isAgentRole(role?: string | null): boolean {
  return role === 'agent';
}

export function isSuperAdmin(role?: string | null): boolean {
  return role === 'super_admin';
}

/** An agent may only use the portal once approved. */
export function isApproved(user: AuthUser | null | undefined): boolean {
  return !!user && isAgentRole(user.role) && user.status === 'active';
}

/** Admins are approved by construction; never gate on a pending admin. */
export function isActiveAdmin(user: AuthUser | null | undefined): boolean {
  return !!user && isAdminRole(user.role) && user.status !== 'suspended';
}

/** Should this user be redirect to the admin portal? */
export function isUserAdmin(user: AuthUser | null | undefined): boolean {
  return !!user && isAdminRole(user.role);
}

/**
 * THE single authoritative post-login / post-auth destination resolver.
 *
 * Every gateway - the Agent login page, the Admin login page, the pending
 * screen, and the portal guards - MUST route through this function so there
 * is one and only one decision about where an authenticated account may go.
 *
 * The gateway URL is irrelevant: only the account's authoritative
 * server-side role + status decide the destination.
 *
 *   admin / super_admin          → /admin/dashboard
 *   agent + active (approved)    → /agent/dashboard
 *   agent + pending              → /agent/approval
 *   agent + suspended/rejected   → /agent/login (no portal access)
 *
 * An optional `from` path lets a user return to the page they were headed to
 * IF (and only if) it belongs to the correct portal for their role.
 * An admin can never be routed into an /agent/* path, and vice versa.
 *
 * `entryPortal` records which gateway the user actually authenticated
 * through. It is the security backstop that makes a wrong-portal login
 * IMPOSSIBLE to leak across portals:
 *
 *   agent who SIGNED IN AT the admin gateway → /agent/login (never the dashboard)
 *   admin who SIGNED IN AT the agent gateway → /admin/dashboard
 */
export function resolvePostLoginRoute(
  user: AuthUser | null | undefined,
  from?: string | null,
  entryPortal?: 'agent' | 'admin',
): string {
  if (!user) return '/agent/login';

  const intended = (from ?? '').split('?')[0] || '';

  // ADMIN / SUPER ADMIN → the admin portal, regardless of login entry point.
  if (isAdminRole(user.role)) {
    // An admin who tried the agent gateway is rejected from the agent portal
    // and sent to the admin portal. They are never silently given an agent
    // dashboard or an agent shell.
    if (entryPortal === 'agent') return '/admin/dashboard';

    if (intended.startsWith('/admin/') && intended !== '/admin/login') return intended;
    return '/admin/dashboard';
  }

  if (user.role === 'agent') {
    // An agent who attempted to authenticate through the ADMIN gateway must be
    // denied the admin portal - and must NOT be handed the agent dashboard. The
    // only valid destination is the agent SIGN-IN page (fresh login required).
    if (entryPortal === 'admin') return '/agent/login';

    // A pending agent can never reach the dashboard.
    if (user.status === 'pending') return '/agent/approval';

    // Suspended / rejected / deletion-in-progress → no portal access.
    if (user.status !== 'active') return '/agent/login';

    // Approved agent → return to their intended agent page if valid, else home.
    if (
      intended.startsWith('/agent/') &&
      intended !== '/agent/login' &&
      intended !== '/agent/signup'
    ) {
      return intended;
    }
    return '/agent/dashboard';
  }

  return '/agent/login';
}

/** Backward-compatible alias: resolve the portal home for a user's role.
 *  Delegates to the single authoritative resolver so a pending agent is
 *  correctly routed to /agent/approval (never /agent/dashboard). */
export function portalHomeFor(user: AuthUser | null | undefined): string {
  return resolvePostLoginRoute(user);
}

/**
 * Where a "portal mismatch" attempt should be sent.
 * An agent hitting /admin/* is bounced to the agent portal;
 * an admin hitting /agent/* is bounced to the admin portal.
 */
export function portalForRole(role?: string | null): '/agent' | '/admin' {
  return isAdminRole(role) ? '/admin' : '/agent';
}