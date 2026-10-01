import RichTextEditor from '@/components/feature/RichTextEditor';
import { PROPERTY_TYPES, PURPOSE_OPTIONS, COMMERCIAL_PROPERTY_TYPES, RESIDENTIAL_PROPERTY_TYPES, LAND_PROPERTY_TYPES, PROPERTY_TYPE_TO_DB } from './types';

interface Props {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  propertyType: string;
  setPropertyType: (v: string) => void;
  propertyCategory: string;
  setPropertyCategory: (v: string) => void;
  purpose: string;
  setPurpose: (v: string) => void;
  isEdit: boolean;
  isTitleRequired?: boolean;
  isDescriptionRequired?: boolean;
}

/* ── Shared design tokens ── */
const inputBase =
  'w-full text-base font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] placeholder:font-normal rounded-md';

const selectClass = `${inputBase} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237a8a99%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11`;

const labelClass = 'block text-[16px] font-bold tracking-wide text-[#0d1f2d] uppercase mb-2.5 leading-none';

const hintClass = 'text-[15px] text-[#4a5568] mt-2 leading-relaxed';

/* ── Section Header ── */
const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) => (
  <div className="mb-7">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
        <i className={`${icon} text-white text-base`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-semibold text-[#0d1f2d] tracking-wide">
          {title}
        </h4>
        <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
    <div className="h-px bg-[#e5e7eb] mt-4" />
  </div>
);

/* ── Card wrapper ── */
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
    <div className="px-6 py-6">{children}</div>
  </div>
);

const descPlaceholder = 'Welcome to this stunning property nestled in the heart of...';

export default function DescriptionStep({
  title, setTitle, description, setDescription,
  propertyType, setPropertyType, propertyCategory, setPropertyCategory,
  purpose, setPurpose,
  isTitleRequired,
}: Props) {
  /* ── Derive the selectable property types based on category ── */
  const filteredPropertyTypes = propertyCategory === 'commercial'
    ? COMMERCIAL_PROPERTY_TYPES
    : propertyCategory === 'residential'
    ? RESIDENTIAL_PROPERTY_TYPES
    : propertyCategory === 'land' || propertyCategory === 'joint_venture'
    ? LAND_PROPERTY_TYPES
    : PROPERTY_TYPES;

  /* Land listings have no "Short Stay" purpose and can never be a new development */
  const isLandCategory = propertyCategory === 'land' || propertyCategory === 'joint_venture';

  const purposeOptions = isLandCategory
    ? PURPOSE_OPTIONS.filter((o) => o.value !== 'short_stay')
    : PURPOSE_OPTIONS;

  const handleCategoryChange = (cat: string) => {
    setPropertyCategory(cat);
    setPropertyType('');
  };

  return (
    <div className="w-full space-y-5">
      {/* ─── FULL-WIDTH PROPERTY CATEGORY ─── */}
      <SectionHeader
        icon="ri-building-4-line"
        title="Property Category"
        subtitle="Classify what this property IS — this determines which page it appears on"
      />
      <Card>
        <div>
          <label className={labelClass}>
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={propertyCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className={selectClass}
          >
            <option value="">Select property category</option>
            <option value="residential">Residential — Houses, apartments, bungalows, villas, townhouses, flats</option>
            <option value="commercial">Commercial — Offices, retail, industrial, hospitality, warehouses</option>
            <option value="land">Land — Plots, acreage, farms &amp; development land</option>
          </select>
          <p className={hintClass}>
            {propertyCategory === 'commercial'
              ? 'Showing commercial property sub-types below'
              : propertyCategory === 'residential'
              ? 'Showing residential property sub-types below'
              : propertyCategory === 'land'
              ? 'Showing land sub-types below'
              : 'Select a category to unlock relevant property types in the next section'}
          </p>
        </div>
      </Card>

      {/* ─── Property Title ─── */}
      <SectionHeader
        icon="ri-file-text-line"
        title="Property Title"
        subtitle="A compelling headline attracts more buyers"
      />
      <Card>
        <div>
          <label className={labelClass}>
            Title {isTitleRequired !== false && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputBase}
            placeholder="Untitled Draft"
          />
          <p className={hintClass}>Make it descriptive and memorable</p>
        </div>
      </Card>

      {/* ─── Listing Type ─── */}
      <SectionHeader
        icon="ri-folder-line"
        title="Listing Type"
        subtitle="Define the property type and purpose for this listing"
      />
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>
              Property Type <span className="text-red-500">*</span>
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className={selectClass}
              disabled={!propertyCategory}
            >
              <option value="">{propertyCategory ? 'Select type' : 'Select category first'}</option>
              {filteredPropertyTypes.map((t) => (
                <option key={t} value={PROPERTY_TYPE_TO_DB[t] || t.toLowerCase().replace(/[\s/]+/g, '_')}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Purpose <span className="text-red-500">*</span>
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className={selectClass}
            >
              {purposeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className={hintClass}>
              {isLandCategory
                ? 'Choose For Sale or Joint Venture for this land listing'
                : purpose === 'rent' ? 'Listing is for rent' : 'Listing is for sale'}
            </p>
          </div>
        </div>
      </Card>

      {/* ─── Description ─── */}
      <SectionHeader
        icon="ri-article-line"
        title="Description"
        subtitle="Tell the story of this property — headings, colours and lists all show on the public listing"
      />
      <Card>
        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder={descPlaceholder}
          minHeight={260}
        />
      </Card>
    </div>
  );
}