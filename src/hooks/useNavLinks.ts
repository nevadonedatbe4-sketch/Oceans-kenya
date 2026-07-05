import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface NavLink {
  id: string;
  label: string;
  href: string;
  visible: boolean;
  sort_order: number;
}

export function useNavLinks() {
  const [links, setLinks] = useState<NavLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    const { data } = await supabase
      .from('nav_links')
      .select('id, label, href, visible, sort_order')
      .eq('visible', true)
      .order('sort_order', { ascending: true });
    setLinks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return { links, loading, refresh: fetchLinks };
}