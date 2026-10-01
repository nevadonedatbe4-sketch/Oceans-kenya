import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { stopOceansPresence } from '@/lib/oceansPresence';
import { isAdminRole, isAgentRole, type AuthUser, type Role, type AccountStatus } from '@/lib/authz';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  /** True once the initial session/profile has resolved. */
  ready: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  isSuperAdmin: boolean;
  isApprovedAgent: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; role?: Role; status?: AccountStatus }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toRole(role?: string | null): Role {
  return role === 'admin' || role === 'super_admin' || role === 'agent' ? role : 'agent';
}

function toStatus(status?: string | null): AccountStatus {
  const recognized: AccountStatus[] = [
    'pending', 'active', 'suspended', 'rejected',
    'deletion_requested', 'deletion_rejected', 'deletion_approved', 'deleted',
  ];
  return status && (recognized as string[]).includes(status) ? (status as AccountStatus) : 'active';
}

/**
 * Translate a raw authentication error into an accurate, user-facing message.
 * Critically: unrelated server/network failures must NOT be reported as
 * "invalid credentials", which misleads users into resetting a working password.
 */
function mapAuthError(error: unknown): Error {
  const err = error as { message?: string; status?: number; code?: string; name?: string };
  const raw = (err?.message || '').toLowerCase();
  const code = (err?.code || '').toLowerCase();
  const status = typeof err?.status === 'number' ? err.status : undefined;

  if (code === 'invalid_credentials' || raw.includes('invalid login credentials')) {
    return new Error('Incorrect email or password. Please check and try again.');
  }
  if (code === 'email_not_confirmed' || raw.includes('email not confirmed')) {
    return new Error('Your email hasn\u2019t been verified yet. Check your inbox for the verification link, then sign in.');
  }
  if (code === 'user_banned' || raw.includes('banned') || raw.includes('disabled')) {
    return new Error('This account has been deactivated. Please contact your administrator.');
  }
  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    status === 429 ||
    raw.includes('rate limit') ||
    raw.includes('too many')
  ) {
    return new Error('Too many sign-in attempts. Please wait a moment and try again.');
  }
  if (
    code === 'abort_error' ||
    raw.includes('aborted') ||
    raw.includes('timeout') ||
    raw.includes('lock')
  ) {
    return new Error('The sign-in request was interrupted. Please try again.');
  }
  if (
    status === 0 ||
    raw.includes('failed to fetch') ||
    raw.includes('network') ||
    raw.includes('fetch failed') ||
    raw.includes('load failed')
  ) {
    return new Error('We can\u2019t reach the sign-in service right now. Check your connection and try again.');
  }
  if (status !== undefined && status >= 500) {
    return new Error('The sign-in service is temporarily unavailable. Please try again shortly.');
  }
  if (raw.includes('invalid') && raw.includes('token')) {
    return new Error('Your sign-in session expired. Please try again.');
  }

  // Unexpected error: never hide the real cause behind a vague message.
  // Log the raw error for diagnosis and surface its code/status so the
  // exact failure is visible instead of being swallowed.
  console.error('[auth] Unexpected sign-in error:', error);
  const detail = [code || undefined, status !== undefined ? `status ${status}` : undefined]
    .filter(Boolean)
    .join(', ');
  return new Error(
    detail
      ? `We couldn\u2019t sign you in right now (${detail}). Please try again.`
      : 'We couldn\u2019t sign you in right now. Please try again.',
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  // Initial session check
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSessionUserId(session.user.id);
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };

    getSession();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSessionUserId(session.user.id);
      } else {
        setSessionUserId(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile when sessionUserId changes (outside of onAuthStateChange)
  useEffect(() => {
    if (!sessionUserId) {
      if (user !== null) setUser(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, name, status, avatar')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.auth.signOut();
          setUser(null);
          setSessionUserId(null);
          setLoading(false);
          return;
        }

        if (profile.status === 'suspended') {
          await supabase.auth.signOut();
          setUser(null);
          setSessionUserId(null);
          setLoading(false);
          return;
        }

        // NOTE: status is preserved here (pending/active). The portal guard
        // decides whether a pending agent may enter - the auth layer simply
        // reports the authoritative profile state.
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: toRole(profile.role),
          status: toStatus(profile.status),
          name: profile.name || session.user.email?.split('@')[0] || 'User',
          avatar: profile.avatar || undefined,
        });
      } catch {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: 'agent',
            status: 'active',
            name: session.user.email?.split('@')[0] || 'Agent',
            avatar: undefined,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [sessionUserId]);

  const signIn = async (email: string, password: string) => {
    // Normalise the email so casing/whitespace differences never cause a
    // spurious "invalid credentials" result for a correct account.
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) return { error: mapAuthError(error) };

      if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, name, status, avatar')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.auth.signOut();
          return { error: new Error('We couldn\u2019t find a profile for this account. Please contact your administrator.') };
        }

        if (profile.status === 'suspended') {
          await supabase.auth.signOut();
          return { error: new Error('Your account has been deactivated. Please contact your administrator.') };
        }

        return {
          error: null,
          role: toRole(profile.role),
          status: toStatus(profile.status),
        };
      }

      return { error: null };
    } catch (err) {
      return { error: mapAuthError(err) };
    }
  };

  const signOut = async () => {
    // Stop presence BEFORE the token is torn down so teammates see us go
    // offline immediately (rather than waiting for the socket to drop).
    try { stopOceansPresence(); } catch { /* ignore */ }
    await supabase.auth.signOut();
    setUser(null);
    setSessionUserId(null);
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name, status, avatar')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (profile) {
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        role: toRole(profile.role),
        status: toStatus(profile.status),
        name: profile.name || session.user.email?.split('@')[0] || 'User',
        avatar: profile.avatar || undefined,
      });
    }
  };

  const isAdmin = isAdminRole(user?.role);
  const isAgent = isAgentRole(user?.role);
  const isSuperAdmin = user?.role === 'super_admin';
  const isApprovedAgent = !!user && isAgent && user.status === 'active';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        ready: !loading,
        isAdmin,
        isAgent,
        isSuperAdmin,
        isApprovedAgent,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  return { user, loading, isAuthenticated: !!user };
}