import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { useFormSubmit } from '@/hooks/useFormSubmit';

const services = [
  { icon: 'ri-user-search-line', title: 'Tenant Finding', desc: 'We market your property across all major platforms and our own database of pre-qualified tenants.' },
  { icon: 'ri-home-gear-line', title: 'Full Management', desc: 'We handle everything — from tenant vetting to maintenance coordination and rent collection.' },
  { icon: 'ri-money-dollar-circle-line', title: 'Rent Collection', desc: 'Reliable monthly rent collection with detailed statements and direct bank transfers.' },
  { icon: 'ri-tools-line', title: 'Property Maintenance', desc: 'Trusted contractor network for repairs, inspections, and property upkeep.' },
];

const howItWorks = [
  { icon: 'ri-phone-line', step: 1, title: 'Free Valuation', desc: 'We assess your property and provide a free, no-obligation rental valuation.' },
  { icon: 'ri-search-eye-line', step: 2, title: 'Property Listing', desc: 'Professional photography and listing across all major platforms within 48 hours.' },
  { icon: 'ri-camera-line', step: 3, title: 'Tenant Vetting', desc: 'Thorough background checks, employment verification, and reference screening.' },
  { icon: 'ri-user-received-2-line', step: 4, title: 'Move In', desc: 'Tenancy agreement, deposit collection, and smooth move-in coordination.' },
];

const whyUs = [
  { icon: 'ri-bar-chart-2-line', title: 'Maximum Returns', desc: 'We price your property correctly from day one to maximise your rental income.' },
  { icon: 'ri-time-line', title: 'Minimum Voids', desc: 'Our proactive approach means your property is rarely empty between tenancies.' },
  { icon: 'ri-eye-line', title: 'Full Transparency', desc: 'Monthly statements, online portal access, and 24/7 communication with your dedicated manager.' },
];

const faqs = [
  { q: 'How much does it cost to let my property?', a: 'Our fees vary depending on the service level. For Let Only, we charge a one-time fee equivalent to one month\'s rent. For Full Management, we charge a monthly percentage of the rental income. Contact us for a bespoke quote.' },
  { q: 'How long does it take to find a tenant?', a: 'On average, we find a qualified tenant within 21 days of listing. This can vary based on property type, location, and rental price.' },
  { q: 'Do you handle maintenance and repairs?', a: 'Yes, under our Full Management service we coordinate all maintenance and repairs using our trusted contractor network. You\'ll be notified and have approval for all significant works.' },
  { q: 'What happens if a tenant doesn\'t pay rent?', a: 'We have robust procedures to chase outstanding rent. We also offer a Rent Guarantee scheme — ask us for details on this additional protection.' },
  { q: 'Can I use your tenant-finding service only?', a: 'Absolutely. Our Let Only service covers everything up to finding and placing the tenant. After that, you take over management yourself.' },
];

const guarantees = [
  { icon: 'ri-calendar-check-line', title: 'No Let, No Fee', desc: 'You only pay when we successfully place a tenant. Zero risk, zero upfront cost.' },
  { icon: 'ri-shield-check-line', title: 'Fully Vetted Tenants', desc: 'Every applicant undergoes background checks, employment verification, and reference screening.' },
  { icon: 'ri-money-dollar-circle-line', title: 'Rent Guarantee Option', desc: 'Ask about our rent guarantee scheme — we pay you whether or not the tenant does.' },
];

export default function Landlords() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { status: formStatus, error: formError, submitToContacts, reset } = useFormSubmit();

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    // Anti-spam honeypot check
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
    const bedrooms = (formData.get('bedrooms') as string || '').trim();
    const serviceRequired = (formData.get('service_required') as string || '').trim();
    const currentStatus = (formData.get('current_status') as string || '').trim();
    const message = (formData.get('message') as string || '').trim();

    const notes = `Property Address: ${propertyAddress}
Property Type: ${propertyType}
Bedrooms: ${bedrooms}
Service Required: ${serviceRequired}
Current Status: ${currentStatus}

${message}`;

    const success = await submitToContacts({
      name: fullName,
      email,
      phone: phone || undefined,
      type: 'landlord_enquiry',
      notes,
      tags: ['landlords_page'],
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
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/hero-bg-1776885671058.JPG)' }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/50"></div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6">
          <div className="max-w-2xl">
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-4">For Landlords &amp; Property Owners</p>
            <h1 className="font-roboto font-bold text-white text-3xl md:text-5xl mb-6 leading-tight">
              Let or Sell Your<br />Property With<br />Confidence
            </h1>
            <p className="text-white/80 font-roboto text-base md:text-lg leading-relaxed mb-10 max-w-lg">
              Nairobi&apos;s most trusted letting and management agency. We find quality tenants fast, collect your rent reliably, and protect your investment for the long term.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <a href="#landlord-form" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-golden text-white font-roboto text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
                <i className="ri-home-heart-line"></i>List My Property
              </a>
              <a href="#landlord-form" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-white/50 text-white font-roboto text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors">
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
            <p className="text-white font-roboto font-bold text-sm">#1 Letting Agency</p>
            <p className="text-white/60 font-roboto text-xs">Nairobi, Kenya</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-primary">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { stat: '200+', label: 'Properties Managed' },
            { stat: '98%', label: 'Occupancy Rate' },
            { stat: '10+', label: 'Years Experience' },
            { stat: '21 days', label: 'Avg. Time to Let' },
          ].map((item) => (
            <div key={item.label}>
              <p className="font-roboto font-bold text-3xl text-white">{item.stat}</p>
              <p className="text-white/60 font-roboto text-xs mt-1 uppercase tracking-wider">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Priority section */}
      <section className="py-16 px-6 border-b border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-3">Our Commitment</p>
            <h2 className="text-3xl font-roboto font-bold text-primary mb-5 leading-snug">Your Property Is Our Priority</h2>
            <p className="text-stone-500 font-roboto text-sm leading-relaxed mb-5">
              At Oceans Kenya, we understand that your property is more than an asset — it&apos;s a significant investment. Our dedicated landlord team treats every property as if it were their own: maximising returns, minimising voids, and ensuring every tenancy runs smoothly.
            </p>
            <p className="text-stone-500 font-roboto text-sm leading-relaxed">
              With deep roots in Nairobi&apos;s premium property market, we have the network, experience, and systems to consistently deliver outstanding results for landlords across Karen, Westlands, Kilimani, and beyond.
            </p>
          </div>
          <div className="relative">
            <div className="w-full h-72 overflow-hidden">
              <img alt="Oceans Kenya agent consulting a landlord client" className="w-full h-full object-cover object-top" src="https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/hero-bg-1776885671058.JPG" />
            </div>
            <div className="absolute -bottom-5 -left-5 px-6 py-4 bg-golden hidden md:block">
              <p className="text-white font-roboto font-bold text-xl">98%</p>
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
            <h2 className="text-3xl md:text-4xl font-roboto font-bold text-primary mb-4">Our Landlord Services</h2>
            <p className="text-stone-500 font-roboto text-sm max-w-xl mx-auto leading-relaxed">Everything you need to let and manage your property with confidence.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s) => (
              <div key={s.title} className="group p-7 border border-gray-100 rounded-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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
            <h2 className="text-3xl font-roboto font-bold text-primary mb-4">Choose the Right Service for You</h2>
            <p className="text-stone-500 font-roboto text-sm max-w-lg mx-auto leading-relaxed">Whether you want us to find the tenant and step back, or have us manage everything end-to-end, we have a package that fits.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Let Only */}
            <div className="bg-white border-2 border-primary overflow-hidden rounded-sm hover:shadow-lg transition-all duration-300">
              <div className="px-8 py-7 border-b border-gray-100">
                <div className="w-10 h-10 flex items-center justify-center rounded-full mb-4 bg-primary/5">
                  <i className="ri-key-2-line text-lg text-primary"></i>
                </div>
                <h3 className="font-roboto font-bold text-2xl text-primary mb-1">Let Only</h3>
                <p className="text-stone-500 font-roboto text-sm">Ideal for landlords who prefer hands-on management after tenant placement.</p>
              </div>
              <div className="px-8 py-7">
                <ul className="space-y-3">
                  {['Professional property photography', 'Listings on all major portals', 'Tenant viewings & vetting', 'Tenancy agreement preparation', 'Deposit handling & registration', 'Handover & key release'].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm font-roboto text-stone-500">
                      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-golden">
                        <i className="ri-check-line"></i>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#landlord-form" className="mt-8 flex items-center justify-center gap-2 w-full py-3 bg-primary text-white font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/85 transition-all">
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
                <h3 className="text-white font-roboto font-bold text-2xl mb-1">Full Management</h3>
                <p className="text-white/60 font-roboto text-sm">Complete peace of mind — we handle everything from first listing to ongoing tenancy.</p>
              </div>
              <div className="px-8 py-7">
                <ul className="space-y-3">
                  {['Everything in Let Only, plus:', 'Monthly rent collection', 'Detailed income statements', 'Maintenance & repair coordination', 'Periodic property inspections', 'Tenant dispute resolution', 'Annual compliance review', 'Dedicated account manager'].map((item, i) => (
                    <li key={item} className={`flex items-start gap-3 text-sm font-roboto ${i === 0 ? 'text-white font-medium' : 'text-white/75'}`}>
                      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-golden">
                        <i className="ri-check-line"></i>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#landlord-form" className="mt-8 flex items-center justify-center gap-2 w-full py-3 bg-golden text-white font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
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
            <h2 className="text-3xl font-roboto font-bold text-primary">Why Landlords Choose Us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyUs.map((item) => (
              <div key={item.title} className="p-7 border border-gray-100 rounded-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
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
              <div key={i} className="border border-gray-100 overflow-hidden rounded-sm">
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

      {/* Form */}
      <section id="landlord-form" className="relative py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            {/* Left info */}
            <div className="lg:col-span-2">
              <div className="w-full aspect-square overflow-hidden mb-8">
                <img alt="Oceans Estate &amp; Letting Agents" className="w-full h-full object-cover object-top" src="https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/hero-bg-1776886125836.jpg" />
              </div>
              <p className="text-golden text-xs font-roboto tracking-widest uppercase mb-3">Get Started</p>
              <h2 className="text-3xl font-roboto font-bold text-primary mb-5 leading-snug">Let's Talk About Your Property</h2>
              <p className="text-stone-500 font-roboto text-sm leading-relaxed mb-10">
                Fill in the short form and one of our dedicated landlord specialists will be in touch within 24 hours to discuss how we can maximise your rental return.
              </p>
              <div className="space-y-6">
                {[
                  { icon: 'ri-phone-line', label: 'Call Us Directly', value: '+254712345678' },
                  { icon: 'ri-mail-line', label: 'Email Us', value: 'info@oceans.co.ke' },
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
            <div className="lg:col-span-3 bg-white border border-stone-100 p-8 md:p-10">
              <form data-readdy-form="true" id="landlord-property-form" onSubmit={handleFormSubmit} className="space-y-6">
                <div>
                  <p className="text-primary font-roboto text-xs tracking-widest uppercase font-semibold mb-4 pb-2 border-b border-stone-100">About Your Property</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Property Address <span className="text-red-400">*</span></label>
                      <input required name="property_address" placeholder="e.g. 14 Riverside Drive, Westlands" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Property Type</label>
                        <select name="property_type" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                          <option>Apartment</option>
                          <option>Villa</option>
                          <option>Penthouse</option>
                          <option>Townhouse</option>
                          <option>Family Home</option>
                          <option>Studio</option>
                          <option>Land</option>
                          <option>Commercial</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Bedrooms</label>
                        <select name="bedrooms" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                          <option>Studio</option>
                          <option>1 Bed</option>
                          <option>2 Beds</option>
                          <option>3 Beds</option>
                          <option>4 Beds</option>
                          <option>5 Beds</option>
                          <option>6+ Beds</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Service Required</label>
                        <select name="service_required" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                          <option value="full_management">Full Management</option>
                          <option value="let_only">Let Only</option>
                          <option value="sale">I Want to Sell</option>
                          <option value="not_sure">Not Sure Yet</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Current Status</label>
                        <select name="current_status" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                          <option value="vacant">Currently Vacant</option>
                          <option value="occupied">Currently Tenanted</option>
                          <option value="owner_occupied">Owner Occupied</option>
                          <option value="under_refurb">Under Renovation</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-primary font-roboto text-xs tracking-widest uppercase font-semibold mb-4 pb-2 border-b border-stone-100">Your Details</p>
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
                        <input required type="tel" name="phone" placeholder="+256 700 000 000" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Message / Additional Details</label>
                      <textarea name="message" rows={3} maxLength={500} placeholder="Tell us anything else about your property or requirements..." className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors resize-none"></textarea>
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
                    'Submit'
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