import { displayTitle, displayLocation } from '@/lib/crmDisplay';
import {
  JV_STATUS_LABELS, JV_STATUS_COLORS,
  DEAL_STRUCTURE_LABELS, formatMoney, parseJvStatus,
} from '@/pages/crm/jvOpportunityConstants';

export interface JvOpportunityRow {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  land_location: string | null;
  land_size: string | null;
  owner_name: string | null;
  deal_type: string | null;
  deal_structure: string | null;
  deal_currency: string | null;
  status: string | null;
  is_featured: boolean;
  is_public_listing: boolean;
  land_value: number | null;
  land_value_currency: string | null;
  total_planned_units: number | null;
  landowner_units_min: number | null;
  landowner_units_max: number | null;
  dev_payment_amount: number | null;
  dev_payment_frequency: string | null;
  dev_payment_currency: string | null;
  commission_structure: string | null;
  commission_payer: string | null;
  created_at: string;
}

interface Props {
  row: JvOpportunityRow;
  toggling: boolean;
  onOpen: () => void;
  onTogglePublish: () => void;
  onToggleFeatured: () => void;
  onShare: () => void;
  onDelete: () => void;
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function JVOpportunityCard({ row, toggling, onOpen, onTogglePublish, onToggleFeatured, onShare, onDelete }: Props) {
  return (
    <div
      onClick={onOpen}
      className="bg-white border border-[#e2e7ec] hover:border-[#001731]/30 transition-all group cursor-pointer"
    >
      <div className="p-4">
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {(() => {
            const { status: st, scheduledAt } = parseJvStatus(row.status);
            if (!st) return null;
            return (
              <span className={`text-[12px] font-roboto font-semibold px-2 py-0.5 rounded ${JV_STATUS_COLORS[st] || 'bg-[#f0f2f4] text-[#6b7684]'}`}>
                {JV_STATUS_LABELS[st] || st}
                {st === 'scheduled' && scheduledAt
                  ? ` · ${new Date(scheduledAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                  : ''}
              </span>
            );
          })()}
          {row.deal_structure && (
            <span className="text-[12px] font-roboto text-[#001731] bg-[#e8edf2] px-2 py-0.5 rounded">
              {DEAL_STRUCTURE_LABELS[row.deal_structure] || row.deal_structure}
            </span>
          )}
          {row.is_public_listing ? (
            <span className="text-[12px] font-roboto text-[#088135] bg-[#e6f4ea] px-2 py-0.5 rounded">Public</span>
          ) : (
            <span className="text-[12px] font-roboto text-[#6b7684] bg-[#f0f2f4] px-2 py-0.5 rounded">Internal</span>
          )}
          {row.is_featured && (
            <span className="text-[12px] font-roboto text-white bg-amber-500 px-2 py-0.5 rounded">
              <i className="ri-star-fill mr-0.5" /> Featured
            </span>
          )}
        </div>

        <h3 className="font-jost text-[17px] font-semibold text-[#001731] leading-snug">{displayTitle(row.title) || 'Untitled Deal'}</h3>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-[#e2e7ec]">
          <div>
            <p className="text-[12px] text-[#6b7684] font-roboto uppercase tracking-wider">Location</p>
            <p className="text-[16px] font-semibold text-[#001731]">{displayLocation(row.land_location, null, { upper: true }) || '—'}</p>
          </div>
          <div>
            <p className="text-[12px] text-[#6b7684] font-roboto uppercase tracking-wider">Size</p>
            <p className="text-[16px] font-semibold text-[#001731] truncate">{row.land_size || '—'}</p>
          </div>
          <div>
            <p className="text-[12px] text-[#6b7684] font-roboto uppercase tracking-wider">Land contribution</p>
            <p className="text-[16px] font-semibold text-[#001731] truncate">
              {formatMoney(row.land_value, row.land_value_currency || '')}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-[#6b7684] font-roboto uppercase tracking-wider">Units / Landowner</p>
            <p className="text-[16px] font-semibold text-[#001731] truncate">
              {row.total_planned_units
                ? `${row.total_planned_units} → ${row.landowner_units_min || 0}${row.landowner_units_max && row.landowner_units_max !== row.landowner_units_min ? `–${row.landowner_units_max}` : ''}`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-[#6b7684] font-roboto uppercase tracking-wider">Deal currency</p>
            <p className="text-[16px] font-semibold text-[#001731] truncate">{row.deal_currency || '—'}</p>
          </div>
          <div>
            <p className="text-[12px] text-[#6b7684] font-roboto uppercase tracking-wider">Dev-period payment</p>
            <p className="text-[16px] font-semibold text-[#001731] truncate">
              {row.dev_payment_amount
                ? `${formatMoney(row.dev_payment_amount, row.dev_payment_currency || '')}${row.dev_payment_frequency ? ` / ${row.dev_payment_frequency}` : ''}`
                : '—'}
            </p>
          </div>
        </div>

        {(row.owner_name || row.commission_structure) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#e2e7ec] text-[14px] text-[#6b7684] font-roboto flex-wrap">
            {row.owner_name && (
              <span className="inline-flex items-center gap-1"><i className="ri-user-line" />{row.owner_name}</span>
            )}
            {row.commission_structure && (
              <span className="inline-flex items-center gap-1"><i className="ri-vip-crown-line" />Commission: {row.commission_structure}</span>
            )}
            <span className="ml-auto">{formatDate(row.created_at)}</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-[#e2e7ec]">
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePublish(); }}
            disabled={toggling}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-none text-[12px] font-roboto transition-all cursor-pointer whitespace-nowrap shadow-[inset_0_0_0_1px_#cdd5de] ${row.is_public_listing ? 'bg-[#e6f4ea] text-[#088135]' : 'bg-white text-[#6b7684]'}`}
          >
            <i className={row.is_public_listing ? 'ri-eye-off-line' : 'ri-eye-line'} />
            {row.is_public_listing ? 'Unpublish' : 'Publish'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFeatured(); }}
            disabled={toggling}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-none text-[12px] font-roboto transition-all cursor-pointer whitespace-nowrap shadow-[inset_0_0_0_1px_#cdd5de] ${row.is_featured ? 'bg-[#fff5e6] text-[#f58300]' : 'bg-white text-[#6b7684]'}`}
          >
            <i className="ri-star-line" />
            {row.is_featured ? 'Unfeature' : 'Feature'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-none text-[12px] font-roboto text-[#6b7684] bg-white shadow-[inset_0_0_0_1px_#cdd5de] hover:text-[#dc2626] hover:shadow-[inset_0_0_0_1px_#dc2626] transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-delete-bin-line" />
            Delete
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-none text-[12px] font-roboto text-[#001731] bg-white shadow-[inset_0_0_0_1px_#001731] hover:bg-[#001731] hover:text-white transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-share-line" />
            Share
          </button>
          <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className="ml-auto text-[12px] font-roboto font-semibold text-[#001731] hover:underline cursor-pointer">
            Edit <i className="ri-arrow-right-line" />
          </button>
        </div>
      </div>
    </div>
  );
}