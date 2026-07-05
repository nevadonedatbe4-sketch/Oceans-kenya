import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface FooterSetting {
  id: string;
  key: string;
  value: string | null;
  category: string;
}

export function useFooterSettings() {
  const [settings, setSettings] = useState<FooterSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('footer_settings').select('*');
    setSettings(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const getValue = (key: string) => settings.find((s) => s.key === key)?.value || '';

  return { settings, loading, refresh: fetchSettings, getValue };
}