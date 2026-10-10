import { useState, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { DEFAULT_DIAL_CODE, combinePhone } from '@/lib/dialCodes';
import CountryCodeSelect from '@/components/feature/CountryCodeSelect';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useContactPageContent } from '@/hooks/useContactPageContent';
import { resolveSocials } from '@/lib/socialIcons';
import { getSiteOffices } from '@/lib/siteOffices';
import { DEFAULT_CONTACT, formatPhoneDisplay, toTelHref, toWhatsappHref } from '@/lib/contactDefaults';
import { FIELD_CLASS } from '@/lib/formFieldStyles';

const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

export default function Contact() {
  const { status: formStatus, error: formError, submitToContacts, reset } = useFormSubmit();
  const { getSite, social } = useSiteSettings();
  const { content } = useContactPageContent();
  const [searchParams] = useSearchParams();
  const presetEnquiry = searchParams.get('type');
  const socialLinks = resolveSocials(social, 'contact', []);

  const sitePhone = getSite('contact_phone') || DEFAULT_CONTACT.phone;
  const siteEmail = getSite('contact_email') || DEFAULT_CONTACT.email;
  const siteWhatsapp = getSite('whatsapp_number') || sitePhone;
  const siteAddress = getSite('address');
  const offices = getSiteOffices(getSite);
  const telHref = toTelHref(sitePhone);
  const waHref = toWhatsappHref(siteWhatsapp);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // Anti-spam honeypot
    const honeypot = (formData.get('company_alt') as string || '').trim();
    if (honeypot) {
      form.reset();
      return;
    }

    const fullName = (formData.get('full_name') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const dialCode = (formData.get('dial_code') as string || DEFAULT_DIAL_CODE).trim();
    const phone = combinePhone(dialCode, (formData.get('phone') as string || ''));
    const enquiryType = (formData.get('enquiry_type') as string || 'general').trim();
    const subject = (formData.get('subject') as string || '').trim();
    const message = (formData.get('message') as string || '').trim();

    const notes = `Subject: ${subject}\n\n${message}`;

    const success = await submitToContacts({
      name: fullName,
      email,
      phone: phone || undefined,
      type: enquiryType,
      notes,
      tags: ['contact_page'],
    });

    if (success) {
      form.reset();
    }
  };

  return (
    <div className="min-h-screen bg-white pt-[62px] md:pt-[122px] lg:pt-[130px]">
      <Header />

      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center text-center overflow-hidden pt-24 pb-24 md:pt-32 md:pb-32">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${content.hero_image})` }}></div>
        <div className="absolute inset-0 bg-primary/80"></div>
        <div className="relative z-10 w-full max-w-2xl mx-auto px-6">
          <p className="text-golden text-sm md:text-base font-roboto font-semibold tracking-[0.2em] uppercase mb-3">{content.hero_eyebrow}</p>
          <h1 className="text-3xl md:text-5xl font-roboto font-bold text-white mb-3 leading-tight">{content.hero_title}</h1>
          <p className="text-white/75 font-roboto text-sm leading-relaxed max-w-md mx-auto mb-6">
            {content.hero_subtitle}
          </p>
        </div>
      </div>

      {/* Quick links - sits directly under the banner so the blue flows straight through */}
      <div className="bg-primary">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-5 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {content.quick_links.map((item) => (
            <Link key={item.label} to={item.link} className="flex items-center gap-2 bg-white/8 border border-white/10 px-2.5 md:px-3 py-2 md:py-2.5 hover:bg-white/15 hover:shadow-md transition-all cursor-pointer group rounded-sm">
              <div className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full bg-white/10 flex-shrink-0">
                <i className={`${item.icon} text-golden text-[10px] md:text-xs`}></i>
              </div>
              <span className="text-white/80 font-roboto text-[10px] md:text-[11px] leading-tight group-hover:text-white transition-colors">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Breadcrumb - placed below the blue band so the blue is never broken */}
      <PageBreadcrumbs />

      {/* Main content */}
      <section className="relative max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          {/* Form + Map */}
          <div className="lg:col-span-8 flex flex-col h-full pb-4 md:pb-8">
            <div className="mb-4 md:mb-5">
              <p className="text-golden text-xs md:text-base font-roboto font-semibold tracking-[0.2em] uppercase mb-2">{content.form_eyebrow}</p>
              <h2 className="text-xl md:text-2xl font-roboto font-bold text-primary mb-2">{content.form_heading}</h2>
              <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed">{content.form_text}</p>
            </div>

            <div className="bg-white border border-primary/10 p-4 md:p-10 shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)]">
              <form data-readdy-form="true" id="contact-main-form" onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                  <div>
                    <label className="block text-primary font-roboto text-sm font-semibold mb-2">Full Name <span className="text-red-400">*</span></label>
                    <input required name="full_name" placeholder="Your full name" className={FIELD_CLASS} />
                  </div>
                  <div>
                    <label className="block text-primary font-roboto text-sm font-semibold mb-2">Email <span className="text-red-400">*</span></label>
                    <input required type="email" name="email" placeholder="your@email.com" className={FIELD_CLASS} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-primary font-roboto text-sm font-semibold mb-2">Phone Number</label>
                    <div className="flex">
                      <CountryCodeSelect name="dial_code" defaultCode={DEFAULT_DIAL_CODE} />
                      <input
                        type="tel"
                        name="phone"
                        placeholder="700 000 000"
                        className={`${FIELD_CLASS.replace('w-full ', '')} rounded-l-none flex-1 min-w-0`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-primary font-roboto text-sm font-semibold mb-2">Enquiry Type</label>
                    <select name="enquiry_type" defaultValue={presetEnquiry === 'brochure' ? 'brochure' : undefined} className={`${FIELD_CLASS} cursor-pointer bg-white`}>
                      <option value="buy">Buying a Property</option>
                      <option value="rent">Renting a Property</option>
                      <option value="sell">Selling a Property</option>
                      <option value="let">Letting / Landlord Services</option>
                      <option value="valuation">Property Valuation</option>
                      <option value="brochure">Request Brochure</option>
                      <option value="general">General Enquiry</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-2">Subject <span className="text-red-400">*</span></label>
                  <input required name="subject" placeholder="How can we help?" className={FIELD_CLASS} />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-2">Message <span className="text-red-400">*</span></label>
                  <textarea name="message" required rows={4} maxLength={500} placeholder="Tell us about your property needs, questions, or anything else we can help with..." className={`${FIELD_CLASS} resize-none`}></textarea>
                  <p className="text-right text-sm text-primary/50 font-roboto mt-1">Max 500 characters</p>
                </div>
                <input type="text" name="company_alt" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly className="contact-hp-field" />
                <button
                  type="submit"
                  disabled={formStatus === 'submitting' || formStatus === 'success'}
                  className="w-full px-5 py-3 bg-primary hover:bg-accent text-white border-2 border-primary font-roboto font-semibold text-base tracking-widest uppercase cursor-pointer whitespace-nowrap transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {formStatus === 'submitting' ? 'Submitting...' : formStatus === 'success' ? 'Sent!' : 'Submit'}
                </button>
                {formStatus === 'success' && (
                  <div className="flex items-start gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg" role="status">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 shrink-0">
                      <i className="ri-check-line text-green-600"></i>
                    </span>
                    <div className="text-left">
                      <p className="text-green-700 font-roboto font-semibold text-sm">Message sent successfully!</p>
                      <p className="text-green-600 font-roboto text-xs mt-0.5">Thank you - we&apos;ll respond within 24 hours. There&apos;s no need to send it again.</p>
                    </div>
                  </div>
                )}
                {formStatus === 'error' && (
                  <p className="text-red-500 text-sm font-roboto text-center">{formError}</p>
                )}
                <p className="text-stone-400 font-roboto text-xs text-center">{content.form_footnote}</p>
              </form>
            </div>

            {/* Map */}
            <div className="mt-4 md:mt-6 border border-primary/12 overflow-hidden">
              <div className="bg-primary px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-white/10 rounded-full shrink-0">
                    <i className="ri-map-pin-2-fill text-golden text-[10px] md:text-xs"></i>
                  </div>
                  <p className="text-white font-roboto text-[10px] md:text-xs font-bold truncate">{siteAddress}</p>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                  <a href={telHref} className="hidden sm:flex items-center gap-1 text-white font-roboto text-xs hover:text-white/80 transition-colors cursor-pointer">
                    <i className="ri-phone-line text-xs"></i>{formatPhoneDisplay(sitePhone)}
                  </a>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(siteAddress || '')}`} target="_blank" rel="nofollow noreferrer" className="inline-flex items-center gap-1 px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-roboto font-medium bg-golden text-white hover:bg-golden/90 transition cursor-pointer whitespace-nowrap">
                    <i className="ri-navigation-fill text-[10px] md:text-xs"></i>Get Directions
                  </a>
                </div>
              </div>
              <div className="overflow-hidden">
                <iframe
                  title="Oceans Kenya Office Location"
                  width="100%"
                  height="480"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255281.1989180463!2d36.68258773125!3d-1.302861050000005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f1172d84d49a7%3A0xf7cf0254b297924c!2sNairobi%2C%20Kenya!5e0!3m2!1sen!2sus!4v1717000000000!5m2!1sen!2sus"
                  className="h-[300px] md:h-[480px]"
                ></iframe>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 relative pb-4 md:pb-8">
            <div className="bg-white border-2 border-primary/12 p-4 md:p-7 space-y-5 md:space-y-8 lg:sticky lg:top-24 lg:self-start">
              <div>
                <p className="text-golden text-xs md:text-sm font-roboto font-semibold tracking-widest uppercase mb-2">{content.sidebar_eyebrow}</p>
                <h2 className="text-xl md:text-2xl font-roboto font-bold text-primary">{content.sidebar_heading}</h2>
              </div>

              <div className="space-y-3 md:space-y-5">
                {/* Office photo */}
                <div className="w-full aspect-square overflow-hidden">
                  <img alt="Oceans Kenya" className="w-full h-full object-cover object-center" src={content.office_image} />
                </div>

                {/* Open status */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-roboto font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {content.open_status_label}
                </div>

                {/* Hours */}
                <div className="bg-white border-2 border-primary/12 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 flex items-center justify-center rounded-full">
                      <i className="ri-time-line text-primary text-xs"></i>
                    </div>
                    <h3 className="text-primary font-roboto font-bold text-sm">{content.hours_heading}</h3>
                  </div>
                  <div className="space-y-1">
                    {content.hours.map((h) => {
                      const isToday = h.day === today;
                      const isClosed = h.hours === 'Closed';
                      return (
                        <div key={h.day} className={`flex items-center justify-between py-1.5 text-sm font-roboto border-b border-gray-50 last:border-0 ${isToday ? 'bg-golden/5 px-2 -mx-2 rounded-sm' : ''}`}>
                          <span className={isToday ? 'text-primary font-semibold' : 'text-stone-500'}>
                            {h.day}
                            {isToday && <span className="ml-2 text-xs text-golden font-normal">(today)</span>}
                          </span>
                          <span className={isClosed ? 'text-red-400' : isToday ? 'text-primary font-medium' : 'text-stone-500'}>{h.hours}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Contact info */}
                <div className="bg-white border-2 border-primary/12 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/10">
                      <i className="ri-contacts-line text-golden text-xs"></i>
                    </div>
                    <h3 className="text-primary font-roboto font-bold text-sm">{content.details_heading}</h3>
                  </div>
                  <div className="space-y-2.5 md:space-y-3">
                    {[
                      { icon: 'ri-phone-line', label: 'Phone', value: formatPhoneDisplay(sitePhone), href: telHref },
                      { icon: 'ri-whatsapp-line', label: 'WhatsApp', value: siteWhatsapp, href: waHref },
                      { icon: 'ri-mail-line', label: 'Email', value: siteEmail, href: `mailto:${siteEmail}` },
                    ].map((item) => (
                      <a key={item.label} href={item.href} target={item.href.startsWith('https://wa') ? '_blank' : undefined} rel={item.href.startsWith('https') ? 'nofollow' : undefined} className="flex items-start gap-2 md:gap-2.5 group cursor-pointer rounded-sm p-1.5 -mx-1.5 hover:bg-primary/5 transition-colors">
                        <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full flex-shrink-0 group-hover:bg-golden/20 transition-colors">
                          <i className={`${item.icon} text-golden text-xs group-hover:text-golden transition-colors`}></i>
                        </div>
                        <div>
                          <p className="text-primary font-roboto text-sm font-bold uppercase tracking-wider mb-0.5">{item.label}</p>
                          <p className="text-primary font-roboto text-base font-medium group-hover:text-golden transition-colors">{item.value}</p>
                        </div>
                      </a>
                    ))}
                    {offices.map((office, index) => (
                      <div key={`${office.label}-${index}`} className="flex items-start gap-2 md:gap-2.5 rounded-sm p-1.5 -mx-1.5 hover:bg-primary/5 transition-colors">
                        <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full flex-shrink-0">
                          <i className="ri-map-pin-2-line text-golden text-xs"></i>
                        </div>
                        <div>
                          <p className="text-primary font-roboto text-sm font-bold uppercase tracking-wider mb-0.5">{office.label || 'Office'}</p>
                          <p className="text-primary font-roboto text-base font-medium leading-relaxed">{office.address}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Department emails */}
                <div className="bg-white border-2 border-primary/12 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/10">
                      <i className="ri-mail-send-line text-golden text-xs"></i>
                    </div>
                    <h3 className="text-primary font-roboto font-bold text-sm">{content.email_heading}</h3>
                  </div>
                  <div className="space-y-2.5 md:space-y-3">
                    {[
                      { label: 'General Inquiries', value: getSite('email_general') || siteEmail },
                      { label: 'Sales', value: getSite('email_sales') },
                      { label: 'Rentals', value: getSite('email_rentals') },
                      { label: 'Ventures', value: getSite('email_ventures') },
                    ].filter((item) => item.value && item.value.trim()).map((item) => (
                      <a key={item.label} href={`mailto:${item.value}`} className="flex items-start gap-2 md:gap-2.5 group cursor-pointer rounded-sm p-1.5 -mx-1.5 hover:bg-primary/5 transition-colors">
                        <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full flex-shrink-0 group-hover:bg-golden/20 transition-colors">
                          <i className="ri-mail-line text-golden text-xs"></i>
                        </div>
                        <div>
                          <p className="text-primary font-roboto text-sm font-bold uppercase tracking-wider mb-0.5">{item.label}</p>
                          <p className="text-primary font-roboto text-base font-medium group-hover:text-golden transition-colors">{item.value}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Social */}
                <div className="bg-white border-2 border-primary/12 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 flex items-center justify-center rounded-full">
                      <i className="ri-share-line text-primary text-xs"></i>
                    </div>
                    <h3 className="text-primary font-roboto font-bold text-sm">{content.social_heading}</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {socialLinks.map((s) => (
                      <a key={s.label} href={s.href} rel="nofollow" target="_blank" aria-label={s.label} className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-primary text-white border border-primary hover:bg-transparent hover:text-primary hover:border-primary/12 transition-all cursor-pointer">
                        <i className={`${s.icon} text-base md:text-lg`}></i>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Valuation CTA */}
                <Link to="/landlords" className="flex items-center gap-2 md:gap-2.5 p-4 md:p-5 bg-primary hover:bg-primary/95 transition-colors cursor-pointer">
                  <div className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-white/10 rounded-full flex-shrink-0">
                    <i className="ri-bar-chart-2-line text-golden text-sm md:text-base"></i>
                  </div>
                  <div>
                    <p className="text-white font-roboto font-bold text-sm">{content.valuation_title}</p>
                    <p className="text-white/60 font-roboto text-xs">{content.valuation_text}</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Find our office */}
      <section className="py-8 md:py-12 px-4 md:px-12 border-t-2 border-primary/12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <p className="text-golden text-xs md:text-sm font-roboto font-semibold tracking-[0.2em] uppercase mb-2">{content.find_eyebrow}</p>
            <h2 className="text-xl md:text-2xl font-roboto font-bold text-primary">{content.find_heading}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
            <div className="text-center flex flex-col items-center">
              <div className="w-11 h-11 flex items-center justify-center bg-primary rounded-full mx-auto mb-3">
                <i className="ri-map-pin-2-line text-white text-lg"></i>
              </div>
              <h3 className="text-primary font-roboto font-bold text-sm mb-1">{content.find_address_title}</h3>
              <div className="space-y-2">
                {offices.map((office, index) => (
                  <div key={`${office.label}-${index}`}>
                    {office.label && (
                      <p className="text-primary font-roboto text-xs font-semibold mb-0.5">{office.label}</p>
                    )}
                    <p className="text-stone-500 font-roboto text-xs leading-relaxed">
                      {office.address}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-11 h-11 flex items-center justify-center bg-primary rounded-full mx-auto mb-3">
                <i className="ri-car-line text-white text-lg"></i>
              </div>
              <h3 className="text-primary font-roboto font-bold text-sm mb-1">{content.find_getting_title}</h3>
              <p className="text-stone-500 font-roboto text-xs leading-relaxed max-w-sm mx-auto">
                {content.find_getting_text}
              </p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-11 h-11 flex items-center justify-center bg-primary rounded-full mx-auto mb-3">
                <i className="ri-calendar-line text-white text-lg"></i>
              </div>
              <h3 className="text-primary font-roboto font-bold text-sm mb-1">{content.find_book_title}</h3>
              <p className="text-stone-500 font-roboto text-xs leading-relaxed mb-3 max-w-sm mx-auto">
                {content.find_book_text}
              </p>
              <a href={telHref} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-golden text-white font-roboto text-xs font-semibold tracking-wider uppercase rounded-sm cursor-pointer mt-auto transition-colors whitespace-nowrap">
                <i className="ri-phone-line text-sm"></i>{content.find_book_button}
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <BackToTop />
    </div>
  );
}