import { Link } from 'react-router-dom';

interface MobileStickyBarProps {
  propertyTitle: string;
  agentPhone?: string;
}

export default function MobileStickyBar({ agentPhone }: MobileStickyBarProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3">
        <a
          href={agentPhone ? `tel:${agentPhone}` : 'tel:+254712345678'}
          className="w-12 h-12 flex items-center justify-center border border-stone-200 rounded-[2px] text-primary shrink-0 cursor-pointer"
        >
          <i className="ri-phone-line text-lg"></i>
        </a>
        <Link
          to="/contact"
          className="flex-1 h-12 flex items-center justify-center bg-primary text-white font-roboto text-xs font-semibold uppercase tracking-wider rounded-[2px] cursor-pointer whitespace-nowrap"
        >
          Book a viewing
        </Link>
      </div>
    </div>
  );
}