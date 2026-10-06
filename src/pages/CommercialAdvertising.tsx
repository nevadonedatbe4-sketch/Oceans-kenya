import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import PageLoader from '@/components/feature/PageLoader';
import { useCommercialAdvertisingPageContent } from '@/hooks/useCommercialAdvertisingPageContent';

export default function CommercialAdvertising() {
  const { content: c } = useCommercialAdvertisingPageContent();
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
    <div className="min-h-screen bg-white pt-[62px] md:pt-[122px] lg:pt-[130px]">
      <Header />

      {/* Hero */}
      <div className="relative flex flex-col justify-center overflow-hidden pt-16 pb-16 min-h-[420px] md:min-h-[480px]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/70"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/50"></div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6">
          <div className="max-w-2xl">
            <p className="text-golden text-sm font-roboto font-bold tracking-widest uppercase mb-4">{c.hero_eyebrow}</p>
            <h1 className="font-roboto font-bold text-white text-3xl md:text-5xl mb-6 leading-tight">
              {c.hero_title}
            </h1>
            <p className="text-white/80 font-roboto text-base md:text-lg leading-relaxed mb-10 max-w-lg">
              {c.hero_text}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <a href="#advertising-form" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-golden text-white font-roboto font-semibold text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
                <i className="ri-building-2-line"></i>{c.hero_btn1_label}
              </a>
              <a href="#advertising-form" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-white/50 text-white font-roboto font-semibold text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors">
                <i className="ri-bar-chart-2-line"></i>{c.hero_btn2_label}
              </a>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 right-10 hidden lg:flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0">
            <i className="ri-award-line text-white text-lg"></i>
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
          <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {c.stats.map((item, i) => (
              <div key={i}>
                <p className="font-roboto font-bold text-3xl text-white">{item.value}</p>
                <p className="text-white/60 font-roboto text-xs mt-1 uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <PageBreadcrumbs />

      {/* Commitment */}
      {c.show_commit && (
        <section className="py-16 px-6 border-b-2 border-primary/12">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-golden text-sm font-roboto font-bold tracking-widest uppercase mb-3">{c.commit_eyebrow}</p>
              <h2 className="text-3xl font-roboto font-bold text-primary mb-5 leading-snug">{c.commit_title}</h2>
              <p className="text-stone-500 font-roboto text-sm leading-relaxed mb-5">{c.commit_p1}</p>
              <p className="text-stone-500 font-roboto text-sm leading-relaxed">{c.commit_p2}</p>
            </div>
            <div className="relative">
              <div className="w-full h-72 overflow-hidden">
                <img
                  alt={c.commit_title}
                  className="w-full h-full object-cover object-center"
                  src={c.commit_image}
                />
              </div>
              <div className="absolute -bottom-5 -left-5 px-6 py-4 bg-accent hidden md:block">
                <p className="text-white font-roboto font-bold text-xl">{c.commit_badge_value}</p>
                <p className="text-white/80 font-roboto text-xs">{c.commit_badge_label}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Services */}
      {c.show_services && (
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-golden text-sm font-roboto font-bold tracking-widest uppercase mb-3">{c.services_eyebrow}</p>
              <h2 className="text-3xl md:text-4xl font-roboto font-bold text-primary mb-4">{c.services_title}</h2>
              <p className="text-stone-500 font-roboto text-sm max-w-xl mx-auto leading-relaxed">{c.services_text}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {c.services.map((s, i) => (
                <div key={i} className="group p-7 border-2 border-primary/12 rounded-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full mb-5 bg-primary">
                    <i className={`${s.icon} text-xl text-white`}></i>
                  </div>
                  <h3 className="font-roboto font-bold text-primary text-base mb-2">{s.title}</h3>
                  <p className="text-stone-500 font-roboto text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Packages */}
      {c.show_packages && (
        <section className="py-20 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-golden text-sm font-roboto font-bold tracking-widest uppercase mb-3">{c.packages_eyebrow}</p>
              <h2 className="text-3xl font-roboto font-bold text-primary mb-4">{c.packages_title}</h2>
              <p className="text-stone-500 font-roboto text-sm max-w-lg mx-auto leading-relaxed">{c.packages_text}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {c.packages.map((p, i) => p.highlight ? (
                <div key={i} className="overflow-hidden relative shadow-xl rounded-sm hover:shadow-2xl transition-all duration-300 bg-primary">
                  {p.badge && (
                    <div className="absolute top-5 right-5">
                      <span className="bg-golden text-white font-roboto text-xs px-3 py-1 uppercase tracking-widest whitespace-nowrap">{p.badge}</span>
                    </div>
                  )}
                  <div className="px-8 py-7 border-b border-white/10">
                    <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full mb-4">
                      <i className="ri-building-4-line text-lg text-white"></i>
                    </div>
                    <h3 className="text-white font-roboto font-bold text-2xl mb-1">{p.title}</h3>
                    <p className="text-white/60 font-roboto text-sm">{p.desc}</p>
                  </div>
                  <div className="px-8 py-7">
                    <ul className="space-y-3">
                      {p.items.map((item, j) => (
                        <li key={j} className={`flex items-start gap-3 text-sm font-roboto ${j === 0 ? 'text-white font-medium' : 'text-white/75'}`}>
                          <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-golden">
                            <i className="ri-check-line"></i>
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <a href="#advertising-form" className="mt-8 flex items-center justify-center gap-2 w-full px-4 py-3 bg-golden text-white font-roboto font-semibold text-[11px] leading-none tracking-wide uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
                      <i className="ri-arrow-right-line"></i>{p.button}
                    </a>
                  </div>
                </div>
              ) : (
                <div key={i} className="bg-white border-2 border-primary overflow-hidden rounded-sm hover:shadow-lg transition-all duration-300">
                  <div className="px-8 py-7 border-b-2 border-primary/12">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full mb-4 bg-primary">
                      <i className="ri-key-2-line text-lg text-white"></i>
                    </div>
                    <h3 className="font-roboto font-bold text-2xl text-primary mb-1">{p.title}</h3>
                    <p className="text-stone-500 font-roboto text-sm">{p.desc}</p>
                  </div>
                  <div className="px-8 py-7">
                    <ul className="space-y-3">
                      {p.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm font-roboto text-stone-500">
                          <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-golden">
                            <i className="ri-check-line"></i>
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <a href="#advertising-form" className="mt-8 flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-white border border-primary font-roboto font-semibold text-[11px] leading-none tracking-wide uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-all">
                      <i className="ri-arrow-right-line"></i>{p.button}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      {c.show_how && (
        <section className="py-20 px-6 bg-white border-t border-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-golden text-sm font-roboto font-bold tracking-widest uppercase mb-3">{c.how_eyebrow}</p>
              <h2 className="text-3xl font-roboto font-bold text-primary">{c.how_title}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {c.steps.map((step, i) => (
                <div key={i} className="relative text-center p-4 rounded-sm hover:bg-white hover:shadow-md transition-all duration-300">
                  {i < c.steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px bg-gray-200"></div>
                  )}
                  <div className="relative inline-flex items-center justify-center mb-5">
                    <div className="w-16 h-16 flex items-center justify-center rounded-full bg-accent mx-auto">
                      <i className={`${step.icon} text-white text-xl`}></i>
                    </div>
                    <span className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full bg-[#002349] text-white font-roboto text-xs font-bold">{step.step}</span>
                  </div>
                  <h3 className="font-roboto font-bold text-primary text-base mb-2">{step.title}</h3>
                  <p className="text-stone-500 font-roboto text-xs leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Us */}
      {c.show_why && (
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-golden text-sm font-roboto font-bold tracking-widest uppercase mb-3">{c.why_eyebrow}</p>
              <h2 className="text-3xl font-roboto font-bold text-primary">{c.why_title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {c.why.map((item, i) => (
                <div key={i} className="p-7 border-2 border-primary/12 rounded-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full mb-5 bg-primary">
                    <i className={`${item.icon} text-xl text-white`}></i>
                  </div>
                  <h3 className="font-roboto font-bold text-primary text-base mb-2">{item.title}</h3>
                  <p className="text-stone-500 font-roboto text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {c.show_faq && (
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-golden text-sm font-roboto font-bold tracking-widest uppercase mb-3">{c.faq_eyebrow}</p>
              <h2 className="text-3xl font-roboto font-bold text-primary">{c.faq_title}</h2>
            </div>
            <div className="space-y-3">
              {c.faqs.map((faq, i) => (
                <div key={i} className="border-2 border-primary/12 overflow-hidden rounded-sm">
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
      )}

      {/* Guarantees */}
      {c.show_guarantees && (
        <section className="py-16 px-6 bg-primary">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {c.guarantees.map((g, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-14 h-14 flex items-center justify-center bg-white/10 rounded-full mb-4">
                  <i className={`${g.icon} text-2xl text-white`}></i>
                </div>
                <h3 className="text-white font-roboto font-bold text-lg mb-2">{g.title}</h3>
                <p className="text-white/60 font-roboto text-sm leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Browse listings CTA */}
      {c.show_browse && (
        <section className="py-12 px-6 bg-white text-center border-b-2 border-primary/12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-roboto font-bold text-primary mb-3">{c.browse_title}</h2>
            <p className="text-stone-500 font-roboto text-sm mb-6 max-w-lg mx-auto">{c.browse_text}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/commercial-property?buy=false" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white border-2 border-primary font-roboto text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-building-2-line"></i>
                {c.browse_btn1_label}
              </Link>
              <Link to="/commercial-property?buy=true" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary text-primary font-roboto text-sm font-semibold rounded-lg hover:bg-golden/10 transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-hand-coin-line"></i>
                {c.browse_btn2_label}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Form */}
      <section id="advertising-form" className="relative py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            <div className="lg:col-span-2">
              <div className="w-full aspect-square overflow-hidden mb-8">
                <img
                  alt={c.form_title}
                  className="w-full h-full object-cover object-center"
                  src={c.form_image}
                />
              </div>
              <p className="text-golden text-sm font-roboto font-bold tracking-widest uppercase mb-3">{c.form_eyebrow}</p>
              <h2 className="text-3xl font-roboto font-bold text-primary mb-5 leading-snug">{c.form_title}</h2>
              <p className="text-stone-500 font-roboto text-sm leading-relaxed mb-10">{c.form_text}</p>
              <div className="space-y-6">
                {c.contact_info.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-primary rounded-full flex-shrink-0">
                      <i className={`${item.icon} text-white`}></i>
                    </div>
                    <div>
                      <p className="text-primary font-roboto text-xs font-semibold uppercase tracking-wider mb-0.5">{item.label}</p>
                      <p className="text-stone-500 font-roboto text-sm">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 bg-white border border-gray-200 p-8 md:p-10 shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)]">
              <form
                data-readdy-form="true"
                id="commercial-advertising-form"
                action="https://readdy.ai/api/form/d9kqo0ec26n1c7c5qlh0"
                method="POST"
                onSubmit={handleFormSubmit}
                className="space-y-6"
              >
                <div>
                  <p className="text-primary font-roboto font-semibold text-xs tracking-widest uppercase mb-4 pb-2 border-b border-gray-200">About Your Property</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Property Address <span className="text-red-400">*</span></label>
                      <input required name="property_address" placeholder="e.g. 14 Riverside Drive, Westlands" className="w-full border border-gray-300 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15 transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Property Type</label>
                        <select name="property_type" className="w-full border border-gray-300 px-4 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15 cursor-pointer bg-white">
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
                        <select name="property_size" className="w-full border border-gray-300 px-4 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15 cursor-pointer bg-white">
                          <option>Under 500</option>
                          <option>500 - 1,000</option>
                          <option>1,000 - 2,500</option>
                          <option>2,500 - 5,000</option>
                          <option>5,000 - 10,000</option>
                          <option>10,000+</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">I Want To</label>
                        <select name="purpose" className="w-full border border-gray-300 px-4 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15 cursor-pointer bg-white">
                          <option value="let">Let the Property</option>
                          <option value="sell">Sell the Property</option>
                          <option value="both">Let or Sell</option>
                          <option value="valuation">Valuation Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Current Status</label>
                        <select name="current_status" className="w-full border border-gray-300 px-4 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15 cursor-pointer bg-white">
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
                  <p className="text-primary font-roboto font-semibold text-xs tracking-widest uppercase mb-4 pb-2 border-b border-gray-200">Your Details</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Full Name <span className="text-red-400">*</span></label>
                      <input required name="full_name" placeholder="Your full name" className="w-full border border-gray-300 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15 transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Email <span className="text-red-400">*</span></label>
                        <input required type="email" name="email" placeholder="your@email.com" className="w-full border border-gray-300 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Phone <span className="text-red-400">*</span></label>
                        <input required type="tel" name="phone" placeholder="+254 700 000 000" className="w-full border border-gray-300 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Message / Additional Details</label>
                      <textarea name="message" rows={3} maxLength={500} placeholder="Tell us anything else about your commercial property or requirements..." className="w-full border border-gray-300 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15 transition-colors resize-none"></textarea>
                    </div>
                  </div>
                </div>

                <input type="text" name="phone_alt" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly className="hp-wrap" />

                <button
                  type="submit"
                  disabled={formStatus === 'submitting'}
                  className="w-full px-5 py-2.5 bg-primary hover:bg-golden text-white border-2 border-primary font-roboto font-semibold text-base tracking-widest uppercase cursor-pointer whitespace-nowrap transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {formStatus === 'submitting' ? (
                    <><PageLoader size={20} />Submitting...</>
                  ) : formStatus === 'success' ? (
                    <><i className="ri-check-line"></i>Submitted!</>
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
                <p className="text-stone-400 font-roboto text-xs text-center">{c.form_note}</p>
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