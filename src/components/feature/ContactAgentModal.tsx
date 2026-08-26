import { useState } from 'react';
import { useFormSubmit } from '@/hooks/useFormSubmit';

interface ContactAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyTitle: string;
  propertyId: string;
  propertySlug: string;
  propertyPrice: string;
  propertyLocation: string;
}

export default function ContactAgentModal({
  isOpen,
  onClose,
  propertyTitle,
  propertyId,
  propertySlug,
  propertyPrice,
  propertyLocation,
}: ContactAgentModalProps) {
  const { status, error, submitToContacts, reset } = useFormSubmit();
  const [showSuccess, setShowSuccess] = useState(false);
  const [message, setMessage] = useState(
    `I'm interested in ${propertyTitle}. Please send me more details about this property.`
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const honeypot = (formData.get('website_alt') as string || '').trim();
    if (honeypot) {
      setShowSuccess(true);
      return;
    }

    const name = (formData.get('name') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();

    const success = await submitToContacts({
      name,
      email,
      phone: phone || undefined,
      type: 'property_enquiry',
      notes: `Enquiry about: ${propertyTitle} (${propertySlug})\nPrice: ${propertyPrice}\nLocation: ${propertyLocation}\n\nMessage: ${message}`,
      tags: ['property_enquiry', propertyId],
    });

    if (success) {
      setShowSuccess(true);
      form.reset();
      setMessage(`I'm interested in ${propertyTitle}. Please send me more details about this property.`);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        reset();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <div>
            <h3 className="text-lg font-roboto font-bold text-primary">Enquire about this property</h3>
            <p className="text-xs font-roboto text-gray-500 mt-0.5 line-clamp-1">{propertyTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Property summary */}
        <div className="mx-6 mb-4 p-3 bg-white rounded-lg flex items-center gap-3 border border-gray-100">
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <i className="ri-home-4-line text-lg"></i>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-roboto font-semibold text-primary truncate">{propertyTitle}</p>
            <p className="text-xs font-roboto text-gray-500">{propertyPrice} &middot; {propertyLocation}</p>
          </div>
        </div>

        {/* Form */}
        {showSuccess ? (
          <div className="px-6 pb-6 text-center">
            <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-full bg-green-50">
              <i className="ri-check-line text-green-500 text-2xl"></i>
            </div>
            <h4 className="text-base font-roboto font-bold text-primary mb-1">Enquiry sent!</h4>
            <p className="text-sm font-roboto text-gray-500">An agent will get back to you shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
            <div>
              <label className="block text-sm font-roboto font-semibold text-gray-700 mb-2">Full Name *</label>
              <input
                name="name"
                type="text"
                required
                placeholder="Enter your full name"
                className="w-full h-12 px-4 text-base font-roboto font-normal border-2 border-primary/40 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-stone-400"
              />
            </div>
            <div>
              <label className="block text-sm font-roboto font-semibold text-gray-700 mb-2">Email Address *</label>
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full h-12 px-4 text-base font-roboto font-normal border-2 border-primary/40 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-stone-400"
              />
            </div>
            <div>
              <label className="block text-sm font-roboto font-semibold text-gray-700 mb-2">Phone Number</label>
              <input
                name="phone"
                type="tel"
                placeholder="+254 700 000 000"
                className="w-full h-12 px-4 text-base font-roboto font-normal border-2 border-primary/40 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-stone-400"
              />
            </div>
            <div>
              <label className="block text-sm font-roboto font-semibold text-gray-700 mb-2">Message *</label>
              <textarea
                name="message"
                required
                maxLength={500}
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="I'm interested in this property. Please send me more details..."
                className="w-full px-4 py-3 text-base font-roboto font-normal border-2 border-primary/40 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-stone-400 resize-none"
              ></textarea>
              <p className="text-sm font-roboto text-stone-400 mt-1">Max 500 characters</p>
            </div>

            {/* Honeypot */}
            <div className="overflow-hidden absolute opacity-0 pointer-events-none" aria-hidden="true">
              <input type="text" name="website_alt" tabIndex={-1} autoComplete="off" readOnly />
            </div>

            {status === 'error' && error && (
              <p className="text-red-500 text-sm font-roboto text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full px-5 py-3 bg-primary text-white text-base font-roboto font-semibold rounded-lg hover:bg-accent transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {status === 'submitting' ? 'Sending...' : 'Send Enquiry'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}