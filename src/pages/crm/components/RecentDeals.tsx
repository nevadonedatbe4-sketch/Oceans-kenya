import { Link } from 'react-router-dom';

interface RecentDeal {
  id: string;
  title: string;
  status: string;
  price: number | null;
  created_at: string;
}

interface RecentDealsProps {
  deals: RecentDeal[];
  loading: boolean;
}

const statusStyles: Record<string, string> = {
  prospect: 'bg-[#0d5959]/8 text-[#0d5959]',
  negotiation: 'bg-[#fff5e6] text-[#f58300]',
  offer: 'bg-[#002349]/8 text-[#002349]',
  due_diligence: 'bg-[#001731]/8 text-[#001731]',
  closed_won: 'bg-[#e6f4ea] text-[#088135]',
  closed_lost: 'bg-[#fef2f2] text-[#dc2626]',
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
    <div className="relative bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent" />

      <div className="bg-[#0d5959]/10 lg:bg-[#0d5959]/5 px-4 md:px-5 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0d5959]/20 lg:bg-[#0d5959]/10 flex items-center justify-center">
            <i className="ri-briefcase-3-line text-[#5eead4] lg:text-[#0d5959] text-sm" />
          </div>
          <div>
            <h3 className="font-inter text-sm sm:text-base font-medium text-white lg:text-[#001731]">Recent Deals</h3>
            <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">Latest pipeline activity</p>
          </div>
        </div>
        <Link
          to="/crm/deals"
          className="text-xs sm:text-sm font-inter text-[#5eead4] lg:text-[#0d5959] hover:text-[#5eead4] lg:hover:text-[#001731] transition-colors whitespace-nowrap cursor-pointer"
        >
          View all
        </Link>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-[#1c3a5e]">
              <div className="h-3.5 w-32 bg-[#012a52] rounded animate-pulse mb-2" />
              <div className="h-3 w-20 bg-[#012a52] rounded animate-pulse" />
            </div>
          ))
        ) : deals.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm font-inter text-[#6b7280]">
            No deals yet
          </div>
        ) : (
          deals.map((deal) => (
            <div key={deal.id} className="px-4 py-3 border-b border-[#1c3a5e] flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-inter text-white font-semibold truncate">{deal.title}</p>
                <p className="text-xs font-inter text-[#6b7280]">{deal.price ? formatCurrency(deal.price) : '—'}</p>
              </div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-inter capitalize whitespace-nowrap flex-shrink-0 ml-3 ${
                deal.status === 'closed_won' ? 'bg-[#088135]/20 text-[#5eead4]' :
                deal.status === 'closed_lost' ? 'bg-[#dc2626]/20 text-red-300' :
                deal.status === 'negotiation' ? 'bg-[#f58300]/20 text-[#f58300]' :
                deal.status === 'offer' ? 'bg-[#023655]/30 text-[#e8f4f8]' :
                'bg-[#0d5959]/30 text-[#5eead4]'
              }`}>
                {statusLabels[deal.status] || deal.status}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="overflow-x-auto hidden lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f0f0f0]">
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider">
                Property
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider hidden md:table-cell">
                Value
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider">
                Stage
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider hidden sm:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0]/60">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 md:px-5 py-3">
                    <div className="h-4 w-32 bg-[#f7f8fa] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                    <div className="h-4 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <div className="h-5 w-16 bg-[#f7f8fa] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                    <div className="h-4 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : deals.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 md:px-5 py-8 text-center text-sm font-inter text-[#636363]">
                  No deals yet
                </td>
              </tr>
            ) : (
              deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-[#f7f8fa]/60 transition-colors">
                  <td className="px-4 md:px-5 py-3">
                    <p className="text-sm font-inter text-[#001731] font-semibold">{deal.title}</p>
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                    <p className="text-sm font-inter text-[#001731]">
                      {deal.price ? formatCurrency(deal.price) : '—'}
                    </p>
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-inter capitalize whitespace-nowrap ${statusStyles[deal.status] || 'bg-[#f7f8fa] text-[#9ca3af]'}`}>
                      {statusLabels[deal.status] || deal.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                    <span className="text-xs font-inter text-[#636363]">
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