import { useState, useEffect } from 'react';
import type { AgentDatabaseRecord } from '../types';
import { addToast } from '@/pages/crm/components/CRMToast';
import {
  SPECIALISATIONS,
  STRENGTHS,
  RELATIONSHIP_STATUSES,
  AGENT_TYPES,
  CONTACT_METHODS,
  SOURCES,
  AREA_EXPERTISE_LEVELS,
  KENYA_COUNTIES,
  SCORE_FIELDS,
} from '../constants';

interface Props {
  open: boolean;
  record: AgentDatabaseRecord | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: Partial<AgentDatabaseRecord>) => Promise<void>;
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="pt-5 first:pt-0">
      <div className="flex items-center gap-2 mb-3">
        <i className={`${icon} text-[#0d5959] text-base`} />
        <h4 className="font-jost text-sm font-semibold text-[#1a1a1a] uppercase tracking-wider">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-roboto font-medium text-[#4b5563] mb-1.5">{children}</label>;
}

const inputCls =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-roboto text-[#1a1a1a] focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white';

const EMPTY_FORM: Record<string, any> = {
  full_name: '',
  trading_name: '',
  agency: '',
  job_title: '',
  agent_type: '',
  profile_photo: '',
  gender: '',
  phone: '',
  whatsapp: '',
  email: '',
  secondary_email: '',
  website: '',
  linkedin: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  other_social: '',
  county: '',
  city: '',
  primary_area: '',
  office_location: '',
  physical_address: '',
  areas_served: [] as string[],
  geographic_coverage: '',
  specialisations: [] as string[],
  strengths: [] as string[],
  area_expertise: [] as { area: string; level: string }[],
  quality_score: '',
  reputation_score: '',
  market_knowledge: '',
  listing_quality: '',
  responsiveness: '',
  professionalism: '',
  negotiation_strength: '',
  network_strength: '',
  digital_presence: '',
  overall_potential: '',
  super_admin_notes: '',
  relationship_status: 'new_prospect',
  first_contact_date: '',
  last_contact_date: '',
  next_follow_up_date: '',
  contact_method: '',
  contacted_by: '',
  preferred_contact_method: '',
  outreach_notes: '',
  follow_up_notes: '',
  source: '',
  source_url: '',
  referral_by: '',
  event: '',
  publication: '',
  how_found: '',
  why_valuable: '',
};

export default function AgentFormModal({ open, record, saving, onClose, onSave }: Props) {
  const [form, setForm] = useState<Record<string, any>>({ ...EMPTY_FORM });
  const [areaInput, setAreaInput] = useState('');
  const [expertiseArea, setExpertiseArea] = useState('');
  const [expertiseLevel, setExpertiseLevel] = useState('Expert');

  const isEdit = !!record;

  useEffect(() => {
    if (!open) return;
    if (!record) {
      setForm({ ...EMPTY_FORM, areas_served: [], specialisations: [], strengths: [], area_expertise: [] });
      return;
    }
    const sl = record.social_links || {};
    setForm({
      ...EMPTY_FORM,
      full_name: record.full_name || '',
      trading_name: record.trading_name || '',
      agency: record.agency || '',
      job_title: record.job_title || '',
      agent_type: record.agent_type || '',
      profile_photo: record.profile_photo || '',
      gender: record.gender || '',
      phone: record.phone || '',
      whatsapp: record.whatsapp || '',
      email: record.email || '',
      secondary_email: record.secondary_email || '',
      website: record.website || '',
      linkedin: sl.linkedin || '',
      instagram: sl.instagram || '',
      facebook: sl.facebook || '',
      tiktok: sl.tiktok || '',
      other_social: sl.other || '',
      county: record.county || '',
      city: record.city || '',
      primary_area: record.primary_area || '',
      office_location: record.office_location || '',
      physical_address: record.physical_address || '',
      areas_served: record.areas_served || [],
      geographic_coverage: record.geographic_coverage || '',
      specialisations: record.specialisations || [],
      strengths: record.strengths || [],
      area_expertise: Object.entries(record.area_expertise || {}).map(([area, level]) => ({ area, level })),
      quality_score: record.quality_score ?? '',
      reputation_score: record.reputation_score ?? '',
      market_knowledge: record.market_knowledge ?? '',
      listing_quality: record.listing_quality ?? '',
      responsiveness: record.responsiveness ?? '',
      professionalism: record.professionalism ?? '',
      negotiation_strength: record.negotiation_strength ?? '',
      network_strength: record.network_strength ?? '',
      digital_presence: record.digital_presence ?? '',
      overall_potential: record.overall_potential ?? '',
      super_admin_notes: record.super_admin_notes || '',
      relationship_status: record.relationship_status || 'new_prospect',
      first_contact_date: record.first_contact_date || '',
      last_contact_date: record.last_contact_date || '',
      next_follow_up_date: record.next_follow_up_date || '',
      contact_method: record.contact_method || '',
      contacted_by: record.contacted_by || '',
      preferred_contact_method: record.preferred_contact_method || '',
      outreach_notes: record.outreach_notes || '',
      follow_up_notes: record.follow_up_notes || '',
      source: record.source || '',
      source_url: record.source_url || '',
      referral_by: record.referral_by || '',
      event: record.event || '',
      publication: record.publication || '',
      how_found: record.how_found || '',
      why_valuable: record.why_valuable || '',
    });
  }, [open, record]);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: string, value: string) => {
    setForm((f) => {
      const arr = f[key] as string[];
      return { ...f, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const addArea = () => {
    const a = areaInput.trim();
    if (a && !form.areas_served.includes(a)) set('areas_served', [...form.areas_served, a]);
    setAreaInput('');
  };

  const addExpertise = () => {
    const a = expertiseArea.trim();
    if (a) {
      set('area_expertise', [...form.area_expertise, { area: a, level: expertiseLevel }]);
      setExpertiseArea('');
    }
  };

  const buildPayload = (): Partial<AgentDatabaseRecord> => {
    const expertise: Record<string, string> = {};
    form.area_expertise.forEach((e: { area: string; level: string }) => {
      expertise[e.area] = e.level;
    });
    const num = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v));
    return {
      full_name: form.full_name,
      trading_name: form.trading_name || null,
      agency: form.agency || null,
      job_title: form.job_title || null,
      agent_type: form.agent_type || null,
      profile_photo: form.profile_photo || null,
      gender: form.gender || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      secondary_email: form.secondary_email || null,
      website: form.website || null,
      social_links: {
        linkedin: form.linkedin,
        instagram: form.instagram,
        facebook: form.facebook,
        tiktok: form.tiktok,
        other: form.other_social,
      },
      county: form.county || null,
      city: form.city || null,
      primary_area: form.primary_area || null,
      office_location: form.office_location || null,
      physical_address: form.physical_address || null,
      areas_served: form.areas_served,
      geographic_coverage: form.geographic_coverage || null,
      specialisations: form.specialisations,
      strengths: form.strengths,
      area_expertise: expertise,
      quality_score: num(form.quality_score),
      reputation_score: num(form.reputation_score),
      market_knowledge: num(form.market_knowledge),
      listing_quality: num(form.listing_quality),
      responsiveness: num(form.responsiveness),
      professionalism: num(form.professionalism),
      negotiation_strength: num(form.negotiation_strength),
      network_strength: num(form.network_strength),
      digital_presence: num(form.digital_presence),
      overall_potential: num(form.overall_potential),
      super_admin_notes: form.super_admin_notes || null,
      relationship_status: form.relationship_status,
      first_contact_date: form.first_contact_date || null,
      last_contact_date: form.last_contact_date || null,
      next_follow_up_date: form.next_follow_up_date || null,
      contact_method: form.contact_method || null,
      contacted_by: form.contacted_by || null,
      preferred_contact_method: form.preferred_contact_method || null,
      outreach_notes: form.outreach_notes || null,
      follow_up_notes: form.follow_up_notes || null,
      source: form.source || null,
      source_url: form.source_url || null,
      referral_by: form.referral_by || null,
      event: form.event || null,
      publication: form.publication || null,
      how_found: form.how_found || null,
      why_valuable: form.why_valuable || null,
    };
  };

  if (!open) return null;

  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-xs font-roboto font-medium border cursor-pointer transition-all whitespace-nowrap ${
      active
        ? 'bg-[#0d5959] text-white border-[#0d5959]'
        : 'bg-white text-[#4b5563] border-gray-200 hover:border-[#0d5959]/40'
    }`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0] shrink-0">
          <div className="flex items-center gap-2">
            <i className="ri-shield-user-line text-[#0d5959] text-lg" />
            <h2 className="font-jost text-base font-semibold text-[#1a1a1a]">
              {isEdit ? `Edit Prospect — ${record?.full_name}` : 'Add Agent Prospect'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
            <i className="ri-close-line text-gray-400 text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Section title="Basic Information" icon="ri-user-line">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <input className={inputCls} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="e.g. Jane Wanjiku" />
              </div>
              <div>
                <Label>Trading / Professional Name</Label>
                <input className={inputCls} value={form.trading_name} onChange={(e) => set('trading_name', e.target.value)} placeholder="e.g. Jane Homes" />
              </div>
              <div>
                <Label>Agency / Company</Label>
                <input className={inputCls} value={form.agency} onChange={(e) => set('agency', e.target.value)} placeholder="e.g. ABC Realty" />
              </div>
              <div>
                <Label>Job Title / Role</Label>
                <input className={inputCls} value={form.job_title} onChange={(e) => set('job_title', e.target.value)} placeholder="e.g. Senior Agent" />
              </div>
              <div>
                <Label>Agent Type</Label>
                <select className={inputCls} value={form.agent_type} onChange={(e) => set('agent_type', e.target.value)}>
                  <option value="">— Select —</option>
                  {AGENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Gender</Label>
                <select className={inputCls} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">— Select —</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Profile Photo URL</Label>
                <input className={inputCls} value={form.profile_photo} onChange={(e) => set('profile_photo', e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </Section>

          <Section title="Contact" icon="ri-phone-line">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Phone</Label><input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+2547..." /></div>
              <div><Label>WhatsApp</Label><input className={inputCls} value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+2547..." /></div>
              <div><Label>Email</Label><input className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@example.com" /></div>
              <div><Label>Secondary Email</Label><input className={inputCls} value={form.secondary_email} onChange={(e) => set('secondary_email', e.target.value)} /></div>
              <div><Label>Website</Label><input className={inputCls} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://..." /></div>
              <div><Label>LinkedIn</Label><input className={inputCls} value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} /></div>
              <div><Label>Instagram</Label><input className={inputCls} value={form.instagram} onChange={(e) => set('instagram', e.target.value)} /></div>
              <div><Label>Facebook</Label><input className={inputCls} value={form.facebook} onChange={(e) => set('facebook', e.target.value)} /></div>
              <div><Label>TikTok</Label><input className={inputCls} value={form.tiktok} onChange={(e) => set('tiktok', e.target.value)} /></div>
              <div><Label>Other Social</Label><input className={inputCls} value={form.other_social} onChange={(e) => set('other_social', e.target.value)} /></div>
            </div>
          </Section>

          <Section title="Location" icon="ri-map-pin-line">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>County</Label>
                <select className={inputCls} value={form.county} onChange={(e) => set('county', e.target.value)}>
                  <option value="">— Select —</option>
                  {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><Label>City / Town</Label><input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Nairobi" /></div>
              <div><Label>Primary Area</Label><input className={inputCls} value={form.primary_area} onChange={(e) => set('primary_area', e.target.value)} placeholder="e.g. Kilimani" /></div>
              <div><Label>Office Location</Label><input className={inputCls} value={form.office_location} onChange={(e) => set('office_location', e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Physical Address</Label><input className={inputCls} value={form.physical_address} onChange={(e) => set('physical_address', e.target.value)} /></div>
              <div className="sm:col-span-2">
                <Label>Areas Served</Label>
                <div className="flex items-center gap-2">
                  <input
                    className={inputCls}
                    value={areaInput}
                    onChange={(e) => setAreaInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addArea(); } }}
                    placeholder="Type an area and press Enter"
                  />
                  <button type="button" onClick={addArea} className="px-3 py-2 bg-[#0d5959] text-white rounded-lg text-sm cursor-pointer whitespace-nowrap">Add</button>
                </div>
                {form.areas_served.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.areas_served.map((a: string) => (
                      <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0d5959]/10 text-[#0d5959] text-xs rounded-full">
                        {a}
                        <button type="button" onClick={() => set('areas_served', form.areas_served.filter((x: string) => x !== a))} className="cursor-pointer"><i className="ri-close-line text-xs" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2"><Label>Geographic Coverage</Label><input className={inputCls} value={form.geographic_coverage} onChange={(e) => set('geographic_coverage', e.target.value)} placeholder="e.g. Nairobi West & Upper Hill" /></div>
            </div>
          </Section>

          <Section title="Specialisation" icon="ri-award-line">
            <div className="flex flex-wrap gap-1.5">
              {SPECIALISATIONS.map((s) => (
                <button key={s} type="button" onClick={() => toggle('specialisations', s)} className={chip(form.specialisations.includes(s))}>{s}</button>
              ))}
            </div>
          </Section>

          <Section title="Strengths & Area Expertise" icon="ri-star-line">
            <div className="flex flex-wrap gap-1.5 mb-4">
              {STRENGTHS.map((s) => (
                <button key={s} type="button" onClick={() => toggle('strengths', s)} className={chip(form.strengths.includes(s))}>{s}</button>
              ))}
            </div>
            <Label>Area Expertise (rank each area)</Label>
            <div className="flex items-center gap-2 mb-2">
              <input className={inputCls} value={expertiseArea} onChange={(e) => setExpertiseArea(e.target.value)} placeholder="Area name" />
              <select className={inputCls + ' !w-32'} value={expertiseLevel} onChange={(e) => setExpertiseLevel(e.target.value)}>
                {AREA_EXPERTISE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <button type="button" onClick={addExpertise} className="px-3 py-2 bg-[#0d5959] text-white rounded-lg text-sm cursor-pointer whitespace-nowrap">Add</button>
            </div>
            {form.area_expertise.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.area_expertise.map((e: { area: string; level: string }) => (
                  <span key={e.area} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#c8a45c]/15 text-[#8a6d2f] text-xs rounded-full">
                    {e.area} — {e.level}
                    <button type="button" onClick={() => set('area_expertise', form.area_expertise.filter((x: { area: string }) => x.area !== e.area))} className="cursor-pointer"><i className="ri-close-line text-xs" /></button>
                  </span>
                ))}
              </div>
            )}
          </Section>

          <Section title="Private Assessment" icon="ri-lock-line">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <Label>Quality Score (0–100)</Label>
                <input type="number" min={0} max={100} className={inputCls} value={form.quality_score} onChange={(e) => set('quality_score', e.target.value)} />
              </div>
              {SCORE_FIELDS.map((f) => (
                <div key={f.key}>
                  <Label>{f.label} (1–5)</Label>
                  <input type="number" min={1} max={5} className={inputCls} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                </div>
              ))}
            </div>
            <Label>Super Admin Notes (never visible to the agent)</Label>
            <textarea className={inputCls + ' min-h-[90px] resize-none'} value={form.super_admin_notes} onChange={(e) => set('super_admin_notes', e.target.value)} placeholder="Very strong in Kilimani and Kileleshwa. Excellent developer relationships..." maxLength={2000} />
          </Section>

          <Section title="Outreach & Relationship" icon="ri-chat-3-line">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Relationship Status</Label>
                <select className={inputCls} value={form.relationship_status} onChange={(e) => set('relationship_status', e.target.value)}>
                  {RELATIONSHIP_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div><Label>Contacted By</Label><input className={inputCls} value={form.contacted_by} onChange={(e) => set('contacted_by', e.target.value)} /></div>
              <div><Label>First Contact Date</Label><input type="date" className={inputCls} value={form.first_contact_date} onChange={(e) => set('first_contact_date', e.target.value)} /></div>
              <div><Label>Last Contact Date</Label><input type="date" className={inputCls} value={form.last_contact_date} onChange={(e) => set('last_contact_date', e.target.value)} /></div>
              <div><Label>Next Follow-Up Date</Label><input type="date" className={inputCls} value={form.next_follow_up_date} onChange={(e) => set('next_follow_up_date', e.target.value)} /></div>
              <div>
                <Label>Contact Method</Label>
                <select className={inputCls} value={form.contact_method} onChange={(e) => set('contact_method', e.target.value)}>
                  <option value="">— Select —</option>
                  {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label>Preferred Contact Method</Label>
                <select className={inputCls} value={form.preferred_contact_method} onChange={(e) => set('preferred_contact_method', e.target.value)}>
                  <option value="">— Select —</option>
                  {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><Label>Outreach Notes</Label><textarea className={inputCls + ' resize-none'} value={form.outreach_notes} onChange={(e) => set('outreach_notes', e.target.value)} rows={2} maxLength={500} /></div>
              <div className="sm:col-span-2"><Label>Follow-Up Notes</Label><textarea className={inputCls + ' resize-none'} value={form.follow_up_notes} onChange={(e) => set('follow_up_notes', e.target.value)} rows={2} maxLength={500} /></div>
            </div>
          </Section>

          <Section title="Source / Discovery" icon="ri-radar-line">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Source</Label>
                <select className={inputCls} value={form.source} onChange={(e) => set('source', e.target.value)}>
                  <option value="">— Select —</option>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><Label>Source URL</Label><input className={inputCls} value={form.source_url} onChange={(e) => set('source_url', e.target.value)} /></div>
              <div><Label>Referral By</Label><input className={inputCls} value={form.referral_by} onChange={(e) => set('referral_by', e.target.value)} /></div>
              <div><Label>Event</Label><input className={inputCls} value={form.event} onChange={(e) => set('event', e.target.value)} /></div>
              <div><Label>Publication</Label><input className={inputCls} value={form.publication} onChange={(e) => set('publication', e.target.value)} /></div>
              <div><Label>How We Found Them</Label><input className={inputCls} value={form.how_found} onChange={(e) => set('how_found', e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Why We Think They Are Valuable</Label><textarea className={inputCls + ' resize-none'} value={form.why_valuable} onChange={(e) => set('why_valuable', e.target.value)} rows={2} maxLength={500} /></div>
            </div>
          </Section>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#f0f0f0] shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto text-gray-600 hover:bg-gray-50 transition-all cursor-pointer">Cancel</button>
          <button
            onClick={async () => {
              if (!form.full_name.trim()) {
                addToast('Full name is required', 'error');
                return;
              }
              await onSave(buildPayload());
            }}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0d5959] hover:bg-[#0b4a4a] text-white rounded-lg text-sm font-roboto font-semibold transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <i className="ri-check-line" />
                {isEdit ? 'Save Changes' : 'Create Prospect'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}