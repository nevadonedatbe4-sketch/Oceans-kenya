import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface NavLink {
  id: string;
  label: string;
  href: string;
  visible: boolean;
  sort_order: number;
  parent_id: string | null;
  children: NavLink[];
}

export function useNavLinks() {
  const [links, setLinks] = useState<NavLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    const { data } = await supabase
      .from('nav_links')
      .select('id, label, href, visible, sort_order, parent_id')
      .eq('visible', true)
      .order('sort_order', { ascending: true });
    if (!data) {
      setLinks([]);
      setLoading(false);
      return;
    }

    // Separate parents and children
    const allLinks: NavLink[] = data.map((l: any) => ({ ...l, children: [] }));
    const parents = allLinks.filter((l) => !l.parent_id);
    const children = allLinks.filter((l) => l.parent_id);

    // Nest children under parents
    children.forEach((child) => {
      const parent = parents.find((p) => p.id === child.parent_id);
      if (parent) {
        parent.children.push(child);
      }
    });

    setLinks(parents);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return { links, loading, refresh: fetchLinks };
}