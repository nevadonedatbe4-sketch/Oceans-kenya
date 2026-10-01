import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import JVImageManager, { JvImageDraft } from '@/pages/crm/components/JVImageManager';
import { SUBMISSION_PRICE_BASIS_OPTIONS, SUBMISSION_PAYMENT_TERMS_OPTIONS, CURRENCY_OPTIONS } from '@/pages/crm/jvOpportunityConstants';

type SubmissionType = 'landowner' | 'jv_proposal' | 'investor';

interface TypeOption {
  value: SubmissionType;
  label: string;
  short: string;
  icon: string;
  desc: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    value: 'landowner',
    label: 'Land Listing',
    short: 'Land',
    icon: 'ri-landscape-line',
    desc: 'Land submitted to list, sell or joint-venture',
  },
  {
    value: 'jv_proposal',
    label: 'JV Submission',
    short: 'JV',
    icon: 'ri-building-2-line',
    desc: 'A development project seeking a partner',
  },
  {
    value: 'investor',
    label: 'Capital Venture',
    short: 'Capital',
    icon: 'ri-funds-line',
    desc: 'Capital available to invest in land or development',
  },
];

const STATUS_OPTIONS = ['new', 'reviewed', 'contacted', 'archived'] as const;

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  contacted: 'Contacted',
  archived: 'Archived',
};

const SOURCE_OPTIONS = [
  { value: 'admin', label: 'Admin / Staff' },
  { value: 'agent', label: 'Agent Logged' },
  { value: 'public', label: 'Public Website' },
  { value: 'phone', label: 'Phone / Walk-in' },
];

const TITLE_STATUS_OPTIONS = [
  { value: 'freehold', label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'mailo', label: 'Mailo' },
  { value: 'kibanja', label: 'Kibanja / Customary' },
  { value: 'in_process', label: 'In Process' },
];

const STRUCTURE_OPTIONS = [
  { value: 'revenue_share', label: 'JV — Revenue Share' },
  { value: 'equity_split', label: 'JV — Equity Split' },
  { value: 'lease_to_jv', label: 'Lease-to-JV' },
  { value: 'outright_sale', label: 'Outright Sale' },
  { value: 'advise', label: 'Not Sure — Advise' },
];

const BUDGET_OPTIONS = [
  { value: 'below_100m', label: 'Below 100M' },
  { value: '100m_500m', label: '100M – 500M' },
  { value: '500m_1b', label: '500M – 1B' },
  { value: '1b_5b', label: '1B – 5B' },
  { value: 'above_5b', label: 'Above 5B' },
];

const USE_OPTIONS = [
  { value: 'agriculture', label: 'Agriculture / Agri-processing' },
  { value: 'residential', label: 'Residential Estate Development' },
  { value: 'commercial', label: 'Commercial Development' },
  { value: 'mixed_use', label: 'Mixed-use' },
  { value: 'outright_purchase', label: 'Outright Purchase Only' },
];

const PROJECT_TYPE_OPTIONS = [
  { value: 'apartment_blocks', label: 'Apartment Blocks' },
  { value: 'gated_communities', label: 'Gated Communities' },
  { value: 'hotels_resorts', label: 'Hotels & Resorts' },
  { value: 'commercial_complex', label: 'Commercial Complex' },
  { value: 'mixed_use', label: 'Mixed-use' },
];

const TIMELINE_OPTIONS = [
  { value: 'within_30_days', label: 'Ready to move within 30 days' },
  { value: '1_3_months', label: '1–3 months' },
  { value: '3_6_months', label: '3–6 months' },
  { value: 'exploring', label: 'Exploring options' },
];

const inputCls = 'w-full border border-[#e5e9ee] px-3.5 py-2.5 text-base font-roboto text-[#001731] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 rounded-lg bg-white';

const labelCls = 'block text-[#001731] font-roboto text-base font-medium mb-1.5';

export default function JVSubmissionEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user } = useAuth();

  const [type, setType] = useState<SubmissionType>('landowner');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('new');
  const [source, setSource] = useState('admin');

  // Land / JV shared fields
  const [landLocation, setLandLocation] = useState('');
  const [landSize, setLandSize] = useState('');
  const [titleStatus, setTitleStatus] = useState('');
  const [preferredStructure, setPreferredStructure] = useState('');

  // Investor / JV shared fields
  const [budgetRange, setBudgetRange] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');
  const [preferredUse, setPreferredUse] = useState('');
  const [timeline, setTimeline] = useState('');

  const [message, setMessage] = useState('');
  const [images, setImages] = useState<JvImageDraft[]>([]);

  // Optional commercial pricing & payment terms
  const [price, setPrice] = useState('');
  const [priceCurrency, setPriceCurrency] = useState('');
  const [priceBasis, setPriceBasis] = useState('');
  const [priceOnRequest, setPriceOnRequest] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState<string[]>([]);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('jv_submissions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data || cancelled) {
        if (!cancelled) addToast('Failed to load submission', 'error');
        setLoading(false);
        return;
      }

      setType((data.submission_type as SubmissionType) || 'landowner');
      setFullName(String(data.full_name || ''));
      setPhone(String(data.phone || ''));
      setEmail(String(data.email || ''));
      setStatus(String(data.status || 'new'));
      setSource(String(data.source || 'admin'));
      setLandLocation(String(data.land_location || ''));
      setLandSize(String(data.land_size || ''));
      setTitleStatus(String(data.title_status || ''));
      setPreferredStructure(String(data.preferred_structure || ''));
      setBudgetRange(String(data.budget_range || ''));
      setPreferredLocation(String(data.preferred_location || ''));
      setPreferredUse(String(data.preferred_use || ''));
      setTimeline(String(data.timeline || ''));
      setMessage(String(data.message || ''));
      setPrice(data.price != null ? String(data.price) : '');
      setPriceCurrency(String(data.price_currency || ''));
      setPriceBasis(String(data.price_basis || ''));
      setPriceOnRequest(Boolean(data.price_on_request));
      setPaymentTerms(Array.isArray(data.payment_terms) ? data.payment_terms : []);
      setImages(
        (Array.isArray(data.images) ? data.images : []).map((url: string, idx: number) => ({
          url,
          alt: '',
          sortOrder: idx + 1,
          isCover: idx === 0,
        }))
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      submission_type: type,
      status,
      land_location: type !== 'investor' ? landLocation.trim() || null : null,
      land_size: type !== 'investor' ? landSize.trim() || null : null,
      title_status: type === 'landowner' ? titleStatus || null : null,
      preferred_structure:
        type === 'landowner' || type === 'jv_proposal' ? preferredStructure || null : null,
      budget_range: type !== 'landowner' ? budgetRange || null : null,
      preferred_location: type === 'investor' ? preferredLocation.trim() || null : null,
      preferred_use: type !== 'landowner' ? preferredUse || null : null,
      timeline: type !== 'landowner' ? timeline || null : null,
      message: message.trim() || null,
      source,
      price: price.trim() ? Number(price) : null,
      price_currency: priceCurrency || null,
      price_basis: priceBasis || null,
      price_on_request: priceOnRequest,
      payment_terms: paymentTerms.filter(Boolean),
      images: images.map((img) => img.url),
    };

    const ownerId = user?.id || null;

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('jv_submissions')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        addToast('Submission updated', 'success');
      } else {
        const { error } = await supabase.from('jv_submissions').insert({
          ...payload,
          source: source || 'admin',
          owner_id: ownerId,
          status: status || 'new',
        });
        if (error) throw error;
        addToast('Submission added', 'success');
      }
      broadcastSync();
      navigate('/admin/joint-ventures?tab=submissions');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to save submission', 'error');
      setSaving(false);
    }
  };

  const selectType = (value: SubmissionType) => {
    setType(value);
    if (value === 'investor') {
      setTitleStatus('');
      setLandLocation('');
      setLandSize('');
    }
    if (value === 'landowner') {
      setBudgetRange('');
      setPreferredLocation('');
      setPreferredUse('');
      setTimeline('');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-8 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-[#f7f8fa] rounded" />
          <div className="h-10 bg-[#f7f8fa] rounded" />
          <div className="h-10 bg-[#f7f8fa] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="font-jost text-xl font-semibold text-[#001731]">
            {isEdit ? 'Edit Submission' : 'New JV Submission'}
          </h1>
          <p className="text-sm font-roboto text-[#636363] mt-0.5">
            {isEdit
              ? 'Update this land, JV or capital brief on the submissions desk'
              : 'Manually log a land, JV or capital brief into the submissions desk'}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/joint-ventures?tab=submissions')}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto text-[#636363] hover:text-[#0d5959] hover:border-[#0d5959]/20 transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line" />
          Back to Joint Ventures
        </button>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TYPE_OPTIONS.map((opt) => {
          const active = type === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => selectType(opt.value)}
              className={`text-left p-4 rounded-lg border-2 transition-all cursor-pointer ${
                active
                  ? 'border-[#0d5959] bg-[#0d5959]/5'
                  : 'border-[#f0f0f0] bg-white hover:border-[#c0c8d0]'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    active ? 'bg-[#0d5959] text-white' : 'bg-[#f7f8fa] text-[#636363]'
                  }`}
                >
                  <i className={`${opt.icon} text-lg`} />
                </div>
                <div>
                  <p className={`font-jost text-base font-semibold ${active ? 'text-[#0d5959]' : 'text-[#001731]'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] font-roboto text-[#636363]">{opt.desc}</p>
                </div>
              </div>
              {active && (
                <span className="inline-flex items-center gap-1 text-[11px] font-roboto font-semibold text-[#0d5959]">
                  <i className="ri-checkbox-circle-fill text-sm" /> Selected
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#f0f0f0] p-5 md:p-6 space-y-6">
        {/* Contact section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#001731] text-white text-[11px] font-bold flex items-center justify-center">1</span>
            <h2 className="font-jost text-base font-semibold text-[#001731]">Contact Details</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full name *</label>
              <input
                required
                name="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sarah Namutebi"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phone / WhatsApp</label>
              <input
                type="tel"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={`${inputCls} cursor-pointer`}>
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-[#f0f0f0]" />

        {/* Land Listing fields */}
        {type === 'landowner' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#001731] text-white text-[11px] font-bold flex items-center justify-center">2</span>
              <h2 className="font-jost text-base font-semibold text-[#001731]">Land Details</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>District / location *</label>
                <input
                  required
                  value={landLocation}
                  onChange={(e) => setLandLocation(e.target.value)}
                  placeholder="e.g. Karen, Nairobi"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Acreage</label>
                <input
                  value={landSize}
                  onChange={(e) => setLandSize(e.target.value)}
                  placeholder="e.g. 12 acres"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Title status</label>
                <select value={titleStatus} onChange={(e) => setTitleStatus(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select one</option>
                  {TITLE_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Preferred structure</label>
                <select value={preferredStructure} onChange={(e) => setPreferredStructure(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select one</option>
                  {STRUCTURE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* JV Submission fields */}
        {type === 'jv_proposal' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#001731] text-white text-[11px] font-bold flex items-center justify-center">2</span>
              <h2 className="font-jost text-base font-semibold text-[#001731]">Project Details</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Project location *</label>
                <input
                  required
                  value={landLocation}
                  onChange={(e) => setLandLocation(e.target.value)}
                  placeholder="e.g. Kilimani, Nairobi"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Project size / acreage</label>
                <input
                  value={landSize}
                  onChange={(e) => setLandSize(e.target.value)}
                  placeholder="e.g. 4 acres"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Project type</label>
                <select value={preferredUse} onChange={(e) => setPreferredUse(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select one</option>
                  {PROJECT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Capital required (KES)</label>
                <select value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select one</option>
                  {BUDGET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>JV structure</label>
                <select value={preferredStructure} onChange={(e) => setPreferredStructure(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select one</option>
                  {STRUCTURE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Timeline</label>
                <select value={timeline} onChange={(e) => setTimeline(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select one</option>
                  {TIMELINE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Capital Venture fields */}
        {type === 'investor' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#001731] text-white text-[11px] font-bold flex items-center justify-center">2</span>
              <h2 className="font-jost text-base font-semibold text-[#001731]">Investment Details</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Investment range (KES)</label>
                <select value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select one</option>
                  {BUDGET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Preferred district(s)</label>
                <input
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                  placeholder="e.g. Karen, Westlands, Kileleshwa"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Preferred use</label>
                <select value={preferredUse} onChange={(e) => setPreferredUse(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select one</option>
                  {USE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Timeline</label>
                <select value={timeline} onChange={(e) => setTimeline(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select one</option>
                  {TIMELINE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-[#f0f0f0]" />

        {/* Images section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#001731] text-white text-[11px] font-bold flex items-center justify-center">3</span>
            <h2 className="font-jost text-base font-semibold text-[#001731]">Images</h2>
          </div>
          <JVImageManager images={images} onChange={setImages} storageBucket="jv-submissions" />
        </div>

        {/* Pricing & Payment Terms — optional */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#001731] text-white text-[11px] font-bold flex items-center justify-center">4</span>
            <h2 className="font-jost text-sm font-semibold text-[#001731]">Pricing &amp; Payment Terms</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Price (optional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 2500000"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select value={priceCurrency} onChange={(e) => setPriceCurrency(e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option value="">Select currency</option>
                {CURRENCY_OPTIONS.filter((o) => o.value !== '').map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Price basis</label>
              <select value={priceBasis} onChange={(e) => setPriceBasis(e.target.value)} className={`${inputCls} cursor-pointer`}>
                {SUBMISSION_PRICE_BASIS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2.5">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={priceOnRequest}
                  onChange={(e) => setPriceOnRequest(e.target.checked)}
                  className="w-[18px] h-[18px] rounded text-[#001731] border-[#cdd5de] focus:ring-[#001731]"
                />
                <span className="text-[16px] font-roboto text-[#001731]">Price on request</span>
              </label>
            </div>
          </div>
          <div>
            <label className={labelCls}>Payment terms</label>
            <p className="text-[13px] font-roboto text-[#636363] mb-2">Select all that apply — checkable rectangular pills, not a dropdown.</p>
            <div className="flex flex-wrap gap-2.5">
              {SUBMISSION_PAYMENT_TERMS_OPTIONS.map((term) => {
                const active = paymentTerms.includes(term);
                return (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setPaymentTerms((prev) => (active ? prev.filter((t) => t !== term) : [...prev, term]))}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 border rounded-none text-[16px] font-roboto font-medium transition-all cursor-pointer whitespace-nowrap ${active ? 'border-[#001731] bg-[#001731] text-white' : 'border-[#cdd5de] bg-white text-[#001731] hover:border-[#001731]/40'}`}
                  >
                    <i className={active ? 'ri-checkbox-fill' : 'ri-checkbox-blank-line'} />
                    {term}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-[#f0f0f0]" />

        {/* Message & status */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#001731] text-white text-[11px] font-bold flex items-center justify-center">5</span>
            <h2 className="font-jost text-sm font-semibold text-[#001731]">Notes &amp; Status</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>
                {type === 'landowner'
                  ? 'About the land'
                  : type === 'jv_proposal'
                  ? 'Project description'
                  : 'Investment mandate'}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder={
                  type === 'landowner'
                    ? 'Access road, current use, nearby landmarks, ideal investor...'
                    : type === 'jv_proposal'
                    ? 'Project brief, what partner is needed, current stage...'
                    : 'Target sectors, minimum return, structure preference...'
                }
                className={`${inputCls} resize-none`}
              />
              <p className="text-right text-xs text-[#9ca3af] font-roboto mt-1">{message.length}/500</p>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} cursor-pointer`}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-[#f0f0f0]">
          <button
            type="button"
            onClick={() => navigate('/admin/joint-ventures?tab=submissions')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-roboto text-[#636363] border border-[#f0f0f0] hover:text-[#001731] hover:border-[#c0c8d0] transition-all cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-7 py-2.5 rounded-lg text-sm font-roboto bg-[#0d5959] hover:bg-[#0d5959]/90 text-white transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Submission'}
          </button>
        </div>
      </form>
    </div>
  );
}