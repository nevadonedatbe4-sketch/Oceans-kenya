import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import { useAboutPageContent } from '@/hooks/useAboutPageContent';

export default function About() {
  const { content } = useAboutPageContent();

  return (
    <div className="min-h-screen bg-white pt-[60px] md:pt-[130px] lg:pt-[148px]">
      <Header />

      <PageBreadcrumbs />

      {/* Intro section */}
      <section className="px-4 md:px-6 py-6 md:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 mb-8 md:mb-10 pt-4 md:pt-8">
            <div className="hidden lg:block"></div>
            <div className="lg:col-span-2">
              <p className="text-golden text-xs md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">{content.intro_eyebrow}</p>
              <h1 className="font-roboto font-semibold leading-snug text-xl md:text-3xl text-primary mb-0">{content.intro_title}</h1>
              <span className="block mt-3 h-0.5 w-12 bg-golden"></span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 items-start lg:[&>*:first-child]:order-last gap-6 lg:gap-12">
            <div className="relative">
              <div className="w-full overflow-hidden h-52 sm:h-64 lg:h-[380px]">
                <img alt="Oceans Kenya team" className="w-full h-full object-cover object-center" src={content.intro_image} />
              </div>
              <div className="absolute -bottom-3 -right-3 px-4 py-2.5 md:px-5 md:py-3 bg-accent">
                <p className="text-white font-roboto font-bold text-base md:text-xl">{content.intro_badge_value}</p>
                <p className="text-white/80 font-roboto text-[10px] mt-0.5">{content.intro_badge_label}</p>
              </div>
            </div>
            <div className="lg:pt-2">
              <p className="text-stone-600 font-roboto text-sm leading-relaxed mb-3">{content.intro_p1}</p>
              <p className="text-stone-600 font-roboto text-sm leading-relaxed mb-3">{content.intro_p2}</p>
              <p className="text-stone-600 font-roboto text-sm leading-relaxed">
                {content.intro_p3_lead && <strong className="text-primary">{content.intro_p3_lead} </strong>}
                {content.intro_p3_body}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <Link to={content.intro_btn1_link} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase font-semibold cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-opacity w-full sm:w-auto justify-center">
                  <i className="ri-search-line"></i>{content.intro_btn1_label}
                </Link>
                <Link to={content.intro_btn2_link} className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary text-primary text-xs tracking-widest uppercase font-semibold cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white transition-colors w-full sm:w-auto justify-center">
                  <i className="ri-mail-send-line"></i>{content.intro_btn2_label}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="bg-primary">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-center">
          {content.stats.map((item) => (
            <div key={item.label} className="py-1 md:py-2">
              <p className="font-roboto font-bold text-xl md:text-3xl text-white mb-1">{item.value}</p>
              <p className="text-white/55 font-roboto text-[9px] md:text-[10px] uppercase tracking-wider">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Choose Oceans */}
      <section className="px-4 md:px-6 py-10 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 mb-8 md:mb-10">
            <div className="hidden lg:block"></div>
            <div className="lg:col-span-2">
              <p className="text-golden text-xs md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">{content.why_eyebrow}</p>
              <h2 className="font-roboto font-bold leading-snug text-xl md:text-3xl text-primary">{content.why_heading}</h2>
              <span className="block mt-3 h-0.5 w-12 bg-golden"></span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-stone-100">
            {content.why_cards.map((item) => (
              <div key={item.title} className="p-4 md:p-6 bg-white shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] hover:shadow-[0_2px_4px_rgba(0,23,49,0.06),0_8px_24px_rgba(0,23,49,0.10),0_24px_64px_rgba(0,23,49,0.12)] hover:-translate-y-0.5 transition-all duration-300 group">
                <div className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-primary rounded-sm mb-3">
                  <i className={`${item.icon} text-sm md:text-base text-white`}></i>
                </div>
                <h3 className="font-roboto font-bold text-primary text-sm md:text-base mb-1.5">{item.title}</h3>
                <p className="text-primary font-roboto text-xs md:text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="relative overflow-hidden px-4 md:px-6 py-12 md:py-20">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${content.mission_bg_image})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/50"></div>
        <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 items-center">
          <div>
            <p className="text-golden text-xs md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">{content.mission_eyebrow}</p>
            <h2 className="text-white font-roboto font-bold mb-4 leading-snug text-xl md:text-3xl">{content.mission_heading}</h2>
            <div className="space-y-4 md:space-y-5">
              <div className="border-l-2 border-golden pl-4 md:pl-5">
                <h3 className="text-golden text-xs uppercase tracking-wider mb-1 font-roboto font-semibold">{content.mission_label}</h3>
                <p className="text-white/70 font-roboto text-xs md:text-sm leading-relaxed">{content.mission_text}</p>
              </div>
              <div className="border-l-2 border-golden pl-4 md:pl-5">
                <h3 className="text-golden text-xs uppercase tracking-wider mb-1 font-roboto font-semibold">{content.vision_label}</h3>
                <p className="text-white/70 font-roboto text-xs md:text-sm leading-relaxed">{content.vision_text}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-2 md:gap-3 grid-cols-2">
            {content.values.map((v) => (
              <div key={v.title} className="p-3 md:p-4 border border-white/15 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors duration-300">
                <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center mb-2">
                  <i className={`${v.icon} text-xs md:text-sm text-golden`}></i>
                </div>
                <h3 className="text-white font-roboto font-bold text-xs md:text-sm mb-1">{v.title}</h3>
                <p className="text-white/55 font-roboto text-[10px] md:text-xs leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="px-4 md:px-6 py-10 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-6 lg:gap-12">
          <div className="lg:order-last">
            <p className="text-golden text-xs md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">{content.story_eyebrow}</p>
            <h2 className="font-roboto font-bold text-primary mb-4 leading-snug text-xl md:text-3xl">{content.story_heading}</h2>
            <p className="text-stone-600 font-roboto text-xs md:text-sm leading-relaxed mb-3">{content.story_p1}</p>
            <p className="text-stone-600 font-roboto text-xs md:text-sm leading-relaxed">{content.story_p2}</p>
            <div className="mt-5 md:mt-6 space-y-2 md:space-y-3">
              {content.timeline.map((item) => (
                <div key={item.year} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 text-right text-[10px] font-bold tracking-wider pt-0.5 text-golden font-roboto">{item.year}</div>
                  <div className="flex-shrink-0 mt-1 w-px self-stretch bg-golden/30"></div>
                  <p className="text-stone-600 font-roboto text-xs md:text-sm leading-relaxed">{item.event}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="w-full overflow-hidden h-48 sm:h-64 lg:h-[380px]">
              <img alt="Oceans Kenya story" className="w-full h-full object-cover object-center" src={content.story_image} />
            </div>
            <div className="absolute -bottom-3 -left-3 px-4 py-2.5 md:px-5 md:py-3 bg-primary">
              <p className="text-white font-roboto font-bold text-base md:text-xl">{content.story_badge_value}</p>
              <p className="text-white/60 font-roboto text-[10px] mt-0.5">{content.story_badge_label}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary px-4 md:px-6 py-10 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-golden text-xs md:text-base tracking-[0.2em] uppercase mb-3 font-roboto font-semibold">{content.cta_eyebrow}</p>
          <h2 className="text-white font-roboto font-bold mb-3 leading-snug text-xl md:text-3xl">{content.cta_heading}</h2>
          <p className="text-white/65 font-roboto text-xs md:text-sm leading-relaxed mb-6 md:mb-7 max-w-lg mx-auto">{content.cta_text}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={content.cta_btn1_link} className="inline-flex items-center gap-2 px-6 py-2.5 bg-golden text-white border-2 border-golden text-xs tracking-widest uppercase font-semibold cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity w-full sm:w-auto justify-center">
              <i className="ri-search-line"></i>{content.cta_btn1_label}
            </Link>
            <Link to={content.cta_btn2_link} className="inline-flex items-center gap-2 px-6 py-2.5 border border-white/30 text-white text-xs tracking-widest uppercase font-semibold cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors w-full sm:w-auto justify-center">
              <i className="ri-mail-send-line"></i>{content.cta_btn2_label}
            </Link>
          </div>
        </div>
      </section>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}