import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';

const whyChoose = [
  { icon: 'ri-home-heart-line', title: 'Your Home, Your Identity', desc: 'We understand that your home is more than just a place — it\'s a reflection of your unique taste, personality, and the life you\'ve worked hard to build.' },
  { icon: 'ri-award-line', title: 'Unparalleled Excellence', desc: 'Our commitment to excellence starts from the moment you step into our world. You\'ll experience a personalized approach to real estate that goes far beyond what you\'d expect.' },
  { icon: 'ri-map-pin-2-line', title: 'Nairobi Market Leaders', desc: 'With over 12 years of deep expertise in Nairobi\'s premium property market, we know every neighbourhood, every price movement, and every opportunity.' },
  { icon: 'ri-user-heart-line', title: 'Curated Living Experiences', desc: 'At Oceans, we don\'t just sell properties — we curate exceptional living experiences for discerning individuals who expect nothing but the best.' },
  { icon: 'ri-building-2-line', title: 'Exclusive Portfolio', desc: 'From chic urban apartments and luxurious villas to stylish penthouses with panoramic views, our portfolio represents the most exclusive and desirable properties across Nairobi.' },
  { icon: 'ri-shield-check-line', title: 'Trust & Transparency', desc: 'Every transaction we handle is conducted with complete transparency and honesty. Your interests come first — always. That\'s the Oceans promise.' },
];

const values = [
  { icon: 'ri-shield-check-line', title: 'Integrity', desc: 'We operate with complete transparency and honesty in every transaction, every time.' },
  { icon: 'ri-award-line', title: 'Expertise', desc: 'Our team brings deep market knowledge and professional expertise to every deal.' },
  { icon: 'ri-user-heart-line', title: 'Client-First', desc: 'Your goals are our goals. We listen, advise, and deliver results that matter to you.' },
  { icon: 'ri-lightbulb-line', title: 'Innovation', desc: 'We continuously evolve our approach to deliver better outcomes for every client.' },
];

const timeline = [
  { year: '2015', event: 'Oceans Estate & Lettings founded in Nairobi' },
  { year: '2016', event: 'Expanded to property management services' },
  { year: '2020', event: 'Launched New Projects division' },
  { year: '2024', event: '500+ properties sold & 200+ under management' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
      <Header />

      {/* Intro section */}
      <section className="px-6 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 mb-10 pt-6 md:pt-8">
            <div className="hidden lg:block"></div>
            <div className="lg:col-span-2">
              <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">Oceans Estate &amp; Letting Agents</p>
              <h1 className="font-roboto font-bold leading-snug text-2xl md:text-3xl text-primary mb-0">About Oceans Kenya</h1>
              <span className="block mt-3 h-0.5 w-12 bg-golden"></span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 items-start lg:[&>*:first-child]:order-last gap-8 lg:gap-12">
            <div className="relative">
              <div className="w-full overflow-hidden h-52 sm:h-64 lg:h-[380px]">
                <img alt="Oceans Estate team" className="w-full h-full object-cover object-top" src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/80654c03-86fa-4eb2-bc42-7d6b94688b6b_compressed_5016c457-f096-4879-8937-a60638aac297.webp" />
              </div>
              <div className="absolute -bottom-4 -right-4 px-5 py-3 bg-golden hidden md:block">
                <p className="text-white font-roboto font-bold text-xl">Est. 2015</p>
                <p className="text-white/80 font-roboto text-[10px] mt-0.5">Nairobi, Kenya</p>
              </div>
            </div>
            <div className="lg:pt-2">
              <p className="text-stone-600 font-roboto text-sm leading-relaxed mb-3">
                Welcome to Oceans Estate &amp; Lettings Agents, where luxury meets lifestyle in the heart of Nairobi, Kenya!
              </p>
              <p className="text-stone-600 font-roboto text-sm leading-relaxed mb-3">
                At Oceans, we don't just sell properties — we curate exceptional living experiences for the discerning middle-class to high-end individuals. Our passion for real estate goes beyond bricks and mortar; it's about creating homes that resonate with your aspirations and lifestyle.
              </p>
              <p className="text-stone-600 font-roboto text-sm leading-relaxed">
                <strong className="text-primary">Why Oceans?</strong> Because we understand that your home is more than just a place — it's a reflection of your unique taste, personality, and the life you've worked hard to build. Whether you're seeking a chic urban apartment, a luxurious villa, or a stylish penthouse with panoramic views, Oceans Estates is your gateway to the most exclusive and desirable properties in Nairobi.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <Link to="/all-properties" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-opacity">
                  <i className="ri-search-line"></i>Browse Properties
                </Link>
                <Link to="/contact" className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary text-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white transition-colors">
                  <i className="ri-chat-1-line"></i>Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="bg-primary">
        <div className="max-w-5xl mx-auto px-6 py-8 md:py-10 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
          {[
            { stat: '12+', label: 'Years of Excellence' },
            { stat: '500+', label: 'Properties Sold' },
            { stat: '98%', label: 'Client Satisfaction' },
            { stat: '200+', label: 'Properties Managed' },
          ].map((item) => (
            <div key={item.label} className="py-2">
              <p className="font-roboto font-bold text-2xl md:text-3xl text-white mb-1">{item.stat}</p>
              <p className="text-white/55 font-roboto text-[10px] uppercase tracking-wider">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Choose Oceans */}
      <section className="px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 mb-10">
            <div className="hidden lg:block"></div>
            <div className="lg:col-span-2">
              <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">The Oceans Difference</p>
              <h2 className="font-roboto font-bold leading-snug text-2xl md:text-3xl text-primary">Why Choose Oceans?</h2>
              <span className="block mt-3 h-0.5 w-12 bg-golden"></span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-stone-100">
            {whyChoose.map((item) => (
              <div key={item.title} className="p-5 md:p-6 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                <div className="w-9 h-9 flex items-center justify-center bg-primary/5 rounded-sm mb-3">
                  <i className={`${item.icon} text-base text-primary`}></i>
                </div>
                <h3 className="font-roboto font-bold text-primary text-sm md:text-base mb-1.5">{item.title}</h3>
                <p className="text-stone-500 font-roboto text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="relative overflow-hidden px-6 py-14 md:py-20">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/hero-bg-1776885671058.JPG)' }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/40"></div>
        <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 items-center">
          <div>
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">Our Purpose</p>
            <h2 className="text-white font-roboto font-bold mb-4 leading-snug text-2xl md:text-3xl">Our Mission &amp; Vision</h2>
            <div className="space-y-5">
              <div className="border-l-2 border-golden pl-5">
                <h3 className="text-golden text-xs uppercase tracking-wider mb-1 font-roboto font-semibold">Mission</h3>
                <p className="text-white/70 font-roboto text-sm leading-relaxed">
                  To connect people with exceptional properties through honest advice, deep market knowledge, and a commitment to long-term relationships that extend far beyond the closing of any deal.
                </p>
              </div>
              <div className="border-l-2 border-golden pl-5">
                <h3 className="text-golden text-xs uppercase tracking-wider mb-1 font-roboto font-semibold">Vision</h3>
                <p className="text-white/70 font-roboto text-sm leading-relaxed">
                  To be Kenya's most respected and trusted property agency — known for integrity, innovation, and delivering outstanding results for every single client we serve.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-2">
            {values.map((v) => (
              <div key={v.title} className="p-4 border border-white/15 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors duration-300">
                <div className="w-8 h-8 flex items-center justify-center mb-2">
                  <i className={`${v.icon} text-sm text-golden`}></i>
                </div>
                <h3 className="text-white font-roboto font-bold text-sm mb-1">{v.title}</h3>
                <p className="text-white/55 font-roboto text-xs leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="px-6 py-12 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-12">
          <div className="lg:order-last">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">Our Story</p>
            <h2 className="font-roboto font-bold text-primary mb-4 leading-snug text-2xl md:text-3xl">From Humble Beginnings to Market Leaders</h2>
            <p className="text-stone-600 font-roboto text-sm leading-relaxed mb-3">
              Oceans Kenya was founded in 2015 with a vision to transform the property experience in Nairobi. Starting with a small team of dedicated agents and a handful of exceptional listings, we quickly built a reputation for honesty, expertise, and outstanding results.
            </p>
            <p className="text-stone-600 font-roboto text-sm leading-relaxed">
              Today, we are proud to be one of Nairobi's leading property agencies, with a portfolio spanning residential sales, lettings, property management, and new developments across the city's most sought-after neighbourhoods.
            </p>
            <div className="mt-6 space-y-3">
              {timeline.map((item) => (
                <div key={item.year} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 text-right text-[10px] font-bold tracking-wider pt-0.5 text-golden font-roboto">{item.year}</div>
                  <div className="flex-shrink-0 mt-1 w-px self-stretch bg-golden/30"></div>
                  <p className="text-stone-600 font-roboto text-sm leading-relaxed">{item.event}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="w-full overflow-hidden h-52 sm:h-64 lg:h-[380px]">
              <img alt="Oceans Kenya story" className="w-full h-full object-cover object-top" src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/8dc23801-be18-42ec-beba-c8e4d0252b6d_compressed_nai.webp" />
            </div>
            <div className="absolute -bottom-4 -left-4 px-5 py-3 bg-primary hidden md:block">
              <p className="text-white font-roboto font-bold text-xl">Since 2015</p>
              <p className="text-white/60 font-roboto text-[10px] mt-0.5">Serving Kenya</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary px-6 py-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-3 font-roboto font-semibold">Get Started Today</p>
          <h2 className="text-white font-roboto font-bold mb-3 leading-snug text-2xl md:text-3xl">Ready to Find Your Perfect Property?</h2>
          <p className="text-white/65 font-roboto text-sm leading-relaxed mb-7 max-w-lg mx-auto">
            Whether you're buying, selling, or renting — our team of dedicated property professionals is here to help every step of the way. Contact us today for a free, no-obligation consultation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/all-properties" className="inline-flex items-center gap-2 px-6 py-2.5 bg-golden text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity w-full sm:w-auto justify-center">
              <i className="ri-search-line"></i>Browse Properties
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-2.5 border border-white/30 text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors w-full sm:w-auto justify-center">
              <i className="ri-chat-1-line"></i>Contact Us
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