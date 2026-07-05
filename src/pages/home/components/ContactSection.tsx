import { useState, FormEvent } from 'react';

export default function ContactSection() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    fetch('https://readdy.ai/api/form/d85jb2up8k35tp9sb190', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData as any).toString(),
    })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  };

  return (
    <section id="contact" className="relative py-14 sm:py-20 px-4 sm:px-6 bg-[rgb(244,244,245)]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 items-start">
          {/* Left column */}
          <div className="md:col-span-1 p-6 md:p-8 bg-[#fafafa]">
            <div className="w-full overflow-hidden mb-5 aspect-[3/4]">
              <img
                alt="Oceans Kenya"
                className="w-full h-full object-cover object-bottom"
                src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/5d6bd923-764c-4cf1-ba6a-b2b0fcf09499_office.jpg?v=6bbf12d5b592c2087159fd16396a4614"
              />
            </div>
            <h3 className="font-prata text-primary text-2xl leading-snug mb-0.5">Oceans Kenya</h3>
            <p className="font-roboto text-[10px] font-semibold uppercase tracking-[0.28em] mb-5 text-golden">
              Estate &amp; Letting Agents
            </p>
            <div className="mb-4">
              <p className="font-roboto text-sm font-bold text-primary mb-0.5">Nairobi | Kenya</p>
              <p className="font-roboto text-sm text-stone-500 leading-relaxed">
                Riverside Drive, Westlands, Nairobi, Kenya
              </p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 flex items-center justify-center text-primary">
                <i className="ri-whatsapp-line text-base"></i>
              </div>
              <a
                href="https://wa.me/254712345678"
                target="_blank"
                rel="nofollow noreferrer"
                className="font-roboto text-sm text-stone-600 hover:text-primary transition-colors cursor-pointer"
              >
                +254712345678
              </a>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 flex items-center justify-center text-primary">
                <i className="ri-mail-line text-base"></i>
              </div>
              <a
                href="mailto:info@oceans.co.ke"
                className="font-roboto text-sm text-stone-600 hover:text-primary transition-colors cursor-pointer"
              >
                info@oceans.co.ke
              </a>
            </div>
          </div>

          {/* Right column - Form */}
          <div className="md:col-span-2 pb-6 md:pb-8">
            <div className="mb-4 md:mb-6">
              <h2 className="font-prata text-primary text-2xl md:text-3xl mb-1 md:mb-2">Connect with Us</h2>
              <p className="font-roboto text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] whitespace-normal sm:whitespace-nowrap text-golden">
                Buying, Renting or Leasing Prime Residential?
              </p>
            </div>
            <div className="bg-white p-6 sm:p-8 md:p-10 w-full border border-stone-100">
              <form data-readdy-form="true" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-roboto font-semibold text-primary mb-1.5">First Name</label>
                    <input
                      required
                      name="first_name"
                      placeholder="Enter your name"
                      className="w-full px-4 py-2.5 border border-stone-200 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-roboto font-semibold text-primary mb-1.5">Last Name</label>
                    <input
                      required
                      name="last_name"
                      placeholder="Enter your last name"
                      className="w-full px-4 py-2.5 border border-stone-200 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-roboto font-semibold text-primary mb-1.5">Email</label>
                    <input
                      required
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      className="w-full px-4 py-2.5 border border-stone-200 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-roboto font-semibold text-primary mb-1.5">Phone</label>
                    <input
                      name="phone"
                      type="tel"
                      placeholder="Enter your phone"
                      className="w-full px-4 py-2.5 border border-stone-200 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-roboto font-semibold text-primary mb-1.5">Enquiry Type</label>
                  <select
                    name="enquiry_type"
                    className="w-full px-4 py-2.5 border border-stone-200 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white"
                  >
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
                  <textarea
                    name="message"
                    rows={5}
                    required
                    maxLength={500}
                    placeholder="Message"
                    className="w-full px-4 py-2.5 border border-stone-200 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full py-3.5 bg-primary hover:bg-golden text-white font-roboto text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {status === 'submitting' ? 'Submitting...' : 'Submit'}
                </button>
                {status === 'success' && (
                  <p className="text-green-700 text-sm font-roboto text-center">Thank you! We will be in touch soon.</p>
                )}
                {status === 'error' && (
                  <p className="text-red-600 text-sm font-roboto text-center">Something went wrong. Please try again.</p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}