import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, uploadImageViaEdgeFunction } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ManagementLayout from '../ManagementLayout';

type TabKey = 'content' | 'tiles' | 'styling' | 'preview';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'content', label: 'Content', icon: 'ri-article-line' },
  { key: 'tiles', label: 'Neighbourhood Tiles', icon: 'ri-grid-fill' },
  { key: 'styling', label: 'Styling', icon: 'ri-palette-line' },
  { key: 'preview', label: 'Preview', icon: 'ri-eye-line' },
];

interface Tile {
  name: string;
  link: string;
  image: string;
  span: number;
}

interface Content {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  accent: string;
  card_radius: string;
  overlay_opacity: string;
  tiles: Tile[];
}

const DEFAULT_TILES: Tile[] = [
  { name: 'Karen', link: '/neighbourhood/karen', span: 2, image: '' },
  { name: 'Westlands', link: '/neighbourhood/westlands', span: 1, image: '' },
  { name: 'Kilimani', link: '/neighbourhood/kilimani', span: 1, image: '' },
  { name: 'Lavington', link: '/neighbourhood/lavington', span: 1, image: '' },
  { name: 'Runda', link: '/neighbourhood/runda', span: 1, image: '' },
  { name: 'Muthaiga', link: '/neighbourhood/muthaiga', span: 2, image: '' },
  { name: 'Gigiri', link: '/neighbourhood/gigiri', span: 2, image: '' },
  { name: 'Kileleshwa', link: '/neighbourhood/kileleshwa', span: 1, image: '' },
  { name: 'Kitisuru', link: '/neighbourhood/kitisuru', span: 1, image: '' },
];

const DEFAULTS: Content = {
  enabled: true,
  eyebrow: 'Explore Our Areas',
  title: 'Nairobi Prime Neighbourhoods',
  subtitle: 'Premium Homes. Select Locations. Expat Representation.',
  cta_text: 'View More Neighbourhoods',
  cta_link: '/neighbourhoods',
  accent: '#C9A84C',
  card_radius: '0',
  overlay_opacity: '58',
  tiles: DEFAULT_TILES,
};

const PAGE_KEY = 'neighbourhoods_homepage';

function SC({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4"><div className="flex items-center gap-2 mb-1"><span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span><h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3></div>{children}</div>;
}
function T({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" /></div>;
}
function TA({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" /></div>;
}
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!value)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${value ? 'bg-[#1B4332]' : 'bg-stone-200'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}></span></button>;
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><div className="flex items-center gap-2"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 border border-stone-200 rounded-md cursor-pointer shrink-0" /><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm uppercase focus:outline-none focus:border-[#1B4332] bg-white" /></div></div>;
}

export default function NeighbourhoodsHomepage() {
  const [activeTab, setActiveTab] = useState<TabKey>('content');
  const [c, setC] = useState<Content>({ ...DEFAULTS, tiles: DEFAULTS.tiles });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadTarget = useRef<number | null>(null);

  const fetchC = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    const map = { ...DEFAULTS, tiles: DEFAULTS.tiles };
    if (data) {
      data.forEach((r: { key: string; value: string | null }) => {
        const f = r.key.replace(`page_${PAGE_KEY}_`, '');
        if (r.value === null) return;
        if (f === 'enabled') map.enabled = r.value === 'true';
        else if (f === 'tiles') {
          try { const parsed = JSON.parse(r.value); if (Array.isArray(parsed)) map.tiles = parsed; } catch { /* ignore */ }
        } else if (f in map) (map as Record<string, unknown>)[f] = r.value;
      });
    }
    setC(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchC(); }, [fetchC]);

  const upd = (key: keyof Content, value: unknown) => setC((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    const entries = [
      { key: `page_${PAGE_KEY}_enabled`, value: c.enabled ? 'true' : 'false' },
      { key: `page_${PAGE_KEY}_eyebrow`, value: c.eyebrow },
      { key: `page_${PAGE_KEY}_title`, value: c.title },
      { key: `page_${PAGE_KEY}_subtitle`, value: c.subtitle },
      { key: `page_${PAGE_KEY}_cta_text`, value: c.cta_text },
      { key: `page_${PAGE_KEY}_cta_link`, value: c.cta_link },
      { key: `page_${PAGE_KEY}_accent`, value: c.accent },
      { key: `page_${PAGE_KEY}_card_radius`, value: c.card_radius },
      { key: `page_${PAGE_KEY}_overlay_opacity`, value: c.overlay_opacity },
      { key: `page_${PAGE_KEY}_tiles`, value: JSON.stringify(c.tiles) },
    ];
    await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    showToast('Neighbourhoods homepage section saved', 'success');
    setSaving(false);
  };

  const reset = () => { setC({ ...DEFAULTS, tiles: DEFAULTS.tiles }); showToast('Defaults restored — click Save to apply', 'info'); };

  const moveTile = (index: number, dir: -1 | 1) => {
    setC((prev) => {
      const next = [...prev.tiles];
      const ni = index + dir;
      if (ni < 0 || ni >= next.length) return prev;
      [next[index], next[ni]] = [next[ni], next[index]];
      return { ...prev, tiles: next };
    });
  };

  const removeTile = (index: number) => {
    setC((prev) => ({ ...prev, tiles: prev.tiles.filter((_, i) => i !== index) }));
  };

  const addTile = () => {
    setC((prev) => ({ ...prev, tiles: [...prev.tiles, { name: 'New Area', link: '/neighbourhood', image: '', span: 1 }] }));
  };

  const updateTile = (index: number, patch: Partial<Tile>) => {
    setC((prev) => ({ ...prev, tiles: prev.tiles.map((t, i) => (i === index ? { ...t, ...patch } : t)) }));
  };

  const triggerUpload = (index: number) => { uploadTarget.current = index; if (inputRef.current) inputRef.current.click(); };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = uploadTarget.current;
    if (!file || idx === null) return;
    setUploadingIdx(idx);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `nh-tile-${Date.now()}.${fileExt}`;
      const { url } = await uploadImageViaEdgeFunction(file, `neighbourhoods/${fileName}`);
      updateTile(idx, { image: url });
      showToast('Image uploaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    }
    setUploadingIdx(null);
    if (e.target) e.target.value = '';
  };

  return (
    <ManagementLayout title="Neighbourhoods (Homepage)" description="Manage the neighbourhood areas showcase section that appears on the homepage." icon={<i className="ri-map-pin-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const isA = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${isA ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'content' && (
          <div className="space-y-5">
            <SC title="Section Visibility" icon="ri-eye-line">
              <div className="flex items-center justify-between py-2"><div><p className="text-sm font-medium text-stone-700">Show on Homepage</p><p className="text-xs text-stone-400">Toggle the neighbourhoods showcase section on the homepage.</p></div><Toggle value={c.enabled} onChange={(v) => upd('enabled', v)} /></div>
            </SC>
            <SC title="Heading" icon="ri-article-line">
              <T label="Eyebrow" value={c.eyebrow} onChange={(v) => upd('eyebrow', v)} />
              <T label="Title" value={c.title} onChange={(v) => upd('title', v)} />
              <TA label="Subtitle" value={c.subtitle} onChange={(v) => upd('subtitle', v)} />
            </SC>
            <SC title="Call to Action" icon="ri-megaphone-line">
              <T label="Button Text" value={c.cta_text} onChange={(v) => upd('cta_text', v)} />
              <T label="Button Link" value={c.cta_link} onChange={(v) => upd('cta_link', v)} />
            </SC>
          </div>
        )}

        {activeTab === 'tiles' && (
          <SC title="Neighbourhood Tiles" icon="ri-grid-fill">
            <p className="text-xs text-stone-400 leading-relaxed">Add the areas shown in the homepage grid. Set an image, name, link and how many columns it spans. Reorder with the arrows — the grid rebuilds automatically.</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <div className="space-y-3">
              {c.tiles.map((tile, i) => (
                <div key={i} className="p-4 border border-stone-100 rounded-lg bg-[#fcfcfc] space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-14 border border-stone-200 rounded-md overflow-hidden bg-white flex items-center justify-center shrink-0">
                      {tile.image ? <img src={tile.image} alt="" className="w-full h-full object-cover" /> : <i className="ri-image-line text-stone-300 text-lg"></i>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-stone-400 uppercase">Tile {i + 1}</span>
                        {uploadingIdx === i ? <span className="text-[10px] text-[#1B4332] animate-pulse">Uploading...</span> : tile.image ? <span className="text-[10px] font-medium text-emerald-600"><i className="ri-checkbox-circle-line mr-0.5"></i>Uploaded</span> : <span className="text-[10px] text-stone-400">No image — click Upload</span>}
                      </div>
                    </div>
                    <button onClick={() => triggerUpload(i)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-md text-xs font-roboto cursor-pointer transition-colors whitespace-nowrap"><i className="ri-upload-2-line text-sm"></i>{tile.image ? 'Replace' : 'Upload'}</button>
                    <button onClick={() => moveTile(i, -1)} disabled={i === 0} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-stone-100 text-stone-400 disabled:opacity-30 cursor-pointer"><i className="ri-arrow-up-line text-sm"></i></button>
                    <button onClick={() => moveTile(i, 1)} disabled={i === c.tiles.length - 1} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-stone-100 text-stone-400 disabled:opacity-30 cursor-pointer"><i className="ri-arrow-down-line text-sm"></i></button>
                    <button onClick={() => removeTile(i)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-red-400 cursor-pointer"><i className="ri-delete-bin-line text-sm"></i></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5"><label className="text-xs font-medium text-stone-600">Name</label><input type="text" value={tile.name} onChange={(e) => updateTile(i, { name: e.target.value })} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" /></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-stone-600">Link</label><input type="text" value={tile.link} onChange={(e) => updateTile(i, { link: e.target.value })} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" placeholder="/neighbourhood/karen" /></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-stone-600">Width</label><select value={tile.span} onChange={(e) => updateTile(i, { span: Number(e.target.value) })} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm bg-white cursor-pointer"><option value={1}>1 column</option><option value={2}>2 columns (wide)</option></select></div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addTile} className="inline-flex items-center gap-2 px-4 py-2.5 border border-dashed border-stone-300 text-stone-500 hover:text-[#1B4332] hover:border-[#1B4332] rounded-lg text-sm font-roboto cursor-pointer transition-colors whitespace-nowrap"><i className="ri-add-line text-sm"></i>Add Neighbourhood Tile</button>
          </SC>
        )}

        {activeTab === 'styling' && (
          <SC title="Styling" icon="ri-palette-line">
            <ColorField label="Accent Colour (subtitle / eyebrow)" value={c.accent} onChange={(v) => upd('accent', v)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <T label="Card Corner Radius (px)" value={c.card_radius} onChange={(v) => upd('card_radius', v)} />
              <T label="Overlay Opacity (%)" value={c.overlay_opacity} onChange={(v) => upd('overlay_opacity', v)} />
            </div>
            <p className="text-[11px] text-stone-400">These settings also apply to the tiles in the position / focal-point styling on the home grid.</p>
          </SC>
        )}

        {activeTab === 'preview' && (
          <SC title="Homepage Section Preview" icon="ri-eye-line">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="p-6 text-center">
                <p className="text-[11px] font-roboto font-bold uppercase tracking-[0.2em]" style={{ color: c.accent }}>{c.eyebrow}</p>
                <h3 className="font-roboto font-bold text-2xl mt-2">{c.title}</h3>
                <p className="text-sm mt-1" style={{ color: c.accent }}>{c.subtitle}</p>
              </div>
              <div className={`grid grid-cols-4 gap-0.5 px-4`}>
                {c.tiles.slice(0, 4).map((tile, i) => (
                  <div key={i} className={`relative h-24 overflow-hidden ${tile.span >= 2 ? 'col-span-2' : 'col-span-1'}`}>
                    {tile.image ? <img src={tile.image} alt={tile.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-stone-100"></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <span className="absolute bottom-2 left-3 text-white text-xs font-semibold">{tile.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </SC>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{c.tiles.length}</span> tiles · <span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><div className="flex items-center gap-2"><button onClick={reset} className="px-4 py-2 text-sm font-medium bg-white border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"><i className="ri-refresh-line"></i> Reset Defaults</button><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div></div>
      </div>
    </ManagementLayout>
  );
}