import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  HelpCircle, BookOpen, LifeBuoy, ShieldCheck,
  Building2, UserRound, Mail, PlusCircle, ExternalLink, Loader2, CheckCircle2, Search,
} from 'lucide-react';
import Chevron from '@/components/base/Chevron';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: { group: string; items: FaqItem[] }[] = [
  {
    group: 'Getting started',
    items: [
      {
        q: 'How do I create my first listing?',
        a: 'Click "Add Listing" in the left sidebar, or use the "Add a listing" button on your dashboard. Complete each step — details, price, location, media and description — then save it as a draft or submit it for review. Once published, it appears on the public site immediately.',
      },
      {
        q: 'Why does my listing say "pending review"?',
        a: 'New listings and significant edits are reviewed by an administrator before going live. You can keep editing a pending listing, and it will not appear publicly until it is approved. Check your "My Listings" page for the current status.',
      },
      {
        q: 'How do I update my profile and contact details?',
        a: 'Open "Profile / Account" from the sidebar. You can update your display name, email, phone and profile photo. Changes are saved to your account and used across your listing contact cards.',
      },
      {
        q: 'Can I add a listing that I do not own yet?',
        a: 'Yes — you can add a listing you are marketing on behalf of a client. Just make sure you have the client\'s permission and the correct details. Your own agent profile is shown as the contact point.',
      },
    ],
  },
  {
    group: 'Listings & media',
    items: [
      {
        q: 'What image sizes work best for listings?',
        a: 'Use landscape images around 1600×900 or larger for hero shots. Square images work well for thumbnails. Large, clear photos of the property exterior, living spaces and key features perform best.',
      },
      {
        q: 'How many photos can I upload per listing?',
        a: 'There is no hard limit, but we recommend at least 5 and no more than 20 quality photos. Lead with your strongest exterior or living-room shot so it appears as the cover image.',
      },
      {
        q: 'How do I set the cover image?',
        a: 'During media upload, drag the image you want as the cover to the first position, or use the "Set as cover" option on a photo. The first image in the gallery becomes the listing cover.',
      },
      {
        q: 'Can I edit a listing after it is published?',
        a: 'Yes — open the listing from "My Listings" and edit any field. Most edits save immediately. Changes that affect price or availability may be flagged for review.',
      },
    ],
  },
  {
    group: 'Leads & enquiries',
    items: [
      {
        q: 'How do I see who enquired about my listing?',
        a: 'Go to "My Leads" or "Enquiries". Every enquiry from a buyer or tenant is recorded against you with their contact details, message and the listing they were viewing. Reply directly from there.',
      },
      {
        q: 'How is a lead generated?',
        a: 'Leads are created when a visitor contacts you via a listing\'s enquiry form, the "Contact agent" button, or a property viewer. The lead is automatically linked to your agent account.',
      },
      {
        q: 'How quickly should I respond to a lead?',
        a: 'We recommend responding within a few hours. Fast responses dramatically improve conversion, and keeping your leads up to date helps you stay organised.',
      },
    ],
  },
  {
    group: 'Account & security',
    items: [
      {
        q: 'Can I change my password?',
        a: 'Yes. Use the "Forgot password" link on the login screen to reset it by email, or ask an administrator to help if you cannot access your account.',
      },
      {
        q: 'How do I get access to the agent portal?',
        a: 'You must first sign up and be approved by an administrator. Once your application is approved, you can log in with your email and password from the Agent Portal login page.',
      },
      {
        q: 'What happens if my account is suspended?',
        a: 'Suspended accounts cannot log in or access agent tools. Contact your administrator to resolve any issues and request reinstatement.',
      },
      {
        q: 'How do I request account deletion?',
        a: 'Open "Profile / Account" and scroll to the "Delete account" section. Submitting the request requires Super Admin approval before anything is deleted.',
      },
    ],
  },
];

const QUICK_LINKS = [
  { label: 'Add a listing', desc: 'Create a new property listing', icon: <PlusCircle size={18} />, path: '/agent/listings/new' },
  { label: 'View my listings', desc: 'Manage published and pending listings', icon: <Building2 size={18} />, path: '/agent/listings' },
  { label: 'Review my leads', desc: 'See who enquired about your properties', icon: <UserRound size={18} />, path: '/agent/leads' },
  { label: 'Update my profile', desc: 'Edit your name, email and photo', icon: <UserRound size={18} />, path: '/agent/profile' },
];

export default function AgentHelp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const filteredFaqs = query.trim()
    ? FAQS.map((g) => ({ ...g, items: g.items.filter((i) => (i.q + i.a).toLowerCase().includes(query.toLowerCase())) }))
        .filter((g) => g.items.length > 0)
    : FAQS;

  const toggle = (index: number) => setOpenIndex((prev) => (prev === index ? null : index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const topic = form.get('topic') || '';
    const message = form.get('message') || '';
    if (!String(message).trim()) {
      setFormMessage('Please describe your issue so we can help.');
      return;
    }
    setSending(true);
    setFormMessage('');
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 700);
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Intro banner */}
      <div className="bg-gradient-to-br from-[#0d5959] to-[#0a4a4a] rounded-xl p-6 md:p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
            <LifeBuoy size={20} />
          </span>
          <h2 className="font-roboto text-2xl font-bold">How can we help?</h2>
        </div>
        <p className="text-sm text-white/80 font-roboto max-w-xl leading-relaxed">
          Find answers to common questions about managing your listings, leads and account. If you can&apos;t find what you need, reach out below — we&apos;re happy to help.
        </p>
        <div className="mt-4 relative max-w-lg">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help articles..."
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white text-[#1a1a2e] text-sm font-roboto placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-white/40"
          />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {QUICK_LINKS.map((q) => (
          <button
            key={q.path}
            onClick={() => navigate(q.path)}
            className="bg-white rounded-xl p-5 text-left border border-[#e4e9e6] hover:border-[#c9d4d0] transition-all cursor-pointer"
          >
            <span className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-white mb-3">{q.icon}</span>
            <p className="font-roboto font-semibold text-[#1a1a2e]">{q.label}</p>
            <p className="text-xs text-gray-500 font-roboto mt-1 leading-relaxed">{q.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* FAQ */}
        <div className="lg:col-span-2 space-y-4">
          {filteredFaqs.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-[#e4e9e6]">
              <HelpCircle size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="font-roboto font-semibold text-[#1a1a2e]">No results for &quot;{query}&quot;</p>
              <p className="text-sm text-gray-500 font-roboto mt-1">Try a different keyword, or contact support below.</p>
            </div>
          ) : (
            filteredFaqs.map((group) => (
              <div key={group.group} className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden">
                <div className="px-5 py-3.5 bg-[#f6f8f7] border-b border-[#eef2f0]">
                  <h3 className="font-roboto font-semibold text-sm text-[#1a1a2e] flex items-center gap-2">
                    <BookOpen size={16} className="text-accent" />
                    {group.group}
                  </h3>
                </div>
                <div className="divide-y divide-[#eef2f0]">
                  {group.items.map((item, i) => {
                    const gIndex = filteredFaqs.indexOf(group) * 10 + i;
                    const open = openIndex === gIndex;
                    return (
                      <div key={item.q}>
                        <button
                          onClick={() => toggle(gIndex)}
                          className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-[#fafbfa] transition-colors cursor-pointer"
                        >
                          <span className="flex-1 text-sm font-roboto font-medium text-[#1f2937]">{item.q}</span>
                          <Chevron dir="down" className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                        </button>
                        {open && (
                          <div className="px-5 pb-4 -mt-1">
                            <p className="text-sm font-roboto text-gray-500 leading-relaxed">{item.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Contact support card */}
          <div className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden">
            <div className="p-6 border-b border-[#eef2f0] flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-roboto font-semibold text-[#1a1a2e]">Still need help?</h3>
                <p className="text-sm text-gray-500 font-roboto">Send us a message and we&apos;ll get back to you.</p>
              </div>
            </div>

            {sent ? (
              <div className="p-8 text-center">
                <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-3" />
                <p className="font-roboto font-semibold text-[#1a1a2e]">Message sent</p>
                <p className="text-sm text-gray-500 font-roboto mt-1">Thanks {user?.name?.split(/\s+/)[0] || 'there'}! We&apos;ll reply to your email shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Topic</label>
                  <select
                    name="topic"
                    className="w-full px-3.5 py-2.5 rounded-md border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  >
                    <option value="listings">Listings & media</option>
                    <option value="leads">Leads & enquiries</option>
                    <option value="account">Account & sign-in</option>
                    <option value="billing">Pricing & subscriptions</option>
                    <option value="other">Something else</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider">How can we help?</label>
                  <textarea
                    name="message"
                    rows={4}
                    maxLength={500}
                    placeholder="Describe your question or issue…"
                    className="w-full px-3.5 py-2.5 rounded-md border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none placeholder:text-gray-400"
                  />
                  <p className="text-[11px] text-gray-400 font-roboto text-right">Max 500 characters</p>
                </div>
                {formMessage && (
                  <p className="text-sm font-roboto text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{formMessage}</p>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-md text-sm font-roboto font-semibold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  {sending ? 'Sending…' : 'Send message'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#e4e9e6] p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-emerald-600" />
              <h3 className="font-roboto font-semibold text-[#1a1a2e]">Your account</h3>
            </div>
            <div className="space-y-2 text-sm font-roboto">
              <div className="flex items-center justify-between py-2 border-b border-[#eef2f0]">
                <span className="text-gray-500">Account</span>
                <Link to="/agent/profile" className="font-medium text-accent hover:underline cursor-pointer">View profile</Link>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#eef2f0]">
                <span className="text-gray-500">Listings</span>
                <Link to="/agent/listings" className="font-medium text-accent hover:underline cursor-pointer">Manage</Link>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">Leads</span>
                <Link to="/agent/leads" className="font-medium text-accent hover:underline cursor-pointer">Review</Link>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0d5959] to-[#0a4a4a] rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle size={18} />
              <h3 className="font-roboto font-semibold">Contact us</h3>
            </div>
            <p className="text-xs text-white/80 font-roboto leading-relaxed mb-3">
              Prefer to talk to a person? Reach the support team directly.
            </p>
            <a href="mailto:support@example.com" className="inline-flex items-center gap-2 text-sm font-roboto font-semibold text-white hover:text-[#5eead4] transition-colors cursor-pointer">
              <Mail size={16} /> support@example.com <ExternalLink size={13} />
            </a>
          </div>

          <div className="bg-white rounded-xl border border-[#e4e9e6] p-5">
            <h3 className="font-roboto font-semibold text-[#1a1a2e] mb-3">Pro tips</h3>
            <ul className="space-y-2.5">
              {[
                'Add at least 5 quality photos to every listing.',
                'Respond to leads within a few hours for best results.',
                'Keep your profile photo and contact details up to date.',
                'Use clear, accurate pricing to build buyer trust.',
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm font-roboto text-gray-500">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}