import { DevelopmentFormState, AMENITY_OPTIONS } from './types';
import { SectionHeader, CheckChip } from './ui';

interface Props {
  form: DevelopmentFormState;
  update: (patch: Partial<DevelopmentFormState>) => void;
}

export default function DevelopmentAmenitiesStep({ form, update }: Props) {
  const toggle = (a: string) => {
    update({
      amenities: form.amenities.includes(a)
        ? form.amenities.filter((x) => x !== a)
        : [...form.amenities, a],
    });
  };

  return (
    <div className="w-full space-y-5">
      <SectionHeader icon="ri-sparkling-2-line" title="Amenities" subtitle="Facilities available to ALL units in this development" />

      <div className="border-l-2 border-[#0d5959] pl-5 py-1 mb-4">
        <p className="text-xs font-bold text-[#1a1e24] mb-2 uppercase tracking-widest">Global amenities</p>
        <p className="text-xs text-[#7a8a99] font-light leading-relaxed">
          These apply across every unit type. Select all shared facilities such as the pool, gym, lifts and security.
        </p>
      </div>

      <div className="border border-[#e8ecf0] bg-white rounded-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          {AMENITY_OPTIONS.map((a) => (
            <CheckChip key={a} label={a} checked={form.amenities.includes(a)} onChange={() => toggle(a)} />
          ))}
        </div>
      </div>

      {form.amenities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {form.amenities.map((a) => (
            <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-[#0d5959]/10 text-[#0d5959] rounded-md">
              {a}
              <button type="button" onClick={() => toggle(a)} className="text-[#0d5959]/60 hover:text-red-500 cursor-pointer">
                <i className="ri-close-line text-sm" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}