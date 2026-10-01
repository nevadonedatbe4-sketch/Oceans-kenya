import { useState, useEffect } from 'react';
import type { Lead, Agent } from '../types';
import { statusOptions, statusLabels, statusColors, clientTypeLabels, clientTypeColors } from '../types';
import type { MessageTabKey } from '@/pages/crm/messageSystem';
import { displayPersonName, displayTitle } from '@/lib/crmDisplay';

interface LeadTableProps {
  leads: Lead[];
  loading: boolean;
  selectedLeadIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onSelectLead: (lead: Lead) => void;
  onStatusChange: (id: string, newStatus: string) => void;
  onAssignAgent: (leadId: string, agentId: string) => void;
  updatingId: string | null;
  actionMenu: string | null;
  onActionMenu: (id: string | null) => void;
  onAssign: (leadId: string) => void;
  onAddNote: (leadId: string, currentNotes: string | null) => void;
  onDelete: (leadId: string) => void;
  onPermanentDelete: (leadId: string) => void;
  onRestore: (leadId: string) => void;
  onToggleRead: (leadId: string) => void;
  onToggleStar: (leadId: string) => void;
  onToggleImportant: (leadId: string) => void;
  onMarkSpam: (leadId: string) => void;
  onArchive: (leadId: string) => void;
  onOpenLabel: (leadId: string) => void;
  onForward: (leadId: string) => void;
  agents: Agent[];
  messageTab: MessageTabKey;
  isAgent: boolean;
}

export default function LeadTable({
  leads,
  loading,
  selectedLeadIds,
  onToggleSelect,
  onToggleSelectAll,
  onSelectLead,
  onStatusChange,
  onAssignAgent,
  updatingId,
  actionMenu,
  onActionMenu,
  onAssign,
  onAddNote,
  onDelete,
  onPermanentDelete,
  onRestore,
  onToggleRead,
  onToggleStar,
  onToggleImportant,
  onMarkSpam,
  onArchive,
  onOpenLabel,
  onForward,
  agents,
  messageTab,
  isAgent,
}: LeadTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const inTrash = messageTab === 'trash';
  const inSpam = messageTab === 'spam';

  const getInitials = (lead: Lead) => {
    const f = lead.first_name?.charAt(0) || '';
    const l = lead.last_name?.charAt(0) || '';
    return (f + l).toUpperCase() || '?';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatBudget = (budget: number | null) => {
    if (!budget) return '—';
    if (budget >= 1000000) return `$${(budget / 1000000).toFixed(1)}M`;
    if (budget >= 1000) return `$${(budget / 1000).toFixed(0)}K`;
    return `$${budget.toLocaleString()}`;
  };

  const truncateText = (text: string | null, maxLen: number) => {
    if (!text) return '—';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
  };

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-lg overflow-hidden shadow-sm">
      {/* Pipeline Header */}
      <div className="px-4 py-3 bg-[#f5f5f5] border-b border-[#d0d0d0]">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <i className="ri-table-line text-[#636363] text-sm" />
            <h2 className="text-sm font-inter font-semibold text-[#333] tracking-wide uppercase">
              oceans Real Estate Pipeline {now.getFullYear()}
            </h2>
          </div>
          <span className="text-[11px] font-inter text-[#636363] whitespace-nowrap">
            {now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f0f0f0] border-b border-[#d0d0d0]">
              {!isAgent && (
                <th className="px-2 py-2.5 border-r border-[#e0e0e0] w-8">
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.size === leads.length && leads.length > 0}
                    onChange={onToggleSelectAll}
                    className="w-4 h-4 rounded border-[#d0d0d0] text-[#0d5959] focus:ring-[#0d5959] cursor-pointer"
                  />
                </th>
              )}
              <th className="px-3 py-2.5 text-left text-[11px] font-inter font-semibold text-[#555] uppercase tracking-wider border-r border-[#e0e0e0] whitespace-nowrap">
                Date
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-inter font-semibold text-[#555] uppercase tracking-wider border-r border-[#e0e0e0] min-w-[180px]">
                Name & Contacts
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-inter font-semibold text-[#555] uppercase tracking-wider border-r border-[#e0e0e0] whitespace-nowrap">
                Lead Source
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-inter font-semibold text-[#555] uppercase tracking-wider border-r border-[#e0e0e0] min-w-[200px]">
                Description
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-inter font-semibold text-[#555] uppercase tracking-wider border-r border-[#e0e0e0] whitespace-nowrap">
                Budget/Price
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-inter font-semibold text-[#555] uppercase tracking-wider border-r border-[#e0e0e0] whitespace-nowrap">
                Move-in/Available
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-inter font-semibold text-[#555] uppercase tracking-wider border-r border-[#e0e0e0] min-w-[150px]">
                Status
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-inter font-semibold text-[#555] uppercase tracking-wider border-r border-[#e0e0e0] min-w-[150px]">
                Assigned To
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-inter font-semibold text-[#555] uppercase tracking-wider border-r border-[#e0e0e0] min-w-[260px]">
                Notes
              </th>
              <th className="px-2 py-2.5 text-center text-[11px] font-inter font-semibold text-[#555] uppercase tracking-wider w-10">
                <i className="ri-more-fill" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#cbd5e1]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#e8e8e8]">
                  <td className="px-2 py-3">
                    <div className="w-4 h-4 bg-[#f0f0f0] rounded animate-pulse" />
                  </td>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 bg-[#f0f0f0] rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={isAgent ? 9 : 11} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-[#f7f8fa] flex items-center justify-center">
                      <i className="ri-user-add-line text-[#0d5959] text-lg" />
                    </div>
                    <p className="text-sm font-inter text-[#636363]">
                      {inTrash ? 'Trash is empty' : inSpam ? 'No spam leads' : 'No leads match your filters.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const unread = !lead.is_read && !inTrash;
                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-[#e8e8e8] transition-colors cursor-pointer ${
                      hoveredRow === lead.id ? 'bg-[#fafafa]' : unread ? 'bg-[#0d5959]/[0.04]' : 'bg-white'
                    }`}
                    onMouseEnter={() => setHoveredRow(lead.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('input[type="checkbox"]') ||
                          (e.target as HTMLElement).closest('select') ||
                          (e.target as HTMLElement).closest('button')) {
                        return;
                      }
                      onSelectLead(lead);
                    }}
                  >
                    <td className="px-2 py-2.5 border-r border-[#e8e8e8]" onClick={(e) => e.stopPropagation()}>
                      {!isAgent && (
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.has(lead.id)}
                          onChange={() => onToggleSelect(lead.id)}
                          className="w-4 h-4 rounded border-[#d0d0d0] text-[#0d5959] focus:ring-[#0d5959] cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-inter text-[#555] whitespace-nowrap border-r border-[#e8e8e8]">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-3 py-2.5 border-r border-[#e8e8e8] min-w-[180px]">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0d5959]/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[#0d5959] text-[10px] font-inter font-bold">{getInitials(lead)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-inter truncate flex items-center gap-1.5 ${unread ? 'font-bold' : 'font-semibold'}`} style={{ color: '#001731' }}>
                            {unread && <span className="w-2 h-2 rounded-full bg-[#0d5959] flex-shrink-0" title="Unread" />}
                            <span className="truncate">{displayPersonName(lead.first_name, lead.last_name)}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); onToggleStar(lead.id); }}
                              title={lead.is_starred ? 'Unstar' : 'Star'}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#f0f0f0] flex-shrink-0 cursor-pointer"
                            >
                              <i className={`${lead.is_starred ? 'ri-star-fill text-[#f5b50a]' : 'ri-star-line text-[#c0c0c0]'} text-sm`} />
                            </button>
                            {lead.is_important && (
                              <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                                <i className="ri-flag-fill text-[#dc2626] text-sm" title="Important" />
                              </span>
                            )}
                          </p>
                          {lead.phone && <p className="text-[11px] font-inter text-[#636363]">{lead.phone}</p>}
                          <p className="text-[11px] font-inter text-[#9ca3af] truncate">{lead.email}</p>
                          {lead.labels && lead.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {lead.labels.map((label) => (
                                <span key={label} className="text-[9px] font-inter font-semibold px-1.5 py-0.5 rounded bg-[#0d5959]/10 text-[#0d5959]">
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-inter text-[#636363] capitalize whitespace-nowrap border-r border-[#e8e8e8]">
                      {lead.source || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-inter text-[#636363] border-r border-[#e8e8e8] min-w-[200px] max-w-[280px]">
                      <p className="line-clamp-2" title={lead.message || lead.notes || ''}>
                        {truncateText(lead.message || lead.notes, 120)}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-inter font-semibold text-[#001731] whitespace-nowrap border-r border-[#e8e8e8]">
                      {formatBudget(lead.budget)}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-inter text-[#636363] whitespace-nowrap border-r border-[#e8e8e8]">
                      {lead.move_in_date || '—'}
                    </td>
                    <td className="px-3 py-2.5 border-r border-[#e8e8e8] min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1.5">
                        <div className="relative">
                          <select
                            value={lead.status || 'new'}
                            onChange={(e) => onStatusChange(lead.id, e.target.value)}
                            disabled={updatingId === lead.id}
                            className={`text-[10px] font-inter font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-1 focus:ring-[#0d5959]/20 ${statusColors[lead.status || 'new'] || 'bg-[#f7f8fa] text-[#636363]'}`}
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s} className="capitalize bg-white text-[#636363] text-xs font-inter">
                                {statusLabels[s]}
                              </option>
                            ))}
                          </select>
                          {updatingId === lead.id && (
                            <i className="ri-loader-4-line animate-spin text-[#0d5959] text-[10px] ml-1 inline-block" />
                          )}
                        </div>
                        {lead.client_type && (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-inter font-semibold capitalize ${clientTypeColors[lead.client_type] || 'bg-[#f7f8fa] text-[#636363]'}`}>
                            {clientTypeLabels[lead.client_type] || lead.client_type}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 border-r border-[#e8e8e8] whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {!isAgent && (
                        <select
                          value={lead.agent_id || ''}
                          onChange={(e) => onAssignAgent(lead.id, e.target.value)}
                          disabled={updatingId === lead.id}
                          className="text-[10px] font-inter font-medium px-2 py-1.5 rounded-lg border border-[#e0e0e0] bg-white text-[#555] cursor-pointer focus:outline-none focus:border-[#0d5959] max-w-[150px]"
                        >
                          <option value="">Unassigned</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.id} className="text-xs font-inter">{displayTitle(a.name)}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-inter text-[#636363] border-r border-[#e8e8e8] min-w-[260px] max-w-[360px]">
                      {lead.notes ? (
                        <p className="line-clamp-3 whitespace-pre-wrap" title={lead.notes}>{lead.notes}</p>
                      ) : (
                        <span className="text-[#9ca3af]">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onActionMenu(actionMenu === lead.id ? null : lead.id); }}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f7f8fa] text-[#9ca3af] hover:text-[#636363] transition-colors cursor-pointer"
                      >
                        <i className="ri-more-2-fill text-lg" />
                      </button>
                      {actionMenu === lead.id && (
                        <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-[#f0f0f0] shadow-lg min-w-[190px] py-1">
                          <button onClick={() => { onSelectLead(lead); onActionMenu(null); }} className="menu-item">
                            <i className="ri-eye-line mr-2 text-[#636363]" /> View Lead
                          </button>
                          <button onClick={() => { onToggleRead(lead.id); onActionMenu(null); }} className="menu-item">
                            <i className={`mr-2 text-[#636363] ${lead.is_read ? 'ri-mail-unread-line' : 'ri-mail-check-line'}`} />
                            {lead.is_read ? 'Mark as Unread' : 'Mark as Read'}
                          </button>
                          <button onClick={() => { onToggleStar(lead.id); onActionMenu(null); }} className="menu-item">
                            <i className="ri-star-line mr-2 text-[#636363]" /> {lead.is_starred ? 'Unstar' : 'Star'}
                          </button>
                          <button onClick={() => { onToggleImportant(lead.id); onActionMenu(null); }} className="menu-item">
                            <i className="ri-flag-line mr-2 text-[#636363]" /> {lead.is_important ? 'Remove Important' : 'Mark Important'}
                          </button>
                          {!isAgent && (
                            <>
                              <button onClick={() => { onOpenLabel(lead.id); onActionMenu(null); }} className="menu-item">
                                <i className="ri-price-tag-3-line mr-2 text-[#636363]" /> Label As
                              </button>
                              <button onClick={() => { onForward(lead.id); onActionMenu(null); }} className="menu-item">
                                <i className="ri-share-forward-line mr-2 text-[#636363]" /> Forward
                              </button>
                            </>
                          )}
                          {!isAgent && (
                            <button onClick={() => { onAssign(lead.id); onActionMenu(null); }} className="menu-item">
                              <i className="ri-user-add-line mr-2 text-[#636363]" /> Assign Agent
                            </button>
                          )}
                          <button onClick={() => { onAddNote(lead.id, lead.notes); onActionMenu(null); }} className="menu-item">
                            <i className="ri-sticky-note-line mr-2 text-[#636363]" /> Add Note
                          </button>
                          <div className="border-t border-[#f0f0f0] my-1" />
                          {inTrash || inSpam ? (
                            <>
                              <button onClick={() => { onRestore(lead.id); onActionMenu(null); }} className="menu-item">
                                <i className="ri-arrow-go-back-line mr-2 text-[#636363]" /> Restore
                              </button>
                              <button onClick={() => { onPermanentDelete(lead.id); onActionMenu(null); }} className="menu-item text-red-600">
                                <i className="ri-delete-bin-line mr-2" /> Delete Forever
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { onMarkSpam(lead.id); onActionMenu(null); }} className="menu-item">
                                <i className="ri-spam-2-line mr-2 text-[#636363]" /> Mark Spam
                              </button>
                              <button onClick={() => { onArchive(lead.id); onActionMenu(null); }} className="menu-item">
                                <i className="ri-archive-line mr-2 text-[#636363]" /> Archive
                              </button>
                              <button onClick={() => { onDelete(lead.id); onActionMenu(null); }} className="menu-item text-red-600">
                                <i className="ri-delete-bin-line mr-2" /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 bg-[#f7f8fa] border-t border-[#e0e0e0] flex items-center justify-between">
        <span className="text-[11px] font-inter text-[#9ca3af]">
          {leads.length} leads shown
        </span>
        <span className="text-[11px] font-inter text-[#9ca3af]">
          {now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <style>{`
        .menu-item { width: 100%; text-align: left; padding: 8px 12px; font-size: 12px; color: #001731; display: flex; align-items: center; transition: background 0.15s; cursor: pointer; }
        .menu-item:hover { background: #f7f8fa; }
      `}</style>
    </div>
  );
}