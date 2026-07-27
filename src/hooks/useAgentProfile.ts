import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface AgentProfile {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  avatar_url: string | null;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
}

export function useAgentProfile() {
  const { user } = useAuth();
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'agent') {
      setAgentProfile(null);
      setLoading(false);
      return;
    }

    const fetchAgentProfile = async () => {
      try {
        // Try lookup by user_id first
        let { data: agent } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // Fallback: lookup by email
        if (!agent) {
          const { data: emailAgent } = await supabase
            .from('agents')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();

          if (emailAgent) {
            agent = emailAgent;
            // Link the agent record to the user for future lookups
            await supabase
              .from('agents')
              .update({ user_id: user.id })
              .eq('id', emailAgent.id);
          }
        }

        setAgentProfile(agent);
      } catch (err) {
        console.error('Error fetching agent profile:', err);
        setAgentProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentProfile();
  }, [user]);

  return { agentProfile, loading, agentId: agentProfile?.id || null };
}