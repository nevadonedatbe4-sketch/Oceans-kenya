import { useState, FormEvent } from 'react';
import { useContactSections } from '@/hooks/useContactSections';
import { useFormSubmit } from '@/hooks/useFormSubmit';

const FALLBACK = {
  name: 'Oceans Kenya',
  tagline: 'Estate & Letting Agents',
  cityLine: 'Nairobi | Kenya',
  address: 'Plot 9, Riverside Drive, Westlands, Nairobi, Kenya',
  phone: '+254712345678',
  email: 'info@oceans.co.ke',
  image: 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/hero-bg-1776886125836.jpg',
};

const FORM_URL = 'https://readdy.ai/api/form/d9bofl832e7atrj5h7qg';

export default function PageContactSection() {
  const { sections, loading } = useContactSections();
  const { status: formStatus, error: formError, submitToContacts, reset } = useFormSubmit();

  const section = sections[0];
  const companyName = section?.title || FALLBACK.name;
  const companyTagline = section?.subtitle || FALLBACK.tagline;
  const companyPhone = section?.phone || FALLBACK.phone;
  const companyEmail = section?.email || FALLBACK.email;
  const companyImage = section?.profile_image || FALLBACK.image;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const hp = (formData.get('company_alt') as string || '').trim();
    if (hp) {
      reset();
      form.reset();
      return;
    }

    const firstName = (formData.get('first_name') as string || '').trim();
    const lastName = (formData.get('last_name') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();
    const enquiryType = (formData.get('enquiry_type') as string || 'general').trim();
    const message = (formData.get('message') as string || '').trim();

    const success = await submitToContacts({
      name: `${firstName} ${lastName}`,
      email,
      phone: phone || undefined,
      type: enquiryType,
      notes: message || undefined,
      tags: ['page_contact'],
    });

    if (success) {
      form.reset();
    }
  };

  return (
    <section id="contact" className="py-14 sm:py-20 px-3 md:px-6 lg:px-10" style={{ backgroundColor: 'rgb(242, 242, 240)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 items-start">
          {/* Left – Company Info */}
          <div className="md:col-span-1 pb-6 md:pb-8" style={{ backgroundColor: 'rgb(242, 242, 240)', boxShadow: 'rgba(0, 0, 0, 0.06) 0px 4px 24px' }}>
            <div className="w-full overflow-hidden mb-5" style={{ aspectRatio: '4 / 5' }}>
              <img alt={companyName} className="w-full h-full object-cover object-top" src={companyImage} />
            </div>
            <div className="px-5 md:px-6">
            <h3 className="font-roboto font-bold text-primary text-2xl leading-snug mb-0.5">{companyName}</h3>
            <p className="font-roboto text-[10px] font-bold uppercase tracking-[0.28em] mb-5" style={{ color: 'rgb(201, 168, 76)' }}>
              {companyTagline}
            </p>
            <div className="mb-4">
              <p className="font-roboto text-sm font-bold text-primary mb-0.5">{FALLBACK.cityLine}</p>
              <p className="font-roboto text-sm text-stone-500 leading-relaxed">{FALLBACK.address}</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-whatsapp-line text-base" style={{ color: 'rgb(201, 168, 76)' }}></i>
              </div>
              <a href={`https://wa.me/${companyPhone.replace(/[+\s-]/g, '')}`} target="_blank" rel="nofollow noreferrer" className="font-roboto text-sm text-stone-600 hover:text-primary transition-colors cursor-pointer">
                {companyPhone}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-mail-line text-base" style={{ color: 'rgb(201, 168, 76)' }}></i>
              </div>
              <a href={`mailto:${companyEmail}`} className="font-roboto text-sm text-stone-600 hover:text-primary transition-colors cursor-pointer">
                {companyEmail}
              </a>
            </div>
            </div>
          </div>

          {/* Right – Contact Form */}
          <div className="md:col-span-2 pb-6 md:pb-8">
            <div className="mb-6">
              <h2 className="font-roboto font-bold text-primary mb-2" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}>
                Contact Us
              </h2>
              <p className="font-roboto text-xs sm:text-sm md:text-base font-bold uppercase whitespace-nowrap tracking-[0.12em] sm:tracking-[0.16em] md:tracking-[0.2em] text-golden">
                Buying, Renting or Leasing Prime Residential?
              </p>
            </div>
            <div className="bg-white p-6 sm:p-8 md:p-10 w-full" style={{ boxShadow: 'rgba(0, 23, 49, 0.13) 0px 8px 48px', borderRadius: '2px' }}>
              <form data-readdy-form="true" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-roboto font-semibold text-primary mb-1.5">First Name</label>
                    <input required name="first_name" placeholder="Enter your name" className="w-full px-4 py-2.5 border border-stone-200 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" style={{ borderRadius: '1px' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-roboto font-semibold text-primary mb-1.5">Last Name</label>
                    <input required name="last_name" placeholder="Enter your last name" className="w-full px-4 py-2.5 border border-stone-200 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" style={{ borderRadius: '1px' }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-roboto font-semibold text-primary mb-1.5">Email</label>
                    <input required type="email" name="email" placeholder="Enter your email" className="w-full px-4 py-2.5 border border-stone-200 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" style={{ borderRadius: '1px' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-roboto font-semibold text-primary mb-1.5">Phone</label>
                    <input type="tel" name="phone" placeholder="Enter your phone" className="w-full px-4 py-2.5 border border-stone-200 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" style={{ borderRadius: '1px' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-roboto font-semibold text-primary mb-1.5">Enquiry Type</label>
                  <select name="enquiry_type" className="w-full px-4 py-2.5 border border-stone-200 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer" style={{ borderRadius: '1px' }}>
                    <option value="buy">Buying a Property</option>
                    <option value="rent">Renting a Property</option>
                    <option value="sell">Selling a Property</option>
                    <option value="let">Letting / Landlord Services</option>
                    <option value="valuation">Property Valuation</option>
                    <option value="general">General Enquiry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-roboto font-semibold text-primary mb-1.5">Message</label>
                  <textarea name="message" rows={5} required maxLength={500} placeholder="Message" className="w-full px-4 py-2.5 border border-stone-200 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors resize-none" style={{ borderRadius: '1px' }}></textarea>
                </div>

                {/* Anti-spam honeypot */}
                <input type="text" name="company_alt" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly className="hp-wrap" />

                <button
                  type="submit"
                  disabled={formStatus === 'submitting'}
                  className="w-full py-3.5 bg-primary hover:bg-golden text-white font-roboto text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ borderRadius: '1px' }}
                >
                  {formStatus === 'submitting' ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Sending...
                    </>
                  ) : formStatus === 'success' ? (
                    <>
                      <i className="ri-check-line"></i>
                      Sent!
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </form>

              {formStatus === 'success' && (
                <p className="mt-4 text-green-600 text-sm font-roboto text-center">Thank you! We&apos;ll be in touch shortly.</p>
              )}
              {formStatus === 'error' && (
                <p className="mt-4 text-red-500 text-sm font-roboto text-center">{formError}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}