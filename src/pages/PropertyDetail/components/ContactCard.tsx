import { useState, FormEvent, useMemo } from 'react';
import { useFormSubmit } from '@/hooks/useFormSubmit';

interface Agent {
  name: string;
  role: string;
  phone: string;
  email: string;
  avatar?: string;
}

interface ContactCardProps {
  agent: Agent | null;
  propertyTitle: string;
  propertyRef: string;
  formSubmitUrl: string;
  tourFormSubmitUrl: string;
}

const countryCodes = [

  { code: '+254', label: 'Kenya (+254)' },
  { code: '+255', label: 'Tanzania (+255)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+1', label: 'USA (+1)' },
  { code: '+61', label: 'Australia (+61)' },
];

const timeSlots = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
];

function getWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const days = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PropertyContactCard({ agent, propertyTitle, propertyRef, formSubmitUrl, tourFormSubmitUrl }: ContactCardProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'tour'>('tour');
  const { status: formStatus, error: formError, submitToContacts, reset } = useFormSubmit();
  const [countryCode, setCountryCode] = useState('+254');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [message, setMessage] = useState(`I am interested in ${propertyTitle} (Ref: ${propertyRef}). Please contact me with more information.`);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [tourType, setTourType] = useState<'in_person' | 'video'>('in_person');
  const [selectedTime, setSelectedTime] = useState('10:00 AM');

  const dates = useMemo(() => {
    const today = new Date();
    const offset = weekOffset * 7;
    const days = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset + i);
      days.push(d);
    }
    return days;
  }, [weekOffset]);

  const agentInitial = agent?.name ? agent.name.charAt(0).toUpperCase() : 'A';
  const agentRole = agent?.role || 'Property Consultant';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');
    if (!agreeTerms) {
      setValidationError('Please agree to the Terms of Use and Privacy Policy to continue.');
      return;
    }

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const hp = formData.get('company_alt');
    if (hp && String(hp).trim()) {
      reset();
      return;
    }

    const name = (formData.get('name') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();
    const message = (formData.get('message') as string || '').trim();
    const tourType = (formData.get('tour_type') as string || '').trim();
    const tourDate = (formData.get('tour_date') as string || '').trim();
    const tourTime = (formData.get('tour_time') as string || '').trim();

    let notes = `Property: ${propertyTitle} (Ref: ${propertyRef})\n\n${message}`;
    if (activeTab === 'tour') {
      notes += `\n\nTour: ${tourType === 'in_person' ? 'In Person' : 'Video Chat'} on ${tourDate} at ${tourTime}`;
    }

    const success = await submitToContacts({
      name,
      email,
      phone: phone || undefined,
      type: activeTab === 'tour' ? 'property_tour' : 'property_enquiry',
      notes,
      tags: ['property_detail'],
    });

    if (success) {
      form.reset();
      setAgreeTerms(false);
      setMessage(`I am interested in ${propertyTitle} (Ref: ${propertyRef}). Please contact me with more information.`);
    }
  };

  if (formStatus === 'success') {
    return (
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden lg:sticky lg:top-[100px]">
        <div className="text-center py-10 px-5">
          <div className="w-14 h-14 flex items-center justify-center bg-green-50 rounded-full mx-auto mb-4">
            <i className="ri-check-line text-green-500 text-2xl"></i>
          </div>
          <p className="text-[#0D1B2A] font-roboto text-base font-semibold mb-1">
            {activeTab === 'tour' ? 'Tour Request Sent!' : 'Message Sent!'}
          </p>
          <p className="text-gray-400 font-roboto text-sm">We will be in touch shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:sticky lg:top-[100px] w-full">
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className="flex-1 py-3.5 text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap border-b-2"
            style={{
              color: '#002349',
              background: activeTab === 'info' ? '#FFFFFF' : '#F8F8F8',
              borderBottomColor: activeTab === 'info' ? '#002349' : 'transparent',
            }}
          >
            Request Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tour')}
            className="flex-1 py-3.5 text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap border-b-2"
            style={{
              color: '#002349',
              background: activeTab === 'tour' ? '#FFFFFF' : '#F8F8F8',
              borderBottomColor: activeTab === 'tour' ? '#002349' : 'transparent',
            }}
          >
            Schedule a tour
          </button>
        </div>

        {/* Agent row */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold font-roboto" style={{ background: '#002349' }}>
            {agent?.avatar ? (
              <img src={agent.avatar} alt={agent.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              agentInitial
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-roboto font-semibold truncate" style={{ color: '#0D1B2A' }}>
              {agent?.name || 'Oceans Kenya'}
            </p>
            <p className="text-xs font-roboto text-gray-400 truncate">{agentRole}</p>
          </div>
          {activeTab === 'info' && agent?.phone && (
            <a
              href={`tel:${agent.phone}`}
              className="flex items-center gap-1.5 text-xs font-roboto font-semibold text-[#002349] hover:opacity-70 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
            >
              <i className="ri-phone-line text-sm"></i>
              Call Agent
            </a>
          )}
        </div>

        {/* Form */}
        <div className="p-5 space-y-6">
          <form data-readdy-form="true" id="property-tour-form" className="space-y-5" onSubmit={handleSubmit}>
            <input type="hidden" name="property_ref" value={propertyRef} />
            <input type="hidden" name="property_title" value={propertyTitle} />
            <input type="hidden" name="enquiry_type" value={activeTab === 'tour' ? 'Schedule a Tour' : 'Request Info'} />

            {/* Honeypot */}
            <input
              type="text"
              name="company_alt"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              readOnly
              className="hp-wrap"
            />

            {/* Tour-specific fields */}
            {activeTab === 'tour' && (
              <>
                {/* Date picker */}
                <div>
                  <p className="text-sm font-roboto font-bold text-gray-900 mb-3">Choose a date</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={weekOffset === 0}
                      onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                      className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:text-gray-900 hover:border-gray-400 disabled:opacity-30 cursor-pointer shrink-0 transition-colors"
                    >
                      <i className="ri-arrow-left-s-line text-sm"></i>
                    </button>
                    <div className="flex-1 grid grid-cols-4 gap-1.5">
                      {dates.map((d, idx) => {
                        const isSelected = idx === selectedDateIdx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedDateIdx(idx)}
                            className="flex flex-col items-center py-2.5 text-center transition-all cursor-pointer border rounded"
                            style={{
                              background: isSelected ? '#002349' : '#FFFFFF',
                              color: isSelected ? '#FFFFFF' : '#1A1A1A',
                              borderColor: isSelected ? '#002349' : '#E5E5E5',
                            }}
                          >
                            <span
                              className="text-[10px] font-roboto font-medium leading-none mb-1 uppercase tracking-wide"
                              style={{ color: isSelected ? 'rgba(255,255,255,0.65)' : '#999999' }}
                            >
                              {weekDayNames[d.getDay()]}
                            </span>
                            <span className="text-lg font-roboto font-bold leading-none">{d.getDate()}</span>
                            <span
                              className="text-[10px] font-roboto font-medium leading-none mt-1 uppercase tracking-wide"
                              style={{ color: isSelected ? 'rgba(255,255,255,0.65)' : '#999999' }}
                            >
                              {monthNames[d.getMonth()]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setWeekOffset(weekOffset + 1)}
                      className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:text-gray-900 hover:border-gray-400 disabled:opacity-30 cursor-pointer shrink-0 transition-colors"
                    >
                      <i className="ri-arrow-right-s-line text-sm"></i>
                    </button>
                  </div>
                </div>

                {/* Tour type */}
                <div>
                  <p className="text-sm font-roboto font-bold text-gray-900 mb-3">Tour Type</p>
                  <div className="grid grid-cols-2 gap-0 border border-gray-200 rounded overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setTourType('in_person')}
                      className="flex items-center justify-center gap-2 py-3 text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap border-r border-gray-100 last:border-r-0"
                      style={{
                        background: tourType === 'in_person' ? '#002349' : '#FFFFFF',
                        color: tourType === 'in_person' ? '#FFFFFF' : '#555555',
                      }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tourType === 'in_person' ? 'bg-white' : 'bg-stone-300'}`}></span>
                      In Person
                    </button>
                    <button
                      type="button"
                      onClick={() => setTourType('video')}
                      className="flex items-center justify-center gap-2 py-3 text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap border-r border-gray-100 last:border-r-0"
                      style={{
                        background: tourType === 'video' ? '#002349' : '#FFFFFF',
                        color: tourType === 'video' ? '#FFFFFF' : '#555555',
                      }}
                    >
                      Video Chat
                    </button>
                  </div>
                </div>

                {/* Time slot */}
                <div>
                  <select
                    name="tour_time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-3 text-sm font-roboto text-gray-900 focus:outline-none focus:border-gray-400 bg-white cursor-pointer"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>

                <input type="hidden" name="tour_date" value={dates[selectedDateIdx]?.toISOString().split('T')[0] || ''} />
                <input type="hidden" name="tour_type" value={tourType} />
              </>
            )}

            {/* Shared form fields */}
            <div className="space-y-3">
              <input
                placeholder="Name"
                required
                className="w-full border border-gray-200 rounded px-3.5 py-3 text-sm font-roboto text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-100 bg-white transition-colors"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                name="name"
              />
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-[72px] shrink-0 border border-gray-200 rounded px-2 py-3 text-sm font-roboto font-medium text-gray-700 focus:outline-none focus:border-gray-400 bg-white cursor-pointer"
                >
                  {countryCodes.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
                <input
                  placeholder="Phone number (optional)"
                  className="w-full border border-gray-200 rounded px-3.5 py-3 text-sm font-roboto text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-100 bg-white transition-colors flex-1"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  name="phone"
                />
              </div>
              <input
                placeholder="Email"
                required
                className="w-full border border-gray-200 rounded px-3.5 py-3 text-sm font-roboto text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-100 bg-white transition-colors"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                name="email"
              />
              <textarea
                name="message"
                placeholder="Enter your Message"
                rows={3}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-gray-200 rounded px-3.5 py-3 text-sm font-roboto text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-100 bg-white transition-colors resize-none"
              />
              <p className="text-[10px] text-right -mt-1 font-medium text-gray-400">{message.length}/500</p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                className="mt-0.5 shrink-0 cursor-pointer accent-gray-700 w-3.5 h-3.5 rounded"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <span className="text-xs font-roboto text-gray-500 leading-relaxed">
                By submitting this form I agree to the <span className="underline cursor-pointer text-gray-700">Terms of Use</span> and <span className="underline cursor-pointer text-gray-700">Privacy Policy</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={formStatus === 'submitting'}
              className="w-full py-3 text-sm font-roboto font-bold tracking-wide transition-opacity hover:opacity-90 cursor-pointer whitespace-nowrap disabled:opacity-50 rounded"
              style={{ background: '#002349', color: '#FFFFFF' }}
            >
              {formStatus === 'submitting'
                ? 'Sending...'
                : activeTab === 'tour'
                  ? 'Submit a Tour Request'
                  : 'Send Message'}
            </button>

            {validationError && (
              <p className="text-red-500 text-xs font-roboto text-center">{validationError}</p>
            )}
            {formStatus === 'error' && (
              <p className="text-red-500 text-xs font-roboto text-center">{formError}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}