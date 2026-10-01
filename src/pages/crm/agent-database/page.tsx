import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAgentDatabase } from '@/hooks/useAgentDatabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import { getStatus, KENYA_COUNTIES, SPECIALISATIONS, QUICK_FILTERS } from './constants';
import type { AgentDatabaseRecord } from './types';
import AgentDetailPanel from './components/AgentDetailPanel';
import AgentFormModal from './components/AgentFormModal';
import AuditLogModal from './components/AuditLogModal';

const CSV_COLUMNS: { key: keyof AgentDatabaseRecord; label: string }[] = [
  { key: 'full_name', label: 'Name' },
  { key: 'agency', label: 'Agency' },
  { key: 'phone', label: 'Phone' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'county', label: 'County' },
  { key: 'city', label: 'City' },
  { key: 'primary_area', label: 'Primary Area' },
  { key: 'specialisations', label: 'Specialisation' },
  { key: 'strengths', label: 'Strengths' },
  { key: 'source', label: 'Source' },
  { key: 'super_admin_notes', label: 'Notes' },
  { key: 'relationship_status', label: 'Status' },
  { key: 'quality_score', label: 'Score' },
];

function csvEscape(v: any): string {
  if (v === null || v === undefined) return '';
  const s = Array.isArray(v) ? v.join('; ') : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cur); cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else {
      cur += c;
    }
  }
  row.push(cur);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

export default function AgentDatabasePage() {
  const { user } = useAuth();
  const {
    records,
    loading,
    error,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    convertToAgent,
    logAudit,
    recordView,
  } = useAgentDatabase();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countyFilter, setCountyFilter] = useState('all');
  const [specialisationFilter, setSpecialisationFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('');

  const [selected, setSelected] = useState<AgentDatabaseRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AgentDatabaseRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filtered = useMemo(() => {
    let list = records;
    if (quickFilter) {
      const qf = QUICK_FILTERS.find((q) => q.key === quickFilter);
      if (qf) list = list.filter(qf.predicate);
    }
    if (statusFilter !== 'all') list = list.filter((r) => r.relationship_status === statusFilter);
    if (countyFilter !== 'all') list = list.filter((r) => r.county === countyFilter);
    if (specialisationFilter !== 'all') list = list.filter((r) => (r.specialisations || []).includes(specialisationFilter));
    if (search.trim()) {
      const t = search.trim().toLowerCase();
      list = list.filter((r) =>
        [r.full_name, r.trading_name, r.agency, r.phone, r.whatsapp, r.email, r.primary_area, r.city, r.county]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(t)) ||
        (r.areas_served || []).some((a) => a.toLowerCase().includes(t)) ||
        (r.specialisations || []).some((a) => a.toLowerCase().includes(t)) ||
        (r.strengths || []).some((a) => a.toLowerCase().includes(t))
      );
    }
    return list;
  }, [records, search, statusFilter, countyFilter, specialisationFilter, quickFilter]);

  const stats = useMemo(() => {
    const count = (fn: (r: AgentDatabaseRecord) => boolean) => records.filter(fn).length;
    const counties: Record<string, number> = {};
    const specialisations: Record<string, number> = {};
    records.forEach((r) => {
      if (r.county) counties[r.county] = (counties[r.county] || 0) + 1;
      (r.specialisations || []).forEach((s) => { specialisations[s] = (specialisations[s] || 0) + 1; });
    });
    const topCounties = Object.entries(counties).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topSpecs = Object.entries(specialisations).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return {
      total: records.length,
      contacted: count((r) => r.relationship_status === 'contacted'),
      interested: count((r) => r.relationship_status === 'interested'),
      invited: count((r) => r.relationship_status === 'invited'),
      onboarding: count((r) => r.relationship_status === 'onboarding'),
      active: count((r) => r.relationship_status === 'active_agent'),
      topRated: count((r) => (r.quality_score ?? 0) >= 80),
      followUps: count((r) => !!r.next_follow_up_date),
      topCounties,
      topSpecs,
    };
  }, [records]);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <i className="ri-lock-line text-red-400 text-3xl" />
        </div>
        <h2 className="font-jost text-xl text-white font-semibold">Access Denied</h2>
        <p className="text-sm text-[#9ca3af] font-roboto mt-2 max-w-md">
          This area is restricted to Super Admin only. You do not have permission to view the Agent Database.
        </p>
      </div>
    );
  }

  const handleSave = async (payload: Partial<AgentDatabaseRecord>) => {
    setSaving(true);
    try {
      if (editing) {
        await updateRecord(editing.id, payload);
        addToast('Prospect updated', 'success');
      } else {
        await createRecord(payload);
        addToast('Prospect added to database', 'success');
      }
      setFormOpen(false);
      setEditing(null);
      await fetchRecords();
    } catch (e: any) {
      addToast(e?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!selected) return;
    setConverting(true);
    try {
      const res = await convertToAgent(selected);
      addToast(res.message, 'success');
      await fetchRecords();
    } catch (e: any) {
      addToast(e?.message || 'Failed to convert', 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteRecord(selected.id, selected.full_name);
      addToast('Prospect deleted', 'success');
      setSelected(null);
      setDeleteConfirm(false);
      await fetchRecords();
    } catch (e: any) {
      addToast(e?.message || 'Failed to delete', 'error');
      setDeleteConfirm(false);
    }
  };

  const handleSelect = (r: AgentDatabaseRecord) => {
    setSelected(r);
    recordView(r.id, r.full_name);
  };

  const handleExport = async () => {
    const header = CSV_COLUMNS.map((c) => c.label).join(',');
    const lines = filtered.map((r) => CSV_COLUMNS.map((c) => csvEscape(r[c.key])).join(','));
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-database-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    await logAudit('exported', null, { count: filtered.length });
    addToast(`Exported ${filtered.length} prospects`, 'success');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      addToast('CSV has no data rows', 'error');
      return;
    }
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const colIdx: Record<string, number> = {};
    headers.forEach((h, i) => { colIdx[h] = i; });

    let imported = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const get = (label: string) => {
        const idx = colIdx[label.toLowerCase()];
        return idx !== undefined ? (r[idx] || '').trim() : '';
      };
      const name = get('Name');
      if (!name) continue;
      const payload: Partial<AgentDatabaseRecord> = {
        full_name: name,
        agency: get('Agency') || null,
        phone: get('Phone') || null,
        whatsapp: get('WhatsApp') || null,
        email: get('Email') || null,
        website: get('Website') || null,
        county: get('County') || null,
        city: get('City') || null,
        primary_area: get('Primary Area') || null,
        specialisations: get('Specialisation') ? get('Specialisation').split(/[;|]/).map((s) => s.trim()).filter(Boolean) : [],
        strengths: get('Strengths') ? get('Strengths').split(/[;|]/).map((s) => s.trim()).filter(Boolean) : [],
        source: get('Source') || null,
        super_admin_notes: get('Notes') || null,
        relationship_status: get('Status') || 'new_prospect',
        quality_score: get('Score') ? Number(get('Score')) || null : null,
        created_by: user?.id || null,
      };
      try {
        await createRecord(payload);
        imported++;
      } catch {
        /* skip failed row */
      }
    }
    await logAudit('imported', null, { count: imported });
    addToast(`Imported ${imported} prospects`, 'success');
    await fetchRecords();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-white">Agent Database</h2>
          <p className="text-xs text-[#6b7280] font-roboto mt-0.5">
            Kenya's Top Real Estate Agent Prospecting Database — Super Admin private intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-roboto text-white/80 border border-white/20 hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-download-2-line" /> Export CSV
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-roboto text-white/80 border border-white/20 hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-upload-2-line" /> Import CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
          <button onClick={() => setAuditOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-roboto text-white/80 border border-white/20 hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-history-line" /> Audit Log
          </button>
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold bg-[#c8a45c] text-[#001731] hover:bg-[#b8953f] transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-user-add-line" /> Add Prospect
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Prospects', value: stats.total, color: 'text-white' },
          { label: 'Contacted', value: stats.contacted, color: 'text-[#c8a45c]' },
          { label: 'Interested', value: stats.interested, color: 'text-green-400' },
          { label: 'Invited', value: stats.invited, color: 'text-amber-400' },
          { label: 'Onboarding', value: stats.onboarding, color: 'text-[#5eead4]' },
          { label: 'Active Agents', value: stats.active, color: 'text-green-400' },
          { label: 'Top Rated', value: stats.topRated, color: 'text-[#5eead4]' },
          { label: 'Follow-Ups Due', value: stats.followUps, color: 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="bg-[#012144] rounded-lg p-3.5">
            <p className={`text-2xl font-jost ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[#6b7280] font-roboto mt-0.5 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Secondary breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#012144] rounded-lg p-4">
          <p className="text-xs font-roboto text-[#6b7280] uppercase tracking-wider mb-2">Agents by County</p>
          <div className="flex flex-wrap gap-1.5">
            {stats.topCounties.length === 0 ? (
              <span className="text-xs text-[#9ca3af] font-roboto">—</span>
            ) : stats.topCounties.map(([c, n]) => (
              <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#c8a45c]/15 text-[#c8a45c] text-xs rounded-full">{c} · {n}</span>
            ))}
          </div>
        </div>
        <div className="bg-[#012144] rounded-lg p-4">
          <p className="text-xs font-roboto text-[#6b7280] uppercase tracking-wider mb-2">Agents by Specialisation</p>
          <div className="flex flex-wrap gap-1.5">
            {stats.topSpecs.length === 0 ? (
              <span className="text-xs text-[#9ca3af] font-roboto">—</span>
            ) : stats.topSpecs.map(([s, n]) => (
              <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#5eead4]/15 text-[#5eead4] text-xs rounded-full">{s} · {n}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button onClick={() => setQuickFilter('')} className={`px-3 py-1.5 rounded-full text-xs font-roboto font-medium border transition-all cursor-pointer whitespace-nowrap ${quickFilter === '' ? 'bg-[#0d5959] text-white border-[#0d5959]' : 'bg-[#012144] text-[#9ca3af] border-[#1c3a5e] hover:border-[#0d5959]/40'}`}>
          All
        </button>
        {QUICK_FILTERS.map((q) => (
          <button key={q.key} onClick={() => setQuickFilter(quickFilter === q.key ? '' : q.key)} className={`px-3 py-1.5 rounded-full text-xs font-roboto font-medium border transition-all cursor-pointer whitespace-nowrap ${quickFilter === q.key ? 'bg-[#0d5959] text-white border-[#0d5959]' : 'bg-[#012144] text-[#9ca3af] border-[#1c3a5e] hover:border-[#0d5959]/40'}`}>
            {q.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="relative flex-1 w-full sm:max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-sm" />
          <input
            type="text"
            placeholder="Search by name, agency, phone, email, area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-[#1c3a5e] bg-[#012144] rounded-lg text-sm font-roboto text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#5eead4]"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-[#1c3a5e] bg-[#012144] rounded-lg text-sm font-roboto text-white focus:outline-none cursor-pointer">
          <option value="all">All Statuses</option>
          {(() => { const statuses = ['new_prospect','researched','contacted','follow_up_required','in_discussion','interested','invited','onboarding','active_agent','declined','not_interested','do_not_contact','archived']; return statuses.map((s) => { const st = getStatus(s); return <option key={s} value={s}>{st.label}</option>; }); })()}
        </select>
        <select value={countyFilter} onChange={(e) => setCountyFilter(e.target.value)} className="px-3 py-2.5 border border-[#1c3a5e] bg-[#012144] rounded-lg text-sm font-roboto text-white focus:outline-none cursor-pointer">
          <option value="all">All Counties</option>
          {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={specialisationFilter} onChange={(e) => setSpecialisationFilter(e.target.value)} className="px-3 py-2.5 border border-[#1c3a5e] bg-[#012144] rounded-lg text-sm font-roboto text-white focus:outline-none cursor-pointer">
          <option value="all">All Specialisations</option>
          {SPECIALISATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#012144] border border-[#1c3a5e] rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#0d5959] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16 px-6">
              <p className="text-sm text-red-400 font-roboto">{error}</p>
              <button onClick={() => fetchRecords()} className="mt-3 px-4 py-2 bg-[#0d5959] text-white rounded-lg text-sm cursor-pointer">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-14 h-14 rounded-xl bg-[#0d5959]/20 flex items-center justify-center mx-auto mb-3">
                <i className="ri-shield-user-line text-[#5eead4] text-xl" />
              </div>
              <p className="text-sm text-[#9ca3af] font-roboto font-medium">
                {records.length === 0 ? 'No agents in the database yet' : 'No agents match your filters'}
              </p>
              <p className="text-xs text-[#6b7280] font-roboto mt-1">
                {records.length === 0 ? 'Start prospecting by adding your first agent.' : 'Try adjusting your search or filters.'}
              </p>
              {records.length === 0 && (
                <button onClick={() => { setEditing(null); setFormOpen(true); }} className="mt-4 inline-flex items-center gap-2 bg-[#0d5959] text-white px-5 py-2.5 rounded-lg text-sm font-roboto cursor-pointer">
                  <i className="ri-user-add-line" /> Add Your First Prospect
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1c3a5e]">
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#6b7280] uppercase tracking-wider">Agent</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#6b7280] uppercase tracking-wider hidden md:table-cell">Speciality</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#6b7280] uppercase tracking-wider hidden sm:table-cell">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#6b7280] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#6b7280] uppercase tracking-wider hidden sm:table-cell">Follow-Up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a5688]">
                  {filtered.map((r) => {
                    const st = getStatus(r.relationship_status);
                    return (
                      <tr key={r.id} onClick={() => handleSelect(r)} className={`cursor-pointer transition-colors ${selected?.id === r.id ? 'bg-[#0d5959]/10' : 'hover:bg-white/5'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {r.profile_photo ? (
                              <img src={r.profile_photo} alt={r.full_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-[#0d5959]/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-[#5eead4] text-xs font-semibold">{r.full_name.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-roboto text-white font-medium truncate">{r.full_name}</p>
                              <p className="text-xs font-roboto text-[#6b7280] truncate">
                                {[r.agency, r.primary_area].filter(Boolean).join(' · ') || (r.county || '')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {(r.specialisations || []).slice(0, 2).map((s) => (
                              <span key={s} className="inline-flex px-1.5 py-0.5 bg-[#5eead4]/10 text-[#5eead4] text-[10px] rounded">{s}</span>
                            ))}
                            {(r.specialisations || []).length > 2 && <span className="text-[10px] text-[#6b7280]">+{(r.specialisations || []).length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {r.quality_score !== null && r.quality_score !== undefined ? (
                            <span className="inline-flex items-center gap-1 text-xs font-jost font-bold text-[#c8a45c]"><i className="ri-star-fill text-[10px]" />{r.quality_score}</span>
                          ) : <span className="text-xs text-[#6b7280]">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ backgroundColor: `${st.color}20`, color: st.color }}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs font-roboto text-[#9ca3af]">{r.next_follow_up_date || '—'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="bg-white rounded-xl overflow-hidden h-fit lg:sticky lg:top-20 max-h-[calc(100vh-120px)] flex flex-col">
          {selected ? (
            <AgentDetailPanel
              record={selected}
              converting={converting}
              onEdit={() => { setEditing(selected); setFormOpen(true); }}
              onDelete={() => setDeleteConfirm(true)}
              onConvert={handleConvert}
            />
          ) : (
            <div className="text-center py-16 px-6">
              <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center mx-auto mb-3">
                <i className="ri-shield-user-line text-[#0d5959] text-xl" />
              </div>
              <p className="text-sm font-roboto text-[#9ca3af]">Select an agent to view their private profile</p>
            </div>
          )}
        </div>
      </div>

      <AgentFormModal
        open={formOpen}
        record={editing}
        saving={saving}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
      />
      <AuditLogModal open={auditOpen} onClose={() => setAuditOpen(false)} />
      <ConfirmModal
        isOpen={deleteConfirm}
        title="Delete this prospect?"
        message={`This will permanently remove "${selected?.full_name || ''}" from the Agent Database. This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}