import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { useFormSubmit } from '@/hooks/useFormSubmit';

const officeHours = [
  { day: 'Monday', hours: '8:00 AM – 4:00 PM' },
  { day: 'Tuesday', hours: '8:00 AM – 4:00 PM' },
  { day: 'Wednesday', hours: '8:00 AM – 4:00 PM' },
  { day: 'Thursday', hours: '8:00 AM – 4:00 PM' },
  { day: 'Friday', hours: '8:00 AM – 4:00 PM' },
  { day: 'Saturday', hours: '9:00 AM – 4:00 PM' },
  { day: 'Sunday', hours: 'Closed' },
];

const socialLinks = [
  { icon: 'ri-facebook-fill', label: 'Facebook', href: 'https://www.facebook.com/oceanskenya' },
  { icon: 'ri-instagram-line', label: 'Instagram', href: 'https://www.instagram.com/oceans_estateagents' },
  { icon: 'ri-linkedin-fill', label: 'LinkedIn', href: 'https://www.linkedin.com/company/oceans-estate-agents' },
  { icon: 'ri-whatsapp-line', label: 'WhatsApp', href: 'https://wa.me/254712345678' },
  { icon: 'ri-twitter-x-line', label: 'X / Twitter', href: 'https://x.com/oceanskenya' },
  { icon: 'ri-youtube-fill', label: 'YouTube', href: 'https://www.youtube.com/@oceanskenya' },
];

const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

export default function Contact() {
  const { status: formStatus, error: formError, submitToContacts, reset } = useFormSubmit();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const fullName = (formData.get('full_name') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();
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
    <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
      <Header />

      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center text-center overflow-hidden pt-14 pb-14">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/hero-bg-1776885671058.JPG)' }}></div>
        <div className="absolute inset-0 bg-primary/80"></div>
        <div className="relative z-10 w-full max-w-2xl mx-auto px-6">
          <p className="text-golden text-sm md:text-base font-roboto font-semibold tracking-[0.2em] uppercase mb-3">We're Here to Help</p>
          <h1 className="text-3xl md:text-5xl font-roboto font-bold text-white mb-3 leading-tight">Get In Touch</h1>
          <p className="text-white/75 font-roboto text-sm leading-relaxed max-w-md mx-auto">
            Whether you're buying, selling, renting, or just have a question — our team is ready and happy to help.
          </p>
        </div>
        <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-2 text-white/50 font-roboto text-[11px]">
          <Link className="hover:text-white transition-colors cursor-pointer" to="/">Home</Link>
          <i className="ri-arrow-right-s-line"></i>
          <span className="text-white/80">Contact</span>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-primary">
        <div className="max-w-5xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: 'ri-building-2-line', label: 'Browse Properties For Sale', href: '/buy' },
            { icon: 'ri-key-2-line', label: 'Properties To Rent', href: '/rent' },
            { icon: 'ri-home-heart-line', label: 'Landlord Services', href: '/landlords' },
            { icon: 'ri-bar-chart-2-line', label: 'Free Valuation', href: '/valuation' },
          ].map((item) => (
            <Link key={item.label} to={item.href} className="flex items-center gap-2 bg-white/8 border border-white/10 px-3 py-2.5 hover:bg-white/15 hover:shadow-md transition-all cursor-pointer group rounded-sm">
              <div className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 flex-shrink-0">
                <i className={`${item.icon} text-golden text-xs`}></i>
              </div>
              <span className="text-white/80 font-roboto text-[11px] leading-tight group-hover:text-white transition-colors">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Main content */}
      <section className="relative max-w-6xl mx-auto px-6 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form + Map */}
          <div className="lg:col-span-8 flex flex-col h-full pb-6 md:pb-8">
            <div className="mb-5">
              <p className="text-golden text-sm md:text-base font-roboto font-semibold tracking-[0.2em] uppercase mb-2">Send a Message</p>
              <h2 className="text-2xl font-roboto font-bold text-primary mb-2">How Can We Help You?</h2>
              <p className="text-stone-500 font-roboto text-sm leading-relaxed">Fill in the form below and one of our agents will be in touch within 24 hours. For urgent matters, call us directly.</p>
            </div>

            <div className="bg-white border border-gray-100 p-6 md:p-10">
              <form data-readdy-form="true" id="contact-main-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-primary font-roboto text-sm font-semibold mb-1">Full Name <span className="text-red-400">*</span></label>
                    <input required name="full_name" placeholder="Your full name" className="w-full border border-stone-200 px-3.5 py-2 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-primary font-roboto text-sm font-semibold mb-1">Email <span className="text-red-400">*</span></label>
                    <input required type="email" name="email" placeholder="your@email.com" className="w-full border border-stone-200 px-3.5 py-2 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-primary font-roboto text-sm font-semibold mb-1">Phone Number</label>
                    <input type="tel" name="phone" placeholder="+256 700 000 000" className="w-full border border-stone-200 px-3.5 py-2 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-primary font-roboto text-sm font-semibold mb-1">Enquiry Type</label>
                    <select name="enquiry_type" className="w-full border border-stone-200 px-3.5 py-2 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                      <option value="buy">Buying a Property</option>
                      <option value="rent">Renting a Property</option>
                      <option value="sell">Selling a Property</option>
                      <option value="let">Letting / Landlord Services</option>
                      <option value="valuation">Property Valuation</option>
                      <option value="general">General Enquiry</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Subject <span className="text-red-400">*</span></label>
                  <input required name="subject" placeholder="How can we help?" className="w-full border border-stone-200 px-4 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1">Message <span className="text-red-400">*</span></label>
                  <textarea name="message" required rows={4} maxLength={500} placeholder="Tell us about your property needs, questions, or anything else we can help with..." className="w-full border border-stone-200 px-3.5 py-2 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors resize-none"></textarea>
                  <p className="text-right text-xs text-stone-300 font-roboto mt-1">Max 500 characters</p>
                </div>
                <button
                  type="submit"
                  disabled={formStatus === 'submitting'}
                  className="w-full py-3 bg-primary hover:bg-golden text-white font-roboto text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {formStatus === 'submitting' ? 'Submitting...' : 'Submit'}
                </button>
                {formStatus === 'success' && (
                  <p className="text-green-600 text-sm font-roboto text-center">Thank you! We&apos;ll respond within 24 hours.</p>
                )}
                {formStatus === 'error' && (
                  <p className="text-red-500 text-sm font-roboto text-center">{formError}</p>
                )}
                <p className="text-stone-400 font-roboto text-xs text-center">We respond to all enquiries within 24 hours during business days.</p>
              </form>
            </div>

            {/* Map */}
            <div className="mt-6 border border-gray-300 overflow-hidden">
              <div className="bg-primary px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 flex items-center justify-center bg-white/10 rounded-full shrink-0">
                    <i className="ri-map-pin-2-fill text-golden text-xs"></i>
                  </div>
                  <p className="text-white font-roboto text-xs font-bold truncate">Riverside Drive, Westlands, Nairobi, Kenya</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href="tel:+254712345678" className="hidden sm:flex items-center gap-1 text-white font-roboto text-xs hover:text-white/80 transition-colors cursor-pointer">
                    <i className="ri-phone-line text-xs"></i>+254712345678
                  </a>
                  <a href="https://www.google.com/maps/dir//Riverside%20Drive%2C%20Westlands%2C%20Nairobi%2C%20Kenya" target="_blank" rel="nofollow noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-roboto font-medium bg-golden text-white hover:bg-golden/90 transition cursor-pointer whitespace-nowrap">
                    <i className="ri-navigation-fill text-xs"></i>Get Directions
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
                ></iframe>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 relative pb-6 md:pb-8">
            <div className="bg-white border border-gray-200/80 p-7 space-y-8 lg:sticky lg:top-24 lg:self-start">
              <div>
                <p className="text-golden text-sm font-roboto font-semibold tracking-widest uppercase mb-2">Our Details</p>
                <h2 className="text-2xl font-roboto font-bold text-primary">Visit or Call Us</h2>
              </div>

              <div className="space-y-4 md:space-y-5">
                {/* Office photo */}
                <div className="w-full aspect-square overflow-hidden">
                  <img alt="Oceans Estate &amp; Letting Agents" className="w-full h-full object-cover object-top" src="https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/hero-bg-1776886125836.jpg" />
                </div>

                {/* Open status */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-roboto font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  We're Open Now
                </div>

                {/* Hours */}
                <div className="bg-white border border-gray-100 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 flex items-center justify-center rounded-full">
                      <i className="ri-time-line text-primary text-xs"></i>
                    </div>
                    <h3 className="text-primary font-roboto font-bold text-sm">Office Hours</h3>
                  </div>
                  <div className="space-y-1">
                    {officeHours.map((h) => {
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
                <div className="bg-white border border-gray-100 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 flex items-center justify-center rounded-full">
                      <i className="ri-contacts-line text-primary text-xs"></i>
                    </div>
                    <h3 className="text-primary font-roboto font-bold text-sm">Get In Touch</h3>
                  </div>
                  <div className="space-y-2.5 md:space-y-3">
                    {[
                      { icon: 'ri-phone-line', label: 'Phone', value: '+254712345678', href: 'tel:+254712345678' },
                      { icon: 'ri-whatsapp-line', label: 'WhatsApp', value: '+254712345678', href: 'https://wa.me/254712345678' },
                      { icon: 'ri-mail-line', label: 'Email', value: 'info@oceans.co.ke', href: 'mailto:info@oceans.co.ke' },
                    ].map((item) => (
                      <a key={item.label} href={item.href} target={item.href.startsWith('https://wa') ? '_blank' : undefined} rel={item.href.startsWith('https') ? 'nofollow' : undefined} className="flex items-start gap-2 md:gap-2.5 group cursor-pointer">
                        <div className="w-8 h-8 flex items-center justify-center bg-golden/10 rounded-full flex-shrink-0 group-hover:bg-golden/20 transition-colors">
                          <i className={`${item.icon} text-golden text-xs`}></i>
                        </div>
                        <div>
                          <p className="text-primary font-roboto text-[10px] font-semibold uppercase tracking-wider mb-0.5">{item.label}</p>
                          <p className="text-stone-500 font-roboto text-sm group-hover:text-golden transition-colors">{item.value}</p>
                        </div>
                      </a>
                    ))}
                    <div className="flex items-start gap-2 md:gap-2.5">
                      <div className="w-8 h-8 flex items-center justify-center bg-golden/10 rounded-full flex-shrink-0">
                        <i className="ri-map-pin-2-line text-golden text-xs"></i>
                      </div>
                      <div>
                        <p className="text-primary font-roboto text-[10px] font-semibold uppercase tracking-wider mb-0.5">Office</p>
                        <p className="text-stone-500 font-roboto text-sm leading-relaxed">Riverside Drive, Westlands, Nairobi, Kenya</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social */}
                <div className="bg-white border border-gray-100 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 flex items-center justify-center rounded-full">
                      <i className="ri-share-line text-primary text-xs"></i>
                    </div>
                    <h3 className="text-primary font-roboto font-bold text-sm">Follow Us</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {socialLinks.map((s) => (
                      <a key={s.label} href={s.href} rel="nofollow" target="_blank" aria-label={s.label} className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-gray-200 text-primary hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer">
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
                    <p className="text-white font-roboto font-bold text-sm">Free Property Valuation</p>
                    <p className="text-white/60 font-roboto text-xs">Know your property's worth →</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Find our office */}
      <section className="py-10 md:py-12 px-6 md:px-12 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-golden text-sm font-roboto font-semibold tracking-[0.2em] uppercase mb-2">Our Location</p>
            <h2 className="text-2xl font-roboto font-bold text-primary">Find Our Office</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
            <div className="text-center flex flex-col items-center">
              <div className="w-11 h-11 flex items-center justify-center bg-primary/5 rounded-full mx-auto mb-3">
                <i className="ri-map-pin-2-line text-primary text-lg"></i>
              </div>
              <h3 className="text-primary font-roboto font-bold text-sm mb-1">Our Address</h3>
              <p className="text-stone-500 font-roboto text-xs leading-relaxed">
                Riverside Drive<br />Westlands<br />Nairobi<br />Kenya
              </p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-11 h-11 flex items-center justify-center bg-primary/5 rounded-full mx-auto mb-3">
                <i className="ri-car-line text-primary text-lg"></i>
              </div>
              <h3 className="text-primary font-roboto font-bold text-sm mb-1">Getting Here</h3>
              <p className="text-stone-500 font-roboto text-xs leading-relaxed max-w-sm mx-auto">
                We are located off Riverside Drive in Westlands. Ample parking is available on-site. 10 minutes from Nairobi City Centre.
              </p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-11 h-11 flex items-center justify-center bg-primary/5 rounded-full mx-auto mb-3">
                <i className="ri-calendar-line text-primary text-lg"></i>
              </div>
              <h3 className="text-primary font-roboto font-bold text-sm mb-1">Book a Meeting</h3>
              <p className="text-stone-500 font-roboto text-xs leading-relaxed mb-3 max-w-sm mx-auto">
                Prefer a face-to-face consultation? Call ahead to book a time with one of our property specialists.
              </p>
              <a href="tel:+254712345678" className="inline-flex items-center gap-1.5 font-roboto text-xs text-golden hover:underline cursor-pointer mt-auto">
                <i className="ri-phone-line"></i>+254712345678
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