import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { useFormSubmit } from '@/hooks/useFormSubmit';

const services = [
  { icon: 'ri-building-2-line', title: 'Commercial Sales', desc: 'We market your commercial property to qualified investors and businesses across Kenya and East Africa.' },
  { icon: 'ri-store-2-line', title: 'Commercial Lettings', desc: 'Find reliable corporate tenants for your office, retail, or industrial space with our extensive network.' },
  { icon: 'ri-bar-chart-box-line', title: 'Market Valuation', desc: 'Expert commercial property valuation based on current market data, comparable evidence, and local expertise.' },
  { icon: 'ri-file-list-3-line', title: 'Transaction Management', desc: 'Full support through the entire transaction — from heads of terms to completion and handover.' },
];

const howItWorks = [
  { icon: 'ri-phone-line', step: 1, title: 'Initial Consultation', desc: 'We discuss your commercial property, goals, and timeline — free, no obligation.' },
  { icon: 'ri-search-eye-line', step: 2, title: 'Professional Marketing', desc: 'Professional photography, floor plans, and listing across all major commercial property platforms.' },
  { icon: 'ri-user-received-2-line', step: 3, title: 'Tenant & Buyer Matching', desc: 'We match your property with our database of pre-qualified corporate tenants and investors.' },
  { icon: 'ri-hand-coin-line', step: 4, title: 'Close the Deal', desc: 'Negotiation support, lease or sale agreement, and smooth handover coordination.' },
];

const whyUs = [
  { icon: 'ri-global-line', title: 'Market Reach', desc: 'Access to local, regional, and international commercial property investors and occupiers.' },
  { icon: 'ri-team-line', title: 'Expert Team', desc: 'Dedicated commercial property specialists with deep knowledge of Nairobi\'s office, retail, and industrial markets.' },
  { icon: 'ri-speed-line', title: 'Fast Results', desc: 'Our targeted approach means commercial properties are matched quickly with the right tenants or buyers.' },
];

const faqs = [
  { q: 'What types of commercial property do you handle?', a: 'We handle all commercial property types including offices, retail shops, warehouses, industrial units, mixed-use buildings, and commercial land across Nairobi and surrounding areas.' },
  { q: 'How much does it cost to advertise my commercial property?', a: 'Our fees vary depending on the service. For commercial lettings, we charge a percentage of the annual rent. For sales, a competitive commission based on the sale price. Contact us for a tailored quote.' },
  { q: 'How long does it take to let or sell a commercial property?', a: 'Timescales vary by property type and market conditions, but our average time to let a commercial property is 45–60 days. Sales typically complete within 90–120 days.' },
  { q: 'Do you handle lease negotiations?', a: 'Yes, we manage the full leasing process including heads of terms, lease negotiations, rent reviews, and break clauses to ensure the best outcome for you.' },
  { q: 'Can you value my commercial property?', a: 'Absolutely. We provide free, no-obligation commercial property valuations based on thorough market analysis and comparable evidence.' },
];

const guarantees = [
  { icon: 'ri-calendar-check-line', title: 'No Let, No Fee', desc: 'You only pay when we successfully place a tenant or complete a sale.' },
  { icon: 'ri-shield-check-line', title: 'Vetted Occupiers', desc: 'All prospective tenants and buyers are thoroughly financially and professionally screened.' },
  { icon: 'ri-line-chart-line', title: 'Maximum Value', desc: 'We price and position your property to achieve the best possible return in the market.' },
];

export default function CommercialAdvertising() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { status: formStatus, error: formError, submitToContacts, reset } = useFormSubmit();

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    const honeypot = form.querySelector<HTMLInputElement>('input[name="phone_alt"]');
    if (honeypot && honeypot.value.trim() !== '') {
      reset();
      form.reset();
      return;
    }

    const formData = new FormData(form);
    const fullName = (formData.get('full_name') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();
    const propertyAddress = (formData.get('property_address') as string || '').trim();
    const propertyType = (formData.get('property_type') as string || '').trim();
    const propertySize = (formData.get('property_size') as string || '').trim();
    const purpose = (formData.get('purpose') as string || '').trim();
    const message = (formData.get('message') as string || '').trim();

    const notes = `Property Address: ${propertyAddress}
Property Type: ${propertyType}
Size: ${propertySize}
Purpose: ${purpose}

${message}`;

    const success = await submitToContacts({
      name: fullName,
      email,
      phone: phone || undefined,
      type: 'commercial_enquiry',
      notes,
      tags: ['commercial_advertising'],
    });

    if (success) {
      form.reset();
    }
  };

  return (
    <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
      <Header />

      {/* Hero */}
      <div className="relative flex flex-col justify-center overflow-hidden pt-16 pb-16 min-h-[420px] md:min-h-[480px]">
        <img
          src="https://readdy.ai/api/search-image?query=Modern%20glass%20commercial%20office%20tower%20with%20reflective%20facade%20standing%20tall%20against%20dramatic%20twilight%20sky%2C%20Nairobi%20city%20skyline%20silhouette%20in%20background%20with%20warm%20amber%20lights%2C%20professional%20architectural%20photography%2C%20luxury%20corporate%20aesthetic%2C%20high%20contrast%2C%20cinematic%20atmosphere&width=1600&height=800&seq=comm-adv-hero-01&orientation=landscape"
          alt="Commercial property advertising"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/50"></div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6">
          <div className="max-w-2xl">
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-4">Commercial Property Advertising</p>
            <h1 className="font-roboto font-bold text-white text-3xl md:text-5xl mb-6 leading-tight">
              Advertise Your<br />Commercial Property<br />With Us
            </h1>
            <p className="text-white/80 font-roboto text-base md:text-lg leading-relaxed mb-10 max-w-lg">
              Nairobi&apos;s leading commercial property agency. We connect office, retail, and industrial properties with the right tenants and investors — fast.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <a href="#advertising-form" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-golden text-white font-roboto text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
                <i className="ri-building-2-line"></i>Advertise Now
              </a>
              <a href="#advertising-form" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-white/50 text-white font-roboto text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors">
                <i className="ri-bar-chart-2-line"></i>Free Valuation
              </a>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 right-10 hidden lg:flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0">
            <i className="ri-award-line text-white text-lg"></i>
          </div>
          <div>
            <p className="text-white font-roboto font-bold text-sm">#1 Commercial Agency</p>
            <p className="text-white/60 font-roboto text-xs">Nairobi, Kenya</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-primary">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { stat: '150+', label: 'Commercial Properties' },
            { stat: '95%', label: 'Occupancy Rate' },
            { stat: '10+', label: 'Years Experience' },
            { stat: '45 days', label: 'Avg. Time to Let' },
          ].map((item) => (
            <div key={item.label}>
              <p className="font-roboto font-bold text-3xl text-white">{item.stat}</p>
              <p className="text-white/60 font-roboto text-xs mt-1 uppercase tracking-wider">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Priority section */}
      <section className="py-16 px-6 border-b-2 border-gray-200">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">Our Commitment</p>
            <h2 className="text-3xl font-roboto font-bold text-primary mb-5 leading-snug">Your Commercial Property Is Our Business</h2>
            <p className="text-stone-500 font-roboto text-sm leading-relaxed mb-5">
              At Oceans Kenya, we understand commercial real estate. From prime office space in Westlands to retail units in Kilimani and industrial warehouses on Mombasa Road — our dedicated commercial team knows the market inside out.
            </p>
            <p className="text-stone-500 font-roboto text-sm leading-relaxed">
              With extensive connections across Nairobi&apos;s business community and multinational occupiers, we have the reach to connect your property with the right buyer or tenant at the right price.
            </p>
          </div>
          <div className="relative">
            <div className="w-full h-72 overflow-hidden">
              <img
                alt="Commercial property in Nairobi"
                className="w-full h-full object-cover object-top"
                src="https://readdy.ai/api/search-image?query=Professional%20business%20meeting%20in%20modern%20glass%20office%20lobby%20with%20elegant%20interior%20design%2C%20warm%20natural%20lighting%20through%20floor%20to%20ceiling%20windows%2C%20Nairobi%20corporate%20atmosphere%2C%20two%20professionals%20reviewing%20documents%20at%20marble%20table%2C%20high%20end%20commercial%20real%20estate%2C%20architectural%20photography%20style&width=800&height=600&seq=comm-adv-section-01&orientation=landscape"
              />
            </div>
            <div className="absolute -bottom-5 -left-5 px-6 py-4 bg-golden hidden md:block">
              <p className="text-white font-roboto font-bold text-xl">95%</p>
              <p className="text-white/80 font-roboto text-xs">Occupancy Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">Our Services</p>
            <h2 className="text-3xl md:text-4xl font-roboto font-bold text-primary mb-4">Commercial Property Services</h2>
            <p className="text-stone-500 font-roboto text-sm max-w-xl mx-auto leading-relaxed">Comprehensive solutions for commercial property owners and investors.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s) => (
              <div key={s.title} className="group p-7 border-2 border-gray-200 rounded-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 flex items-center justify-center rounded-full mb-5 bg-primary/5">
                  <i className={`${s.icon} text-xl text-primary`}></i>
                </div>
                <h3 className="font-roboto font-bold text-primary text-base mb-2">{s.title}</h3>
                <p className="text-stone-500 font-roboto text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">Service Options</p>
            <h2 className="text-3xl font-roboto font-bold text-primary mb-4">Choose How You Want to Advertise</h2>
            <p className="text-stone-500 font-roboto text-sm max-w-lg mx-auto leading-relaxed">Whether selling or letting, we have a package tailored to your commercial property goals.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Let Only */}
            <div className="bg-white border-2 border-primary overflow-hidden rounded-sm hover:shadow-lg transition-all duration-300">
              <div className="px-8 py-7 border-b-2 border-gray-200">
                <div className="w-10 h-10 flex items-center justify-center rounded-full mb-4 bg-primary/5">
                  <i className="ri-key-2-line text-lg text-primary"></i>
                </div>
                <h3 className="font-roboto font-bold text-2xl text-primary mb-1">Let Only</h3>
                <p className="text-stone-500 font-roboto text-sm">Ideal for landlords who prefer to manage their commercial property after tenant placement.</p>
              </div>
              <div className="px-8 py-7">
                <ul className="space-y-3">
                  {['Professional property photography', 'Listings on all major commercial portals', 'Corporate tenant viewings & vetting', 'Lease agreement preparation', 'Deposit handling & registration', 'Handover & key release'].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm font-roboto text-stone-500">
                      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-golden">
                        <i className="ri-check-line"></i>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#advertising-form" className="mt-8 flex items-center justify-center gap-2 w-full py-3 bg-primary text-white font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/85 transition-all">
                  <i className="ri-arrow-right-line"></i>Enquire About Let Only
                </a>
              </div>
            </div>

            {/* Full Management */}
            <div className="overflow-hidden relative shadow-xl rounded-sm hover:shadow-2xl transition-all duration-300 bg-primary">
              <div className="absolute top-5 right-5">
                <span className="bg-golden text-white font-roboto text-xs px-3 py-1 uppercase tracking-widest whitespace-nowrap">Most Popular</span>
              </div>
              <div className="px-8 py-7 border-b border-white/10">
                <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full mb-4">
                  <i className="ri-building-4-line text-lg text-white"></i>
                </div>
                <h3 className="text-white font-roboto font-bold text-2xl mb-1">Full Sale / Let Management</h3>
                <p className="text-white/60 font-roboto text-sm">Complete peace of mind — we handle everything from marketing to transaction completion.</p>
              </div>
              <div className="px-8 py-7">
                <ul className="space-y-3">
                  {['Everything in Let Only, plus:', 'Targeted investor and occupier outreach', 'Negotiation and heads of terms', 'Legal coordination through completion', 'Periodic market reviews', 'Rent review and lease renewal management', 'Dedicated commercial account manager'].map((item, i) => (
                    <li key={item} className={`flex items-start gap-3 text-sm font-roboto ${i === 0 ? 'text-white font-medium' : 'text-white/75'}`}>
                      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-golden">
                        <i className="ri-check-line"></i>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#advertising-form" className="mt-8 flex items-center justify-center gap-2 w-full py-3 bg-golden text-white font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
                  <i className="ri-arrow-right-line"></i>Enquire About Full Management
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white border-t border-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">How It Works</p>
            <h2 className="text-3xl font-roboto font-bold text-primary">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, i) => (
              <div key={step.title} className="relative text-center p-4 rounded-sm hover:bg-white hover:shadow-md transition-all duration-300">
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px bg-gray-200"></div>
                )}
                <div className="relative inline-flex items-center justify-center mb-5">
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-primary mx-auto">
                    <i className={`${step.icon} text-white text-xl`}></i>
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full bg-golden text-white font-roboto text-xs font-bold">{step.step}</span>
                </div>
                <h3 className="font-roboto font-bold text-primary text-base mb-2">{step.title}</h3>
                <p className="text-stone-500 font-roboto text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">Why Us</p>
            <h2 className="text-3xl font-roboto font-bold text-primary">Why Choose Us for Commercial Property</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyUs.map((item) => (
              <div key={item.title} className="p-7 border-2 border-gray-200 rounded-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 flex items-center justify-center rounded-full mb-5 bg-primary/5">
                  <i className={`${item.icon} text-xl text-primary`}></i>
                </div>
                <h3 className="font-roboto font-bold text-primary text-base mb-2">{item.title}</h3>
                <p className="text-stone-500 font-roboto text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">Common Questions</p>
            <h2 className="text-3xl font-roboto font-bold text-primary">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border-2 border-gray-200 overflow-hidden rounded-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer group hover:bg-gray-50/80 transition-colors"
                >
                  <span className="font-roboto font-bold text-primary text-sm pr-4">{faq.q}</span>
                  <span className="w-7 h-7 flex items-center justify-center flex-shrink-0 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
                    <i className={`text-sm transition-transform duration-300 ${openFaq === i ? 'ri-subtract-line' : 'ri-add-line'}`}></i>
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-stone-500 font-roboto text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section className="py-16 px-6 bg-primary">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {guarantees.map((g) => (
            <div key={g.title} className="flex flex-col items-center">
              <div className="w-14 h-14 flex items-center justify-center bg-white/10 rounded-full mb-4">
                <i className={`${g.icon} text-2xl text-golden`}></i>
              </div>
              <h3 className="text-white font-roboto font-bold text-lg mb-2">{g.title}</h3>
              <p className="text-white/60 font-roboto text-sm leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Browse listings CTA */}
      <section className="py-12 px-6 bg-white text-center border-b-2 border-gray-200">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-roboto font-bold text-primary mb-3">Looking for Commercial Property?</h2>
          <p className="text-stone-500 font-roboto text-sm mb-6 max-w-lg mx-auto">Browse our current commercial property listings — offices, retail spaces, warehouses, and more.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/commercial-property" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-roboto text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-building-2-line"></i>
              Commercial To Rent
            </Link>
            <Link to="/commercial-property?buy=true" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary text-primary font-roboto text-sm font-semibold rounded-lg hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-hand-coin-line"></i>
              Commercial For Sale
            </Link>
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="advertising-form" className="relative py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            {/* Left info */}
            <div className="lg:col-span-2">
              <div className="w-full aspect-square overflow-hidden mb-8">
                <img
                  alt="Oceans Kenya commercial property team"
                  className="w-full h-full object-cover object-top"
                  src="https://readdy.ai/api/search-image?query=Professional%20real%20estate%20agent%20in%20modern%20office%20lobby%20with%20elegant%20interior%20design%2C%20warm%20lighting%2C%20wearing%20business%20attire%2C%20shaking%20hands%20with%20client%2C%20Nairobi%20commercial%20real%20estate%2C%20corporate%20atmosphere%2C%20high%20end%20photography%2C%20natural%20expressions&width=800&height=800&seq=comm-adv-form-01&orientation=squarish"
                />
              </div>
              <p className="text-golden text-xs font-roboto tracking-widest uppercase mb-3">Get Started</p>
              <h2 className="text-3xl font-roboto font-bold text-primary mb-5 leading-snug">Let&apos;s Talk About Your Commercial Property</h2>
              <p className="text-stone-500 font-roboto text-sm leading-relaxed mb-10">
                Fill in the short form and one of our commercial property specialists will be in touch within 24 hours to discuss how we can help you let or sell your property.
              </p>
              <div className="space-y-6">
                {[
                  { icon: 'ri-phone-line', label: 'Call Us Directly', value: '+254712345678' },
                  { icon: 'ri-mail-line', label: 'Email Us', value: 'commercial@oceans.co.ke' },
                  { icon: 'ri-map-pin-2-line', label: 'Visit Our Office', value: 'Riverside Drive, Westlands, Nairobi' },
                  { icon: 'ri-time-line', label: 'Office Hours', value: 'Mon – Fri: 8:30am – 5:30pm' },
                ].map((item) => (
                  <div key={item.label} className="flex gap-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-primary/8 rounded-full flex-shrink-0">
                      <i className={`${item.icon} text-primary`}></i>
                    </div>
                    <div>
                      <p className="text-primary font-roboto text-xs font-semibold uppercase tracking-wider mb-0.5">{item.label}</p>
                      <p className="text-stone-500 font-roboto text-sm">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3 bg-white border-2 border-stone-200 p-8 md:p-10">
              <form
                data-readdy-form="true"
                id="commercial-advertising-form"
                action="https://readdy.ai/api/form/d9kqo0ec26n1c7c5qlh0"
                method="POST"
                onSubmit={handleFormSubmit}
                className="space-y-6"
              >
                <div>
                  <p className="text-primary font-roboto text-xs tracking-widest uppercase font-semibold mb-4 pb-2 border-b-2 border-stone-200">About Your Property</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Property Address <span className="text-red-400">*</span></label>
                      <input required name="property_address" placeholder="e.g. 14 Riverside Drive, Westlands" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Property Type</label>
                        <select name="property_type" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                          <option>Office</option>
                          <option>Retail Shop</option>
                          <option>Warehouse</option>
                          <option>Industrial</option>
                          <option>Mixed-Use</option>
                          <option>Commercial Land</option>
                          <option>Hotel / Hospitality</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Size (sqft)</label>
                        <select name="property_size" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                          <option>Under 500</option>
                          <option>500 – 1,000</option>
                          <option>1,000 – 2,500</option>
                          <option>2,500 – 5,000</option>
                          <option>5,000 – 10,000</option>
                          <option>10,000+</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">I Want To</label>
                        <select name="purpose" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                          <option value="let">Let the Property</option>
                          <option value="sell">Sell the Property</option>
                          <option value="both">Let or Sell</option>
                          <option value="valuation">Valuation Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Current Status</label>
                        <select name="current_status" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                          <option value="vacant">Currently Vacant</option>
                          <option value="occupied">Currently Tenanted</option>
                          <option value="owner_occupied">Owner Occupied</option>
                          <option value="under_refurb">Under Renovation</option>
                          <option value="development">Under Development</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-primary font-roboto text-xs tracking-widest uppercase font-semibold mb-4 pb-2 border-b-2 border-stone-200">Your Details</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Full Name <span className="text-red-400">*</span></label>
                      <input required name="full_name" placeholder="Your full name" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Email <span className="text-red-400">*</span></label>
                        <input required type="email" name="email" placeholder="your@email.com" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Phone <span className="text-red-400">*</span></label>
                        <input required type="tel" name="phone" placeholder="+254 700 000 000" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Message / Additional Details</label>
                      <textarea name="message" rows={3} maxLength={500} placeholder="Tell us anything else about your commercial property or requirements..." className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors resize-none"></textarea>
                    </div>
                  </div>
                </div>

                {/* Anti-spam honeypot */}
                <input type="text" name="phone_alt" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly className="hp-wrap" />

                <button
                  type="submit"
                  disabled={formStatus === 'submitting'}
                  className="w-full py-3.5 bg-primary hover:bg-golden text-white font-roboto text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {formStatus === 'submitting' ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Submitting...
                    </>
                  ) : formStatus === 'success' ? (
                    <>
                      <i className="ri-check-line"></i>
                      Submitted!
                    </>
                  ) : (
                    'Submit Enquiry'
                  )}
                </button>
                {formStatus === 'success' && (
                  <p className="text-green-600 text-sm font-roboto text-center">Thank you! We&apos;ll be in touch within 24 hours.</p>
                )}
                {formStatus === 'error' && (
                  <p className="text-red-500 text-sm font-roboto text-center">{formError}</p>
                )}
                <p className="text-stone-400 font-roboto text-xs text-center">We respond within 24 hours. No obligation, no pressure.</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <BackToTop />
    </div>
  );
}