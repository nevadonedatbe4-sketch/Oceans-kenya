import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { addToast } from '@/pages/crm/components/CRMToast';
import type { AgentDatabaseRecord, AuditEntry } from '@/pages/crm/agent-database/types';

interface Filters {
  search: string;
  status: string;
  county: string;
  specialisation: string;
  quickFilter: string;
}

export function useAgentDatabase() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AgentDatabaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('agent_database')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRecords((data as AgentDatabaseRecord[]) || []);
    } catch (e: any) {
      console.error('Error fetching agent database:', e);
      setError(e?.message || 'Failed to load agent database');
      addToast('Failed to load agent database', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecord = useCallback(
    async (payload: Partial<AgentDatabaseRecord>) => {
      const { data, error } = await supabase
        .from('agent_database')
        .insert({ ...payload, created_by: user?.id || null })
        .select()
        .single();
      if (error) throw error;
      await logAudit('created', (data as AgentDatabaseRecord).id, { name: data.full_name });
      return data as AgentDatabaseRecord;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const updateRecord = useCallback(
    async (id: string, payload: Partial<AgentDatabaseRecord>, changedFields?: string[]) => {
      const { data, error } = await supabase
        .from('agent_database')
        .update({ ...payload, updated_by: user?.id || null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAudit('updated', id, {
        name: data.full_name,
        fields: changedFields || Object.keys(payload),
      });
      return data as AgentDatabaseRecord;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const deleteRecord = useCallback(
    async (id: string, name: string) => {
      const { error } = await supabase.from('agent_database').delete().eq('id', id);
      if (error) throw error;
      await logAudit('deleted', id, { name });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const logAudit = useCallback(
    async (action: string, agentId: string | null, details?: Record<string, unknown>) => {
      try {
        await supabase.from('agent_database_audit').insert({
          agent_database_id: agentId,
          action,
          actor_id: user?.id || null,
          actor_email: user?.email || null,
          details: details || null,
        });
      } catch (e) {
        console.error('Audit log error:', e);
      }
    },
    [user],
  );

  const fetchAudit = useCallback(async (): Promise<AuditEntry[]> => {
    const { data, error } = await supabase
      .from('agent_database_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data as AuditEntry[]) || [];
  }, []);

  const convertToAgent = useCallback(
    async (record: AgentDatabaseRecord) => {
      if (!record.email) {
        throw new Error('This prospect has no email address. Add an email before converting.');
      }

      // If already linked, don't duplicate
      if (record.agent_account_id) {
        throw new Error('This prospect is already linked to an agent account.');
      }

      // Check if an agent with this email already exists
      const { data: existing } = await supabase
        .from('agents')
        .select('id')
        .eq('email', record.email)
        .maybeSingle();

      let agentId = existing?.id as string | undefined;

      if (!agentId) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error('You must be logged in.');

        const res = await fetch(
          `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/invite-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              email: record.email,
              role: 'agent',
              name: record.full_name,
              title: record.job_title || record.agent_type || 'Agent',
              phone: record.phone || null,
              photo_url: record.profile_photo || null,
            }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to create agent account');
        }

        // Retrieve the newly created agent id
        const { data: newAgent } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', data.user_id)
          .maybeSingle();
        agentId = newAgent?.id as string | undefined;
      }

      // Link the account and update status
      await supabase
        .from('agent_database')
        .update({ agent_account_id: agentId || null, relationship_status: 'invited' })
        .eq('id', record.id);

      await logAudit('converted', record.id, { name: record.full_name, agent_id: agentId });

      return { agentId, message: existing?.id ? 'Linked to existing agent account.' : 'Agent account created and invitation ready.' };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const recordView = useCallback(
    async (id: string, name: string) => {
      await logAudit('viewed', id, { name });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  return {
    records,
    loading,
    error,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    fetchAudit,
    convertToAgent,
    logAudit,
    recordView,
  };
}

export type { Filters };