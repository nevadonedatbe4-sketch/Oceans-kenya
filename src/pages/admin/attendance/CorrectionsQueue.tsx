import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fmtDay, fmtTime } from './attendanceUtils';

interface Corr {
  id: string;
  user_id: string;
  session_id: string | null;
  requested_clock_out_at: string | null;
  reason: string;
  status: string;
  created_at: string;
  reviewer_note: string | null;
}

export default function CorrectionsQueue() {
  const [rows, setRows] = useState<Corr[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('og_attendance_corrections').select('*').order('created_at', { ascending: false }).limit(100);
      setRows((data || []) as Corr[]);
      const ids = Array.from(new Set((data || []).map((c) => c.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id,name').in('user_id', ids);
        setNames(new Map((profs || []).map((p) => [p.user_id, p.name || 'Team member'])));
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (c: Corr, decision: 'approved' | 'rejected') => {
    setBusyId(c.id);
    try {
      await supabase.functions.invoke('og-checkin', { body: { action: 'admin_review_correction', correction_id: c.id, decision, note: note || undefined } });
      setNoteFor(null); setNote('');
      await load();
    } finally { setBusyId(null); }
  };

  const pending = rows.filter((r) => r.status === 'pending');
  const resolved = rows.filter((r) => r.status !== 'pending').slice(0, 20);

  const card = 'bg-[#012144] rounded-2xl border border-[#1c3a5e] p-4';

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center text-[#8b98ab] py-10"><i className="ri-loader-4-line animate-spin inline-block" /></div>
      ) : pending.length === 0 ? (
        <div className={`${card} text-center py-8`}><i className="ri-checkbox-circle-line text-3xl text-emerald-400" /><p className="text-sm text-[#8b98ab] mt-2">No pending corrections</p></div>
      ) : pending.map((c) => (
        <div key={c.id} className={card}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <p className="text-sm font-semibold text-white">{names.get(c.user_id) || 'Team member'} requested a correction</p>
              <p className="text-xs text-[#c6d0dc] mt-1">{c.reason}</p>
              <p className="text-[11px] text-[#8b98ab] mt-1">
                Requested punch-out: {c.requested_clock_out_at ? `${fmtDay(c.requested_clock_out_at)} ${fmtTime(c.requested_clock_out_at)}` : 'n/a'} · raised {fmtDay(c.created_at)}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <button disabled={busyId === c.id} onClick={() => { setNoteFor(c.id); setNote(''); }} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/80 text-xs font-semibold hover:bg-white/20 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                <i className="ri-edit-2-line mr-1" />Add note
              </button>
              <button disabled={busyId === c.id} onClick={() => decide(c, 'approved')} className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-40 whitespace-nowrap">Approve</button>
              <button disabled={busyId === c.id} onClick={() => decide(c, 'rejected')} className="px-3.5 py-1.5 rounded-lg bg-white/10 text-white/80 text-xs font-semibold hover:bg-white/20 cursor-pointer disabled:opacity-40 whitespace-nowrap">Reject</button>
            </div>
          </div>
          {noteFor === c.id && (
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder="Reviewer note (optional)"
              className="mt-3 w-full px-3 py-2 rounded-lg bg-[#001731] border border-[#1c3a5e] text-sm text-white resize-none focus:outline-none focus:border-[#2a5480]" />
          )}
        </div>
      ))}

      {resolved.length > 0 && (
        <div className={card}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b98ab] mb-3">Recently reviewed</p>
          <div className="space-y-1.5">
            {resolved.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[#c6d0dc]">{names.get(c.user_id) || 'Team member'} · {c.reason.slice(0, 48)}</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${c.status === 'approved' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/60'}`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}