import { useState } from 'react';
import { Palette, Save, RefreshCw, Loader2, Copy, Check, Info, Eye } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import { useManagementData } from '@/hooks/useManagementData';
import { refreshBadgeSettings } from '@/hooks/useBadgeSettings';

function ColorRow({ label, cssVar, value, onChange }: { label: string; cssVar: string; value: string; onChange: (v: string) => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(cssVar); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="flex items-center gap-3 p-3 border border-stone-100 rounded-lg bg-white hover:border-stone-200 transition-colors">
      <div className="w-9 h-9 rounded-md border border-stone-200 flex-shrink-0" style={{ backgroundColor: value || '#ccc' }}></div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-stone-700 truncate">{label}</p>
        <p className="text-[10px] text-stone-400 font-mono truncate">{cssVar}</p>
      </div>
      <button onClick={handleCopy} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-600 cursor-pointer flex-shrink-0" title="Copy variable">
        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      </button>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 border border-stone-200 rounded cursor-pointer p-0.5" />
        <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-[85px] px-2 py-1.5 border border-stone-200 rounded text-[11px] font-mono text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white" />
      </div>
    </div>
  );
}

export default function ColourPalettePage() {
  const data = useManagementData();
  const { loading, saving, getBrand, setBrand, getCard, setCard, handleSave, fetchData } = data;
  const [activeSection, setActiveSection] = useState<'brand' | 'cards' | 'text' | 'bg' | 'visibility'>('brand');

  if (loading) {
    return (
      <ManagementLayout title="Colour Palette" description="Full colour system — brand, cards, text, and backgrounds." icon={<Palette size={20} className="text-[#1B4332]" />}>
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div>
      </ManagementLayout>
    );
  }

  const sections = [
    { key: 'brand' as const, label: 'Brand Colors' },
    { key: 'cards' as const, label: 'Card Colors' },
    { key: 'text' as const, label: 'Text Colors' },
    { key: 'bg' as const, label: 'Backgrounds' },
    { key: 'visibility' as const, label: 'Badge Visibility' },
  ];

  const badgeVisibilityList = [
    { key: 'sale', label: 'Sale Badge', description: 'Shows SALE on for-sale listings' },
    { key: 'rent', label: 'Rent Badge', description: 'Shows RENT on rental listings' },
    { key: 'featured', label: 'Featured', description: 'Shows on featured properties' },
    { key: 'just_listed', label: 'Just Listed', description: 'Auto-shows on properties listed within 3 days' },
    { key: 'potw', label: 'Property of the Week', description: 'Manual flag on listing' },
    { key: 'back_on_market', label: 'Back on Market', description: 'Manual flag on listing' },
    { key: 'reduced', label: 'Reduced Price', description: 'Manual flag on listing' },
    { key: 'new_home', label: 'New Home', description: 'Manual flag on listing' },
    { key: 'refurbished', label: 'Refurbished', description: 'Manual flag on listing' },
    { key: 'joint_venture', label: 'Joint Venture', description: 'Auto-shown on JV sub-type listings' },
    { key: 'house_share', label: 'House Share', description: 'Manual flag on listing' },
    { key: 'tour', label: 'Video / Virtual Tour / Floor Plan', description: 'Shown when tour media is attached' },
    { key: 'new_dev', label: 'New Development', description: 'Auto-shown on new development listings' },
    { key: 'completed', label: 'Completed', description: 'Used on New Development cards' },
    { key: 'offplan', label: 'Off-Plan / Offplan', description: 'Used on New Development cards' },
    { key: 'under_construction', label: 'Under Construction', description: 'Used on New Development cards' },
    { key: 'sold_off_plan', label: 'Sold Off-Plan', description: 'Used on New Development cards' },
    { key: 'sold_out', label: 'Sold Out', description: 'Used on New Development cards' },
    { key: 'investment', label: 'Investment', description: 'Used on New Development cards' },
  ];

  const handleSaveWithRefresh = async () => {
    await handleSave();
    refreshBadgeSettings();
  };

  const brandColors = [
    { label: 'Primary', cssVar: '--color-primary', get: () => getBrand('primary_color'), set: (v: string) => setBrand('primary_color', v) },
    { label: 'Secondary', cssVar: '--color-secondary', get: () => getBrand('secondary_color'), set: (v: string) => setBrand('secondary_color', v) },
    { label: 'Accent', cssVar: '--color-accent', get: () => getBrand('accent_color'), set: (v: string) => setBrand('accent_color', v) },
    { label: 'Golden / Highlight', cssVar: '--color-golden', get: () => getBrand('golden_color'), set: (v: string) => setBrand('golden_color', v) },
    { label: 'Text', cssVar: '--color-text', get: () => getBrand('text_color'), set: (v: string) => setBrand('text_color', v) },
    { label: 'Topbar', cssVar: '--color-topbar', get: () => getBrand('topbar_color'), set: (v: string) => setBrand('topbar_color', v) },
    { label: 'White', cssVar: '--color-white', get: () => getBrand('white_color'), set: (v: string) => setBrand('white_color', v) },
    { label: 'Off-White', cssVar: '--color-off-white', get: () => getBrand('off_white_color'), set: (v: string) => setBrand('off_white_color', v) },
  ];

  const cardColors = [
    { label: 'Rent Badge', cssVar: '--badge-rent-bg', get: () => getCard('rent_badge_color'), set: (v: string) => setCard('rent_badge_color', v) },
    { label: 'Rent Badge Text', cssVar: '--badge-rent-text', get: () => getCard('rent_badge_text_color'), set: (v: string) => setCard('rent_badge_text_color', v) },
    { label: 'Sale Badge', cssVar: '--badge-sale-bg', get: () => getCard('sale_badge_color'), set: (v: string) => setCard('sale_badge_color', v) },
    { label: 'Sale Badge Text', cssVar: '--badge-sale-text', get: () => getCard('sale_badge_text_color'), set: (v: string) => setCard('sale_badge_text_color', v) },
    { label: 'Featured Badge', cssVar: '--badge-featured-bg', get: () => getCard('featured_badge_color'), set: (v: string) => setCard('featured_badge_color', v) },
    { label: 'Featured Badge Text', cssVar: '--badge-featured-text', get: () => getCard('featured_badge_text_color'), set: (v: string) => setCard('featured_badge_text_color', v) },
    { label: 'Just Listed Badge', cssVar: '--badge-just-listed-bg', get: () => getCard('just_listed_badge_color'), set: (v: string) => setCard('just_listed_badge_color', v) },
    { label: 'Just Listed Text', cssVar: '--badge-just-listed-text', get: () => getCard('just_listed_badge_text_color'), set: (v: string) => setCard('just_listed_badge_text_color', v) },
    { label: 'Property of Week Badge', cssVar: '--badge-potw-bg', get: () => getCard('potw_badge_color'), set: (v: string) => setCard('potw_badge_color', v) },
    { label: 'Property of Week Text', cssVar: '--badge-potw-text', get: () => getCard('potw_badge_text_color'), set: (v: string) => setCard('potw_badge_text_color', v) },
    { label: 'Back on Market Badge', cssVar: '--badge-back-market-bg', get: () => getCard('back_on_market_badge_color'), set: (v: string) => setCard('back_on_market_badge_color', v) },
    { label: 'Back on Market Text', cssVar: '--badge-back-market-text', get: () => getCard('back_on_market_badge_text_color'), set: (v: string) => setCard('back_on_market_badge_text_color', v) },
    { label: 'Reduced Price Badge', cssVar: '--badge-reduced-bg', get: () => getCard('reduced_badge_color'), set: (v: string) => setCard('reduced_badge_color', v) },
    { label: 'Reduced Price Text', cssVar: '--badge-reduced-text', get: () => getCard('reduced_badge_text_color'), set: (v: string) => setCard('reduced_badge_text_color', v) },
    { label: 'New Home Badge', cssVar: '--badge-new-home-bg', get: () => getCard('new_home_badge_color'), set: (v: string) => setCard('new_home_badge_color', v) },
    { label: 'New Home Text', cssVar: '--badge-new-home-text', get: () => getCard('new_home_badge_text_color'), set: (v: string) => setCard('new_home_badge_text_color', v) },
    { label: 'Refurbished Badge', cssVar: '--badge-refurbished-bg', get: () => getCard('refurbished_badge_color'), set: (v: string) => setCard('refurbished_badge_color', v) },
    { label: 'Refurbished Text', cssVar: '--badge-refurbished-text', get: () => getCard('refurbished_badge_text_color'), set: (v: string) => setCard('refurbished_badge_text_color', v) },
    { label: 'Joint Venture Badge', cssVar: '--badge-jv-bg', get: () => getCard('joint_venture_badge_color'), set: (v: string) => setCard('joint_venture_badge_color', v) },
    { label: 'Joint Venture Text', cssVar: '--badge-jv-text', get: () => getCard('joint_venture_badge_text_color'), set: (v: string) => setCard('joint_venture_badge_text_color', v) },
    { label: 'House Share Badge', cssVar: '--badge-house-share-bg', get: () => getCard('house_share_badge_color'), set: (v: string) => setCard('house_share_badge_color', v) },
    { label: 'House Share Text', cssVar: '--badge-house-share-text', get: () => getCard('house_share_badge_text_color'), set: (v: string) => setCard('house_share_badge_text_color', v) },
    { label: 'Tour Badge', cssVar: '--badge-tour-bg', get: () => getCard('tour_badge_color'), set: (v: string) => setCard('tour_badge_color', v) },
    { label: 'Tour Badge Text', cssVar: '--badge-tour-text', get: () => getCard('tour_badge_text_color'), set: (v: string) => setCard('tour_badge_text_color', v) },
    { label: 'New Dev Badge', cssVar: '--badge-new-dev-bg', get: () => getCard('new_dev_badge_color'), set: (v: string) => setCard('new_dev_badge_color', v) },
    { label: 'New Dev Badge Text', cssVar: '--badge-new-dev-text', get: () => getCard('new_dev_badge_text_color'), set: (v: string) => setCard('new_dev_badge_text_color', v) },
    { label: 'Completed Badge', cssVar: '--badge-completed-bg', get: () => getCard('completed_badge_color'), set: (v: string) => setCard('completed_badge_color', v) },
    { label: 'Completed Text', cssVar: '--badge-completed-text', get: () => getCard('completed_badge_text_color'), set: (v: string) => setCard('completed_badge_text_color', v) },
    { label: 'Off-Plan Badge', cssVar: '--badge-offplan-bg', get: () => getCard('offplan_badge_color'), set: (v: string) => setCard('offplan_badge_color', v) },
    { label: 'Off-Plan Text', cssVar: '--badge-offplan-text', get: () => getCard('offplan_badge_text_color'), set: (v: string) => setCard('offplan_badge_text_color', v) },
    { label: 'Under Construction Badge', cssVar: '--badge-under-construction-bg', get: () => getCard('under_construction_badge_color'), set: (v: string) => setCard('under_construction_badge_color', v) },
    { label: 'Under Construction Text', cssVar: '--badge-under-construction-text', get: () => getCard('under_construction_badge_text_color'), set: (v: string) => setCard('under_construction_badge_text_color', v) },
    { label: 'Sold Off-Plan Badge', cssVar: '--badge-sold-off-plan-bg', get: () => getCard('sold_off_plan_badge_color'), set: (v: string) => setCard('sold_off_plan_badge_color', v) },
    { label: 'Sold Off-Plan Text', cssVar: '--badge-sold-off-plan-text', get: () => getCard('sold_off_plan_badge_text_color'), set: (v: string) => setCard('sold_off_plan_badge_text_color', v) },
    { label: 'Sold Out Badge', cssVar: '--badge-sold-out-bg', get: () => getCard('sold_out_badge_color'), set: (v: string) => setCard('sold_out_badge_color', v) },
    { label: 'Sold Out Text', cssVar: '--badge-sold-out-text', get: () => getCard('sold_out_badge_text_color'), set: (v: string) => setCard('sold_out_badge_text_color', v) },
    { label: 'Investment Badge', cssVar: '--badge-investment-bg', get: () => getCard('investment_badge_color'), set: (v: string) => setCard('investment_badge_color', v) },
    { label: 'Investment Text', cssVar: '--badge-investment-text', get: () => getCard('investment_badge_text_color'), set: (v: string) => setCard('investment_badge_text_color', v) },
    { label: 'Button BG', cssVar: '--card-btn-bg', get: () => getCard('button_bg_color'), set: (v: string) => setCard('button_bg_color', v) },
    { label: 'Button Text', cssVar: '--card-btn-text', get: () => getCard('button_text_color'), set: (v: string) => setCard('button_text_color', v) },
    { label: 'Button Hover', cssVar: '--card-btn-hover', get: () => getCard('button_hover_color'), set: (v: string) => setCard('button_hover_color', v) },
    { label: 'Card Background', cssVar: '--card-bg', get: () => getCard('card_background'), set: (v: string) => setCard('card_background', v) },
    { label: 'Title Text', cssVar: '--card-title-text', get: () => getCard('title_color'), set: (v: string) => setCard('title_color', v) },
    { label: 'Price Text', cssVar: '--card-price-text', get: () => getCard('price_color'), set: (v: string) => setCard('price_color', v) },
    { label: 'Category Label', cssVar: '--card-category-text', get: () => getCard('category_color'), set: (v: string) => setCard('category_color', v) },
    { label: 'Location Text', cssVar: '--card-location-text', get: () => getCard('location_color'), set: (v: string) => setCard('location_color', v) },
    { label: 'Specs Text', cssVar: '--card-specs-text', get: () => getCard('specs_color'), set: (v: string) => setCard('specs_color', v) },
    { label: 'Time Ago Text', cssVar: '--card-time-text', get: () => getCard('time_ago_color'), set: (v: string) => setCard('time_ago_color', v) },
  ];

  return (
    <ManagementLayout title="Colour Palette" description="Full colour system — brand, card badges, text, backgrounds and badge visibility." icon={<Palette size={20} className="text-[#1B4332]" />}>
      <div className="space-y-5">
        <div className="flex items-center justify-end gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 px-3 py-2 rounded-lg text-xs font-sans transition-all cursor-pointer whitespace-nowrap">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={handleSaveWithRefresh} disabled={saving} className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#1B4332]/90 text-white px-4 py-2 rounded-lg text-xs font-sans transition-all cursor-pointer whitespace-nowrap disabled:opacity-50">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Changes</>}
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 p-1 bg-stone-50 rounded-lg flex-wrap">
          {sections.map((s) => (
            <button key={s.key} onClick={() => setActiveSection(s.key)} className={`px-3 py-1.5 rounded-md text-[11px] font-sans font-medium transition-all cursor-pointer whitespace-nowrap ${activeSection === s.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeSection === 'brand' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-[#1B4332]/10 flex items-center justify-center"><i className="ri-palette-line text-[#1B4332] text-sm"></i></div>
              <div><h3 className="text-sm font-semibold text-stone-700">Brand Palette</h3><p className="text-[11px] text-stone-400">Primary, secondary, accent and UI chrome colors.</p></div>
            </div>
            <div className="space-y-1.5">{brandColors.map((c) => <ColorRow key={c.cssVar} label={c.label} cssVar={c.cssVar} value={c.get()} onChange={c.set} />)}</div>
          </div>
        )}

        {activeSection === 'cards' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-[#1B4332]/10 flex items-center justify-center"><i className="ri-layout-grid-2-line text-[#1B4332] text-sm"></i></div>
              <div><h3 className="text-sm font-semibold text-stone-700">Card &amp; Badge Colors</h3><p className="text-[11px] text-stone-400">Badges, buttons, and card surface colors across all listing cards.</p></div>
            </div>
            <div className="space-y-1.5">{cardColors.map((c) => <ColorRow key={c.cssVar} label={c.label} cssVar={c.cssVar} value={c.get()} onChange={c.set} />)}</div>
          </div>
        )}

        {activeSection === 'text' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-[#1B4332]/10 flex items-center justify-center"><i className="ri-font-color text-[#1B4332] text-sm"></i></div>
              <div><h3 className="text-sm font-semibold text-stone-700">Text Color Tokens</h3><p className="text-[11px] text-stone-400">Define text color tokens for the design system.</p></div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-md">
              <Info size={13} className="text-blue-600 flex-shrink-0" />
              <p className="text-[11px] text-blue-700 font-sans">Text colors are managed through the Brand palette (Text color) and Typography settings. Use the Brand tab above to set the base text color.</p>
            </div>
          </div>
        )}

        {activeSection === 'bg' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-[#1B4332]/10 flex items-center justify-center"><i className="ri-layout-fill text-[#1B4332] text-sm"></i></div>
              <div><h3 className="text-sm font-semibold text-stone-700">Background Tokens</h3><p className="text-[11px] text-stone-400">Page, section, and surface background color tokens.</p></div>
            </div>
            <div className="space-y-1.5">
              <ColorRow label="White" cssVar="--bg-white" value={getBrand('white_color')} onChange={(v) => setBrand('white_color', v)} />
              <ColorRow label="Off-White" cssVar="--bg-off-white" value={getBrand('off_white_color')} onChange={(v) => setBrand('off_white_color', v)} />
              <ColorRow label="Card Background" cssVar="--card-bg" value={getCard('card_background')} onChange={(v) => setCard('card_background', v)} />
            </div>
          </div>
        )}

        {activeSection === 'visibility' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-[#1B4332]/10 flex items-center justify-center">
                <Eye size={14} className="text-[#1B4332]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-700">Badge Visibility</h3>
                <p className="text-[11px] text-stone-400">Toggle which badges appear on property cards site-wide. Disabled badges are completely hidden regardless of listing flags.</p>
              </div>
            </div>
            <div className="space-y-2">
              {badgeVisibilityList.map((badge) => {
                const dbKey = `badge_${badge.key}_enabled`;
                const currentValue = getCard(dbKey);
                const isOn = currentValue !== 'false';
                return (
                  <div key={badge.key} className="flex items-center justify-between p-3 border border-stone-100 rounded-lg bg-white hover:border-stone-200 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-stone-700">{badge.label}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{badge.description}</p>
                    </div>
                    <button
                      onClick={() => setCard(dbKey, isOn ? 'false' : 'true')}
                      className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors cursor-pointer ml-4 ${isOn ? 'bg-[#1B4332]' : 'bg-stone-200'}`}
                      aria-label={`Toggle ${badge.label}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0'}`}></span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ManagementLayout>
  );
}