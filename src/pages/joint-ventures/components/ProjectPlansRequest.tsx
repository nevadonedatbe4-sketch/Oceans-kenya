import { useState, FormEvent } from 'react';
import { FIELD_CLASS } from '@/lib/formFieldStyles';

const FORM_URL = 'https://readdy.ai/api/form/dapcsmnd3mjnincc41bg';

interface ProjectPlansRequestProps {
  projectTitle: string;
  projectSlug: string;
  projectType?: string;
  projectLocation?: string;
  agentName?: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

const INCLUDED: { icon: string; text: string }[] = [
  { icon: 'ri-layout-masonry-line', text: 'Architectural floor plans & unit layouts' },
  { icon: 'ri-map-2-line', text: 'Site master plan & zoning layout' },
  { icon: 'ri-stack-line', text: 'Unit mix, sizes and pricing schedule' },
  { icon: 'ri-file-shield-2-line', text: 'Approvals, title & feasibility summary' },
];

export default function ProjectPlansRequest({
  projectTitle,
  projectSlug,
  projectType = '',
  projectLocation = '',
  agentName = '',
}: ProjectPlansRequestProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Honeypot - silently treat as success without sending anything.
    const hp = (formData.get('contact_alt') as string || '').trim();
    if (hp) {
      form.reset();
      setMessage('');
      setStatus('success');
      return;
    }

    setStatus('submitting');
    setFormError('');

    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      if (key === 'contact_alt') return;
      params.append(key, String(value));
    });

    try {
      const response = await fetch(FORM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const responseText = await response.text();
      let parsed: { code?: string; message?: string; meta?: { message?: string; detail?: string } } | null = null;
      try {
        parsed = JSON.parse(responseText) as typeof parsed;
      } catch {
        parsed = null;
      }
      const serverMsg = parsed?.meta?.message || parsed?.meta?.detail || parsed?.message || responseText || '';
      const okCode = parsed?.code === 'OK';
      if (!response.ok || !okCode || /spam/i.test(String(serverMsg))) {
        setFormError(String(serverMsg) || 'Submission failed. Please try again.');
        setStatus('error');
        return;
      }
      form.reset();
      setMessage('');
      setStatus('success');
    } catch {
      setFormError('Network error. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="border-2 border-primary/12 bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-[#002349] px-6 md:px-8 py-6">
        <p className="text-golden text-[11px] tracking-[0.25em] uppercase font-roboto font-bold mb-1">
          Project Documents
        </p>
        <h2 className="font-prata text-white text-xl md:text-2xl leading-tight mb-2">
          Request blueprints &amp; plans
        </h2>
        <p className="text-white/60 font-roboto text-sm max-w-2xl leading-relaxed">
          Get the full {projectTitle} pack - floor plans, site layout and approvals - shared by the
          desk once your request is reviewed.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* What you receive */}
        <div className="p-6 md:p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-primary/10">
          <h3 className="font-roboto font-bold text-primary text-sm uppercase tracking-widest mb-4">
            What you&apos;ll receive
          </h3>
          <ul className="space-y-3">
            {INCLUDED.map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <span className="w-5 h-5 flex items-center justify-center text-golden shrink-0 mt-0.5">
                  <i className={item.icon} />
                </span>
                <span className="font-roboto text-sm text-primary/75 leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-roboto text-xs text-primary/50 leading-relaxed">
            Reviewed by {agentName ? `${agentName} and ` : ''}the Joint Ventures desk. Documents are
            shared for evaluation only and remain confidential.
          </p>
        </div>

        {/* Form */}
        <div className="p-6 md:p-8">
          {status === 'success' ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="w-12 h-12 flex items-center justify-center bg-green-50 rounded-full mb-4">
                <i className="ri-check-line text-green-500 text-2xl" />
              </div>
              <p className="font-roboto font-bold text-primary text-base mb-1">Request received</p>
              <p className="font-roboto text-primary/60 text-sm max-w-xs leading-relaxed">
                The desk will review your request and share the project plans with you shortly.
              </p>
            </div>
          ) : (
            <form
              data-readdy-form="true"
              id="jv-project-plans-form"
              onSubmit={handleSubmit}
              className="space-y-3"
            >
              {/* Honeypot */}
              <input
                type="text"
                name="contact_alt"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                readOnly
                className="hp-wrap"
              />

              <input type="hidden" name="project_title" value={projectTitle} />
              <input type="hidden" name="project_slug" value={projectSlug} />
              <input type="hidden" name="project_type" value={projectType} />
              <input type="hidden" name="project_location" value={projectLocation} />

              <input
                required
                type="text"
                name="name"
                placeholder="Full name"
                className={FIELD_CLASS}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="Email"
                  className={FIELD_CLASS}
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone / WhatsApp"
                  className={FIELD_CLASS}
                />
              </div>
              <textarea
                name="message"
                rows={3}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you need - full plan set, specific units, feasibility pack..."
                className={`${FIELD_CLASS} resize-none`}
              />
              <p className="text-right text-[10px] text-primary/40 font-roboto -mt-1">
                {message.length}/500
              </p>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-golden text-white text-xs tracking-widest uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity disabled:opacity-60"
              >
                <i className="ri-file-download-line" />
                {status === 'submitting' ? 'Sending request...' : 'Request plans'}
              </button>

              {status === 'error' && (
                <p className="text-red-600 text-xs font-roboto text-center">{formError}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}