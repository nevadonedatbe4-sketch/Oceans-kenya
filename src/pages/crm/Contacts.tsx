import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { displayTitle } from '@/lib/crmDisplay';
import ContactGroupNav from '@/pages/crm/contacts/components/ContactGroupNav';
import ContactGroupSection from '@/pages/crm/contacts/components/ContactGroupSection';
import ContactRow from '@/pages/crm/contacts/components/ContactRow';
import ContactsToolbar from '@/pages/crm/contacts/components/ContactsToolbar';
import ContactFiltersPanel from '@/pages/crm/contacts/components/ContactFiltersPanel';
import ContactsTable from '@/pages/crm/contacts/components/ContactsTable';
import ContactTagModal from '@/pages/crm/contacts/components/ContactTagModal';
import ContactFormModal, { type ContactFormData } from '@/pages/crm/contacts/components/ContactFormModal';
import GroupEditorModal from '@/pages/crm/contacts/components/GroupEditorModal';
import type { ContactGroup, ContactRecord } from '@/pages/crm/contacts/contactGroups';
import {
  VIEW_ALL,
  VIEW_GROUPS,
  NOT_ASSIGNED_ID,
  loadGroups,
  saveCustomGroups,
  loadAssignments,
  saveAssignments,
  bucketContacts,
  groupForContact,
  buildTags,
  styleForNewGroup,
} from '@/pages/crm/contacts/contactGroups';
import {
  applyFilters,
  sortContacts,
  toCsv,
  downloadCsv,
  type FilterRow,
  type MatchMode,
  type SortDir,
  type SortKey,
} from '@/pages/crm/contacts/contactTableUtils';

const ACTIVE_VIEW_KEY = 'crm_contacts_active_view';
const ACTIVE_TAB_KEY = 'crm_contacts_tab';
const STARRED_KEY = 'crm_contact_starred';
const PAGE_STEP = 25;

function loadStarred(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STARRED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

type Tab = 'overview' | 'list';

export default function Contacts() {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [activeTab, setActiveTab] = useState<Tab>(
    () => (typeof localStorage !== 'undefined' && localStorage.getItem(ACTIVE_TAB_KEY) === 'list' ? 'list' : 'overview'),
  );

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  // Table sorting + selection
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tagModal, setTagModal] = useState<{ open: boolean; mode: 'add' | 'remove' }>({
    open: false,
    mode: 'add',
  });
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [groups, setGroups] = useState<ContactGroup[]>(() => loadGroups());
  const [assignments, setAssignments] = useState<Record<string, string>>(() => loadAssignments());
  const [activeGroupId, setActiveGroupId] = useState<string>(
    () => (typeof localStorage !== 'undefined' && localStorage.getItem(ACTIVE_VIEW_KEY)) || VIEW_GROUPS,
  );

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<ContactRecord | null>(null);

  // ── Load contacts ──────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setContacts((data || []) as ContactRecord[]);
      setSelectedIds(new Set());
    } catch (e) {
      setError((e as Error).message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Persist grouping layer + active view / tab ─────────────
  useEffect(() => saveCustomGroups(groups), [groups]);
  useEffect(() => saveAssignments(assignments), [assignments]);
  useEffect(() => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(ACTIVE_VIEW_KEY, activeGroupId);
  }, [activeGroupId]);
  useEffect(() => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  }, [activeTab]);

  // ── Derived data ───────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const bySearch = term
      ? contacts.filter((c) =>
          [c.name, c.email, c.phone, c.company, c.type].some((v) =>
            (v || '').toLowerCase().includes(term),
          ),
        )
      : contacts;
    return applyFilters(bySearch, filters, matchMode);
  }, [contacts, search, filters, matchMode]);

  const grouped = useMemo(
    () => bucketContacts(filtered, groups, assignments),
    [filtered, groups, assignments],
  );

  const visible = (key: string) => visibleCounts[key] ?? PAGE_STEP;
  const showMore = (key: string) =>
    setVisibleCounts((p) => ({ ...p, [key]: (p[key] ?? PAGE_STEP) + PAGE_STEP }));

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;

  // Rows currently in scope for the table (respects the selected group).
  const baseRows = useMemo(() => {
    if (activeGroupId === VIEW_ALL || activeGroupId === VIEW_GROUPS) return filtered;
    const g = grouped.find((x) => x.id === activeGroupId);
    return g ? g.contacts : filtered;
  }, [activeGroupId, filtered, grouped]);

  const tableRows = useMemo(
    () => sortContacts(baseRows, sortKey, sortDir),
    [baseRows, sortKey, sortDir],
  );

  // ── Starring (independent of groups) ───────────────────────
  const [starred, setStarred] = useState<Set<string>>(() => loadStarred());

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STARRED_KEY, JSON.stringify([...starred]));
  }, [starred]);

  const isStarred = (c: ContactRecord) => starred.has(c.id);
  const starredIds = starred;

  const toggleStar = (c: ContactRecord) =>
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(c.id)) next.delete(c.id);
      else next.add(c.id);
      return next;
    });

  const moveToGroup = (c: ContactRecord, groupId: string) => {
    setAssignments((prev) => ({ ...prev, [c.id]: groupId }));
    const g = groups.find((x) => x.id === groupId);
    addToast(`Moved to ${g?.name || 'group'}`, 'success');
  };

  // ── Sorting ────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // ── Selection ──────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set(tableRows.map((r) => r.id)) : new Set());

  // ── Bulk actions ───────────────────────────────────────────
  const selectedContacts = useMemo(
    () => contacts.filter((c) => selectedIds.has(c.id)),
    [contacts, selectedIds],
  );

  const bulkUnsubscribe = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      const { error: err } = await supabase.from('contacts').update({ status: 'unsubscribed' }).in('id', ids);
      if (err) throw err;
      addToast(`${ids.length} contact${ids.length === 1 ? '' : 's'} unsubscribed`, 'success');
      await load();
    } catch {
      addToast('Failed to unsubscribe', 'error');
    }
  };

  const bulkDownload = () => {
    const rows = selectedContacts.length > 0 ? selectedContacts : tableRows;
    downloadCsv(`contacts-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
    addToast(`Exported ${rows.length} contact${rows.length === 1 ? '' : 's'}`, 'success');
  };

  const applyTag = async (tag: string, mode: 'add' | 'remove') => {
    const ids = [...selectedIds];
    try {
      for (const c of selectedContacts) {
        const current = c.tags || [];
        const next =
          mode === 'add'
            ? current.includes(tag)
              ? current
              : [...current, tag]
            : current.filter((t) => t !== tag);
        const { error: err } = await supabase.from('contacts').update({ tags: next }).eq('id', c.id);
        if (err) throw err;
      }
      addToast(
        `${mode === 'add' ? 'Added' : 'Removed'} tag on ${ids.length} contact${ids.length === 1 ? '' : 's'}`,
        'success',
      );
      setTagModal({ open: false, mode: 'add' });
      await load();
    } catch {
      addToast('Failed to update tags', 'error');
    }
  };

  const bulkDelete = async () => {
    const ids = [...selectedIds];
    try {
      const { error: err } = await supabase.from('contacts').delete().in('id', ids);
      if (err) throw err;
      setAssignments((prev) => {
        const next = { ...prev };
        ids.forEach((id) => delete next[id]);
        return next;
      });
      setBulkDeleteOpen(false);
      addToast(`Deleted ${ids.length} contact${ids.length === 1 ? '' : 's'}`, 'success');
      await load();
    } catch {
      addToast('Failed to delete contacts', 'error');
    }
  };

  // ── Add / edit ─────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c: ContactRecord) => {
    setEditing(c);
    setFormOpen(true);
  };

  const handleSubmit = async (data: ContactFormData) => {
    setSubmitting(true);
    try {
      const name = `${data.firstName} ${data.lastName}`.trim() || data.email;
      const payload = {
        name,
        first_name: data.firstName.trim() || null,
        last_name: data.lastName.trim() || null,
        email: data.email.trim(),
        phone: data.phone.trim() || null,
        company: data.company.trim() || null,
        type: data.type || null,
        location: data.address.trim() || null,
        notes: data.notes.trim() || null,
        tags: buildTags(data.tags, data.jobTitle, data.website),
      };

      if (editing) {
        const { error: err } = await supabase.from('contacts').update(payload).eq('id', editing.id);
        if (err) throw err;
      } else {
        const { data: inserted, error: err } = await supabase
          .from('contacts')
          .insert({ ...payload, source: 'manual' })
          .select('id')
          .single();
        if (err) throw err;
        if (inserted?.id) setAssignments((prev) => ({ ...prev, [inserted.id]: data.groupId }));
      }
      if (editing) setAssignments((prev) => ({ ...prev, [editing.id]: data.groupId }));

      addToast(editing ? 'Contact updated' : 'Contact added', 'success');
      setFormOpen(false);
      setEditing(null);
      await load();
      return true;
    } catch {
      addToast('Failed to save contact', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteAction = async () => {
    const c = confirmDelete;
    if (!c) return;
    try {
      const { error: err } = await supabase.from('contacts').delete().eq('id', c.id);
      if (err) throw err;
      setAssignments((prev) => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });
      setConfirmDelete(null);
      addToast('Contact deleted', 'success');
      await load();
    } catch {
      addToast('Failed to delete contact', 'error');
    }
  };

  // ── Group CRUD ─────────────────────────────────────────────
  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupEditorOpen(true);
  };
  const handleGroupSave = (name: string, existing: ContactGroup | null) => {
    if (existing) {
      setGroups((prev) => prev.map((g) => (g.id === existing.id ? { ...g, name } : g)));
      addToast('Group renamed', 'success');
    } else {
      const id = `g_${Date.now().toString(36)}`;
      const style = styleForNewGroup(groups.filter((g) => !g.builtin).length);
      setGroups((prev) => [...prev, { id, name, icon: style.icon, color: style.color, builtin: false }]);
      addToast('Group created', 'success');
    }
    setGroupEditorOpen(false);
    setEditingGroup(null);
  };
  const handleGroupDelete = (g: ContactGroup) => {
    setGroups((prev) => prev.filter((x) => x.id !== g.id));
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === g.id) delete next[k];
      });
      return next;
    });
    if (activeGroupId === g.id) setActiveGroupId(VIEW_GROUPS);
    setGroupEditorOpen(false);
    setEditingGroup(null);
    addToast('Group deleted', 'success');
  };

  const navProps = {
    groups: grouped,
    totalCount: filtered.length,
    activeId: activeGroupId,
    onSelect: (id: string) => {
      setActiveGroupId(id);
      setMobileNavOpen(false);
      setSelectedIds(new Set());
    },
    onCreateGroup: openCreateGroup,
    onManageGroup: (g: ContactGroup) => {
      setEditingGroup(g);
      setGroupEditorOpen(true);
    },
  };

  const defaultGroupId = activeGroup ? activeGroup.id : NOT_ASSIGNED_ID;
  const formGroupId = editing ? groupForContact(editing, assignments) : defaultGroupId;

  const openTagModal = (mode: 'add' | 'remove') => setTagModal({ open: true, mode });

  const renderRow = (c: ContactRecord, groupId: string) => (
    <ContactRow
      key={c.id}
      contact={c}
      groups={grouped}
      currentGroupId={groupId}
      isSelected={editing?.id === c.id}
      isStarred={isStarred(c)}
      onSelect={openEdit}
      onEdit={openEdit}
      onDelete={setConfirmDelete}
      onMoveToGroup={moveToGroup}
      onToggleStar={toggleStar}
    />
  );

  const sectionProps = (g: (typeof grouped)[number], isCollapsed: boolean) => ({
    group: g,
    collapsed: isCollapsed,
    onToggle: toggleCollapse,
    visibleCount: visible(g.id),
    onShowMore: showMore,
    selectedId: editing?.id || null,
    starredIds,
    allGroups: grouped,
    onSelect: openEdit,
    onEdit: openEdit,
    onDelete: setConfirmDelete,
    onMoveToGroup: moveToGroup,
    onToggleStar: toggleStar,
  });

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="admin-page-title text-[#001731]">Contacts</h1>
        <p className="admin-body text-[#001731]/55 mt-0.5">
          A modern, group-organised directory of every contact in your CRM.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* DESKTOP — Contacts Groups sidebar (filter) */}
        <aside className="hidden lg:flex flex-col w-72 flex-shrink-0">
          <div className="sticky top-4 flex flex-col max-h-[calc(100vh-7rem)] bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
            <div className="px-4 py-4 border-b border-[#eef1f4] flex items-center gap-2.5">
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#001731] text-white flex-shrink-0">
                <i className="ri-folder-3-line text-lg" />
              </span>
              <h2 className="admin-subheading text-[#001731]">Contact Groups</h2>
            </div>
            <ContactGroupNav {...navProps} className="flex-1 min-h-0" />
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Toolbar + filters */}
          <ContactsToolbar
            activeTab={activeTab}
            onTabChange={(t) => {
              setActiveTab(t);
              setSelectedIds(new Set());
            }}
            search={search}
            onSearch={setSearch}
            onAddManual={openAdd}
            onImport={() => addToast('CSV import coming soon', 'info')}
            onDownload={bulkDownload}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((v) => !v)}
            activeFilterCount={filters.filter((f) => f.value.trim()).length}
          />

          <ContactFiltersPanel
            open={filtersOpen}
            applied={filters}
            matchMode={matchMode}
            onApply={(rows, mode) => {
              setFilters(rows);
              setMatchMode(mode);
              setSelectedIds(new Set());
              addToast('Filters applied', 'success');
            }}
            onClear={() => {
              setFilters([]);
              setMatchMode('all');
              setSelectedIds(new Set());
            }}
          />

          {/* Mobile groups button */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="group w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg admin-label font-semibold text-[#001731] border border-[#001731]/20 hover:bg-[#001731] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-layout-grid-line text-lg" />
              Contact Groups
              <span className="ml-1 inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-full admin-meta font-bold bg-[#001731]/8 text-[#001731] group-hover:bg-white/20 group-hover:text-white transition-colors">
                {activeGroup ? activeGroup.name : 'All'}
              </span>
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-[#eef1f4] animate-pulse" />
                  <div className="w-10 h-10 rounded-full bg-[#eef1f4] animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-44 bg-[#eef1f4] rounded animate-pulse" />
                    <div className="h-3.5 w-28 bg-[#eef1f4] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="bg-white border border-[#e5e7eb] rounded-xl py-12 text-center">
              <span className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-xl bg-[#dc2626]/10 text-[#dc2626]">
                <i className="ri-error-warning-line text-2xl" />
              </span>
              <p className="admin-body font-semibold text-[#001731]">Couldn't load contacts</p>
              <p className="admin-meta text-[#001731]/55 mt-1">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg admin-label font-semibold text-white bg-[#001731] hover:bg-[#0d5959] transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line text-lg" />
                Retry
              </button>
            </div>
          )}

          {/* Content once loaded */}
          {!loading && !error && (
            <>
              {filtered.length === 0 ? (
                <div className="bg-white border border-[#e5e7eb] rounded-xl py-14 text-center">
                  <span className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-xl bg-[#0d5959]/10 text-[#0d5959]">
                    <i className="ri-contacts-line text-2xl" />
                  </span>
                  <p className="admin-body font-semibold text-[#001731]">
                    {contacts.length === 0 ? 'No contacts yet' : 'No contacts match your search'}
                  </p>
                  <p className="admin-meta text-[#001731]/55 mt-1">
                    {contacts.length === 0
                      ? 'Form submissions and manually added contacts will appear here.'
                      : 'Try a different search term or clear your filters.'}
                  </p>
                  {contacts.length === 0 && (
                    <button
                      type="button"
                      onClick={openAdd}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg admin-label font-semibold text-white bg-[#001731] hover:bg-[#0d5959] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-user-add-line text-lg" />
                      Add Your First Contact
                    </button>
                  )}
                </div>
              ) : activeTab === 'list' ? (
                /* CONTACT LIST — sortable table */
                <ContactsTable
                  rows={tableRows}
                  groups={grouped}
                  currentGroupId={activeGroup ? activeGroup.id : NOT_ASSIGNED_ID}
                  selectedIds={selectedIds}
                  starredIds={starredIds}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  visibleCount={visible('table')}
                  onSort={handleSort}
                  onToggleSelect={toggleSelect}
                  onToggleAll={toggleAll}
                  onShowMore={() => showMore('table')}
                  onSelect={openEdit}
                  onEdit={openEdit}
                  onDelete={setConfirmDelete}
                  onMoveToGroup={moveToGroup}
                  onToggleStar={toggleStar}
                  onUnsubscribe={() => void bulkUnsubscribe()}
                  onDownload={bulkDownload}
                  onAddTags={() => openTagModal('add')}
                  onRemoveTags={() => openTagModal('remove')}
                  onBulkDelete={() => setBulkDeleteOpen(true)}
                />
              ) : activeGroupId === VIEW_ALL ? (
                /* OVERVIEW — flat list */
                <section className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 md:px-5 pt-4 pb-3">
                    <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#001731]/8 text-[#001731]">
                      <i className="ri-contacts-book-3-line text-lg" />
                    </span>
                    <h3 className="admin-heading text-[#001731] uppercase tracking-wide">All Contacts</h3>
                    <span className="inline-flex items-center justify-center min-w-[30px] h-7 px-2 rounded-full admin-meta font-bold bg-[#001731] text-white">
                      {filtered.length}
                    </span>
                  </div>
                  <div className="mx-4 md:mx-5 border-b-2 border-[#001731]/12" />
                  {filtered.slice(0, visible(VIEW_ALL)).map((c) => renderRow(c, assignments[c.id] || 'unassigned'))}
                  {filtered.length > visible(VIEW_ALL) && (
                    <div className="px-4 md:px-5 py-3 border-t border-[#eef1f4] text-center">
                      <button
                        type="button"
                        onClick={() => showMore(VIEW_ALL)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg admin-label font-semibold text-[#001731] border border-[#001731]/20 hover:bg-[#001731] hover:text-white transition-colors cursor-pointer"
                      >
                        <i className="ri-add-line text-lg" />
                        Show more ({filtered.length - visible(VIEW_ALL)} left)
                      </button>
                    </div>
                  )}
                </section>
              ) : activeGroupId === VIEW_GROUPS ? (
                /* OVERVIEW — every group as a collapsible section */
                <div className="space-y-4">
                  {grouped.map((g) => (
                    <ContactGroupSection key={g.id} {...sectionProps(g, collapsed.has(g.id))} />
                  ))}
                </div>
              ) : (
                /* OVERVIEW — single group */
                <ContactGroupSection
                  {...sectionProps(
                    grouped.find((g) => g.id === activeGroupId) || grouped[grouped.length - 1],
                    false,
                  )}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* MOBILE — full-height group navigation panel */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[330px] max-w-[88vw] bg-white flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#eef1f4]">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#001731] text-white flex-shrink-0">
                  <i className="ri-folder-3-line text-lg" />
                </span>
                <h2 className="admin-subheading text-[#001731]">Contact Groups</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close groups"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-[#001731]/55 hover:text-[#001731] hover:bg-[#001731]/8 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>
            <ContactGroupNav {...navProps} variant="mobile" className="flex-1 min-h-0" />
          </aside>
        </div>
      )}

      {/* Add / Edit contact */}
      <ContactFormModal
        open={formOpen}
        contact={editing}
        groups={groups}
        defaultGroupId={formGroupId}
        submitting={submitting}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      {/* Create / rename / delete group */}
      <GroupEditorModal
        open={groupEditorOpen}
        group={editingGroup}
        existingNames={groups.map((g) => g.name)}
        onClose={() => {
          setGroupEditorOpen(false);
          setEditingGroup(null);
        }}
        onSave={handleGroupSave}
        onDelete={handleGroupDelete}
      />

      {/* Bulk add / remove tag */}
      <ContactTagModal
        open={tagModal.open}
        mode={tagModal.mode}
        count={selectedIds.size}
        onClose={() => setTagModal({ open: false, mode: 'add' })}
        onApply={(tag, mode) => void applyTag(tag, mode)}
      />

      {/* Delete single contact */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001731]/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm p-6">
            <h3 className="admin-subheading text-[#001731] mb-2">Delete contact?</h3>
            <p className="admin-body text-[#001731]/60 mb-5">
              <span className="font-semibold text-[#001731]">{displayTitle(confirmDelete.name)}</span> will be permanently removed.
              This cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-[#001731]/20 rounded-lg admin-label font-medium text-[#001731] hover:bg-[#f7f9fb] transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteAction()}
                className="flex-1 px-4 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-lg admin-label font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete selected contacts */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001731]/50" onClick={() => setBulkDeleteOpen(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm p-6">
            <h3 className="admin-subheading text-[#001731] mb-2">Delete {selectedIds.size} contacts?</h3>
            <p className="admin-body text-[#001731]/60 mb-5">
              The selected contacts will be permanently removed. This cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(false)}
                className="flex-1 px-4 py-2.5 border border-[#001731]/20 rounded-lg admin-label font-medium text-[#001731] hover:bg-[#f7f9fb] transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void bulkDelete()}
                className="flex-1 px-4 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-lg admin-label font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Delete all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}