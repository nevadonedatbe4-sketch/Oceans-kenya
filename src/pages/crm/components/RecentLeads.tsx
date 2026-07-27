import { Link } from 'react-router-dom';

interface RecentLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  source: string | null;
  created_at: string;
}

interface RecentLeadsProps {
  leads: RecentLead[];
  loading: boolean;
}

const statusStyles: Record<string, string> = {
  new: 'bg-[#0d5959]/8 text-[#0d5959]',
  contacted: 'bg-[#001731]/8 text-[#001731]',
  viewing: 'bg-[#fff5e6] text-[#f58300]',
  negotiating: 'bg-[#e8f4f8] text-[#023655]',
  won: 'bg-[#e6f4ea] text-[#088135]',
  lost: 'bg-[#fef2f2] text-[#dc2626]',
  archived: 'bg-[#f7f8fa] text-[#9ca3af]',
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
    <div className="relative bg-white rounded-xl overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />

      <div className="bg-[#0d5959]/5 px-4 md:px-5 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0d5959]/10 flex items-center justify-center">
            <i className="ri-user-add-line text-[#0d5959] text-sm" />
          </div>
          <div>
            <h3 className="font-inter text-sm sm:text-base font-medium text-[#001731]">Recent Leads</h3>
            <p className="text-xs font-inter text-[#636363]">Latest inquiries and contacts</p>
          </div>
        </div>
        <Link
          to="/crm/leads"
          className="text-xs sm:text-sm font-inter text-[#0d5959] hover:text-[#001731] transition-colors whitespace-nowrap cursor-pointer"
        >
          View all
        </Link>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f0f0f0]">
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider hidden sm:table-cell">
                Source
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider hidden md:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0]/60">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 md:px-5 py-3">
                    <div className="h-4 w-28 bg-[#f7f8fa] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                    <div className="h-4 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <div className="h-5 w-16 bg-[#f7f8fa] rounded animate-pulse" />
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                    <div className="h-4 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 md:px-5 py-8 text-center text-sm font-inter text-[#636363]">
                  No leads yet
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#f7f8fa]/60 transition-colors">
                  <td className="px-4 md:px-5 py-3">
                    <div>
                      <p className="text-sm font-inter text-[#001731] font-semibold">
                        {getLeadName(lead)}
                      </p>
                      <p className="text-xs font-inter text-[#636363]">{lead.email}</p>
                    </div>
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                    <span className="text-xs font-inter text-[#636363]">
                      {lead.source || '—'}
                    </span>
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-inter capitalize whitespace-nowrap ${statusStyles[lead.status] || 'bg-[#f7f8fa] text-[#9ca3af]'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                    <span className="text-xs font-inter text-[#636363]">
                      {formatDate(lead.created_at)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-[#f0f0f0]/60">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 space-y-2">
              <div className="h-4 w-32 bg-[#f7f8fa] rounded animate-pulse" />
              <div className="h-3 w-24 bg-[#f7f8fa] rounded animate-pulse" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-5 w-16 bg-[#f7f8fa] rounded animate-pulse" />
                <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : leads.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm font-inter text-[#636363]">
            No leads yet
          </div>
        ) : (
          leads.map((lead) => (
            <Link
              key={lead.id}
              to={`/crm/leads`}
              className="block px-4 py-3 hover:bg-[#f7f8fa]/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-inter text-[#001731] font-semibold truncate">
                    {getLeadName(lead)}
                  </p>
                  <p className="text-xs font-inter text-[#636363] mt-0.5">{lead.email}</p>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-inter capitalize whitespace-nowrap shrink-0 mt-0.5 ${statusStyles[lead.status] || 'bg-[#f7f8fa] text-[#9ca3af]'}`}>
                  {lead.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-inter text-[#636363]">
                  {lead.source || '—'}
                </span>
                <span className="text-xs font-inter text-[#9ca3af]">
                  {formatDate(lead.created_at)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}