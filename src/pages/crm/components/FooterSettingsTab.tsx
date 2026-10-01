import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import {
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_FOOTER_BOTTOM_LINKS,
  parseFooterColumns,
  parseFooterLinks,
  type FooterColumnConfig,
  type FooterLink,
} from '@/lib/footerLinks';

const inputCls =
  'w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary';
const labelCls =
  'block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5';
const iconBtnCls =
  'w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:text-primary hover:border-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const cloneColumns = (cols: FooterColumnConfig[]): FooterColumnConfig[] =>
  cols.map((c) => ({ title: c.title, links: c.links.map((l) => ({ ...l })) }));

const cloneLinks = (links: FooterLink[]): FooterLink[] => links.map((l) => ({ ...l }));

export default function FooterSettingsTab() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [columns, setColumns] = useState<FooterColumnConfig[]>(() => cloneColumns(DEFAULT_FOOTER_COLUMNS));
  const [bottomLinks, setBottomLinks] = useState<FooterLink[]>(() => cloneLinks(DEFAULT_FOOTER_BOTTOM_LINKS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchFooter = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('footer_settings').select('key, value');
    const map: Record<string, string> = {};
    (data || []).forEach((row: { key: string; value: string | null }) => {
      map[row.key] = row.value ?? '';
    });
    setForm(map);
    setColumns(parseFooterColumns(map.columns_json) || cloneColumns(DEFAULT_FOOTER_COLUMNS));
    setBottomLinks(parseFooterLinks(map.bottom_links_json) || cloneLinks(DEFAULT_FOOTER_BOTTOM_LINKS));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFooter();
  }, [fetchFooter]);

  const setField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const val = (key: string) => form[key] ?? '';

  // ── Column helpers ─────────────────────────────────────────
  const addColumn = () =>
    setColumns((prev) => [...prev, { title: 'New Column', links: [{ label: '', href: '' }] }]);
  const removeColumn = (ci: number) => setColumns((prev) => prev.filter((_, i) => i !== ci));
  const moveColumn = (ci: number, dir: number) =>
    setColumns((prev) => {
      const target = ci + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[ci], next[target]] = [next[target], next[ci]];
      return next;
    });
  const updateColumnTitle = (ci: number, title: string) =>
    setColumns((prev) => prev.map((c, i) => (i === ci ? { ...c, title } : c)));
  const addLink = (ci: number) =>
    setColumns((prev) =>
      prev.map((c, i) => (i === ci ? { ...c, links: [...c.links, { label: '', href: '' }] } : c)),
    );
  const updateLink = (ci: number, li: number, patch: Partial<FooterLink>) =>
    setColumns((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, links: c.links.map((l, j) => (j === li ? { ...l, ...patch } : l)) } : c,
      ),
    );
  const removeLink = (ci: number, li: number) =>
    setColumns((prev) =>
      prev.map((c, i) => (i === ci ? { ...c, links: c.links.filter((_, j) => j !== li) } : c)),
    );
  const moveLink = (ci: number, li: number, dir: number) =>
    setColumns((prev) =>
      prev.map((c, i) => {
        if (i !== ci) return c;
        const target = li + dir;
        if (target < 0 || target >= c.links.length) return c;
        const links = [...c.links];
        [links[li], links[target]] = [links[target], links[li]];
        return { ...c, links };
      }),
    );

  // ── Bottom link helpers ────────────────────────────────────
  const addBottomLink = () => setBottomLinks((prev) => [...prev, { label: '', href: '' }]);
  const updateBottomLink = (li: number, patch: Partial<FooterLink>) =>
    setBottomLinks((prev) => prev.map((l, j) => (j === li ? { ...l, ...patch } : l)));
  const removeBottomLink = (li: number) => setBottomLinks((prev) => prev.filter((_, j) => j !== li));
  const moveBottomLink = (li: number, dir: number) =>
    setBottomLinks((prev) => {
      const target = li + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[li], next[target]] = [next[target], next[li]];
      return next;
    });

  const saveFooter = async () => {
    setSaving(true);
    const payload: Record<string, string> = {
      ...form,
      columns_json: JSON.stringify(columns),
      bottom_links_json: JSON.stringify(bottomLinks),
    };
    const rows = Object.entries(payload).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from('footer_settings').upsert(rows, { onConflict: 'key' });
    if (error) {
      showToast('Failed to save footer settings', 'error');
    } else {
      showToast('Footer settings saved', 'success');
      broadcastSync();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const showLogo = val('show_logo') !== 'false';
  const showSocial = val('show_social') === 'true';
  const showNewsletter = val('show_newsletter') !== 'false';

  return (
    <div className="space-y-6">
      {/* Brand & intro */}
      <div className="space-y-4">
        <h4 className="font-jost text-[15px] text-[#1a1a2e]">Brand &amp; Intro</h4>
        <div>
          <label className={labelCls}>About Us Text</label>
          <textarea
            value={val('about_text')}
            onChange={(e) => setField('about_text', e.target.value)}
            rows={4}
            maxLength={500}
            className={`${inputCls} resize-none`}
            placeholder="Short description about your company..."
          />
        </div>
        <div>
          <label className={labelCls}>Footer Tagline</label>
          <input
            type="text"
            value={val('tagline')}
            onChange={(e) => setField('tagline', e.target.value)}
            className={inputCls}
            placeholder="Your Trusted Real Estate Agents..."
          />
        </div>
        <div>
          <label className={labelCls}>Footer SEO Intro</label>
          <textarea
            value={val('seo_intro')}
            onChange={(e) => setField('seo_intro', e.target.value)}
            rows={4}
            maxLength={500}
            className={`${inputCls} resize-none`}
            placeholder="Longer coverage / SEO paragraph shown in the footer..."
          />
          <p className="text-[15px] text-gray-500 font-roboto mt-1.5">
            Shown on the site as the collapsible &ldquo;About our coverage&rdquo; text.
          </p>
        </div>
        <div>
          <label className={labelCls}>Footer Logo</label>
          <ImageUploadField
            label="Footer logo image"
            value={val('logo_url')}
            onChange={(url) => setField('logo_url', url)}
            pageKey="footer"
            fieldKey="logo_url"
            previewWidth="w-24"
            previewHeight="h-16"
          />
          <p className="text-[15px] text-gray-500 font-roboto mt-2">
            Leave empty to use the main site logo from General settings.
          </p>
        </div>
      </div>

      {/* Newsletter */}
      <div className="pt-4 border-t border-gray-100">
        <h4 className="font-jost text-[15px] text-[#1a1a2e] mb-3">Newsletter</h4>
        <label className={labelCls}>Newsletter Heading</label>
        <input
          type="text"
          value={val('newsletter_heading')}
          onChange={(e) => setField('newsletter_heading', e.target.value)}
          className={inputCls}
          placeholder="Sign Up for Our Newsletter"
        />
      </div>

      {/* Contact & emails */}
      <div className="pt-4 border-t border-gray-100">
        <h4 className="font-jost text-[15px] text-[#1a1a2e] mb-1">Contact &amp; Emails</h4>
        <p className="text-[15px] text-gray-500 font-roboto mb-3">
          These drive the contact block in the footer. Leave empty to reuse the General settings values.
        </p>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Address</label>
            <input
              type="text"
              value={val('address')}
              onChange={(e) => setField('address', e.target.value)}
              className={inputCls}
              placeholder="Riverside Drive, Westlands, Nairobi"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="text"
                value={val('phone')}
                onChange={(e) => setField('phone', e.target.value)}
                className={inputCls}
                placeholder="+254 181 408 186"
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={val('email')}
                onChange={(e) => setField('email', e.target.value)}
                className={inputCls}
                placeholder="ask@oceanske.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>General Inquiries</label>
              <input
                type="email"
                value={val('email_general')}
                onChange={(e) => setField('email_general', e.target.value)}
                className={inputCls}
                placeholder="ask@oceanske.com"
              />
            </div>
            <div>
              <label className={labelCls}>Sales</label>
              <input
                type="email"
                value={val('email_sales')}
                onChange={(e) => setField('email_sales', e.target.value)}
                className={inputCls}
                placeholder="sales@oceanske.com"
              />
            </div>
            <div>
              <label className={labelCls}>Rentals</label>
              <input
                type="email"
                value={val('email_rentals')}
                onChange={(e) => setField('email_rentals', e.target.value)}
                className={inputCls}
                placeholder="rent@oceanske.com"
              />
            </div>
            <div>
              <label className={labelCls}>Ventures</label>
              <input
                type="email"
                value={val('email_ventures')}
                onChange={(e) => setField('email_ventures', e.target.value)}
                className={inputCls}
                placeholder="ventures@oceanske.com"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Display options */}
      <div className="pt-4 border-t border-gray-100">
        <h4 className="font-jost text-[15px] text-[#1a1a2e] mb-3">Display Options</h4>
        <div className="flex flex-wrap items-center gap-5 mb-4">
          <label className="flex items-center gap-1.5 text-[15px] font-roboto text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showLogo}
              onChange={(e) => setField('show_logo', e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Show logo
          </label>
          <label className="flex items-center gap-1.5 text-[15px] font-roboto text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showSocial}
              onChange={(e) => setField('show_social', e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Show social links
          </label>
          <label className="flex items-center gap-1.5 text-[15px] font-roboto text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showNewsletter}
              onChange={(e) => setField('show_newsletter', e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Show newsletter
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Background Colour</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={val('background') || '#0C1A2F'}
                onChange={(e) => setField('background', e.target.value)}
                className="w-10 h-9 rounded-md border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={val('background') || '#0C1A2F'}
                onChange={(e) => setField('background', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Text Colour</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={val('text_color') || '#FFFFFF'}
                onChange={(e) => setField('text_color', e.target.value)}
                className="w-10 h-9 rounded-md border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={val('text_color') || '#FFFFFF'}
                onChange={(e) => setField('text_color', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-jost text-[15px] text-[#1a1a2e]">Footer Columns</h4>
          <button
            type="button"
            onClick={addColumn}
            className="inline-flex items-center gap-1.5 text-[15px] font-roboto font-semibold text-primary hover:opacity-80 cursor-pointer"
          >
            <Plus size={15} /> Add Column
          </button>
        </div>
        <p className="text-[15px] text-gray-500 font-roboto mb-4">
          Rename each column, and add, edit, reorder or remove its links. Columns with no links are hidden on the site.
        </p>
        <div className="space-y-4">
          {columns.map((col, ci) => (
            <div key={ci} className="border border-gray-100 rounded-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={col.title}
                  onChange={(e) => updateColumnTitle(ci, e.target.value)}
                  className={`${inputCls} font-semibold`}
                  placeholder="Column title"
                />
                <button type="button" className={iconBtnCls} onClick={() => moveColumn(ci, -1)} disabled={ci === 0} aria-label="Move column up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" className={iconBtnCls} onClick={() => moveColumn(ci, 1)} disabled={ci === columns.length - 1} aria-label="Move column down">
                  <ArrowDown size={14} />
                </button>
                <button type="button" className={`${iconBtnCls} hover:text-red-500 hover:border-red-300`} onClick={() => removeColumn(ci)} aria-label="Remove column">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="space-y-2">
                {col.links.map((link, li) => (
                  <div key={li} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(ci, li, { label: e.target.value })}
                      className={inputCls}
                      placeholder="Label"
                    />
                    <input
                      type="text"
                      value={link.href}
                      onChange={(e) => updateLink(ci, li, { href: e.target.value })}
                      className={`${inputCls} font-roboto text-gray-500`}
                      placeholder="/path or https://..."
                    />
                    <button type="button" className={iconBtnCls} onClick={() => moveLink(ci, li, -1)} disabled={li === 0} aria-label="Move link up">
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" className={iconBtnCls} onClick={() => moveLink(ci, li, 1)} disabled={li === col.links.length - 1} aria-label="Move link down">
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" className={`${iconBtnCls} hover:text-red-500 hover:border-red-300`} onClick={() => removeLink(ci, li)} aria-label="Remove link">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addLink(ci)}
                className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-roboto font-semibold text-primary hover:opacity-80 cursor-pointer"
              >
                <Plus size={15} /> Add Link
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar links */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-jost text-[15px] text-[#1a1a2e]">Bottom Bar Links</h4>
          <button
            type="button"
            onClick={addBottomLink}
            className="inline-flex items-center gap-1.5 text-[15px] font-roboto font-semibold text-primary hover:opacity-80 cursor-pointer"
          >
            <Plus size={15} /> Add Link
          </button>
        </div>
        <p className="text-[15px] text-gray-500 font-roboto mb-4">
          The small quick links beside the copyright line.
        </p>
        <div className="space-y-2">
          {bottomLinks.map((link, li) => (
            <div key={li} className="flex items-center gap-2">
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateBottomLink(li, { label: e.target.value })}
                className={inputCls}
                placeholder="Label"
              />
              <input
                type="text"
                value={link.href}
                onChange={(e) => updateBottomLink(li, { href: e.target.value })}
                className={`${inputCls} font-roboto text-gray-500`}
                placeholder="/path or https://..."
              />
              <button type="button" className={iconBtnCls} onClick={() => moveBottomLink(li, -1)} disabled={li === 0} aria-label="Move link up">
                <ArrowUp size={14} />
              </button>
              <button type="button" className={iconBtnCls} onClick={() => moveBottomLink(li, 1)} disabled={li === bottomLinks.length - 1} aria-label="Move link down">
                <ArrowDown size={14} />
              </button>
              <button type="button" className={`${iconBtnCls} hover:text-red-500 hover:border-red-300`} onClick={() => removeBottomLink(li)} aria-label="Remove link">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={saveFooter}
        disabled={saving}
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-md text-[15px] font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Saving...
          </>
        ) : (
          <>
            <Save size={16} /> Save Footer Settings
          </>
        )}
      </button>
    </div>
  );
}