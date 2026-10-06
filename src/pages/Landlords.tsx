import { useState, FormEvent } from 'react';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import PageLoader from '@/components/feature/PageLoader';
import { useLandlordsPageContent } from '@/hooks/useLandlordsPageContent';
import { FIELD_CLASS } from '@/lib/formFieldStyles';

export default function Landlords() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { status: formStatus, error: formError, submitToContacts, reset } = useFormSubmit();
  const { content } = useLandlordsPageContent();

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
    <div className="min-h-screen bg-white pt-[62px] md:pt-[122px] lg:pt-[130px]">
      <Header />

      {/* Hero */}
      <div className="relative flex flex-col justify-center overflow-hidden pt-16 pb-16 min-h-[420px] md:min-h-[480px]">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${content.hero_image})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/50"></div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6">
          <div className="max-w-2xl">
            <p className="text-golden text-xs font-roboto font-bold tracking-widest uppercase mb-4">{content.hero_eyebrow}</p>
            <h1 className="font-roboto font-bold text-white text-3xl md:text-5xl mb-6 leading-tight">
              {content.hero_line1}<br />{content.hero_line2}<br />{content.hero_line3}
            </h1>
            <p className="text-white/80 font-roboto font-medium text-base md:text-lg leading-relaxed mb-10 max-w-lg">
              {content.hero_paragraph}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <a href={content.hero_form_anchor} className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-golden text-white font-roboto font-medium text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
                <i className="ri-home-heart-line"></i>{content.hero_btn1_label}
              </a>
              <a href={content.hero_form_anchor} className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-white/50 text-white font-roboto font-medium text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors">
                <i className="ri-bar-chart-2-line"></i>{content.hero_btn2_label}
              </a>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 right-10 hidden lg:flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0">
            <i className="ri-award-line text-white text-lg"></i>
          </div>
          <div>
            <p className="text-white font-roboto font-bold text-sm">{content.hero_badge_title}</p>
            <p className="text-white/60 font-roboto text-xs">{content.hero_badge_label}</p>
          </div>
        </div>
      </div>

      {/* Stats - sits directly under the banner so the blue flows straight through */}
      <div className="bg-primary">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-center">
          {content.stats.map((item) => (
            <div key={item.label}>
              <p className="font-roboto font-bold text-xl md:text-3xl text-white">{item.value}</p>
              <p className="text-white/60 font-roboto text-[9px] md:text-xs mt-1 uppercase tracking-wider">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Breadcrumb - placed below the blue band so the blue is never broken */}
      <PageBreadcrumbs />

      {/* Priority section */}
      <section className="py-10 md:py-16 px-4 md:px-6 border-b-2 border-primary/12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <p className="text-golden text-xs font-roboto font-bold tracking-widest uppercase mb-3">{content.commit_eyebrow}</p>
            <h2 className="text-xl md:text-3xl font-roboto font-bold text-primary mb-4 md:mb-5 leading-snug">{content.commit_heading}</h2>
            <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed mb-4 md:mb-5">
              {content.commit_p1}
            </p>
            <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed">
              {content.commit_p2}
            </p>
          </div>
          <div className="relative">
            <div className="w-full h-56 md:h-72 overflow-hidden">
              <img alt="Oceans Kenya agent consulting a landlord client" className="w-full h-full object-cover object-center" src={content.commit_image} />
            </div>
            <div className="absolute -bottom-4 -left-4 px-4 py-3 md:px-6 md:py-4 bg-accent">
              <p className="text-white font-roboto font-bold text-base md:text-xl">{content.commit_badge_value}</p>
              <p className="text-white/80 font-roboto text-[10px] md:text-xs">{content.commit_badge_label}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-12 md:py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-golden text-xs font-roboto font-bold tracking-widest uppercase mb-3">{content.services_eyebrow}</p>
            <h2 className="text-xl md:text-4xl font-roboto font-bold text-primary mb-3 md:mb-4">{content.services_heading}</h2>
            <p className="text-stone-500 font-roboto text-xs md:text-sm max-w-xl mx-auto leading-relaxed">{content.services_text}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {content.services.map((s) => (
              <div key={s.title} className="group p-5 md:p-7 border-2 border-primary/12 rounded-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full mb-4 md:mb-5 bg-primary">
                  <i className={`${s.icon} text-lg md:text-xl text-white`}></i>
                </div>
                <h3 className="font-roboto font-bold text-primary text-sm md:text-base mb-2">{s.title}</h3>
                <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-12 md:py-20 px-4 md:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-golden text-xs font-roboto font-bold tracking-widest uppercase mb-3">{content.packages_eyebrow}</p>
            <h2 className="text-xl md:text-3xl font-roboto font-bold text-primary mb-3 md:mb-4">{content.packages_heading}</h2>
            <p className="text-stone-500 font-roboto text-xs md:text-sm max-w-lg mx-auto leading-relaxed">{content.packages_text}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
            {/* Let Only */}
            <div className="bg-white border-2 border-primary overflow-hidden rounded-sm hover:shadow-lg transition-all duration-300">
              <div className="px-5 md:px-8 py-5 md:py-7 border-b-2 border-primary/12">
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full mb-3 md:mb-4 bg-primary">
                  <i className={`${content.pkg1_icon} text-base md:text-lg text-white`}></i>
                </div>
                <h3 className="font-roboto font-bold text-lg md:text-2xl text-primary mb-1">{content.pkg1_title}</h3>
                <p className="text-stone-500 font-roboto text-xs md:text-sm">{content.pkg1_desc}</p>
              </div>
              <div className="px-5 md:px-8 py-5 md:py-7">
                <ul className="space-y-2 md:space-y-3">
                  {content.pkg1_features.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-xs md:text-sm font-roboto text-stone-500">
                      <span className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-golden">
                        <i className="ri-check-line font-semibold"></i>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#landlord-form" className="mt-6 md:mt-8 flex items-center justify-center gap-2 w-full py-3 bg-primary text-white border-2 border-primary font-roboto font-semibold text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden5 transition-all">
                  <i className="ri-arrow-right-line"></i>{content.pkg1_button}
                </a>
              </div>
            </div>

            {/* Full Management */}
            <div className="overflow-hidden relative shadow-xl rounded-sm hover:shadow-2xl transition-all duration-300 bg-primary">
              <div className="absolute top-3 md:top-5 right-3 md:right-5">
                <span className="bg-golden text-white font-roboto text-[10px] md:text-xs px-2 md:px-3 py-1 uppercase tracking-widest whitespace-nowrap">{content.pkg2_badge}</span>
              </div>
              <div className="px-5 md:px-8 py-5 md:py-7 border-b border-white/10">
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white/10 rounded-full mb-3 md:mb-4">
                  <i className={`${content.pkg2_icon} text-base md:text-lg text-white`}></i>
                </div>
                <h3 className="text-white font-roboto font-bold text-lg md:text-2xl mb-1">{content.pkg2_title}</h3>
                <p className="text-white/60 font-roboto text-xs md:text-sm">{content.pkg2_desc}</p>
              </div>
              <div className="px-5 md:px-8 py-5 md:py-7">
                <ul className="space-y-2 md:space-y-3">
                  {content.pkg2_features.map((item, i) => (
                    <li key={item} className={`flex items-start gap-3 text-xs md:text-sm font-roboto ${i === 0 ? 'text-white font-medium' : 'text-white/75'}`}>
                      <span className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-golden">
                        <i className="ri-check-line font-semibold"></i>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#landlord-form" className="mt-6 md:mt-8 flex items-center justify-center gap-2 w-full py-3 bg-golden text-white font-roboto font-semibold text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
                  <i className="ri-arrow-right-line"></i>{content.pkg2_button}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-20 px-4 md:px-6 bg-white border-t border-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-golden text-xs font-roboto font-bold tracking-widest uppercase mb-3">{content.how_eyebrow}</p>
            <h2 className="text-xl md:text-3xl font-roboto font-bold text-primary">{content.how_heading}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
            {content.how_steps.map((step, i) => (
              <div key={step.title} className="relative text-center p-3 md:p-4 rounded-sm hover:bg-white hover:shadow-md transition-all duration-300">
                {i < content.how_steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px bg-gray-200"></div>
                )}
                <div className="relative inline-flex items-center justify-center mb-4 md:mb-5">
                  <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-primary mx-auto">
                    <i className={`${step.icon} text-white text-lg md:text-xl`}></i>
                  </div>
                  <span className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-accent text-white font-roboto text-[10px] md:text-xs font-bold">{step.step}</span>
                </div>
                <h3 className="font-roboto font-bold text-primary text-sm md:text-base mb-2">{step.title}</h3>
                <p className="text-stone-500 font-roboto text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-12 md:py-20 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-golden text-xs font-roboto font-bold tracking-widest uppercase mb-3">{content.why_eyebrow}</p>
            <h2 className="text-xl md:text-3xl font-roboto font-bold text-primary">{content.why_heading}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
            {content.why_cards.map((item) => (
              <div key={item.title} className="p-5 md:p-7 border-2 border-primary/12 rounded-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full mb-4 md:mb-5 bg-primary">
                  <i className={`${item.icon} text-lg md:text-xl text-white`}></i>
                </div>
                <h3 className="font-roboto font-bold text-primary text-sm md:text-base mb-2">{item.title}</h3>
                <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 md:py-20 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-golden text-xs font-roboto font-bold tracking-widest uppercase mb-3">{content.faq_eyebrow}</p>
            <h2 className="text-xl md:text-3xl font-roboto font-bold text-primary">{content.faq_heading}</h2>
          </div>
          <div className="space-y-2 md:space-y-3">
            {content.faqs.map((faq, i) => (
              <div key={i} className="border-2 border-primary/12 overflow-hidden rounded-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 md:px-6 py-4 md:py-5 text-left cursor-pointer group hover:bg-gray-50/80 transition-colors"
                >
                  <span className="font-roboto font-bold text-primary text-xs md:text-sm pr-4">{faq.q}</span>
                  <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center flex-shrink-0 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
                    <i className={`text-sm transition-transform duration-300 ${openFaq === i ? 'ri-subtract-line' : 'ri-add-line'}`}></i>
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-4 md:px-6 pb-4 md:pb-5">
                    <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section className="py-12 md:py-16 px-4 md:px-6 bg-primary">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-center">
          {content.guarantees.map((g) => (
            <div key={g.title} className="flex flex-col items-center">
              <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-white/10 rounded-full mb-3 md:mb-4">
                <i className={`${g.icon} text-xl md:text-2xl text-white`}></i>
              </div>
              <h3 className="text-white font-roboto font-bold text-base md:text-lg mb-2">{g.title}</h3>
              <p className="text-white/60 font-roboto text-xs md:text-sm leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section id="landlord-form" className="relative py-12 md:py-20 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 md:gap-12 items-start">
            {/* Left info */}
            <div className="lg:col-span-2">
              <div className="w-full aspect-square overflow-hidden mb-6 md:mb-8">
                <img alt="Oceans Kenya" className="w-full h-full object-cover object-center" src={content.form_image} />
              </div>
              <p className="text-golden text-xs font-roboto font-bold tracking-widest uppercase mb-3">{content.form_eyebrow}</p>
              <h2 className="text-xl md:text-3xl font-roboto font-bold text-primary mb-4 md:mb-5 leading-snug">{content.form_heading}</h2>
              <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed mb-8 md:mb-10">
                {content.form_text}
              </p>
              <div className="space-y-4 md:space-y-6">
                {content.form_info.map((item) => (
                  <div key={item.label} className="flex gap-3 md:gap-4">
                    <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-primary rounded-full flex-shrink-0">
                      <i className={`${item.icon} text-white text-sm`}></i>
                    </div>
                    <div>
                      <p className="text-primary font-roboto text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-0.5">{item.label}</p>
                      <p className="text-stone-500 font-roboto text-xs md:text-sm">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3 bg-white border-2 border-primary/20 p-5 md:p-10 shadow-[0_4px_12px_rgba(0,35,73,0.05),0_12px_32px_rgba(0,35,73,0.08),0_24px_64px_rgba(0,35,73,0.10)]">
              <form data-readdy-form="true" id="landlord-property-form" onSubmit={handleFormSubmit} className="space-y-6">
                <div>
                  <p className="text-primary font-roboto text-xs tracking-widest uppercase font-semibold mb-4 pb-2 border-b-2 border-primary/20">About Your Property</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Property Address <span className="text-red-400">*</span></label>
                      <input required name="property_address" placeholder="e.g. 14 Riverside Drive, Westlands" className={FIELD_CLASS} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Property Type</label>
                        <select name="property_type" className={`${FIELD_CLASS} cursor-pointer bg-white`}>
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
                        <select name="bedrooms" className={`${FIELD_CLASS} cursor-pointer bg-white`}>
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
                        <select name="service_required" className={`${FIELD_CLASS} cursor-pointer bg-white`}>
                          <option value="full_management">Full Management</option>
                          <option value="let_only">Let Only</option>
                          <option value="sale">I Want to Sell</option>
                          <option value="not_sure">Not Sure Yet</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Current Status</label>
                        <select name="current_status" className={`${FIELD_CLASS} cursor-pointer bg-white`}>
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
                  <p className="text-primary font-roboto text-xs tracking-widest uppercase font-semibold mb-4 pb-2 border-b-2 border-primary/20">Your Details</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Full Name <span className="text-red-400">*</span></label>
                      <input required name="full_name" placeholder="Your full name" className={FIELD_CLASS} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Email <span className="text-red-400">*</span></label>
                        <input required type="email" name="email" placeholder="your@email.com" className={FIELD_CLASS} />
                      </div>
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Phone <span className="text-red-400">*</span></label>
                        <input required type="tel" name="phone" placeholder="+256 700 000 000" className={FIELD_CLASS} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Message / Additional Details</label>
                      <textarea name="message" rows={3} maxLength={500} placeholder="Tell us anything else about your property or requirements..." className={`${FIELD_CLASS} resize-none`}></textarea>
                    </div>
                  </div>
                </div>

                {/* Anti-spam honeypot */}
                <input type="text" name="phone_alt" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly className="hp-wrap" />

                <button
                  type="submit"
                  disabled={formStatus === 'submitting' || formStatus === 'success'}
                  className="w-full px-5 py-2.5 bg-primary hover:bg-golden text-white border-2 border-primary font-roboto font-semibold text-base tracking-widest uppercase cursor-pointer whitespace-nowrap transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {formStatus === 'submitting' ? (
                    <>
                      <PageLoader size={20} />
                      Submitting...
                    </>
                  ) : formStatus === 'success' ? (
                    <>
                      <i className="ri-check-line"></i>
                      Submitted!
                    </>
                  ) : (
                    content.form_submit_label
                  )}
                </button>
                {formStatus === 'success' && (
                  <div className="flex items-start gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg" role="status">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 shrink-0">
                      <i className="ri-check-line text-green-600"></i>
                    </span>
                    <div className="text-left">
                      <p className="text-green-700 font-roboto font-semibold text-sm">{content.form_success_title}</p>
                      <p className="text-green-600 font-roboto text-xs mt-0.5">{content.form_success_text}</p>
                    </div>
                  </div>
                )}
                {formStatus === 'error' && (
                  <p className="text-red-500 text-sm font-roboto text-center">{formError}</p>
                )}
                <p className="text-stone-400 font-roboto text-xs text-center">{content.form_footnote}</p>
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