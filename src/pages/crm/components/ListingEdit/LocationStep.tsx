import { useEffect, useState } from 'react';
import { fetchNeighborhoods } from './types';

interface Props {
  address: string;
  setAddress: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  neighbourhood: string;
  setNeighbourhood: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
}

/* ── Design tokens ── */
const inputBase =
  'w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] placeholder:font-normal rounded-md';

const selectClass = `${inputBase} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237a8a99%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11`;

const labelClass = 'block text-[14px] font-bold tracking-wide text-[#0d1f2d] uppercase mb-2.5 leading-none';

const hintClass = 'text-[15px] text-[#4a5568] mt-2 leading-relaxed';

const SectionHeader = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="mb-7">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
        <i className={`${icon} text-white text-base`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-semibold text-[#0d1f2d] tracking-wide">{title}</h4>
        <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
    <div className="h-px bg-[#e5e7eb] mt-4" />
  </div>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
    <div className="px-6 py-6">{children}</div>
  </div>
);

export default function LocationStep({
  address, setAddress, location, setLocation, neighbourhood, setNeighbourhood,
  city, setCity, country, setCountry,
}: Props) {
  const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string }[]>([]);
  const [loadingHoods, setLoadingHoods] = useState(false);

  useEffect(() => {
    setLoadingHoods(true);
    fetchNeighborhoods().then((data) => {
      setNeighborhoods(data);
      setLoadingHoods(false);
    });
  }, []);

  useEffect(() => {
    if (!city) setCity('Nairobi');
  }, [city, setCity]);

  useEffect(() => {
    if (!country) setCountry('Kenya');
  }, [country, setCountry]);

  return (
    <div className="w-full space-y-5">
      <SectionHeader
        icon="ri-map-pin-2-line"
        title="Location Details"
        subtitle="Where is this property situated?"
      />

      <Card>
        <div className="space-y-6">
          {/* Street Address */}
          <div>
            <label className={labelClass}>
              Full Street Address <span className="text-red-500 normal-case">*</span>
            </label>
            <input
              placeholder="e.g. Plot 24, Acacia Avenue"
              className={inputBase}
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <p className={hintClass}>Street address, plot number, or building name</p>
          </div>

          {/* Neighbourhood */}
          <div>
            <label className={labelClass}>
              Area / Neighbourhood <span className="text-red-500 normal-case">*</span>
            </label>
            <select
              value={neighbourhood}
              onChange={(e) => setNeighbourhood(e.target.value)}
              disabled={loadingHoods}
              className={`${selectClass} ${loadingHoods ? 'opacity-60' : ''}`}
            >
              <option value="">Select neighbourhood</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.name}>{n.name}</option>
              ))}
            </select>
            <p className={hintClass}>Select the neighbourhood where the property is located</p>
          </div>

          {/* City + Country (locked) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>City</label>
              <div className="w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#9ba5b1] bg-[#f8f9fa] rounded-md cursor-not-allowed select-none flex items-center gap-2">
                <i className="ri-lock-line text-xs text-[#c8cdd5]" />
                {city || 'Nairobi'}
              </div>
              <p className={hintClass}>Automatically set</p>
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <div className="w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#9ba5b1] bg-[#f8f9fa] rounded-md cursor-not-allowed select-none flex items-center gap-2">
                <i className="ri-lock-line text-xs text-[#c8cdd5]" />
                {country || 'Kenya'}
              </div>
              <p className={hintClass}>Automatically set</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}