import { Link } from 'react-router-dom';
import type { RecentDeal } from '@/mocks/dashboard';

interface RecentDealsProps {
  deals: RecentDeal[];
  loading: boolean;
}

const statusStyles: Record<string, string> = {
  prospect: 'bg-[#0d5959]/8 text-[#0d5959]',
  negotiation: 'bg-amber-50 text-amber-700',
  offer: 'bg-sky-50 text-sky-700',
  due_diligence: 'bg-[#001731]/8 text-[#001731]',
  closed_won: 'bg-emerald-50 text-emerald-700',
  closed_lost: 'bg-red-50 text-red-700',
};

const statusLabels: Record<string, string> = {
  prospect: 'Prospect',
  negotiation: 'Negotiation',
  offer: 'Offer',
  due_diligence: 'Due Diligence',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

function formatCurrency(val: number) {
  if (val >= 1000000000) return `KSh ${(val / 1000000000).toFixed(1)}B`;
  if (val >= 1000000) return `KSh ${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `KSh ${(val / 1000).toFixed(0)}K`;
  return `KSh ${val}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RecentDeals({ deals, loading }: RecentDealsProps) {
  return (
    <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent" />

      <div className="bg-[#0d5959]/5 px-4 md:px-5 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0d5959]/10 flex items-center justify-center">
            <i className="ri-briefcase-3-line text-[#0d5959] text-sm" />
          </div>
          <div>
            <h3 className="font-jost text-sm sm:text-base font-medium text-[#001731]">Recent Deals</h3>
            <p className="text-xs font-roboto text-[#7a8a99]">Latest pipeline activity</p>
          </div>
        </div>
        <Link
          to="/crm/deals"
          className="text-xs sm:text-sm font-roboto text-[#0d5959] hover:text-[#001731] transition-colors whitespace-nowrap cursor-pointer"
        >
          View all
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e8edf2]">
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider">
                Property
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider hidden md:table-cell">
                Value
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider">
                Stage
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider hidden sm:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8edf2]/60">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 md:px-5 py-3">
                    <div className="h-4 w-32 bg-[#f8fafc] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                    <div className="h-4 w-20 bg-[#f8fafc] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <div className="h-5 w-16 bg-[#f8fafc] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                    <div className="h-4 w-20 bg-[#f8fafc] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : deals.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 md:px-5 py-8 text-center text-sm font-roboto text-[#7a8a99]">
                  No deals yet
                </td>
              </tr>
            ) : (
              deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-[#f8fafc]/60 transition-colors">
                  <td className="px-4 md:px-5 py-3">
                    <p className="text-sm font-roboto text-[#001731] font-medium">{deal.title}</p>
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                    <p className="text-sm font-roboto text-[#001731]">
                      {deal.price ? formatCurrency(deal.price) : '—'}
                    </p>
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-roboto capitalize whitespace-nowrap ${statusStyles[deal.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[deal.status] || deal.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                    <span className="text-xs font-roboto text-[#7a8a99]">
                      {formatDate(deal.created_at)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}