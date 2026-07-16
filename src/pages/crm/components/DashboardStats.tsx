import { Link } from 'react-router-dom';
import type { DashboardStats } from '@/mocks/dashboard';

interface DashboardStatsProps {
  stats: DashboardStats;
  loading: boolean;
}

const formatCurrency = (val: number) => {
  if (val >= 1000000000) return `KSh ${(val / 1000000000).toFixed(1)}B`;
  if (val >= 1000000) return `KSh ${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `KSh ${(val / 1000).toFixed(0)}K`;
  return `KSh ${val}`;
};

const cards = [
  {
    key: 'properties' as const,
    label: 'Properties',
    value: (s: DashboardStats) => s.totalProperties,
    sub: (s: DashboardStats) => `${s.activeProperties} active · ${s.publishedProperties} published · ${s.draftProperties} draft`,
    icon: 'ri-building-line',
    accent: 'bg-accent',
    link: '/crm/listings',
  },
  {
    key: 'leads' as const,
    label: 'Leads',
    value: (s: DashboardStats) => s.totalLeads,
    sub: (s: DashboardStats) => `${s.newLeadsWeek} new this week · ${s.openLeads} open · ${s.pendingFollowUps} pending follow-up`,
    icon: 'ri-user-add-line',
    accent: 'bg-primary',
    link: '/crm/leads',
  },
  {
    key: 'deals' as const,
    label: 'Deals',
    value: (s: DashboardStats) => s.totalDeals,
    sub: (s: DashboardStats) => `${s.dealsInPipeline} in pipeline · ${s.wonDeals} won · ${s.winRate}% win rate`,
    icon: 'ri-briefcase-3-line',
    accent: 'bg-accent',
    link: '/crm/deals',
  },
  {
    key: 'pipeline' as const,
    label: 'Pipeline Value',
    value: (s: DashboardStats) => formatCurrency(s.pipelineValue),
    sub: () => 'Expected revenue from open deals',
    icon: 'ri-line-chart-line',
    accent: 'bg-primary',
    link: '/crm/deals',
  },
];

export default function DashboardStats({ stats, loading }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
      {cards.map((card) => (
        <Link
          key={card.key}
          to={card.link}
          className="relative block bg-white rounded-xl border border-[#e8edf2] overflow-hidden hover:border-[#0d5959]/20 transition-colors group cursor-pointer"
        >
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${card.accent}`} />
          <div className="p-4 md:p-5">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg bg-[#0d5959]/8 flex items-center justify-center">
                <i className={`${card.icon} text-[#0d5959] text-sm sm:text-base`} />
              </div>
              <div className="w-8 h-8 flex items-center justify-center">
                <i className="ri-arrow-right-up-line text-[#7a8a99] text-sm group-hover:text-[#0d5959] transition-colors" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              {loading ? (
                <div className="h-7 sm:h-8 w-20 bg-[#f8fafc] rounded animate-pulse" />
              ) : (
                <p className="font-roboto font-bold text-xl sm:text-2xl text-[#001731]">
                  {card.value(stats)}
                </p>
              )}
              <p className="text-xs sm:text-sm font-roboto text-[#7a8a99] mt-1">
                {card.label}
              </p>
              <p className="text-xs font-roboto text-[#7a8a99]/80 mt-0.5">
                {loading ? '...' : card.sub(stats)}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}