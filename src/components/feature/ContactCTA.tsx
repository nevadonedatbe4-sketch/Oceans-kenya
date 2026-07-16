import { Link } from 'react-router-dom';
import { useContactSections } from '@/hooks/useContactSections';

interface ContactCTAProps {
  pageSlug?: string;
}

export default function ContactCTA({ pageSlug }: ContactCTAProps) {
  const { sections, loading } = useContactSections(pageSlug);

  if (loading || sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => (
        <section
          key={section.id}
          className="relative py-12 md:py-16 px-4 md:px-6 overflow-hidden"
          style={{ backgroundColor: section.background_color || '#f8fafc' }}
        >
          {section.background_image && (
            <>
              <img
                src={section.background_image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-[#0a1f33]/70"></div>
            </>
          )}
          <div className="relative max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
              {section.profile_image && (
                <div className="shrink-0">
                  <img
                    src={section.profile_image}
                    alt="Contact"
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-white/20 shadow-lg"
                  />
                </div>
              )}
              <div className="text-center md:text-left flex-1">
                {section.title && (
                  <h3 className="text-xl md:text-2xl font-roboto font-bold text-primary mb-2">
                    {section.title}
                  </h3>
                )}
                {section.subtitle && (
                  <p className="text-sm font-roboto text-stone-500 mb-3">
                    {section.subtitle}
                  </p>
                )}
                {section.body_text && (
                  <p className="text-sm font-roboto text-stone-500 mb-4 max-w-xl">
                    {section.body_text}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
                  {section.phone && (
                    <a
                      href={`tel:${section.phone}`}
                      className="inline-flex items-center gap-2 text-sm font-roboto text-primary hover:text-golden transition-colors whitespace-nowrap"
                    >
                      <i className="ri-phone-line"></i>
                      {section.phone}
                    </a>
                  )}
                  {section.email && (
                    <a
                      href={`mailto:${section.email}`}
                      className="inline-flex items-center gap-2 text-sm font-roboto text-primary hover:text-golden transition-colors whitespace-nowrap"
                    >
                      <i className="ri-mail-line"></i>
                      {section.email}
                    </a>
                  )}
                  {section.whatsapp_link && (
                    <a
                      href={section.whatsapp_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-roboto text-emerald-600 hover:text-emerald-700 transition-colors whitespace-nowrap"
                    >
                      <i className="ri-whatsapp-line"></i>
                      WhatsApp
                    </a>
                  )}
                </div>
                {section.button_text && section.button_link && (
                  <div className="mt-5">
                    <Link
                      to={section.button_link}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap rounded-lg"
                    >
                      {section.button_text}
                      <i className="ri-arrow-right-line text-xs"></i>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}