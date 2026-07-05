import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ContactSection {
  id: string;
  page_slug: string;
  title: string | null;
  subtitle: string | null;
  body_text: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_link: string | null;
  button_text: string | null;
  button_link: string | null;
  profile_image: string | null;
  background_color: string | null;
  background_image: string | null;
  visible: boolean;
  sort_order: number;
}

export function useContactSections(pageSlug?: string) {
  const [sections, setSections] = useState<ContactSection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSections = useCallback(async () => {
    let query = supabase
      .from('contact_sections')
      .select('*')
      .eq('visible', true)
      .order('sort_order', { ascending: true });

    if (pageSlug) {
      query = query.or(`page_slug.eq.${pageSlug},page_slug.eq.global`);
    } else {
      query = query.eq('page_slug', 'global');
    }

    const { data } = await query;
    setSections(data || []);
    setLoading(false);
  }, [pageSlug]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  return { sections, loading, refresh: fetchSections };
}