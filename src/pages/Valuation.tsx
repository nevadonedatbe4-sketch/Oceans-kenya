import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import { useValuationPageContent } from '@/hooks/useValuationPageContent';

export default function Valuation() {
  const { content: c } = useValuationPageContent();

  return (
    <div className="min-h-screen bg-white pt-[60px] md:pt-[130px] lg:pt-[148px]">
      <Header />

      {/* Hero */}
      <div className="relative flex flex-col justify-center overflow-hidden pt-14 pb-14 md:pt-20 md:pb-20 min-h-[380px] md:min-h-[460px]">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${c.hero_bg_image})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/50"></div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-6">
          <div className="max-w-2xl">
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-4">{c.hero_eyebrow}</p>
            <h1 className="font-roboto font-bold text-white text-2xl md:text-5xl mb-4 md:mb-6 leading-tight">
              {c.hero_title}
            </h1>
            <p className="text-white/80 font-roboto text-sm md:text-lg leading-relaxed mb-8 md:mb-10 max-w-lg">
              {c.hero_subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="tel:+254181408186" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-golden text-white font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity w-full sm:w-auto">
                <i className="ri-phone-line"></i>{c.hero_btn1_label}
              </a>
              <a href="#valuation-process" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/50 text-white font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors w-full sm:w-auto">
                <i className="ri-arrow-down-line"></i>How It Works
              </a>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 md:bottom-8 right-4 md:right-10 hidden lg:flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-4 md:px-5 py-3 md:py-4">
          <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full flex-shrink-0">
            <i className="ri-award-line text-white text-base md:text-lg"></i>
          </div>
          <div>
            <p className="text-white font-roboto font-bold text-sm">{c.hero_badge_value}</p>
            <p className="text-white/60 font-roboto text-xs">{c.hero_badge_label}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {c.show_stats && (
        <div className="bg-primary">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-center">
            {c.stats.map((item, i) => (
              <div key={i} className="py-1 md:py-2">
                <p className="font-roboto font-bold text-xl md:text-3xl text-white mb-1">{item.value}</p>
                <p className="text-white/55 font-roboto text-[9px] md:text-[10px] uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <PageBreadcrumbs />

      {/* Process */}
      {c.show_process && (
        <section id="valuation-process" className="px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 md:mb-14">
              <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">{c.process_eyebrow}</p>
              <h2 className="text-xl md:text-3xl font-roboto font-bold text-primary mb-3">{c.process_title}</h2>
              <p className="text-stone-500 font-roboto text-xs md:text-sm max-w-xl mx-auto leading-relaxed">{c.process_text}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {c.steps.map((step, i) => (
                <div key={i} className="relative text-center p-3 md:p-4 rounded-sm hover:bg-white hover:shadow-md transition-all duration-300">
                  {i < c.steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px bg-gray-200"></div>
                  )}
                  <div className="relative inline-flex items-center justify-center mb-4 md:mb-5">
                    <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-primary mx-auto">
                      <i className={`${step.icon} text-white text-lg md:text-xl`}></i>
                    </div>
                    <span className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-[#002349] text-white font-roboto text-[10px] md:text-xs font-bold">{step.step}</span>
                  </div>
                  <h3 className="font-roboto font-bold text-primary text-sm md:text-base mb-2">{step.title}</h3>
                  <p className="text-stone-500 font-roboto text-xs leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      {c.show_why && (
        <section className="px-4 md:px-6 py-12 md:py-20 bg-white border-t border-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 md:mb-14">
              <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">{c.why_eyebrow}</p>
              <h2 className="text-xl md:text-3xl font-roboto font-bold text-primary mb-3">{c.why_title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
              {c.why.map((item, i) => (
                <div key={i} className="p-5 md:p-7 border-2 border-primary/12 rounded-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full mb-4 md:mb-5 bg-[#002349]">
                    <i className={`${item.icon} text-lg md:text-xl text-golden`}></i>
                  </div>
                  <h3 className="font-roboto font-bold text-primary text-sm md:text-base mb-2">{item.title}</h3>
                  <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {c.show_faq && (
        <section className="px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10 md:mb-14">
              <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">{c.faq_eyebrow}</p>
              <h2 className="text-xl md:text-3xl font-roboto font-bold text-primary">{c.faq_title}</h2>
            </div>
            <div className="space-y-2 md:space-y-3">
              {c.faqs.map((faq, i) => (
                <details key={i} className="border-2 border-primary/12 overflow-hidden rounded-sm group cursor-pointer">
                  <summary className="w-full flex items-center justify-between px-4 md:px-6 py-4 md:py-5 text-left cursor-pointer hover:bg-gray-50/80 transition-colors list-none">
                    <span className="font-roboto font-bold text-primary text-xs md:text-sm pr-4">{faq.q}</span>
                    <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center flex-shrink-0 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
                      <i className="ri-add-line text-sm group-open:hidden"></i>
                      <i className="ri-subtract-line text-sm hidden group-open:block"></i>
                    </span>
                  </summary>
                  <div className="px-4 md:px-6 pb-4 md:pb-5">
                    <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {c.show_cta && (
        <section className="relative bg-primary px-4 md:px-6 py-10 md:py-16 overflow-hidden">
          {c.cta_bg_image && (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${c.cta_bg_image})` }}></div>
          )}
          {c.cta_bg_image && <div className="absolute inset-0 bg-primary/85"></div>}
          <div className="relative max-w-3xl mx-auto text-center">
            <p className="text-golden text-xs md:text-base tracking-[0.2em] uppercase mb-3 font-roboto font-semibold">{c.cta_eyebrow}</p>
            <h2 className="text-white font-roboto font-bold mb-3 leading-snug text-xl md:text-3xl">{c.cta_title}</h2>
            <p className="text-white/65 font-roboto text-xs md:text-sm leading-relaxed mb-6 md:mb-7 max-w-lg mx-auto">{c.cta_text}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="tel:+254181408186" className="inline-flex items-center gap-2 px-6 py-2.5 bg-golden text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity w-full sm:w-auto justify-center">
                <i className="ri-phone-line"></i>{c.cta_btn1_label}
              </a>
              <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-2.5 border border-white/30 text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors w-full sm:w-auto justify-center">
                <i className="ri-mail-line"></i>{c.cta_btn2_label}
              </Link>
            </div>
          </div>
        </section>
      )}

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}