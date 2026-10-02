import { Link } from 'react-router-dom';
import Reveal from '@/components/feature/Reveal';

export interface DecisionGuideItem {
  who: string;
  icon: string;
  matches: string[];
}

// Seed content — only used until an admin saves from the CRM. Once saved,
// the backend site_settings row is the single source of truth.
export const DEFAULT_GUIDE_TITLE = 'Quick Decision Guide';
export const DEFAULT_GUIDE_HINT = 'Not sure where to start?';
export const DEFAULT_GUIDE_HELPER = 'Click a profile to filter, or tap an area to open its guide';

export const DEFAULT_GUIDE_ITEMS: DecisionGuideItem[] = [
  { who: 'First-Time Visitors', icon: 'ri-plane-line', matches: ['Westlands', 'Kilimani'] },
  { who: 'Nightlife & Social', icon: 'ri-moon-line', matches: ['Westlands'] },
  { who: 'Families & Nature', icon: 'ri-leaf-line', matches: ['Karen', 'Lavington'] },
  { who: 'Business & Work', icon: 'ri-briefcase-line', matches: ['Westlands', 'Upper Hill', 'Kilimani'] },
  { who: 'Diplomats & Expats', icon: 'ri-global-line', matches: ['Gigiri', 'Runda', 'Muthaiga'] },
  { who: 'Ultimate Privacy', icon: 'ri-eye-off-line', matches: ['Rosslyn', 'Spring Valley'] },
  { who: 'Budget-Conscious', icon: 'ri-money-dollar-circle-line', matches: ['Parklands', 'Kileleshwa'] },
  { who: 'Best Value & Space', icon: 'ri-home-smile-line', matches: ['Lower Kabete'] },
  { who: 'Young Professionals', icon: 'ri-user-star-line', matches: ['Kilimani', 'Kileleshwa'] },
  { who: 'Maximum Security', icon: 'ri-shield-check-line', matches: ['Runda', 'Gigiri'] },
  { who: 'Green & Exclusive', icon: 'ri-plant-line', matches: ['Riverside'] },
];

export const DEFAULT_GUIDE_TIP =
  'Safety tip: Stick to well-known areas, use Uber/Bolt (reliable), gated compounds/hotels, and avoid walking alone at night in unfamiliar spots. Most tourist zones feel secure during the day.';

interface QuickDecisionGuideProps {
  expanded: boolean;
  onExpandedChange: (value: boolean) => void;
  activeMatches: string[];
  onSelectProfile: (matches: string[]) => void;
  onClear: () => void;
  areaHref: (name: string) => string;
  items?: DecisionGuideItem[];
  tip?: string;
  title?: string;
  hint?: string;
  helperText?: string;
}

export default function QuickDecisionGuide({
  expanded,
  onExpandedChange,
  activeMatches,
  onSelectProfile,
  onClear,
  areaHref,
  items,
  tip,
  title,
  hint,
  helperText,
}: QuickDecisionGuideProps) {
  const guideItems = items && items.length ? items : DEFAULT_GUIDE_ITEMS;
  const guideTip = tip !== undefined ? tip : DEFAULT_GUIDE_TIP;
  const guideTitle = title !== undefined && title !== '' ? title : DEFAULT_GUIDE_TITLE;
  const guideHint = hint !== undefined ? hint : DEFAULT_GUIDE_HINT;
  const guideHelper = helperText !== undefined && helperText !== '' ? helperText : DEFAULT_GUIDE_HELPER;

  return (
    <div className="bg-primary border-2 border-white/10 -mx-4 md:-mx-6 lg:-mx-8">
      {!expanded && (
        <button
          onClick={() => onExpandedChange(true)}
          className="w-full flex items-center justify-between px-4 md:px-6 lg:px-8 py-3.5 cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5">
            <i className="ri-compass-3-line text-golden text-base"></i>
            <span className="font-jost text-white text-[13px] uppercase tracking-[0.12em] font-semibold">
              {guideTitle}
            </span>
            {guideHint ? (
              <span className="font-roboto text-white/60 text-[13px] hidden sm:inline">
                - {guideHint}
              </span>
            ) : null}
          </div>
          <i className="ri-arrow-down-wide-fill text-golden text-4xl transition-colors"></i>
        </button>
      )}
      {expanded && (
        <div className="px-4 md:px-6 lg:px-8 py-5 md:py-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-white/10 shrink-0">
                <i className="ri-guide-line text-golden"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-jost text-white text-[12px] uppercase tracking-[0.15em] font-semibold">
                    {guideTitle}
                  </span>
                  {activeMatches.length > 0 && (
                    <button
                      onClick={onClear}
                      className="text-[12px] font-jost text-white/60 hover:text-white transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                    >
                      <i className="ri-close-line"></i>
                      Clear
                    </button>
                  )}
                </div>
                <p className="font-roboto text-[14px] text-white/60 mt-0.5">
                  {activeMatches.length > 0
                    ? `Showing: ${activeMatches.join(', ')}`
                    : guideHelper}
                </p>
              </div>
            </div>
            <button
              onClick={() => onExpandedChange(false)}
              className="text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <i className="ri-arrow-up-s-line text-xl"></i>
            </button>
          </div>
          <div className="divide-y divide-white/10">
            {guideItems.map((item, idx) => {
              const num = String(idx + 1).padStart(2, '0');
              const isActive =
                activeMatches.length > 0
                && item.matches.every((m) => activeMatches.includes(m))
                && activeMatches.every((g) => item.matches.includes(g));
              return (
                <Reveal key={`${item.who}-${idx}`} delay={idx * 60}>
                  <div className="py-4 flex items-start gap-4">
                    <span className="font-prata text-golden text-[34px] leading-none shrink-0 w-10">{num}</span>
                    <div className="flex-1">
                      <button
                        onClick={() => onSelectProfile(isActive ? [] : item.matches)}
                        className="text-left cursor-pointer mb-1 flex items-center gap-2"
                      >
                        <i className={`${item.icon} text-base ${isActive ? 'text-golden' : 'text-white/60'}`}></i>
                        <span className={`font-prata text-lg ${isActive ? 'text-golden' : 'text-white'}`}>{item.who}</span>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        {item.matches.map((m) => (
                          <Link
                            key={m}
                            to={areaHref(m)}
                            className={`px-2 py-0.5 text-[11px] font-jost font-semibold uppercase tracking-[0.08em] cursor-pointer transition-colors whitespace-nowrap hover:bg-golden hover:text-primary ${
                              isActive ? 'bg-golden/20 text-golden' : 'bg-white/10 text-white/70'
                            }`}
                          >
                            {m}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
          {guideTip ? (
            <div className="mt-5 bg-white/5 border-l-4 border-golden p-4 flex items-start gap-3">
              <i className="ri-information-line text-golden text-lg shrink-0"></i>
              <p className="font-roboto text-[15px] text-white/85 leading-relaxed">{guideTip}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}