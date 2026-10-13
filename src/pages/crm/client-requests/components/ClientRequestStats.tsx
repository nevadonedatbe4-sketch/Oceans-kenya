import { Link } from 'react-router-dom';
import { useClientRequestsList } from '@/hooks/useClientRequests';
import { OPEN_STATUSES, isOverdue, hasNoMatches } from '@/lib/clientRequests';

/**
 * Compact client-request overview for the Admin and Agent dashboards.
 * Every tile deep-links to the filtered Client Requests list. Counts come from
 * the same RLS-scoped query the list uses, so an agent only ever sees their own.
 */
export default function ClientRequestStats({ basePath = '/admin' }: { basePath?: string }) {
  const { requests } = useClientRequestsList();

  const open = requests.filter((r) => OPEN_STATUSES.includes((r.status || 'new') as never)).length;
  const unassigned = requests.filter((r) => !r.assigned_agent_id).length;
  const awaiting = requests.filter((r) => r.status === 'shared').length;
  const noMatches = requests.filter((r) => hasNoMatches(r)).length;
  const overdue = requests.filter((r) => isOverdue(r.next_follow_up_at, r.status)).length;
  const urgent = requests.filter((r) => r.priority === 'urgent' || r.priority === 'high').length;

  const tiles = [
    { label: 'Open requests', value: open, icon: 'ri-folder-open-line', to: `${basePath}/client-requests?quick=open`, tone: 'text-[#0f766e] bg-[#0f766e]/10' },
    { label: 'Unassigned', value: unassigned, icon: 'ri-user-unfollow-line', to: `${basePath}/client-requests?quick=unassigned`, tone: 'text-amber-700 bg-amber-100' },
    { label: 'Awaiting client feedback', value: awaiting, icon: 'ri-chat-voice-line', to: `${basePath}/client-requests?status=shared`, tone: 'text-indigo-700 bg-indigo-100' },
    { label: 'Requests without matches', value: noMatches, icon: 'ri-search-eye-line', to: `${basePath}/client-requests?quick=no_matches`, tone: 'text-rose-700 bg-rose-100' },
    { label: 'Overdue follow-ups', value: overdue, icon: 'ri-time-line', to: `${basePath}/client-requests?quick=overdue`, tone: 'text-red-700 bg-red-100' },
    { label: 'High / urgent', value: urgent, icon: 'ri-alarm-warning-line', to: `${basePath}/client-requests?quick=urgent`, tone: 'text-orange-700 bg-orange-100' },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#e4e9e6] p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-roboto font-semibold text-[#1a1a2e]">Client Requests</h3>
          <p className="text-xs text-gray-500 font-roboto">Client requirements matched to live inventory</p>
        </div>
        <Link to={`${basePath}/client-requests`} className="text-xs font-roboto font-semibold text-[#0f766e] hover:underline cursor-pointer whitespace-nowrap">
          View all <i className="ri-arrow-right-line" />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Link
            key={t.label}
            to={t.to}
            className="flex items-center gap-3 p-3 rounded-lg bg-[#f6f8f7] hover:bg-[#eef2f0] border border-transparent hover:border-[#c9d4d0] transition-all cursor-pointer"
          >
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.tone}`}>
              <i className={`${t.icon} text-base`} />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-roboto font-bold text-[#1a1a2e] leading-tight">{t.value}</p>
              <p className="text-xs font-roboto font-medium text-gray-500 truncate">{t.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}