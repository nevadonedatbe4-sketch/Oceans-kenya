import { displayTitle, displayLocation } from '@/lib/crmDisplay';
import {
  JV_STATUS_LABELS, JV_STATUS_COLORS,
  DEAL_STRUCTURE_LABELS, formatMoney, parseJvStatus,
} from '@/pages/crm/jvOpportunityConstants';
import RowMoreMenu from '@/pages/crm/components/RowMoreMenu';
import type { JvOpportunityRow } from '@/pages/crm/components/jv/JVOpportunityCard';

interface Props {
  rows: JvOpportunityRow[];
  togglingId: string | null;
  onOpen: (id: string) => void;
  onTogglePublish: (id: string, currentlyPublic: boolean) => void;
  onToggleFeatured: (id: string, current: boolean) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const thClass = 'px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-[#6b7684] font-roboto whitespace-nowrap';
const tdClass = 'px-4 py-3.5 align-middle whitespace-nowrap';

export default function JVOpportunityListView({ rows, togglingId, onOpen, onTogglePublish, onToggleFeatured, onShare, onDelete }: Props) {
  return (
    <div className="bg-white border border-[#e2e7ec] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e2e7ec] bg-[#f8f9fb]">
              <th className={thClass}>Listing</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Structure</th>
              <th className={thClass}>Location</th>
              <th className={thClass}>Size</th>
              <th className={thClass}>Land Contribution</th>
              <th className={thClass}>Units / Landowner</th>
              <th className={thClass}>Added</th>
              <th className={`${thClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef1f4]">
            {rows.map((row) => {
              const { status: st, scheduledAt } = parseJvStatus(row.status);
              return (
                <tr
                  key={row.id}
                  onClick={() => onOpen(row.id)}
                  className="hover:bg-[#f8f9fb]/80 transition-colors cursor-pointer"
                >
                  <td className={tdClass}>
                    <div className="flex flex-col gap-1">
                      <span className="text-[15px] font-jost font-semibold text-[#001731] whitespace-nowrap">
                        {displayTitle(row.title) || 'Untitled Deal'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {row.is_public_listing ? (
                          <span className="text-[11px] font-roboto text-[#088135] bg-[#e6f4ea] px-1.5 py-0.5 rounded">Public</span>
                        ) : (
                          <span className="text-[11px] font-roboto text-[#6b7684] bg-[#f0f2f4] px-1.5 py-0.5 rounded">Internal</span>
                        )}
                        {row.is_featured && (
                          <span className="text-[11px] font-roboto text-white bg-amber-500 px-1.5 py-0.5 rounded">
                            <i className="ri-star-fill mr-0.5" />Featured
                          </span>
                        )}
                        {row.owner_name && (
                          <span className="text-[11px] font-roboto text-[#6b7684] inline-flex items-center gap-1 whitespace-nowrap">
                            <i className="ri-user-line" />{row.owner_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={tdClass}>
                    {st ? (
                      <span className={`inline-flex text-[12px] font-roboto font-semibold px-2 py-0.5 rounded whitespace-nowrap ${JV_STATUS_COLORS[st] || 'bg-[#f0f2f4] text-[#6b7684]'}`}>
                        {JV_STATUS_LABELS[st] || st}
                        {st === 'scheduled' && scheduledAt
                          ? ` · ${new Date(scheduledAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                          : ''}
                      </span>
                    ) : (
                      <span className="text-[14px] text-[#88929e]">—</span>
                    )}
                  </td>
                  <td className={tdClass}>
                    {row.deal_structure ? (
                      <span className="text-[12px] font-roboto text-[#001731] bg-[#e8edf2] px-2 py-0.5 rounded whitespace-nowrap">
                        {DEAL_STRUCTURE_LABELS[row.deal_structure] || row.deal_structure}
                      </span>
                    ) : (
                      <span className="text-[14px] text-[#88929e]">—</span>
                    )}
                  </td>
                  <td className={tdClass}>
                    <span className="text-[14px] font-roboto font-semibold text-[#001731]">
                      {displayLocation(row.land_location, null, { upper: true }) || '—'}
                    </span>
                  </td>
                  <td className={`${tdClass} text-[14px] font-roboto text-[#001731]`}>{row.land_size || '—'}</td>
                  <td className={`${tdClass} text-[14px] font-roboto font-semibold text-[#001731]`}>
                    {formatMoney(row.land_value, row.land_value_currency || '')}
                  </td>
                  <td className={`${tdClass} text-[14px] font-roboto text-[#001731]`}>
                    {row.total_planned_units
                      ? `${row.total_planned_units} → ${row.landowner_units_min || 0}${row.landowner_units_max && row.landowner_units_max !== row.landowner_units_min ? `–${row.landowner_units_max}` : ''}`
                      : '—'}
                  </td>
                  <td className={`${tdClass} text-[13px] font-roboto text-[#6b7684]`}>{formatDate(row.created_at)}</td>
                  <td className={tdClass}>
                    <RowMoreMenu
                      triggerLabel="Listing actions"
                      items={[
                        {
                          key: 'edit',
                          icon: 'ri-edit-line',
                          label: 'Edit',
                          onSelect: () => onOpen(row.id),
                        },
                        {
                          key: 'publish',
                          icon: row.is_public_listing ? 'ri-eye-off-line' : 'ri-eye-line',
                          label: row.is_public_listing ? 'Unpublish' : 'Publish',
                          onSelect: () => onTogglePublish(row.id, row.is_public_listing),
                        },
                        {
                          key: 'feature',
                          icon: row.is_featured ? 'ri-star-fill' : 'ri-star-line',
                          label: row.is_featured ? 'Unfeature' : 'Feature',
                          onSelect: () => onToggleFeatured(row.id, row.is_featured),
                        },
                        {
                          key: 'share',
                          icon: 'ri-share-line',
                          label: 'Share link',
                          onSelect: () => onShare(row.id),
                        },
                        {
                          key: 'delete',
                          icon: 'ri-delete-bin-line',
                          label: 'Delete',
                          danger: true,
                          onSelect: () => onDelete(row.id),
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}