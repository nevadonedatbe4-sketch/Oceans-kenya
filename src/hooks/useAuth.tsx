import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: profile.role || 'admin',
          name: profile.name || session.user.email?.split('@')[0] || 'Admin',
          avatar: profile.avatar || undefined,
        });
      } catch {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: 'admin',
            name: session.user.email?.split('@')[0] || 'Admin',
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name, status, avatar')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.auth.signOut();
        return { error: new Error('No account found. Please contact your administrator.') };
      }

      if (profile.status === 'suspended') {
        await supabase.auth.signOut();
        return { error: new Error('Your account has been deactivated. Please contact your administrator.') };
      }
    }

    return { error: null };
  };

  const signOut = async () => {
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
        role: profile.role || 'admin',
        name: profile.name || session.user.email?.split('@')[0] || 'Admin',
        avatar: profile.avatar || undefined,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshProfile }}>
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