import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';

const steps = [
  { icon: 'ri-phone-line', step: 1, title: 'Book an Appointment', desc: 'Call or message us to schedule a free, no-obligation valuation at a time that suits you.' },
  { icon: 'ri-search-eye-line', step: 2, title: 'On-Site Assessment', desc: 'One of our experienced valuers visits your property, takes measurements, notes features, and photographs.' },
  { icon: 'ri-file-chart-line', step: 3, title: 'Market Analysis', desc: 'We analyse comparable sales and current market conditions to determine your property\'s accurate value.' },
  { icon: 'ri-survey-line', step: 4, title: 'Detailed Report', desc: 'You receive a comprehensive valuation report with our recommended listing price and marketing strategy.' },
];

const faqs = [
  { q: 'How much does a valuation cost?', a: 'Absolutely nothing. Our property valuations are completely free with no obligation to list your property with us.' },
  { q: 'How long does a valuation take?', a: 'The on-site visit typically takes 30–60 minutes depending on the property size. You will receive your full report within 48 hours.' },
  { q: 'What do I need to prepare?', a: 'Just be available to show us around! Having recent utility bills, title deeds, and any renovation receipts handy is helpful but not required.' },
  { q: 'Is the valuation binding?', a: 'No. The valuation is an expert opinion of your property\'s current market value. You are under no obligation to sell or list with us afterwards.' },
];

export default function Valuation() {
  return (
    <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
      <Header />

      {/* Hero */}
      <div className="relative flex flex-col justify-center overflow-hidden pt-14 pb-14 md:pt-20 md:pb-20 min-h-[380px] md:min-h-[460px]">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/hero-bg-1776885671058.JPG)' }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/50"></div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-6">
          <div className="max-w-2xl">
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-4">Free Property Valuation</p>
            <h1 className="font-roboto font-bold text-white text-2xl md:text-5xl mb-4 md:mb-6 leading-tight">
              Know What Your<br />Property Is Worth
            </h1>
            <p className="text-white/80 font-roboto text-sm md:text-lg leading-relaxed mb-8 md:mb-10 max-w-lg">
              Get a free, no-obligation valuation from Nairobi's leading estate agents. Our experienced valuers understand the local market and will give you an accurate, honest assessment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="tel:+254703712984" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-golden text-white font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity w-full sm:w-auto">
                <i className="ri-phone-line"></i>Call for a Valuation
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
            <p className="text-white font-roboto font-bold text-sm">98% Accuracy</p>
            <p className="text-white/60 font-roboto text-xs">On Final Sale Price</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-primary">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-center">
          {[
            { stat: '500+', label: 'Properties Valued' },
            { stat: '98%', label: 'Valuation Accuracy' },
            { stat: '48h', label: 'Report Turnaround' },
            { stat: '100%', label: 'Free & No Obligation' },
          ].map((item) => (
            <div key={item.label} className="py-1 md:py-2">
              <p className="font-roboto font-bold text-xl md:text-3xl text-white mb-1">{item.stat}</p>
              <p className="text-white/55 font-roboto text-[9px] md:text-[10px] uppercase tracking-wider">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Process */}
      <section id="valuation-process" className="px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">How It Works</p>
            <h2 className="text-xl md:text-3xl font-roboto font-bold text-primary mb-3">Our Valuation Process</h2>
            <p className="text-stone-500 font-roboto text-xs md:text-sm max-w-xl mx-auto leading-relaxed">Four simple steps to an accurate, transparent property valuation.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="relative text-center p-3 md:p-4 rounded-sm hover:bg-white hover:shadow-md transition-all duration-300">
                {i < steps.length - 1 && (
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

      {/* Why Choose Us */}
      <section className="px-4 md:px-6 py-12 md:py-20 bg-white border-t border-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">Why Choose Us</p>
            <h2 className="text-xl md:text-3xl font-roboto font-bold text-primary mb-3">Why Get a Valuation From Oceans?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
            {[
              { icon: 'ri-map-pin-2-line', title: 'Local Market Expertise', desc: 'With 12+ years in Nairobi\'s premium property market, we know every neighbourhood\'s true value. We don\'t guess — we analyse real data from recent comparable sales.' },
              { icon: 'ri-shield-check-line', title: 'Honest, Not Flattering', desc: 'Some agents inflate valuations to win your business. We give you the real number — backed by evidence — so your property sells at the right price, not a fantasy one.' },
              { icon: 'ri-bar-chart-2-line', title: 'No Strings Attached', desc: 'Our valuation is completely free with zero obligation. You get a professional report. If you choose not to list with us, that\'s entirely fine.' },
            ].map((item) => (
              <div key={item.title} className="p-5 md:p-7 border-2 border-primary/12 rounded-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full mb-4 md:mb-5 bg-[#002349]">
                  <i className={`${item.icon} text-lg md:text-xl text-primary`}></i>
                </div>
                <h3 className="font-roboto font-bold text-primary text-sm md:text-base mb-2">{item.title}</h3>
                <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">Common Questions</p>
            <h2 className="text-xl md:text-3xl font-roboto font-bold text-primary">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-2 md:space-y-3">
            {faqs.map((faq, i) => (
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

      {/* CTA */}
      <section className="bg-primary px-4 md:px-6 py-10 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-golden text-xs md:text-base tracking-[0.2em] uppercase mb-3 font-roboto font-semibold">Ready to Know Your Property's Worth?</p>
          <h2 className="text-white font-roboto font-bold mb-3 leading-snug text-xl md:text-3xl">Book Your Free Valuation Today</h2>
          <p className="text-white/65 font-roboto text-xs md:text-sm leading-relaxed mb-6 md:mb-7 max-w-lg mx-auto">
            Our team of experienced valuers is ready to give you an honest, accurate assessment. No cost, no pressure, no obligation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="tel:+254703712984" className="inline-flex items-center gap-2 px-6 py-2.5 bg-golden text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity w-full sm:w-auto justify-center">
              <i className="ri-phone-line"></i>Call Now
            </a>
            <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-2.5 border border-white/30 text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors w-full sm:w-auto justify-center">
              <i className="ri-mail-line"></i>Send an Enquiry
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