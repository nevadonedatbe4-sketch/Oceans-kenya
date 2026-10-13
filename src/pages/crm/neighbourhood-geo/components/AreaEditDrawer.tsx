import { useEffect, useState } from 'react';
import { addToast } from '@/pages/crm/components/CRMToast';
import AreaMapPicker from './AreaMapPicker';
import type {
  AdminArea,
  AdminLandmark,
  AdminNeighbourLink,
  useAreaGeoAdmin,
} from '@/hooks/useAreaGeoAdmin';

type GeoAdminApi = ReturnType<typeof useAreaGeoAdmin>;

interface Props {
  area: AdminArea | null;
  allAreas: AdminArea[];
  api: GeoAdminApi;
  onClose: () => void;
  onSaved: () => void;
}

const ACCURACY_LABELS: Record<string, string> = {
  exact: 'Exact (verified listing coords)',
  area_approximate: 'Area-level approximate',
  unverified: 'Unverified',
};
const VERIFICATION_LABELS: Record<string, string> = {
  verified: 'Verified',
  pending: 'Pending',
  needs_review: 'Needs review',
};

export default function AreaEditDrawer({ area, allAreas, api, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [aliases, setAliases] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [accuracy, setAccuracy] = useState('area_approximate');
  const [verification, setVerification] = useState('needs_review');
  const [radiusKm, setRadiusKm] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [landmarks, setLandmarks] = useState<AdminLandmark[]>([]);
  const [neighbours, setNeighbours] = useState<AdminNeighbourLink[]>([]);
  const [lmName, setLmName] = useState('');
  const [lmLat, setLmLat] = useState('');
  const [lmLng, setLmLng] = useState('');
  const [lmPrimary, setLmPrimary] = useState(false);
  const [newNeighbourId, setNewNeighbourId] = useState('');

  useEffect(() => {
    if (!area) return;
    setName(area.name);
    setSlug(area.slug);
    setCity(area.city);
    setCountry(area.country);
    setAliases((area.aliases || []).join(', '));
    setLat(area.latitude != null ? String(area.latitude) : '');
    setLng(area.longitude != null ? String(area.longitude) : '');
    setAccuracy(area.location_accuracy);
    setVerification(area.verification_status);
    setRadiusKm(area.nearby_radius_km != null ? String(area.nearby_radius_km) : '');
    setActive(area.is_active);

    api.fetchLandmarks(area.id).then(setLandmarks).catch(() => setLandmarks([]));
    api.fetchNeighbours(area.id).then(setNeighbours).catch(() => setNeighbours([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area?.id]);

  if (!area) return null;

  const reloadLandmarks = async () => setLandmarks(await api.fetchLandmarks(area.id));
  const reloadNeighbours = async () => setNeighbours(await api.fetchNeighbours(area.id));

  const handleSave = async () => {
    if (!name.trim()) {
      addToast('Area name is required', 'error');
      return;
    }
    const slugValue = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!slugValue) {
      addToast('A valid slug is required (letters, numbers and hyphens)', 'error');
      return;
    }
    const latNum = lat.trim() === '' ? null : Number(lat);
    const lngNum = lng.trim() === '' ? null : Number(lng);
    if (latNum != null && (Number.isNaN(latNum) || latNum < -90 || latNum > 90)) {
      addToast('Latitude must be between -90 and 90', 'error');
      return;
    }
    if (lngNum != null && (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180)) {
      addToast('Longitude must be between -180 and 180', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.updateArea(area.id, {
        name: name.trim(),
        slug: slugValue,
        city: city.trim(),
        country: country.trim(),
        aliases: aliases.split(',').map((a) => a.trim()).filter(Boolean),
        latitude: latNum,
        longitude: lngNum,
        location_accuracy: accuracy,
        verification_status: verification,
        nearby_radius_km: radiusKm.trim() === '' ? null : Number(radiusKm),
        is_active: active,
      });
      addToast('Area updated - search now uses the new coordinates', 'success');
      onSaved();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save area', 'error');
    }
    setSaving(false);
  };

  const handleAddLandmark = async () => {
    const nLat = Number(lmLat);
    const nLng = Number(lmLng);
    if (!lmName.trim() || Number.isNaN(nLat) || Number.isNaN(nLng)) {
      addToast('Enter a landmark name and valid coordinates', 'error');
      return;
    }
    try {
      await api.addLandmark(area.id, { name: lmName.trim(), latitude: nLat, longitude: nLng, is_primary: lmPrimary, source: 'admin' });
      setLmName(''); setLmLat(''); setLmLng(''); setLmPrimary(false);
      await reloadLandmarks();
      addToast('Landmark added', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add landmark', 'error');
    }
  };

  const handleSetPrimary = async (lm: AdminLandmark) => {
    try {
      await api.updateLandmark(area.id, lm.id, { is_primary: true });
      await reloadLandmarks();
      addToast('Primary landmark set - this becomes the area anchor', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update landmark', 'error');
    }
  };

  const handleDeleteLandmark = async (id: string) => {
    try {
      await api.deleteLandmark(id);
      await reloadLandmarks();
      addToast('Landmark removed', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove landmark', 'error');
    }
  };

  const handleAddNeighbour = async () => {
    if (!newNeighbourId) return;
    try {
      await api.addNeighbour(area.id, newNeighbourId);
      setNewNeighbourId('');
      await reloadNeighbours();
      addToast('Neighbour relationship added', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add neighbour', 'error');
    }
  };

  const handleDeleteNeighbour = async (id: string) => {
    try {
      await api.deleteNeighbour(id);
      await reloadNeighbours();
      addToast('Neighbour relationship removed', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove neighbour', 'error');
    }
  };

  const neighbourOptions = allAreas.filter(
    (a) => a.id !== area.id && !neighbours.some((n) => n.neighbour_neighbourhood_id === a.id),
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl h-full bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#f0f0f0] px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-jost font-semibold text-[#001731]">{area.name}</h2>
            <p className="text-xs font-roboto text-[#636363]">{area.city}, {area.country} &middot; {area.listings} listings</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-[#636363] cursor-pointer">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Basic details */}
          <section className="space-y-3">
            <h3 className="text-sm font-roboto font-bold text-[#001731] uppercase tracking-wide">Basic details</h3>
            <label className="block">
              <span className="block text-xs font-roboto text-[#636363] mb-1">Area name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nairobi City Centre (CBD)" className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-roboto text-[#636363] mb-1">Slug</span>
                <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="nairobi-city-centre-cbd" className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]" />
              </label>
              <label className="block">
                <span className="block text-xs font-roboto text-[#636363] mb-1">City</span>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Nairobi" className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]" />
              </label>
            </div>
            <label className="block">
              <span className="block text-xs font-roboto text-[#636363] mb-1">Country</span>
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Kenya" className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]" />
            </label>
          </section>

          {/* Coordinates */}
          <section className="space-y-3">
            <h3 className="text-sm font-roboto font-bold text-[#001731] uppercase tracking-wide">Area centre &amp; status</h3>
            <AreaMapPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-roboto text-[#636363] mb-1">Latitude</span>
                <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-1.3192" className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]" />
              </label>
              <label className="block">
                <span className="block text-xs font-roboto text-[#636363] mb-1">Longitude</span>
                <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="36.7073" className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]" />
              </label>
            </div>
            <label className="block">
              <span className="block text-xs font-roboto text-[#636363] mb-1">Location accuracy</span>
              <select value={accuracy} onChange={(e) => setAccuracy(e.target.value)} className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto bg-white focus:outline-none focus:border-[#0d5959]">
                {Object.entries(ACCURACY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-roboto text-[#636363] mb-1">Verification</span>
                <select value={verification} onChange={(e) => setVerification(e.target.value)} className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto bg-white focus:outline-none focus:border-[#0d5959]">
                  {Object.entries(VERIFICATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-roboto text-[#636363] mb-1">Nearby radius (km)</span>
                <input value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} placeholder="e.g. 3" className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]" />
              </label>
            </div>
            <label className="block">
              <span className="block text-xs font-roboto text-[#636363] mb-1">Aliases (comma separated)</span>
              <input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="e.g. Karen Nairobi, Karen Estate" className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]" />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 text-[#0d5959] rounded border-[#e8edf2]" />
              <span className="text-sm font-roboto text-[#001731]">Active (available in search)</span>
            </label>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2.5 rounded-lg text-sm font-roboto cursor-pointer disabled:opacity-50">
              <i className={saving ? 'ri-loader-4-line animate-spin' : 'ri-save-line'} />
              {saving ? 'Saving...' : 'Save area'}
            </button>
          </section>

          {/* Landmarks */}
          <section className="space-y-3 border-t border-[#f0f0f0] pt-5">
            <h3 className="text-sm font-roboto font-bold text-[#001731] uppercase tracking-wide">Landmarks</h3>
            <p className="text-xs font-roboto text-[#636363]">The primary landmark becomes the area&apos;s search anchor. Add recognisable references (malls, junctions, schools).</p>
            <div className="space-y-2">
              {landmarks.length === 0 && <p className="text-xs font-roboto text-[#9a9a9a]">No landmarks yet.</p>}
              {landmarks.map((lm) => (
                <div key={lm.id} className="flex items-center gap-2 px-3 py-2 border border-[#f0f0f0] rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-roboto text-[#001731] truncate flex items-center gap-1.5">
                      {lm.name}
                      {lm.is_primary && <span className="text-[10px] font-semibold text-white bg-[#0d5959] px-1.5 py-0.5 rounded">PRIMARY</span>}
                    </p>
                    <p className="text-[11px] font-roboto text-[#9a9a9a]">{lm.latitude.toFixed(5)}, {lm.longitude.toFixed(5)}</p>
                  </div>
                  {!lm.is_primary && (
                    <button onClick={() => handleSetPrimary(lm)} className="text-xs font-roboto font-medium text-[#0d5959] hover:underline cursor-pointer whitespace-nowrap">Set primary</button>
                  )}
                  <button onClick={() => handleDeleteLandmark(lm.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#636363] hover:text-red-600 hover:bg-red-50 cursor-pointer">
                    <i className="ri-delete-bin-line text-sm" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={lmName} onChange={(e) => setLmName(e.target.value)} placeholder="Landmark name" className="col-span-2 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]" />
              <input value={lmLat} onChange={(e) => setLmLat(e.target.value)} placeholder="Latitude" className="px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]" />
              <input value={lmLng} onChange={(e) => setLmLng(e.target.value)} placeholder="Longitude" className="px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={lmPrimary} onChange={(e) => setLmPrimary(e.target.checked)} className="w-4 h-4 text-[#0d5959] rounded border-[#e8edf2]" />
                <span className="text-xs font-roboto text-[#001731]">Set as primary</span>
              </label>
              <button onClick={handleAddLandmark} className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0d5959] text-white rounded-lg text-xs font-roboto cursor-pointer">
                <i className="ri-add-line" /> Add landmark
              </button>
            </div>
          </section>

          {/* Neighbours */}
          <section className="space-y-3 border-t border-[#f0f0f0] pt-5">
            <h3 className="text-sm font-roboto font-bold text-[#001731] uppercase tracking-wide">Neighbouring areas</h3>
            <p className="text-xs font-roboto text-[#636363]">Geographic neighbours (distance still decides inclusion - adjacency alone never adds a property outside the radius).</p>
            <div className="flex flex-wrap gap-2">
              {neighbours.length === 0 && <p className="text-xs font-roboto text-[#9a9a9a]">No neighbours linked yet.</p>}
              {neighbours.map((n) => (
                <span key={n.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0d5959]/8 text-[#0d5959] text-xs font-roboto rounded-full">
                  {n.neighbourName}
                  <button onClick={() => handleDeleteNeighbour(n.id)} className="hover:text-red-600 cursor-pointer">
                    <i className="ri-close-line" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select value={newNeighbourId} onChange={(e) => setNewNeighbourId(e.target.value)} className="flex-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto bg-white focus:outline-none focus:border-[#0d5959]">
                <option value="">Select an area to link...</option>
                {neighbourOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button onClick={handleAddNeighbour} disabled={!newNeighbourId} className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0d5959] text-white rounded-lg text-xs font-roboto cursor-pointer disabled:opacity-50">
                <i className="ri-link" /> Link
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}