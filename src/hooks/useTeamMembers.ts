import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────
// TEAM MEMBERS — the internal staff directory.
//
// This is deliberately SEPARATE from the site's CRM `contacts`
// (clients, enquiries, buyers, sellers, newsletter signups). It is
// backed by its own `team_members` table and is admin-only (RLS gates
// every read/write behind is_admin()). It is also NOT the `agents`
// table — agent accounts are auth/portal linked; this is a lightweight,
// manually maintained directory of the people who make up the team,
// their team/department and their role.
// ─────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  team: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberInput {
  name: string;
  role: string;
  team: string;
  email: string;
  phone: string;
  status: string;
  notes: string;
}

export const MEMBER_STATUSES: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'inactive', label: 'Inactive' },
];

export const ROLE_SUGGESTIONS = [
  'Principal Agent',
  'Lettings Manager',
  'Property Manager',
  'Client Relations',
  'Marketing Lead',
  'Finance & Admin',
  'Sales Negotiator',
  'Operations',
  'Bookkeeper',
  'Reception',
];

export const TEAM_SUGGESTIONS = [
  'Sales',
  'Lettings',
  'Property Management',
  'Client Care',
  'Marketing',
  'Operations',
  'Finance',
];

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('team_members')
        .select('*')
        .order('name', { ascending: true });
      if (err) throw err;
      setMembers((data || []) as TeamMember[]);
    } catch (e) {
      setError((e as Error).message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addMember = useCallback(
    async (input: TeamMemberInput) => {
      const { error: err } = await supabase
        .from('team_members')
        .insert({ ...input, updated_at: new Date().toISOString() });
      if (err) throw err;
      await load();
    },
    [load],
  );

  const updateMember = useCallback(
    async (id: string, input: TeamMemberInput) => {
      const { error: err } = await supabase
        .from('team_members')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw err;
      await load();
    },
    [load],
  );

  const removeMember = useCallback(
    async (id: string) => {
      const { error: err } = await supabase.from('team_members').delete().eq('id', id);
      if (err) throw err;
      await load();
    },
    [load],
  );

  const teams = useMemo(
    () =>
      Array.from(new Set(members.map((m) => (m.team || '').trim()).filter(Boolean))).sort() as string[],
    [members],
  );

  return { members, teams, loading, error, reload: load, addMember, updateMember, removeMember };
}