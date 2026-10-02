import { Link } from 'react-router-dom';
import Reveal from '@/components/feature/Reveal';
import { areaSearchHref } from '@/lib/areaSearch';

export interface NotableAreaItem {
  name: string;
  description: string;
  url: string;
  image: string;
}

// Seed content — only used until an admin saves from the CRM. Once saved,
// the backend site_settings row is the single source of truth.
export const DEFAULT_NOTABLE_EYEBROW = 'Also Worth Knowing';
export const DEFAULT_NOTABLE_TITLE = 'Other Notable Areas';

export const DEFAULT_NOTABLE_AREAS: NotableAreaItem[] = [
  {
    name: 'South B & South C',
    description:
      'More local, affordable, and close to Nairobi National Park - ideal for experienced residents and budget-conscious travellers who want space without the Karen price tag. Strong community feel with markets, local eateries, and easy access to the CBD.',
    url: '',
    image: '',
  },
  {
    name: 'City Centre & Upper Hill',
    description:
      'Busy, central, and all business - ideal for short stays and professionals who need to be in the thick of it. Upper Hill hosts major corporate HQs and hotels. The CBD offers unmatched convenience but can be hectic.',
    url: '',
    image: '',
  },
  {
    name: 'Langata',
    description:
      'Nature-focused living on a budget - bordering Nairobi National Park and close to the Giraffe Centre and Elephant Orphanage. More affordable than neighbouring Karen while sharing the same green, relaxed atmosphere. Popular with families seeking space.',
    url: '',
    image: '',
  },
  {
    name: 'Ruaka',
    description:
      'A fast-growing satellite suburb north of the city - significantly cheaper rents than Gigiri or Runda but only 15-20 minutes from the UN and diplomatic quarter. Popular with young professionals and families priced out of the core northern suburbs.',
    url: '',
    image: '',
  },
];

export const DEFAULT_NOTABLE_FOOTNOTE =
  'These areas are not yet covered by full Area Guides but have active property listings. Our agents can provide detailed local knowledge on any of them.';

interface OtherNotableAreasProps {
  eyebrow?: string;
  title?: string;
  footnote?: string;
  items?: NotableAreaItem[];
}

export default function OtherNotableAreas({
  eyebrow,
  title,
  footnote,
  items,
}: OtherNotableAreasProps) {
  const list = items && items.length ? items : DEFAULT_NOTABLE_AREAS;
  const eyebrowText = eyebrow !== undefined && eyebrow !== '' ? eyebrow : DEFAULT_NOTABLE_EYEBROW;
  const titleText = title !== undefined && title !== '' ? title : DEFAULT_NOTABLE_TITLE;
  const footnoteText = footnote !== undefined ? footnote : DEFAULT_NOTABLE_FOOTNOTE;

  return (
    <Reveal delay={200}>
      <div className="mt-12 md:mt-16 bg-[#FAFAF8] border-y-2 border-[#1a1a1a]/10 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-8 md:py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-5 bg-golden"></div>
            <span className="font-jost text-golden text-[12px] uppercase tracking-[0.15em] font-semibold">
              {eyebrowText}
            </span>
          </div>
          <h3 className="font-prata font-bold text-primary text-[25px] md:text-[35px]">{titleText}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-0">
          {list.map((item, idx) => {
            const href = item.url && item.url.trim() ? item.url.trim() : areaSearchHref(item.name);
            return (
              <div
                key={`${item.name}-${idx}`}
                className={`py-6 border-b-2 border-[#1a1a1a]/10 ${idx % 2 === 1 ? 'md:pl-8' : ''}`}
              >
                {item.image ? (
                  <div className="w-full h-40 md:h-44 overflow-hidden mb-4 bg-[#F5F5F5]">
                    <img
                      alt={item.name}
                      className="w-full h-full object-cover object-top"
                      src={item.image}
                    />
                  </div>
                ) : null}
                <h4 className="font-prata font-semibold text-primary text-[23px] mb-2">{item.name}</h4>
                {item.description ? (
                  <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-3 mb-3">
                    {item.description}
                  </p>
                ) : null}
                <Link
                  to={href}
                  className="inline-flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-golden hover:text-[#8a6d1f] transition-colors cursor-pointer"
                >
                  Browse {item.name}
                  <i className="ri-arrow-right-line"></i>
                </Link>
              </div>
            );
          })}
        </div>
        {footnoteText ? (
          <p className="font-roboto text-[15px] text-[#636363] mt-6 pt-4 border-t-2 border-[#1a1a1a]/10 leading-relaxed">
            {footnoteText}
          </p>
        ) : null}
      </div>
    </Reveal>
  );
}