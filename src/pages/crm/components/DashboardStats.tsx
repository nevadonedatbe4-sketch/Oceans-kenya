import { Link } from 'react-router-dom';

interface DashboardStats {
  totalProperties: number;
  activeProperties: number;
  featuredProperties: number;
  publishedProperties: number;
  draftProperties: number;
  totalLeads: number;
  newLeadsWeek: number;
  openLeads: number;
  pendingFollowUps: number;
  totalDeals: number;
  dealsInPipeline: number;
  pipelineValue: number;
  wonDeals: number;
  winRate: number;
  totalAgents: number;
}

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
    <div className="flex gap-4 md:gap-5 overflow-x-auto">
      {cards.map((card) => (
        <Link
          key={card.key}
          to={card.link}
          className="relative flex-1 min-w-[220px] bg-white rounded-xl overflow-hidden hover:ring-1 hover:ring-accent/20 transition-all group cursor-pointer"
        >
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${card.accent}`} />
          <div className="p-5 md:p-6">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-accent/8 flex items-center justify-center">
                <i className={`${card.icon} text-accent text-base sm:text-lg`} />
              </div>
              <div className="w-8 h-8 flex items-center justify-center">
                <i className="ri-arrow-right-up-line text-stone-400 text-sm group-hover:text-accent transition-colors" />
              </div>
            </div>
            <div className="mt-4 sm:mt-5">
              {loading ? (
                <div className="h-8 sm:h-9 w-24 bg-stone-100 rounded animate-pulse" />
              ) : (
                <p className="font-prata text-xl sm:text-2xl text-stone-900">
                  {card.value(stats)}
                </p>
              )}
              <p className="text-sm text-stone-600 mt-1.5">
                {card.label}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {loading ? '...' : card.sub(stats)}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}