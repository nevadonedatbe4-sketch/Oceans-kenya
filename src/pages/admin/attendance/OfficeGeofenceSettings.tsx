import { useState } from 'react';
import type { OfficeLocationsState, OfficeLocationInput } from '@/hooks/useOfficeLocations';

interface Props {
  state: OfficeLocationsState;
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#001731] border border-[#1c3a5e] text-sm text-white focus:outline-none focus:border-[#2a5480]';
const labelCls = 'text-[11px] font-semibold uppercase tracking-wider text-[#8b98ab] mb-1 block';

const EMPTY: OfficeLocationInput = {
  name: '',
  address: '',
  latitude: null,
  longitude: null,
  radius_m: 150,
  enabled: true,
  is_default: false,
};

/**
 * Manage the office location(s) and the allowed radius the attendance geofence
 * measures against. A punch outside the radius is stored as `flagged_geofence`.
 */
export default function OfficeGeofenceSettings({ state }: Props) {
  const { offices, loading, error, save, remove, setDefault } = state;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OfficeLocationInput>(EMPTY);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyRemote, setBusyRemote] = useState(false);
  const [locating, setLocating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3200); };

  const toggleRemote = async (allow: boolean) => {
    setBusyRemote(true);
    const res = await state.setRemoteWork(allow);
    setBusyRemote(false);
    if (res.ok) flash(allow ? 'Remote work enabled — geofence is off for everyone' : 'Remote work disabled — the office geofence now applies');
    else flash(res.error || 'Could not save.', false);
  };

  const startAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY, is_default: offices.length === 0 });
    setFormOpen(true);
  };

  const startEdit = (id: string) => {
    const o = offices.find((x) => x.id === id);
    if (!o) return;
    setEditingId(id);
    setForm({
      name: o.name,
      address: o.address || '',
      latitude: o.latitude,
      longitude: o.longitude,
      radius_m: o.radius_m ?? 150,
      enabled: o.enabled,
      is_default: o.is_default,
    });
    setFormOpen(true);
  };

  const cancel = () => { setFormOpen(false); setEditingId(null); setForm(EMPTY); };

  const locate = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      flash('This browser cannot share location.', false);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setLocating(false);
      },
      () => { setLocating(false); flash('Could not get your location — enter coordinates manually.', false); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const submit = async () => {
    if (!form.name.trim()) { flash('Give the office a name.', false); return; }
    if (form.latitude == null || form.longitude == null) { flash('Set the office coordinates (lat / lng).', false); return; }
    if (form.latitude === 0 && form.longitude === 0) { flash('0,0 is not a valid office location.', false); return; }
    if (!form.radius_m || form.radius_m <= 0) { flash('The allowed radius must be greater than 0.', false); return; }
    setBusy(true);
    const res = await save({ ...form, name: form.name.trim(), address: form.address?.trim() || null }, editingId || undefined);
    setBusy(false);
    if (res.ok) { flash(editingId ? 'Office updated' : 'Office added'); cancel(); }
    else flash(res.error || 'Could not save.', false);
  };

  const onRemove = async (id: string) => {
    setBusy(true);
    const res = await remove(id);
    setBusy(false);
    if (res.ok) flash('Office removed'); else flash(res.error || 'Could not remove.', false);
  };

  const onDefault = async (id: string) => {
    setBusy(true);
    const res = await setDefault(id);
    setBusy(false);
    if (res.ok) flash('Default office set'); else flash(res.error || 'Could not set default.', false);
  };

  return (
    <div className="space-y-5">
      {/* Org-wide remote work — turns the geofence off for every team */}
      <div className="bg-[#012144] rounded-2xl border border-[#1c3a5e] p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-2">
            <i className="ri-global-line text-teal-300 mt-0.5" />
            <div>
              <h2 className="text-white font-semibold text-sm">Remote work</h2>
              <p className="text-xs text-[#8b98ab] mt-0.5 max-w-xl">
                Let every team punch in from anywhere — Kololo, Nairobi, or fully remote. When this is on,
                a punch is never flagged for being away from an office and no reason is ever required.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.remoteWork}
            aria-label="Toggle remote work"
            onClick={() => toggleRemote(!state.remoteWork)}
            disabled={busyRemote || state.remoteLoading}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${state.remoteWork ? 'bg-[#0d5959]' : 'bg-white/15'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${state.remoteWork ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${state.remoteWork ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/60'}`}>
            <i className={state.remoteWork ? 'ri-checkbox-circle-fill' : 'ri-building-2-line'} />
            {state.remoteWork ? 'Remote work ON — geofence off for everyone' : 'Remote work OFF — office radius applies'}
          </span>
          {state.remoteLoading && <span className="text-[11px] text-[#5b6b80]"><i className="ri-loader-4-line animate-spin" /> loading…</span>}
        </div>
      </div>

      <div className="bg-[#012144] rounded-2xl border border-[#1c3a5e] p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2">
          <i className="ri-map-pin-2-line text-teal-300 mt-0.5" />
          <div>
            <h2 className="text-white font-semibold text-sm">Office &amp; geofence</h2>
            <p className="text-xs text-[#8b98ab] mt-0.5 max-w-xl">
              Used when remote work is off. Punches are then measured against the default office below,
              and a punch beyond the allowed radius is flagged so the person must add a reason to continue.
            </p>
          </div>
        </div>
        <button onClick={startAdd} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0d5959] text-white text-xs font-semibold hover:bg-[#0f6a6a] cursor-pointer whitespace-nowrap">
          <i className="ri-add-line" /> Add office
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-red-300 text-xs">
          <i className="ri-error-warning-line" /> {error}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[#8b98ab] py-3"><i className="ri-loader-4-line animate-spin" /> Loading offices…</div>
        ) : offices.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-[#1c3a5e] py-8">
            <span className="w-11 h-11 rounded-2xl bg-[#001731] flex items-center justify-center text-[#5b6b80] mb-2"><i className="ri-building-2-line text-xl" /></span>
            <p className="text-sm text-white">No office location yet</p>
            <p className="text-xs text-[#8b98ab] mt-1 max-w-sm">Without an office and radius, every punch counts as inside the area — the geofence never flags. Add one to turn it on.</p>
          </div>
        ) : offices.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#001731] border border-[#1c3a5e] px-3.5 py-3 flex-wrap">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${o.is_default ? 'bg-teal-400/15 text-teal-300' : 'bg-white/10 text-white/50'}`}>
                <i className="ri-building-2-line" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white truncate">{o.name}</p>
                  {o.is_default && <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-teal-400/15 text-teal-300">Default</span>}
                  {!o.enabled && <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/10 text-white/50">Disabled</span>}
                </div>
                <p className="text-[11px] text-[#8b98ab] truncate mt-0.5">{o.address || 'No address'}</p>
                <p className="text-[11px] text-[#5b6b80] mt-0.5 tabular-nums">
                  {o.latitude != null && o.longitude != null ? `${o.latitude}, ${o.longitude}` : 'No coordinates'}
                  {o.radius_m ? ` · ${o.radius_m} m` : ' · no radius'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!o.is_default && (
                <button onClick={() => onDefault(o.id)} disabled={busy} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 font-semibold cursor-pointer whitespace-nowrap disabled:opacity-40">Set default</button>
              )}
              <button onClick={() => startEdit(o.id)} aria-label="Edit" className="w-8 h-8 rounded-lg hover:bg-white/10 text-teal-300 flex items-center justify-center cursor-pointer"><i className="ri-edit-line" /></button>
              <button onClick={() => onRemove(o.id)} disabled={busy} aria-label="Delete" className="w-8 h-8 rounded-lg hover:bg-red-500/15 text-red-300 flex items-center justify-center cursor-pointer disabled:opacity-40"><i className="ri-delete-bin-line" /></button>
            </div>
          </div>
        ))}
      </div>

      {formOpen && (
        <div className="mt-4 rounded-xl border border-[#1c3a5e] bg-[#001731]/60 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b98ab]">{editingId ? 'Edit office' : 'New office'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Oceans HQ — Kololo" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Address</label>
              <input value={form.address || ''} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="e.g. Baskerville, Kololo, Kampala" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Latitude</label>
              <input type="number" step="any" value={form.latitude ?? ''} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value === '' ? null : Number(e.target.value) }))} placeholder="0.334200" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Longitude</label>
              <input type="number" step="any" value={form.longitude ?? ''} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value === '' ? null : Number(e.target.value) }))} placeholder="32.598900" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Allowed radius (m)</label>
              <input type="number" min={1} value={form.radius_m} onChange={(e) => setForm((f) => ({ ...f, radius_m: Number(e.target.value) }))} className={inputCls} />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={locate} disabled={locating} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 text-xs font-semibold cursor-pointer whitespace-nowrap disabled:opacity-40">
                {locating ? <><i className="ri-loader-4-line animate-spin" /> Locating…</> : <><i className="ri-crosshair-2-line" /> Use my location</>}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-white cursor-pointer">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} className="accent-teal-400 w-4 h-4 cursor-pointer" /> Enabled
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-white cursor-pointer">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))} className="accent-teal-400 w-4 h-4 cursor-pointer" /> Default office
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={cancel} className="px-4 py-2 rounded-lg text-sm text-[#9ca3af] hover:text-white cursor-pointer whitespace-nowrap">Cancel</button>
            <button onClick={submit} disabled={busy} className="px-4 py-2 rounded-lg bg-[#0d5959] text-white text-xs font-semibold hover:bg-[#0f6a6a] cursor-pointer disabled:opacity-40 whitespace-nowrap">{busy ? 'Saving…' : editingId ? 'Save changes' : 'Add office'}</button>
          </div>
        </div>
      )}

      {msg && (
        <div className={`mt-3 rounded-xl p-3 text-xs font-medium ${msg.ok ? 'bg-emerald-400/10 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>{msg.text}</div>
      )}
    </div>
    </div>
  );
}