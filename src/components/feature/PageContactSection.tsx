import { useState, FormEvent } from 'react';
import { useContactSections } from '@/hooks/useContactSections';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import PageLoader from '@/components/feature/PageLoader';

const FALLBACK = {
  name: 'Oceans Nairobi',
  tagline: 'Estate & Letting Agents',
  cityLine: 'Nairobi | Kenya',
  address: 'Plot 9, Riverside Drive, Westlands, Nairobi, Kenya',
  phone: '+254703712984',
  email: 'ask@oceanske.com',
  image: 'https://storage.helloreaddy.io/project_files/842d3b8a-5d73-416c-bead-c20132299a10/7e1ae572-8d93-4598-a1fb-e49d9066583a_compressed_6763327f26245b63a5c7ce2e32ec8cf5.webp',
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
    <section id="contact" className="py-14 sm:py-20 px-3 md:px-6 lg:px-10" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 items-start">
          {/* Left – Company Info */}
          <div className="md:col-span-1 pb-6 md:pb-8 bg-white" style={{ boxShadow: '0 1px 2px rgba(0, 23, 49, 0.04), 0 4px 12px rgba(0, 23, 49, 0.06), 0 16px 48px rgba(0, 23, 49, 0.08)', borderRadius: '2px' }}>
            <div className="w-full overflow-hidden mb-5" style={{ aspectRatio: '4 / 5' }}>
              <img alt={companyName} className="w-full h-full object-cover object-top" src={companyImage} />
            </div>
            <div className="px-5 md:px-6">
            <h3 className="font-prata font-bold text-primary text-[32px] leading-snug mb-0.5">{companyName}</h3>
            <p className="font-roboto text-base font-bold uppercase tracking-[0.28em] mb-5 whitespace-nowrap" style={{ color: 'rgb(201, 168, 76)' }}>
              {companyTagline}
            </p>
            <div className="mb-4">
              <p className="font-roboto text-lg font-normal text-primary mb-0.5">{FALLBACK.cityLine}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(FALLBACK.address)}`}
                target="_blank"
                rel="noreferrer"
                className="font-roboto text-lg text-stone-500 leading-relaxed hover:text-primary hover:underline underline-offset-4 transition-colors cursor-pointer"
              >
                {FALLBACK.address}
              </a>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-phone-line text-lg font-semibold" style={{ color: 'rgb(201, 168, 76)' }}></i>
              </div>
              <a href={`tel:${companyPhone.replace(/[^+\d]/g, '')}`} className="font-roboto text-lg font-normal text-stone-600 hover:text-primary hover:underline underline-offset-4 transition-colors cursor-pointer">
                {companyPhone}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-mail-line text-lg font-semibold" style={{ color: 'rgb(201, 168, 76)' }}></i>
              </div>
              <a href={`mailto:${companyEmail}`} className="font-roboto text-lg font-normal text-stone-600 hover:text-primary hover:underline underline-offset-4 transition-colors cursor-pointer">
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
              <p className="font-roboto text-sm sm:text-base md:text-lg font-bold uppercase md:whitespace-nowrap tracking-[0.12em] sm:tracking-[0.16em] md:tracking-[0.2em] text-golden">
                Buying, Renting or Leasing Prime<br className="md:hidden" /> Residential?
              </p>
            </div>
            <div className="bg-white p-6 sm:p-8 md:p-10 w-full" style={{ boxShadow: '0 1px 2px rgba(0, 23, 49, 0.04), 0 4px 12px rgba(0, 23, 49, 0.06), 0 16px 48px rgba(0, 23, 49, 0.08)', borderRadius: '2px' }}>
              <form data-readdy-form="true" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-roboto font-semibold text-primary mb-2">First Name</label>
                    <input required name="first_name" placeholder="Enter your name" className="w-full px-4 py-3 border-2 border-primary/40 text-base font-roboto font-normal text-primary placeholder:text-stone-400 focus:outline-none focus:border-primary transition-colors" style={{ borderRadius: '1px' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-roboto font-semibold text-primary mb-2">Last Name</label>
                    <input required name="last_name" placeholder="Enter your last name" className="w-full px-4 py-3 border-2 border-primary/40 text-base font-roboto font-normal text-primary placeholder:text-stone-400 focus:outline-none focus:border-primary transition-colors" style={{ borderRadius: '1px' }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-roboto font-semibold text-primary mb-2">Email</label>
                    <input required type="email" name="email" placeholder="Enter your email" className="w-full px-4 py-3 border-2 border-primary/40 text-base font-roboto font-normal text-primary placeholder:text-stone-400 focus:outline-none focus:border-primary transition-colors" style={{ borderRadius: '1px' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-roboto font-semibold text-primary mb-2">Phone Number</label>
                    <input type="tel" name="phone" placeholder="Enter your phone" className="w-full px-4 py-3 border-2 border-primary/40 text-base font-roboto font-normal text-primary placeholder:text-stone-400 focus:outline-none focus:border-primary transition-colors" style={{ borderRadius: '1px' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-roboto font-semibold text-primary mb-2">Enquiry Type</label>
                  <select name="enquiry_type" className="w-full px-4 py-3 border-2 border-primary/40 text-base font-roboto font-normal text-primary focus:outline-none focus:border-primary cursor-pointer" style={{ borderRadius: '1px' }}>
                    <option value="buy">Buying a Property</option>
                    <option value="rent">Renting a Property</option>
                    <option value="sell">Selling a Property</option>
                    <option value="let">Letting / Landlord Services</option>
                    <option value="valuation">Property Valuation</option>
                    <option value="brochure">Request Brochure</option>
                    <option value="general">General Enquiry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-roboto font-semibold text-primary mb-2">Message</label>
                  <textarea name="message" rows={5} required maxLength={500} placeholder="How can we help you?" className="w-full px-4 py-3 border-2 border-primary/40 text-base font-roboto font-normal text-primary placeholder:text-stone-400 focus:outline-none focus:border-primary transition-colors resize-none" style={{ borderRadius: '1px' }}></textarea>
                </div>

                {/* Anti-spam honeypot */}
                <input type="text" name="company_alt" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly className="hp-wrap" />

                <button
                  type="submit"
                  disabled={formStatus === 'submitting'}
                  className="w-full px-5 py-3 bg-primary hover:bg-accent text-white font-roboto font-semibold text-base tracking-widest uppercase cursor-pointer whitespace-nowrap transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ borderRadius: '1px' }}
                >
                  {formStatus === 'submitting' ? (
                    <>
                      <PageLoader size={20} />
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