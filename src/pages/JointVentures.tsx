import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { supabase } from '@/lib/supabase';
import { jvFaqs } from '@/mocks/jointVentures';

const projectTypes = [
  'Apartment Blocks',
  'Gated Communities',
  'Hotels & Resorts',
  'Commercial Complexes',
];

const services = [
  { code: 'SVC/01', title: 'Land Sourcing & Acquisition', desc: 'We identify, verify and secure development-ready parcels with clean titles, proper zoning and access to infrastructure.' },
  { code: 'SVC/02', title: 'Investment Structuring', desc: 'Tailored JV frameworks that balance risk and reward — from SPV creation to shareholder agreements and profit-sharing models.' },
  { code: 'SVC/03', title: 'Development & Project Management', desc: 'End-to-end oversight from design brief to contractor selection, milestone tracking, quality control and handover.' },
  { code: 'SVC/04', title: 'Market Analysis & Feasibility', desc: 'Demand studies, competitive pricing analysis, absorption forecasts and scenario modelling to validate every project before ground breaks.' },
  { code: 'SVC/05', title: 'Financing & Capital Raising', desc: 'Debt structuring, equity introductions, mezzanine financing and institutional partnerships to close funding gaps.' },
  { code: 'SVC/06', title: 'Legal & Regulatory Compliance', desc: 'Title verification, NEMA approvals, county permits, building plan approvals and ongoing compliance throughout the project lifecycle.' },
];

const trustPillars = [
  { icon: 'ri-global-line', title: 'Reach', subtitle: 'Nairobi & Beyond', desc: 'Active network across Kenya and East Africa. We source land, capital and buyers in Nairobi, Mombasa, Kampala and emerging regional markets.' },
  { icon: 'ri-shield-check-line', title: 'Transparent', subtitle: 'Legal-First, Title-Checked', desc: 'Every site undergoes independent title verification and encumbrance checks before any agreement is drafted. No surprises, no hidden liens.' },
  { icon: 'ri-customer-service-2-line', title: 'Support', subtitle: 'Brief to Breaking Ground', desc: 'From your first call through project completion, a dedicated partner manager stays with you. Regular reporting, site visits and milestone reviews.' },
];

type FormState = 'idle' | 'submitting' | 'success' | 'error';

function useJVForm(submitAddr: string) {
  const [status, setStatus] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const hp = (formData.get('website_alt') as string || '').trim();
    if (hp) {
      setStatus('success');
      form.reset();
      return;
    }
    formData.delete('website_alt');

    setStatus('submitting');
    setErrorMsg('');

    try {
      const response = await fetch(submitAddr, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData as any).toString(),
      });
      const responseText = await response.text();
      let parsed: { code?: string; meta?: { message?: string; detail?: string }; message?: string } | null = null;
      try { parsed = JSON.parse(responseText); } catch { /* ignore */ }

      const serverMsg = parsed?.meta?.message || parsed?.meta?.detail || parsed?.message || responseText;
      const isSpam = serverMsg?.toLowerCase().includes('spam') || serverMsg?.toLowerCase().includes('form data is spam');

      if (!response.ok || !parsed || parsed.code !== 'OK' || isSpam) {
        setErrorMsg(serverMsg || 'Submission failed. Please try again.');
        setStatus('error');
        return;
      }

      setStatus('success');
      form.reset();
    } catch (err) {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  };

  return { status, errorMsg, handleSubmit };
}

interface LandListing {
  id: string;
  slug: string;
  ref: string;
  title: string;
  district: string;
  area: string;
  size: string;
  titleType: string;
  price: string;
  category: 'outright' | 'joint_venture';
  description: string;
  image: string;
}

export default function JointVentures() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [landTab, setLandTab] = useState<'all' | 'outright' | 'joint_venture'>('all');
  const [requestTab, setRequestTab] = useState<'landowner' | 'investor'>('landowner');
  const [landData, setLandData] = useState<LandListing[]>([]);
  const [landLoading, setLandLoading] = useState(true);
  const [landError, setLandError] = useState('');
  const landownerForm = useJVForm('https://readdy.ai/api/form/d95971dcb7lqctnurpk0');
  const investorForm = useJVForm('https://readdy.ai/api/form/d95971dcb7lqctnurpkg');

  useEffect(() => {
    let cancelled = false;
    async function fetchLandListings() {
      setLandLoading(true);
      setLandError('');
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('property_type', 'land')
          .eq('purpose', 'sale')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!cancelled && data && data.length > 0) {
          const mapped: LandListing[] = data.map((row: Record<string, unknown>) => {
            const currencyLabel = String(row.currency || '').toUpperCase() === 'UGX' ? 'UGX' : String(row.currency || '').toUpperCase() === 'USD' ? 'USD' : 'KSh';
            const priceVal = row.price ? Number(row.price) : 0;
            let priceDisplay = 'On request';
            if (priceVal > 0) {
              if (priceVal >= 1_000_000) {
                priceDisplay = `${currencyLabel} ${(priceVal / 1_000_000).toFixed(priceVal % 1_000_000 === 0 ? 0 : 1)}M`;
              } else {
                priceDisplay = `${currencyLabel} ${priceVal.toLocaleString()}`;
              }
            }
            return {
              id: String(row.id),
              slug: String(row.slug || ''),
              ref: String(row.property_id || `LAND/${String(row.sub_type || 'OP').toUpperCase()}-${String(row.id).slice(0, 3)}`),
              title: String(row.title || ''),
              district: String(row.state_region || row.location || ''),
              area: String(row.location || ''),
              size: row.land_size ? `${row.land_size} ${row.land_unit || 'acres'}` : (row.size ? `${row.size} ${row.size_unit || 'sqm'}` : ''),
              titleType: (row.custom_fields as Record<string, unknown> | null)?.title_type as string || 'Freehold',
              price: priceDisplay,
              category: (row.sub_type === 'joint_venture' ? 'joint_venture' : 'outright') as 'outright' | 'joint_venture',
              description: String(row.description || ''),
              image: String(row.main_image || ''),
            };
          });
          setLandData(mapped);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setLandError(err instanceof Error ? err.message : 'Failed to load land listings');
        }
      } finally {
        if (!cancelled) setLandLoading(false);
      }
    }
    fetchLandListings();
    return () => { cancelled = true; };
  }, []);

  const filteredLand = landTab === 'all' ? landData : landData.filter((l) => l.category === landTab);

  return (
    <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#152238]">
        {/* Subtle grid lines */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-10 items-center">
            {/* Left — headline + CTAs */}
            <div className="lg:col-span-3">
              <p className="text-golden text-xs tracking-[0.25em] uppercase mb-5 font-roboto font-semibold">
                Joint Venture &amp; Land Investment Desk
              </p>
              <h1 className="font-prata text-white text-3xl md:text-4xl lg:text-[3.2rem] leading-[1.15] mb-6">
                Land is the asset.
                <br />
                The <em className="text-golden italic">right partner</em> is
                <br />
                the return.
              </h1>
              <p className="text-white/55 font-roboto text-sm md:text-base leading-relaxed mb-8 max-w-lg">
                Post your land and find capital, or submit a brief and find a
                plot. Oceans Uganda matches landowners with investors for joint
                ventures — and lists prime land available for outright purchase
                across Kampala and beyond.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <a
                  href="#request-desk"
                  onClick={(e) => { e.preventDefault(); setRequestTab('landowner'); document.getElementById('request-desk')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-golden text-[#152238] text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity font-semibold"
                >
                  I own land
                </a>
                <a
                  href="#request-desk"
                  onClick={(e) => { e.preventDefault(); setRequestTab('investor'); document.getElementById('request-desk')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 border border-white/30 text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors"
                >
                  I have capital
                </a>
              </div>
            </div>

            {/* Right — live figures card */}
            <div className="lg:col-span-2">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 md:p-7">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
                  <p className="text-white/50 font-roboto text-[10px] uppercase tracking-[0.2em]">
                    JV Desk — Live Figures
                  </p>
                  <span className="text-white/40 font-roboto text-[10px] uppercase tracking-wider">
                    KES
                  </span>
                </div>
                <div className="space-y-5">
                  <div className="flex items-baseline gap-4">
                    <span className="font-prata text-white text-3xl md:text-4xl">
                      100+
                    </span>
                    <p className="text-white/50 font-roboto text-xs leading-snug">
                      Acres currently under JV negotiation
                    </p>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-baseline gap-4">
                    <span className="font-prata text-white text-3xl md:text-4xl">
                      28
                    </span>
                    <p className="text-white/50 font-roboto text-xs leading-snug">
                      Active investor briefs on file
                    </p>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-baseline gap-4">
                    <span className="font-prata text-white text-3xl md:text-4xl">
                      12
                    </span>
                    <p className="text-white/50 font-roboto text-xs leading-snug">
                      Areas with listed opportunities
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Project types strip */}
      <section className="border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-5 md:py-6">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <span className="text-stone-400 font-roboto text-xs uppercase tracking-wider mr-1">What gets built on JV land:</span>
            {projectTypes.map((type) => (
              <span key={type} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-full text-stone-600 font-roboto text-xs whitespace-nowrap">
                <i className="ri-building-line text-golden text-[10px]"></i>
                {type}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">How It Works</p>
            <h2 className="font-prata text-primary text-2xl md:text-3xl mb-3">Two starting points, one deal room.</h2>
            <p className="text-stone-500 font-roboto text-sm max-w-xl mx-auto leading-relaxed">
              Whichever side of the table you sit on, every request lands with our JV desk, gets verified, and is matched by location, acreage and structure before any introduction is made.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 items-stretch">
            {/* Landowner card */}
            <div className="border border-stone-200 bg-white p-6 md:p-8 flex flex-col">
              <span className="inline-block self-start px-3 py-1 bg-primary/5 text-primary font-roboto text-[10px] uppercase tracking-widest font-semibold mb-5">
                Landowner
              </span>
              <h3 className="font-prata text-primary text-lg md:text-xl mb-5 leading-snug">
                Bring the land,<br />find the capital.
              </h3>
              <ol className="space-y-3 mb-6 flex-1">
                {[
                  'Tell us where the land is, its size and title status.',
                  'Choose a structure — revenue share, equity split, lease-to-JV, or outright sale.',
                  'We verify title and shortlist matched investors.',
                  'You review offers and choose who you work with.',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-stone-600 font-roboto text-sm leading-relaxed">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-primary font-roboto text-xs font-bold">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <a
                href="#request-desk"
                onClick={(e) => { e.preventDefault(); setRequestTab('landowner'); document.getElementById('request-desk')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 border border-stone-300 text-primary font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-colors"
              >
                Post your land brief <i className="ri-arrow-right-line"></i>
              </a>
            </div>

            {/* Center connector */}
            <div className="flex items-center justify-center px-4 py-6 lg:py-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-roboto text-[9px] md:text-[10px] leading-tight text-center font-bold tracking-wider">
                  JV<br />DEAL<br />ROOM
                </span>
              </div>
            </div>

            {/* Investor card */}
            <div className="border border-stone-200 bg-white p-6 md:p-8 flex flex-col">
              <span className="inline-block self-start px-3 py-1 bg-accent/10 text-accent font-roboto text-[10px] uppercase tracking-widest font-semibold mb-5">
                Investor
              </span>
              <h3 className="font-prata text-primary text-lg md:text-xl mb-5 leading-snug">
                Bring the capital,<br />find the land.
              </h3>
              <ol className="space-y-3 mb-6 flex-1">
                {[
                  'Tell us your budget, target districts and preferred use.',
                  'We search verified landowner briefs and live listings.',
                  'Receive a shortlist with title status and site notes.',
                  'Structure the JV or purchase directly, your call.',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-stone-600 font-roboto text-sm leading-relaxed">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-accent font-roboto text-xs font-bold">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <a
                href="#request-desk"
                onClick={(e) => { e.preventDefault(); setRequestTab('investor'); document.getElementById('request-desk')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 border border-stone-300 text-primary font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-colors"
              >
                Submit your investment brief <i className="ri-arrow-right-line"></i>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services section */}
      <section className="bg-primary px-6 py-14 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">Full-Service Desk</p>
            <h2 className="font-prata text-white text-2xl md:text-3xl mb-3">What the Desk Handles</h2>
            <p className="text-white/55 font-roboto text-sm max-w-lg mx-auto">
              We do not just make introductions. We carry every joint venture from first handshake to final sale.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10">
            {services.map((svc) => (
              <div key={svc.code} className="bg-primary p-6 md:p-7 hover:bg-primary/80 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-golden font-roboto text-[10px] tracking-widest uppercase font-semibold">{svc.code}</span>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>
                <h3 className="font-prata text-white text-base md:text-lg mb-2">{svc.title}</h3>
                <p className="text-white/50 font-roboto text-sm leading-relaxed">{svc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust pillars */}
      <section className="px-6 py-14 md:py-20 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">Our Promise</p>
            <h2 className="font-prata text-primary text-2xl md:text-3xl">Why Partners Trust the Desk</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {trustPillars.map((pillar) => (
              <div key={pillar.title} className="bg-white border border-stone-200 p-6 md:p-8 text-center hover:border-golden/30 transition-colors">
                <div className="w-14 h-14 flex items-center justify-center bg-primary/5 rounded-full mx-auto mb-4">
                  <i className={`${pillar.icon} text-2xl text-primary`}></i>
                </div>
                <h3 className="font-prata text-primary text-lg mb-1">{pillar.title}</h3>
                <p className="text-golden font-roboto text-xs uppercase tracking-wider mb-3">{pillar.subtitle}</p>
                <p className="text-stone-500 font-roboto text-sm leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Request desk / Forms */}
      <section id="request-desk" className="bg-[#152238] px-6 py-14 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">Submit a Request</p>
            <h2 className="font-prata text-white text-2xl md:text-3xl mb-3">Open a file with the JV desk.</h2>
            <p className="text-white/55 font-roboto text-sm max-w-lg mx-auto leading-relaxed">
              Fill in whichever side applies to you. A member of the Oceans Uganda land team reviews every submission and responds within 48 hours.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center justify-center mb-8 md:mb-10">
            <div className="inline-flex items-center bg-white/10 rounded-full px-1 py-1">
              <button
                onClick={() => setRequestTab('landowner')}
                className={`px-6 py-2.5 rounded-full text-sm font-roboto whitespace-nowrap cursor-pointer transition-all ${
                  requestTab === 'landowner'
                    ? 'bg-golden text-primary font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                I own land
              </button>
              <button
                onClick={() => setRequestTab('investor')}
                className={`px-6 py-2.5 rounded-full text-sm font-roboto whitespace-nowrap cursor-pointer transition-all ${
                  requestTab === 'investor'
                    ? 'bg-golden text-primary font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                I have capital
              </button>
            </div>
          </div>

          {/* Landowner form */}
          {requestTab === 'landowner' && (
            <form data-readdy-form="true" id="landowner-form" onSubmit={landownerForm.handleSubmit} className="bg-white border border-white/10 p-6 md:p-8">
              <div className="hp-wrap" aria-hidden="true">
                <input type="text" name="website_alt" tabIndex={-1} autoComplete="off" readOnly />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-6">
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Full name</label>
                  <input required name="full_name" placeholder="e.g. Sarah Namutebi" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Phone / WhatsApp</label>
                  <input required type="tel" name="phone" placeholder="+256 7XX XXX XXX" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Email</label>
                  <input type="email" name="email" placeholder="you@email.com" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">District / location</label>
                  <input required name="land_location" placeholder="e.g. Wakiso, Kira" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Acreage</label>
                  <input required name="land_size" placeholder="e.g. 12 acres" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Title status</label>
                  <select required name="title_status" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                    <option value="">Select one</option>
                    <option value="freehold">Freehold</option>
                    <option value="leasehold">Leasehold</option>
                    <option value="mailo">Mailo</option>
                    <option value="kibanja">Kibanja / customary</option>
                    <option value="in_process">In process</option>
                  </select>
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Preferred structure</label>
                  <select required name="preferred_structure" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                    <option value="">Select one</option>
                    <option value="revenue_share">Joint venture — revenue share</option>
                    <option value="equity_split">Joint venture — equity split</option>
                    <option value="lease_to_jv">Lease-to-JV</option>
                    <option value="outright_sale">Open to outright sale instead</option>
                    <option value="advise">Not sure — advise me</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Tell us about the land</label>
                  <textarea name="message" rows={3} maxLength={500} placeholder="Access road, current use, nearby landmarks, any existing survey or valuation, ideal type of investor..." className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors resize-none"></textarea>
                  <p className="text-right text-xs text-stone-300 font-roboto mt-1">Max 500 characters</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-stone-100">
                <p className="text-stone-400 font-roboto text-xs leading-relaxed max-w-md">
                  Have a survey map or photos? Mention it here — our team will follow up to collect them by WhatsApp or email.
                </p>
                <button
                  type="submit"
                  disabled={landownerForm.status === 'submitting'}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-golden text-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity font-semibold flex-shrink-0"
                >
                  {landownerForm.status === 'submitting' ? 'Submitting...' : 'Submit land brief'}
                </button>
              </div>
              {landownerForm.status === 'success' && (
                <div className="mt-5 p-4 bg-green-50 border border-green-100">
                  <p className="text-green-700 font-roboto text-sm flex items-center gap-2">
                    <i className="ri-check-line"></i>Brief received. The JV desk will call or WhatsApp you within 48 hours.
                  </p>
                </div>
              )}
              {landownerForm.status === 'error' && (
                <div className="mt-5 p-4 bg-red-50 border border-red-100">
                  <p className="text-red-600 font-roboto text-sm">{landownerForm.errorMsg}</p>
                </div>
              )}
            </form>
          )}

          {/* Investor form */}
          {requestTab === 'investor' && (
            <form data-readdy-form="true" id="investor-form" onSubmit={investorForm.handleSubmit} className="bg-white border border-white/10 p-6 md:p-8">
              <div className="hp-wrap" aria-hidden="true">
                <input type="text" name="website_alt" tabIndex={-1} autoComplete="off" readOnly />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-6">
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Full name</label>
                  <input required name="full_name" placeholder="e.g. David Okello" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Phone / WhatsApp</label>
                  <input required type="tel" name="phone" placeholder="+256 7XX XXX XXX" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Email</label>
                  <input type="email" name="email" placeholder="you@email.com" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Investment range (KES)</label>
                  <select required name="budget_range" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                    <option value="">Select one</option>
                    <option value="below_100m">Below 100M</option>
                    <option value="100m_500m">100M – 500M</option>
                    <option value="500m_1b">500M – 1B</option>
                    <option value="1b_5b">1B – 5B</option>
                    <option value="above_5b">Above 5B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Preferred district(s)</label>
                  <input name="preferred_location" placeholder="e.g. Mukono, Entebbe, Gulu" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Preferred use</label>
                  <select required name="preferred_use" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                    <option value="">Select one</option>
                    <option value="agriculture">Agriculture / agri-processing</option>
                    <option value="residential">Residential estate development</option>
                    <option value="commercial">Commercial development</option>
                    <option value="mixed_use">Mixed-use</option>
                    <option value="outright_purchase">Outright land purchase only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Timeline</label>
                  <select name="timeline" className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary focus:outline-none focus:border-stone-400 cursor-pointer bg-white">
                    <option value="">Select one</option>
                    <option value="within_30_days">Ready to move within 30 days</option>
                    <option value="1_3_months">1–3 months</option>
                    <option value="3_6_months">3–6 months</option>
                    <option value="exploring">Exploring options</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">What are you looking for?</label>
                  <textarea name="message" rows={3} maxLength={500} placeholder="Minimum acreage, access requirements, JV structure preference, or any land you've already seen..." className="w-full border border-stone-200 px-3.5 py-2.5 text-sm font-roboto text-primary placeholder:text-stone-300 focus:outline-none focus:border-stone-400 transition-colors resize-none"></textarea>
                  <p className="text-right text-xs text-stone-300 font-roboto mt-1">Max 500 characters</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-stone-100">
                <p className="text-stone-400 font-roboto text-xs leading-relaxed max-w-md">
                  We only share your brief with landowners once you approve a shortlist — your details stay private until then.
                </p>
                <button
                  type="submit"
                  disabled={investorForm.status === 'submitting'}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-golden text-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity font-semibold flex-shrink-0"
                >
                  {investorForm.status === 'submitting' ? 'Submitting...' : 'Submit investment brief'}
                </button>
              </div>
              {investorForm.status === 'success' && (
                <div className="mt-5 p-4 bg-green-50 border border-green-100">
                  <p className="text-green-700 font-roboto text-sm flex items-center gap-2">
                    <i className="ri-check-line"></i>Brief received. Expect a shortlist of matching land within 48 hours.
                  </p>
                </div>
              )}
              {investorForm.status === 'error' && (
                <div className="mt-5 p-4 bg-red-50 border border-red-100">
                  <p className="text-red-600 font-roboto text-sm">{investorForm.errorMsg}</p>
                </div>
              )}
            </form>
          )}
        </div>
      </section>

      {/* Lands Available */}
      <section id="projects" className="px-6 py-14 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">Available Now</p>
            <h2 className="font-prata text-primary text-2xl md:text-3xl mb-3">Land on the desk today.</h2>
            <p className="text-stone-500 font-roboto text-sm max-w-xl mx-auto leading-relaxed">
              A live feed of plots available for outright purchase and open joint venture opportunities, pulled directly from our listings database.
            </p>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 md:mb-10">
            {[
              { key: 'all' as const, label: 'All opportunities' },
              { key: 'outright' as const, label: 'Outright purchase' },
              { key: 'joint_venture' as const, label: 'Joint venture' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setLandTab(f.key)}
                className={`px-5 py-2.5 text-sm font-roboto whitespace-nowrap cursor-pointer transition-colors border ${
                  landTab === f.key
                    ? 'bg-primary text-white border-primary font-semibold'
                    : 'text-stone-500 border-stone-200 hover:text-primary hover:border-stone-400 bg-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {landLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="border border-stone-200 bg-white p-5 md:p-6 animate-pulse">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-3 bg-stone-200 rounded w-24" />
                    <div className="h-5 bg-stone-200 rounded w-20" />
                  </div>
                  <div className="h-4 bg-stone-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-stone-200 rounded w-1/2 mb-3" />
                  <div className="h-px bg-stone-100 mb-3" />
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="h-8 bg-stone-200 rounded" />
                    <div className="h-8 bg-stone-200 rounded" />
                    <div className="h-8 bg-stone-200 rounded" />
                  </div>
                  <div className="h-3 bg-stone-200 rounded w-full mb-1" />
                  <div className="h-3 bg-stone-200 rounded w-4/5 mb-4" />
                  <div className="h-9 bg-stone-200 rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!landLoading && landError && (
            <div className="text-center py-16">
              <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full mx-auto mb-4">
                <i className="ri-error-warning-line text-2xl text-red-400"></i>
              </div>
              <p className="text-stone-500 font-roboto text-sm mb-4">{landError}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
              >
                <i className="ri-refresh-line"></i>Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!landLoading && !landError && filteredLand.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-4">
                <i className="ri-landscape-line text-2xl text-stone-400"></i>
              </div>
              <p className="text-stone-500 font-roboto text-sm mb-2">No {landTab !== 'all' ? landTab === 'outright' ? 'outright purchase' : 'joint venture' : ''} plots available right now.</p>
              <p className="text-stone-400 font-roboto text-xs">Check back soon or submit a brief to be notified when new opportunities arrive.</p>
            </div>
          )}

          {/* Deed-style listing cards */}
          {!landLoading && !landError && filteredLand.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
                {filteredLand.map((land) => (
                  <Link to={land.slug ? `/property/${land.slug}` : '#'} key={land.id} data-type={land.category === 'joint_venture' ? 'jv' : 'sale'} className="group relative block cursor-pointer">
                    {/* Top zigzag serration */}
                    <svg className="absolute -top-[5px] left-0 w-full h-[5px] block" preserveAspectRatio="none" viewBox="0 0 100 5">
                      <path d="M0 5 L2.5 0 L5 5 L7.5 0 L10 5 L12.5 0 L15 5 L17.5 0 L20 5 L22.5 0 L25 5 L27.5 0 L30 5 L32.5 0 L35 5 L37.5 0 L40 5 L42.5 0 L45 5 L47.5 0 L50 5 L52.5 0 L55 5 L57.5 0 L60 5 L62.5 0 L65 5 L67.5 0 L70 5 L72.5 0 L75 5 L77.5 0 L80 5 L82.5 0 L85 5 L87.5 0 L90 5 L92.5 0 L95 5 L97.5 0 L100 5 Z" fill="#faf9f6" />
                    </svg>

                    {/* Card body — receipt paper */}
                    <div className="bg-[#faf9f6] p-6 md:p-7 relative">
                      {/* Ref code — mono, top center */}
                      <span className="font-mono text-[11px] text-stone-400 tracking-[0.2em] uppercase font-medium block text-center mb-4">
                        {land.ref}
                      </span>

                      {/* Centered badge */}
                      <div className="text-center mb-3">
                        <span className={`inline-block px-3 py-1 text-[10px] uppercase tracking-wider font-semibold font-roboto ${
                          land.category === 'joint_venture'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-golden/10 text-golden'
                        }`}>
                          {land.category === 'joint_venture' ? 'JV Opportunity' : 'For Sale'}
                        </span>
                      </div>

                      {/* Title — centered, receipt style */}
                      <h4 className="font-prata text-primary text-sm md:text-base text-center mb-1.5 leading-snug">{land.title}</h4>

                      {/* Location — centered */}
                      <p className="font-roboto text-[11px] text-stone-400 text-center mb-5">
                        <i className="ri-map-pin-2-line mr-1 text-stone-300"></i>{land.district}, {land.area}
                      </p>

                      {/* Dashed separator */}
                      <div className="border-t border-dashed border-stone-300 mb-4" />

                      {/* Metrics — two-column receipt rows */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="font-roboto text-[11px] text-stone-400 uppercase tracking-wider">{land.category === 'joint_venture' ? 'Acreage' : 'Size'}</span>
                          <span className="font-mono text-xs text-primary font-semibold">{land.size}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-roboto text-[11px] text-stone-400 uppercase tracking-wider">Title</span>
                          <span className="font-mono text-xs text-primary font-semibold">{land.titleType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-roboto text-[11px] text-stone-400 uppercase tracking-wider">{land.category === 'joint_venture' ? 'Ask' : 'Price'}</span>
                          <span className="font-mono text-xs text-golden font-semibold">{land.price}</span>
                        </div>
                      </div>

                      {/* Dashed separator */}
                      <div className="border-t border-dashed border-stone-300 mb-4" />

                      {/* Description — centered, italic, receipt style */}
                      <p className="font-roboto text-[11px] text-stone-500 leading-relaxed text-center mb-5 italic">{land.description}</p>

                      {/* CTA — full width, outlined */}
                      <div
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRequestTab('investor'); document.getElementById('request-desk')?.scrollIntoView({ behavior: 'smooth' }); }}
                        className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-dashed border-stone-400 text-primary font-roboto text-[11px] tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-colors"
                      >
                        Enquire about this plot <i className="ri-arrow-right-line"></i>
                      </div>
                    </div>

                    {/* Bottom zigzag serration */}
                    <svg className="absolute -bottom-[5px] left-0 w-full h-[5px] block" preserveAspectRatio="none" viewBox="0 0 100 5">
                      <path d="M0 0 L2.5 5 L5 0 L7.5 5 L10 0 L12.5 5 L15 0 L17.5 5 L20 0 L22.5 5 L25 0 L27.5 5 L30 0 L32.5 5 L35 0 L37.5 5 L40 0 L42.5 5 L45 0 L47.5 5 L50 0 L52.5 5 L55 0 L57.5 5 L60 0 L62.5 5 L65 0 L67.5 5 L70 0 L72.5 5 L75 0 L77.5 5 L80 0 L82.5 5 L85 0 L87.5 5 L90 0 L92.5 5 L95 0 L97.5 5 L100 0 Z" fill="#faf9f6" />
                    </svg>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-14 md:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-semibold">Questions</p>
            <h2 className="font-prata text-primary text-2xl md:text-3xl">Frequently Asked</h2>
          </div>
          <div className="space-y-3">
            {jvFaqs.map((faq, idx) => (
              <div key={idx} className="border border-stone-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-start gap-3 p-4 md:p-5 text-left hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  <span className="text-golden font-roboto text-xs font-bold mt-0.5 flex-shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="flex-1 font-prata text-primary text-sm md:text-base">{faq.question}</span>
                  <i className={`${openFaq === idx ? 'ri-subtract-line' : 'ri-add-line'} text-stone-400 mt-1 flex-shrink-0`}></i>
                </button>
                {openFaq === idx && (
                  <div className="px-4 md:px-5 pb-4 md:pb-5 pl-10 md:pl-12">
                    <p className="text-stone-500 font-roboto text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary px-6 py-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-3 font-roboto font-semibold">Ready to Partner?</p>
          <h2 className="text-white font-prata mb-3 leading-snug text-2xl md:text-3xl">Let\'s Build Something Worthwhile</h2>
          <p className="text-white/65 font-roboto text-sm leading-relaxed mb-7 max-w-lg mx-auto">
            Whether you hold land or capital, our desk is built to structure deals that work for every partner. Submit a brief and let\'s talk.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#request-desk" className="inline-flex items-center gap-2 px-6 py-2.5 bg-golden text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity w-full sm:w-auto justify-center">
              <i className="ri-file-list-3-line"></i>Submit a Brief
            </a>
            <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-2.5 border border-white/30 text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors w-full sm:w-auto justify-center">
              <i className="ri-chat-1-line"></i>Speak to the Desk
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <BackToTop />
    </div>
  );
}