import { Monitor, ArrowRight, Palette, Type, MoveHorizontal, Grid3X3, Hand, CreditCard, Play, Layout, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import ManagementLayout from '../ManagementLayout';

const HUB_CARDS = [
  {
    title: 'Colour Palette',
    desc: 'Brand colors, card colors, text, and background tokens. Full CSS variable generation.',
    path: '/crm/management/colour-palette',
    icon: <Palette size={16} className="text-[#1B4332]" />,
  },
  {
    title: 'Typography System',
    desc: 'Font families, sizes, weights, line heights, letter spacing, and transforms.',
    path: '/crm/management/typography',
    icon: <Type size={16} className="text-[#1B4332]" />,
  },
  {
    title: 'Spacing & Sizes',
    desc: 'Container widths, grid gaps, border radius, shadows, and elevation.',
    path: '/crm/management/spacing-sizes',
    icon: <MoveHorizontal size={16} className="text-[#1B4332]" />,
  },
  {
    title: 'Card Box System',
    desc: 'Global card builder — background, border, radius, shadow, hover effects.',
    path: '/crm/management/card-box',
    icon: <Grid3X3 size={16} className="text-[#1B4332]" />,
  },
  {
    title: 'Button System',
    desc: 'Primary, secondary, outline, ghost variants with full state control.',
    path: '/crm/management/button-system',
    icon: <Hand size={16} className="text-[#1B4332]" />,
  },
  {
    title: 'Card v7',
    desc: 'Advanced card config — content, style, hover, animation, responsive.',
    path: '/crm/management/card-v7',
    icon: <CreditCard size={16} className="text-[#1B4332]" />,
  },
  {
    title: 'Carousel System',
    desc: 'Slides, autoplay, dots, arrows, speed, touch, breakpoints.',
    path: '/crm/management/carousel',
    icon: <Play size={16} className="text-[#1B4332]" />,
  },
  {
    title: 'Global Page Control',
    desc: 'Page width, content spacing, section defaults, container type.',
    path: '/crm/management/global-page-control',
    icon: <Layout size={16} className="text-[#1B4332]" />,
  },
  {
    title: 'Responsive Control',
    desc: 'Desktop, tablet, mobile breakpoint overrides for every setting.',
    path: '/crm/management/responsive',
    icon: <Smartphone size={16} className="text-[#1B4332]" />,
  },
  {
    title: 'Component Settings',
    desc: 'Browse all components — cards, buttons, nav, content, layout.',
    path: '/crm/management/component-settings',
    icon: <Monitor size={16} className="text-[#1B4332]" />,
  },
];

export default function DesignSystemHubPage() {
  return (
    <ManagementLayout title="Design System Hub" description="Central hub for all design system controls. Jump to any design setting from here." icon={<Monitor size={20} className="text-[#1B4332]" />}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-stone-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-md bg-[#1B4332]/10 flex items-center justify-center">
              <i className="ri-paint-brush-line text-[#1B4332] text-base"></i>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-700">Design Controls</h3>
              <p className="text-[11px] text-stone-400 mt-0.5">Every design token and component setting in one place.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HUB_CARDS.map((card) => (
              <Link
                key={card.path}
                to={card.path}
                className="flex items-start gap-3 p-4 border border-stone-100 rounded-lg hover:border-[#1B4332]/30 hover:bg-[#1B4332]/5 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-md bg-[#1B4332]/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-stone-700 group-hover:text-[#1B4332] transition-colors">{card.title}</p>
                    <ArrowRight size={12} className="text-stone-300 group-hover:text-[#1B4332] group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">{card.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-stone-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-md bg-amber-50 flex items-center justify-center">
              <i className="ri-information-line text-amber-600 text-base"></i>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-700">How It Works</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-stone-50 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-[#1B4332]/10 flex items-center justify-center mb-2">
                <span className="text-[10px] font-bold text-[#1B4332]">1</span>
              </div>
              <p className="text-xs font-medium text-stone-700">Configure Tokens</p>
              <p className="text-[10px] text-stone-400 mt-0.5">Set colors, fonts, spacing, and radius in each design page.</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-[#1B4332]/10 flex items-center justify-center mb-2">
                <span className="text-[10px] font-bold text-[#1B4332]">2</span>
              </div>
              <p className="text-xs font-medium text-stone-700">Save Changes</p>
              <p className="text-[10px] text-stone-400 mt-0.5">Hit save — tokens regenerate as CSS variables instantly.</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-[#1B4332]/10 flex items-center justify-center mb-2">
                <span className="text-[10px] font-bold text-[#1B4332]">3</span>
              </div>
              <p className="text-xs font-medium text-stone-700">Frontend Updates</p>
              <p className="text-[10px] text-stone-400 mt-0.5">All pages refresh automatically with the new design tokens.</p>
            </div>
          </div>
        </div>
      </div>
    </ManagementLayout>
  );
}