import { DEFAULT_CONTACT } from '@/lib/contactDefaults';
import { normalizePhone } from '@/lib/phone';

interface MobileStickyBarProps {
  propertyTitle: string;
  agentPhone?: string;
}

/**
 * Mobile bottom bar for property detail pages.
 * Offers Call Agent, WhatsApp Agent and Book a viewing. Call / WhatsApp use the
 * listing agent's own number (falling back to the office line), normalised to
 * international format. An unusable number renders as a disabled hint.
 */
export default function MobileStickyBar({ agentPhone, propertyTitle }: MobileStickyBarProps) {
  const links = normalizePhone(agentPhone || DEFAULT_CONTACT.phone);
  const waHref = links.whatsapp
    ? `${links.whatsapp}?text=${encodeURIComponent(`Hello, I'm interested in ${propertyTitle}.`)}`
    : undefined;

  const scrollToContact = () => {
    const el = document.getElementById('section-contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const outline =
    'h-10 flex items-center justify-center gap-1.5 border border-primary rounded-[2px] text-primary font-roboto text-xs font-semibold uppercase tracking-wide cursor-pointer whitespace-nowrap';
  const outlineDisabled =
    'h-10 flex items-center justify-center gap-1.5 border border-primary/20 rounded-[2px] text-primary/30 text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-not-allowed';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-primary/12 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex items-stretch gap-2">
        {links.tel ? (
          <a href={links.tel} className={`${outline} flex-1`} aria-label="Call the agent">
            <i className="ri-phone-line text-base"></i>
            Call
          </a>
        ) : (
          <span className={`${outlineDisabled} flex-1`} title="No valid phone number on file" aria-disabled="true">
            <i className="ri-phone-line text-base"></i>
            Call
          </span>
        )}

        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${outline} flex-1`}
            aria-label="WhatsApp the agent"
          >
            <i className="ri-whatsapp-line text-base"></i>
            WhatsApp
          </a>
        ) : (
          <span className={`${outlineDisabled} flex-1`} title="No valid phone number on file" aria-disabled="true">
            <i className="ri-whatsapp-line text-base"></i>
            WhatsApp
          </span>
        )}

        <button
          onClick={scrollToContact}
          className="flex-[1.4] h-10 flex items-center justify-center bg-primary text-white font-roboto text-sm font-semibold uppercase tracking-wide rounded-[2px] cursor-pointer whitespace-nowrap"
        >
          Book a viewing
        </button>
      </div>
    </div>
  );
}