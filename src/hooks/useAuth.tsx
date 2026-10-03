import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
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
  /**
   * One-off, user-facing explanation for a sign-out the user didn't initiate
   * (expired / revoked stored session, idle auto sign-out, deactivated
   * account). The login pages surface this so users understand WHY they were
   * signed out instead of being silently dropped on the sign-in form.
   */
  sessionNotice: string | null;
  dismissSessionNotice: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; role?: Role; status?: AccountStatus }>;
  /** Pass an optional `notice` to explain a programmatic sign-out to the user. */
  signOut: (notice?: string) => Promise<void>;
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
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Refs mirror state so the long-lived auth listener (registered once) always
  // reads the CURRENT values instead of a stale closure.
  const sessionUserIdRef = useRef<string | null>(null);
  const manualSignOutRef = useRef(false);

  useEffect(() => {
    sessionUserIdRef.current = sessionUserId;
  }, [sessionUserId]);

  // ── Initial session restore ──────────────────────────────────────────────
  // We only READ the local session here to learn whether anything is stored.
  // The stored session is NEVER treated as proof on its own — the profile
  // effect below validates it against the server (getUser) before any
  // authenticated UI is allowed to render.
  useEffect(() => {
    let cancelled = false;
    let settled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        settled = true;
        if (data.session?.user) {
          setSessionUserId(data.session.user.id);
        } else {
          setSessionUserId(null);
          setLoading(false);
        }
      } catch {
        if (cancelled) return;
        settled = true;
        setLoading(false);
      }
    })();

    // Safety valve: never leave the app frozen on a loader because a session
    // read never settles. If we couldn't read a session in time, render the
    // normal signed-out state instead of an endless spinner.
    const timer = setTimeout(() => {
      if (!cancelled && !settled) setLoading(false);
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // ── Auth state changes (sign-in / sign-out / refresh / expiry) ────────────
  // The callback stays synchronous and only updates local state. Data loading
  // happens in the effect below, so Auth initialization never deadlocks.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        // A token that expires/gets revoked mid-session fires SIGNED_OUT. If the
        // user was signed in and this wasn't a sign-out they performed, tell
        // them why on the login page. A manual sign-out is explicitly tagged so
        // it never produces a misleading "session expired" notice.
        const wasSignedIn = sessionUserIdRef.current !== null;
        const isManual = manualSignOutRef.current;
        sessionUserIdRef.current = null;
        setSessionUserId(null);
        setUser(null);
        try { stopOceansPresence(); } catch { /* ignore */ }
        setLoading(false);
        if (wasSignedIn && !isManual) {
          setSessionNotice('Your session expired \u2014 please sign in again.');
        }
        return;
      }
      // Ignore token-only churn (refreshes) that keeps the same user.
      setSessionUserId((prev) => (prev === session.user.id ? prev : session.user.id));
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ── Cross-tab session sync ────────────────────────────────────────────────
  // Signing out (or in) in one tab only fires storage events in OTHER tabs.
  // Re-reading the session there keeps every tab consistent, so a sign-out is
  // reflected everywhere instead of leaving a stale authenticated shell behind.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith('sb-') || !e.key.includes('auth-token')) return;
      supabase.auth
        .getSession()
        .then(({ data }) => {
          const uid = data.session?.user?.id ?? null;
          sessionUserIdRef.current = uid;
          setSessionUserId((prev) => (prev === uid ? prev : uid));
          if (!uid) {
            setUser(null);
            try { stopOceansPresence(); } catch { /* ignore */ }
            setLoading(false);
          }
        })
        .catch(() => { /* ignore */ });
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ── Validate the session + load the authoritative profile ─────────────────
  useEffect(() => {
    if (!sessionUserId) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async (attempt: number): Promise<void> => {
      try {
        // Validate the token against the auth server. A stored-but-invalid
        // (expired / revoked / deleted user) session is cleared here rather
        // than silently trusted.
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (cancelled) return;

        if (userErr || !userData?.user) {
          // The stored session failed server-side validation: it is expired,
          // revoked or belongs to a deleted user. Clear it and explain why.
          manualSignOutRef.current = true;
          await supabase.auth.signOut().catch(() => { /* ignore */ });
          if (cancelled) return;
          setUser(null);
          setSessionUserId(null);
          sessionUserIdRef.current = null;
          setSessionNotice('Your session expired \u2014 please sign in again.');
          setLoading(false);
          setTimeout(() => { manualSignOutRef.current = false; }, 2000);
          return;
        }

        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('role, name, status, avatar')
          .eq('user_id', userData.user.id)
          .maybeSingle();

        if (cancelled) return;

        // A DB/network/RLS failure is NOT the same as "no profile". Retry once,
        // and never sign the user out (or fabricate a role) because of a
        // transient error — that is what caused spurious sign-outs.
        if (profileErr) {
          if (attempt < 1) {
            await new Promise((r) => setTimeout(r, 600));
            if (!cancelled) return load(attempt + 1);
            return;
          }
          console.error('[auth] profile load failed:', profileErr);
          setUser(null);
          setLoading(false);
          return;
        }

        // Genuinely no profile row → the account is not provisioned; end it.
        if (!profile) {
          manualSignOutRef.current = true;
          await supabase.auth.signOut().catch(() => { /* ignore */ });
          if (cancelled) return;
          setUser(null);
          setSessionUserId(null);
          sessionUserIdRef.current = null;
          setSessionNotice('Your session ended. Please sign in again.');
          setLoading(false);
          setTimeout(() => { manualSignOutRef.current = false; }, 2000);
          return;
        }

        if (profile.status === 'suspended') {
          manualSignOutRef.current = true;
          await supabase.auth.signOut().catch(() => { /* ignore */ });
          if (cancelled) return;
          setUser(null);
          setSessionUserId(null);
          sessionUserIdRef.current = null;
          setSessionNotice('Your account has been deactivated. Please contact your administrator.');
          setLoading(false);
          setTimeout(() => { manualSignOutRef.current = false; }, 2000);
          return;
        }

        // NOTE: status is preserved (pending/active). The portal guard decides
        // whether a pending agent may enter - the auth layer simply reports the
        // authoritative profile state.
        setUser({
          id: userData.user.id,
          email: userData.user.email || '',
          role: toRole(profile.role),
          status: toStatus(profile.status),
          name: profile.name || userData.user.email?.split('@')[0] || 'User',
          avatar: profile.avatar || undefined,
        });
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        if (attempt < 1) {
          await new Promise((r) => setTimeout(r, 600));
          if (!cancelled) return load(attempt + 1);
          return;
        }
        console.error('[auth] profile load threw:', err);
        setUser(null);
        setLoading(false);
      }
    };

    load(0);
    return () => {
      cancelled = true;
    };
  }, [sessionUserId]);

  const signIn = useCallback(async (email: string, password: string) => {
    // A fresh sign-in attempt supersedes any previous sign-out explanation.
    setSessionNotice(null);
    // Normalise the email so casing/whitespace differences never cause a
    // spurious "invalid credentials" result for a correct account.
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) return { error: mapAuthError(error) };
      if (!data?.user) {
        return { error: new Error('We couldn\u2019t complete the sign-in. Please try again.') };
      }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role, name, status, avatar')
        .eq('user_id', data.user.id)
        .maybeSingle();

      // A failed lookup must NOT be misreported as "no profile".
      if (profileErr) {
        console.error('[auth] profile lookup failed on sign-in:', profileErr);
        await supabase.auth.signOut().catch(() => { /* ignore */ });
        return { error: new Error('We couldn\u2019t verify your account right now. Please try again in a moment.') };
      }

      if (!profile) {
        await supabase.auth.signOut().catch(() => { /* ignore */ });
        return { error: new Error('We couldn\u2019t find a profile for this account. Please contact your administrator.') };
      }

      if (profile.status === 'suspended') {
        await supabase.auth.signOut().catch(() => { /* ignore */ });
        return { error: new Error('Your account has been deactivated. Please contact your administrator.') };
      }

      return {
        error: null,
        role: toRole(profile.role),
        status: toStatus(profile.status),
      };
    } catch (err) {
      return { error: mapAuthError(err) };
    }
  }, []);

  const signOut = useCallback(async (notice?: string) => {
    // Mark this as an intentional sign-out so the auth listener does not report
    // it to the user as an unexplained "session expired".
    manualSignOutRef.current = true;

    // Stop presence BEFORE the token is torn down so teammates see us go
    // offline immediately (rather than waiting for the socket to drop).
    try { stopOceansPresence(); } catch { /* ignore */ }

    // Clear the client-side authenticated state FIRST so sign-out is always
    // reflected immediately - even if the server call fails (offline, expired
    // token, network error). A failed network call must never leave the UI
    // looking signed-in with a stale user object.
    setUser(null);
    setSessionUserId(null);
    sessionUserIdRef.current = null;
    setSessionNotice(notice ?? null);

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[auth] server sign-out failed; clearing local session:', err);
      try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
    }

    // Any late SIGNED_OUT event belongs to this intentional action - release the
    // guard shortly after so a genuine expiry can still be reported.
    setTimeout(() => { manualSignOutRef.current = false; }, 2000);
  }, []);

  const dismissSessionNotice = useCallback(() => { setSessionNotice(null); }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, name, status, avatar')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error) {
      console.error('[auth] refreshProfile failed:', error);
      return;
    }
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
  }, []);

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
        sessionNotice,
        dismissSessionNotice,
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