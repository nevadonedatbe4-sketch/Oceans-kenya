import { supabase } from '@/lib/supabase';

/**
 * Safe public profile fields for every staff member.
 *
 * `profiles` is only readable by your own row (or an admin), so a plain select
 * can never show teammates. Everything goes through the `og_org_directory`
 * SECURITY DEFINER function instead, which returns only the fields teammates
 * are allowed to see (name, role, avatar, title, about, phone, email, status,
 * country, department, office) and nothing sensitive like verification codes.
 */
export interface StaffRow {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  avatar_url: string | null;
  title: string | null;
  about: string | null;
  status: string | null;
  country: string | null;
  department: string | null;
  office: string | null;
}

export async function fetchStaffDirectory(): Promise<StaffRow[]> {
  const { data, error } = await supabase.rpc('og_org_directory');
  if (error) throw error;
  return (data || []) as StaffRow[];
}

/** Build a lookup map of staff rows keyed by user id. */
export async function fetchStaffMap(): Promise<Map<string, StaffRow>> {
  const rows = await fetchStaffDirectory();
  return new Map(rows.map((r) => [r.user_id, r]));
}