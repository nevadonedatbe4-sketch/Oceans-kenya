import { Link } from 'react-router-dom';
import type { RecentLead } from '@/mocks/dashboard';

interface RecentLeadsProps {
  leads: RecentLead[];
  loading: boolean;
}

const statusStyles: Record<string, string> = {
  new: 'bg-[#0d5959]/8 text-[#0d5959]',
  contacted: 'bg-[#001731]/8 text-[#001731]',
  viewing: 'bg-amber-50 text-amber-700',
  negotiating: 'bg-sky-50 text-sky-700',
  won: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-red-50 text-red-700',
  archived: 'bg-gray-100 text-gray-600',
};

function getLeadName(lead: RecentLead) {
  return `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unnamed Lead';
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RecentLeads({ leads, loading }: RecentLeadsProps) {
  return (
    <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />

      <div className="bg-[#0d5959]/5 px-4 md:px-5 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0d5959]/10 flex items-center justify-center">
            <i className="ri-user-add-line text-[#0d5959] text-sm" />
          </div>
          <div>
            <h3 className="font-jost text-sm sm:text-base font-medium text-[#001731]">Recent Leads</h3>
            <p className="text-xs font-roboto text-[#7a8a99]">Latest inquiries and contacts</p>
          </div>
        </div>
        <Link
          to="/crm/leads"
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
                Name
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider hidden sm:table-cell">
                Source
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
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 md:px-5 py-3">
                    <div className="h-4 w-28 bg-[#f8fafc] rounded animate-pulse" />
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
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 md:px-5 py-8 text-center text-sm font-roboto text-[#7a8a99]">
                  No leads yet
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#f8fafc]/60 transition-colors">
                  <td className="px-4 md:px-5 py-3">
                    <div>
                      <p className="text-sm font-roboto text-[#001731] font-medium">
                        {getLeadName(lead)}
                      </p>
                      <p className="text-xs font-roboto text-[#7a8a99]">{lead.email}</p>
                    </div>
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                    <span className="text-xs font-roboto text-[#7a8a99]">
                      {lead.source || '—'}
                    </span>
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-roboto capitalize whitespace-nowrap ${statusStyles[lead.status] || 'bg-gray-100 text-gray-600'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                    <span className="text-xs font-roboto text-[#7a8a99]">
                      {formatDate(lead.created_at)}
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