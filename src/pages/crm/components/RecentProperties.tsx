import { Link } from 'react-router-dom';
import type { RecentProperty } from '@/mocks/dashboard';

interface RecentPropertiesProps {
  properties: RecentProperty[];
  loading: boolean;
}

const statusStyles: Record<string, string> = {
  available: 'bg-emerald-50 text-emerald-700',
  sold: 'bg-[#001731]/8 text-[#001731]',
  rented: 'bg-[#0d5959]/8 text-[#0d5959]',
  hidden: 'bg-gray-100 text-gray-600',
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

export default function RecentProperties({ properties, loading }: RecentPropertiesProps) {
  return (
    <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />

      <div className="bg-[#0d5959]/5 px-4 md:px-5 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0d5959]/10 flex items-center justify-center">
            <i className="ri-building-4-line text-[#0d5959] text-sm" />
          </div>
          <div>
            <h3 className="font-jost text-sm sm:text-base font-medium text-[#001731]">Recent Properties</h3>
            <p className="text-xs font-roboto text-[#7a8a99]">Latest listings added</p>
          </div>
        </div>
        <Link
          to="/crm/listings"
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
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider hidden sm:table-cell">
                Price
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider hidden md:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8edf2]/60">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 md:px-5 py-3">
                    <div className="h-4 w-36 bg-[#f8fafc] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                    <div className="h-4 w-20 bg-[#f8fafc] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <div className="h-5 w-16 bg-[#f8fafc] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                    <div className="h-4 w-20 bg-[#f8fafc] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : properties.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 md:px-5 py-8 text-center text-sm font-roboto text-[#7a8a99]">
                  No properties yet
                </td>
              </tr>
            ) : (
              properties.map((prop) => (
                <tr key={prop.id} className="hover:bg-[#f8fafc]/60 transition-colors">
                  <td className="px-4 md:px-5 py-3">
                    <div>
                      <p className="text-sm font-roboto text-[#001731] font-medium">{prop.title}</p>
                      <p className="text-xs font-roboto text-[#7a8a99]">{prop.location || '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                    <p className="text-sm font-roboto text-[#001731]">
                      {prop.price ? formatCurrency(prop.price) : '—'}
                    </p>
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-roboto capitalize whitespace-nowrap ${statusStyles[prop.status] || 'bg-gray-100 text-gray-600'}`}>
                      {prop.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                    <span className="text-xs font-roboto text-[#7a8a99]">
                      {formatDate(prop.created_at)}
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