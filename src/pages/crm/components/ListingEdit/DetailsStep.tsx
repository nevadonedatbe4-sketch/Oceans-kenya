import { useState } from 'react';
import type { CustomField } from './types';

/* ── Luxury shared styling ── */
const inputBase =
  'w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] placeholder:font-normal rounded-md';

const selectClass = `${inputBase} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237a8a99%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11`;

const labelClass = 'block text-[14px] font-bold tracking-wide text-[#0d1f2d] uppercase mb-2.5 leading-none';

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

/* ── Collapsible Card ── */
const CollapsibleCard = ({
  icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl mb-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#fafbfc] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-[#f4f6f8] rounded-lg">
            <i className={`${icon} text-[#0d5959] text-sm`} />
          </div>
          <span className="text-[15px] font-semibold text-[#0d1f2d] tracking-normal">{title}</span>
        </div>
        <i
          className={`ri-arrow-down-s-line text-[#7a8a99] text-xl transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 border-t border-[#f0f3f5]">
          {children}
        </div>
      )}
    </div>
  );
};

/* ── Counter Box ── */
const CounterBox = ({
  label,
  value,
  onDec,
  onInc,
  min = 0,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  min?: number;
}) => (
  <div>
    <label className={labelClass}>{label}</label>
    <div className="flex items-center border-2 border-[#e8edf2] rounded-md bg-white overflow-hidden">
      <button
        type="button"
        disabled={value <= min}
        onClick={onDec}
        className="w-11 h-11 flex items-center justify-center text-[#7a8a99] hover:bg-[#f6f7f9] hover:text-[#0d1f2d] transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed text-lg font-light"
      >
        −
      </button>
      <div className="flex-1 flex items-center justify-center border-x-2 border-[#e8edf2] h-11">
        <span className="text-[17px] font-semibold text-[#0d1f2d]">{value}</span>
      </div>
      <button
        type="button"
        onClick={onInc}
        className="w-12 h-12 flex items-center justify-center text-[#7a8a99] hover:bg-[#f6f7f9] hover:text-[#0d1f2d] transition-colors cursor-pointer text-lg font-light"
      >
        +
      </button>
    </div>
  </div>
);

/* ── Checkbox Chip ── */
const CheckChip = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label className="flex items-center gap-2.5 cursor-pointer select-none group py-0.5">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-[#c8cdd5] text-[#0d5959] focus:ring-[#0d5959]/20 cursor-pointer accent-[#0d5959] shrink-0"
    />
    <span className="text-[14px] text-[#2d3748] group-hover:text-[#0d1f2d] transition-colors leading-snug">{label}</span>
  </label>
);

/* ── Radio Option ── */
const RadioOption = ({
  label,
  value,
  selected,
  onChange,
}: {
  label: string;
  value: string;
  selected: boolean;
  onChange: (v: string) => void;
}) => (
  <label className="flex items-center gap-2.5 cursor-pointer select-none">
    <input
      type="radio"
      name="furnished"
      value={value}
      checked={selected}
      onChange={() => onChange(value)}
      className="w-4 h-4 border-[#c8cdd5] text-[#0d5959] focus:ring-[#0d5959]/20 cursor-pointer accent-[#0d5959]"
    />
    <span className="text-[14px] text-[#2d3748]">{label}</span>
  </label>
);

/* ── Constants ── */
const SIZE_UNITS_BUILDING = ['sqm', 'sq ft'];

const LAND_UNITS = ['Acres', 'Hectares', 'sqm', 'sq ft'];

const UTILITIES = [
  { key: 'electricity', label: 'Electricity' },
  { key: 'water', label: 'Water' },
  { key: 'internet', label: 'Internet' },
  { key: 'sewer', label: 'Sewer' },
  { key: 'gas', label: 'Gas' },
  { key: 'solar', label: 'Solar' },
  { key: 'cableTv', label: 'Cable TV' },
];

const PROPERTY_CONDITIONS = ['Brand New', 'Excellent', 'Good', 'Fair', 'Needs Renovation'];

const AVAILABILITY_OPTIONS = [
  'Available Now',
  'Available From',
  'Occupied',
  'Reserved',
  'Sold',
  'Rented',
];

const FURNISHED_OPTIONS = ['Furnished', 'Semi Furnished', 'Unfurnished'];

const FURNISHED_ITEMS = [
  'Kitchen Appliances',
  'Washing Machine',
  'Air Conditioning',
  'Wardrobes',
  'Curtains',
  'TV',
  'Internet',
  'Generator',
];

const LAND_TENURE_OPTIONS = [
  'Freehold',
  'Leasehold',
  'Sectional Title',
  'Community Land',
  'Government Lease',
  'Custom',
];

const PLOT_SHAPES = ['Rectangular', 'Square', 'Irregular', 'Corner Plot'];

const TOPOGRAPHY_OPTIONS = ['Flat', 'Gentle Slope', 'Steep', 'Rocky', 'Mixed'];

const ROAD_ACCESS_OPTIONS = ['Tarmac Road', 'Cabro Road', 'Gravel Road', 'Earth Road'];

const PARKING_TYPES = ['Private', 'Shared', 'Street'];

/* ── Props ── */
interface Props {
  size: string;
  setSize: (v: string) => void;
  landSize: string;
  setLandSize: (v: string) => void;
  acreage: string;
  setAcreage: (v: string) => void;
  landTitle: string;
  setLandTitle: (v: string) => void;
  sqft: string;
  setSqft: (v: string) => void;
  parking: number;
  setParking: (v: number) => void;
  bedrooms: number;
  setBedrooms: (v: number) => void;
  bathrooms: number;
  setBathrooms: (v: number) => void;
  sizeUnit: string;
  setSizeUnit: (v: string) => void;
  landUnit: string;
  setLandUnit: (v: string) => void;
  garages: number;
  setGarages: (v: number) => void;
  garageSize: string;
  setGarageSize: (v: string) => void;
  yearBuilt: string;
  setYearBuilt: (v: string) => void;
  rooms: number;
  setRooms: (v: number) => void;
  propertyId: string;
  setPropertyId: (v: string) => void;
  customFields: CustomField[];
  setCustomFields: (v: CustomField[]) => void;
  propertyType?: string;
  backupPower: boolean;
  setBackupPower: (v: boolean) => void;
  gatedCommunity: boolean;
  setGatedCommunity: (v: boolean) => void;
  staffQuarters: boolean;
  setStaffQuarters: (v: boolean) => void;
  swimmingPool: boolean;
  setSwimmingPool: (v: boolean) => void;
  gym: boolean;
  setGym: (v: boolean) => void;
  proximityAmenities: string;
  setProximityAmenities: (v: string) => void;
  backupPowerDesc: string;
  setBackupPowerDesc: (v: string) => void;
  staffQuartersRooms: number;
  setStaffQuartersRooms: (v: number) => void;
  uniqueFeatures: string;
  setUniqueFeatures: (v: string) => void;
  balconySize: string;
  setBalconySize: (v: string) => void;
  plotDimensions: string;
  setPlotDimensions: (v: string) => void;
  floors: number;
  setFloors: (v: number) => void;
  floorNumber: string;
  setFloorNumber: (v: string) => void;
  renovatedYear: string;
  setRenovatedYear: (v: string) => void;
  propertyCondition: string;
  setPropertyCondition: (v: string) => void;
  availableDate: string;
  setAvailableDate: (v: string) => void;
  furnishedStatus: string;
  setFurnishedStatus: (v: string) => void;
  includedItems: string[];
  setIncludedItems: (v: string[]) => void;
  featureCheckboxes: Record<string, boolean>;
  setFeatureCheckboxes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  utilityCheckboxes: Record<string, boolean>;
  setUtilityCheckboxes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  roadAccess: string;
  setRoadAccess: (v: string) => void;
  parkingType: string;
  setParkingType: (v: string) => void;
  wheelchairAccessible: boolean;
  setWheelchairAccessible: (v: boolean) => void;
  terraceSize: string;
  setTerraceSize: (v: string) => void;
  plotLength: string;
  setPlotLength: (v: string) => void;
  plotWidth: string;
  setPlotWidth: (v: string) => void;
  leasePeriod: string;
  setLeasePeriod: (v: string) => void;
  leaseExpiryDate: string;
  setLeaseExpiryDate: (v: string) => void;
  plotShape: string;
  setPlotShape: (v: string) => void;
  topography: string;
  setTopography: (v: string) => void;
  availabilityStatus: string;
  setAvailabilityStatus: (v: string) => void;
}

export default function DetailsStep(props: Props) {
  const {
    size, setSize, landSize, setLandSize,
    acreage, setAcreage, landTitle, setLandTitle,
    sqft, setSqft, parking, setParking, bedrooms, setBedrooms, bathrooms, setBathrooms,
    sizeUnit, setSizeUnit, landUnit, setLandUnit, garages, setGarages,
    garageSize, setGarageSize, yearBuilt, setYearBuilt, rooms, setRooms,
    propertyId, setPropertyId, customFields, setCustomFields, propertyType,
    backupPower, setBackupPower, gatedCommunity, setGatedCommunity,
    staffQuarters, setStaffQuarters, swimmingPool, setSwimmingPool, gym, setGym,
    proximityAmenities, setProximityAmenities, backupPowerDesc, setBackupPowerDesc,
    staffQuartersRooms, setStaffQuartersRooms, uniqueFeatures, setUniqueFeatures,
    balconySize, setBalconySize, plotDimensions, setPlotDimensions,
    floors, setFloors, floorNumber, setFloorNumber,
    renovatedYear, setRenovatedYear, propertyCondition, setPropertyCondition,
    availableDate, setAvailableDate,
    furnishedStatus, setFurnishedStatus, includedItems, setIncludedItems,
    featureCheckboxes, setFeatureCheckboxes,
    utilityCheckboxes, setUtilityCheckboxes,
    roadAccess, setRoadAccess, parkingType, setParkingType,
    wheelchairAccessible, setWheelchairAccessible,
    terraceSize, setTerraceSize, plotLength, setPlotLength,
    plotWidth, setPlotWidth, leasePeriod, setLeasePeriod,
    leaseExpiryDate, setLeaseExpiryDate, plotShape, setPlotShape,
    topography, setTopography,
    availabilityStatus, setAvailabilityStatus,
  } = props;

  const isLand = propertyType === 'land';

  const landTypes = ['house', 'villa', 'townhouse', 'bungalow', 'detached', 'semi-detached', 'terraced', 'commercial'];
  const showsLandInfo = !isLand && landTypes.includes((propertyType || '').toLowerCase());

  const toggleUtilityCheckbox = (key: string) => {
    setUtilityCheckboxes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleIncludedItem = (item: string) => {
    setIncludedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], [field]: val };
    setCustomFields(updated);
  };

  if (isLand) {
    const plotDisplay = plotLength && plotWidth ? `${plotLength} × ${plotWidth}` : '';
    const isLeasehold = landTitle === 'Leasehold';

    return (
      <div className="w-full space-y-5">
        <SectionHeader
          icon="ri-landscape-line"
          title="Land Details"
          subtitle="Key facts about the land listing"
        />

        <CollapsibleCard icon="ri-ruler-line" title="Size &amp; Measurements" defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
            <div>
              <label className={labelClass}>Land Size</label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="text"
                  value={landSize}
                  onChange={(e) => setLandSize(e.target.value)}
                  className={inputBase}
                  placeholder="e.g. 0.5"
                />
                <select
                  value={landUnit}
                  onChange={(e) => setLandUnit(e.target.value)}
                  className={`${inputBase} cursor-pointer w-32 shrink-0`}
                >
                  {LAND_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Acreage</label>
              <input
                type="text"
                value={acreage}
                onChange={(e) => setAcreage(e.target.value)}
                className={inputBase}
                placeholder="e.g. 2.5"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Plot Dimensions</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={plotLength}
                  onChange={(e) => setPlotLength(e.target.value)}
                  className={inputBase}
                  placeholder="Length e.g. 50"
                />
                <input
                  type="text"
                  value={plotWidth}
                  onChange={(e) => setPlotWidth(e.target.value)}
                  className={inputBase}
                  placeholder="Width e.g. 100"
                />
              </div>
              {plotDisplay && (
                <span className="inline-block mt-3 px-4 py-2 bg-[#0d5959]/5 border border-[#0d5959]/15 text-[13px] font-semibold text-[#0d5959] rounded-md tracking-wide">
                  {plotDisplay} {landUnit || 'ft'}
                </span>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Land Tenure</label>
              <select
                value={landTitle}
                onChange={(e) => setLandTitle(e.target.value)}
                className={selectClass}
              >
                <option value="">Select tenure type</option>
                {LAND_TENURE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {isLeasehold && (
              <>
                <div>
                  <label className={labelClass}>Lease Period</label>
                  <input
                    type="text"
                    value={leasePeriod}
                    onChange={(e) => setLeasePeriod(e.target.value)}
                    className={inputBase}
                    placeholder="e.g. 99 Years"
                  />
                </div>
                <div>
                  <label className={labelClass}>Lease Expiry Date</label>
                  <input
                    type="date"
                    value={leaseExpiryDate}
                    onChange={(e) => setLeaseExpiryDate(e.target.value)}
                    className={inputBase}
                  />
                </div>
              </>
            )}
            <div>
              <label className={labelClass}>Plot Shape</label>
              <select
                value={plotShape}
                onChange={(e) => setPlotShape(e.target.value)}
                className={selectClass}
              >
                <option value="">Select shape</option>
                {PLOT_SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Topography</label>
              <select
                value={topography}
                onChange={(e) => setTopography(e.target.value)}
                className={selectClass}
              >
                <option value="">Select topography</option>
                {TOPOGRAPHY_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Road Access</label>
              <select
                value={roadAccess}
                onChange={(e) => setRoadAccess(e.target.value)}
                className={selectClass}
              >
                <option value="">Select road type</option>
                {ROAD_ACCESS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard icon="ri-plug-line" title="Utilities" defaultOpen={true}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3">
            {UTILITIES.map((u) => (
              <CheckChip
                key={u.key}
                label={u.label}
                checked={!!utilityCheckboxes[u.key]}
                onChange={() => toggleUtilityCheckbox(u.key)}
              />
            ))}
          </div>
        </CollapsibleCard>

        <CollapsibleCard icon="ri-road-map-line" title="Accessibility" defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
            <div>
              <label className={labelClass}>Parking Type</label>
              <select
                value={parkingType}
                onChange={(e) => setParkingType(e.target.value)}
                className={selectClass}
              >
                <option value="">Select parking type</option>
                {PARKING_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Wheelchair Accessible</label>
              <div className="flex gap-6 pt-3">
                <RadioOption label="Yes" value="yes" selected={wheelchairAccessible} onChange={() => setWheelchairAccessible(true)} />
                <RadioOption label="No" value="no" selected={!wheelchairAccessible} onChange={() => setWheelchairAccessible(false)} />
              </div>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard icon="ri-key-2-line" title="Reference" defaultOpen={false}>
          <div className="pt-3">
            <label className={labelClass}>Property ID</label>
            <input
              type="text"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className={inputBase}
              placeholder="Auto-generated or manual"
            />
            <p className={hintClass}>Leave empty for auto-generated reference number</p>
          </div>
        </CollapsibleCard>

        <CollapsibleCard icon="ri-list-settings-line" title="Custom Fields" defaultOpen={false}>
          <div className="pt-3">
            {customFields.length > 0 ? (
              <div className="space-y-3 mb-5">
                {customFields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => updateCustomField(idx, 'key', e.target.value)}
                      className={inputBase}
                      placeholder="Field name"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                      className={inputBase}
                      placeholder="Field value"
                    />
                    <button
                      onClick={() => removeCustomField(idx)}
                      className="w-10 h-10 flex items-center justify-center border border-[#d1d5db] text-[#7a8a99] hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0 rounded-md"
                    >
                      <i className="ri-delete-bin-line text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-[#9ba5b1] mb-5">No custom fields added yet.</p>
            )}
            <button
              onClick={addCustomField}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-3 border border-[#d1d5db] text-[13px] font-semibold text-[#7a8a99] hover:border-[#0d1f2d] hover:text-[#0d1f2d] transition-colors cursor-pointer whitespace-nowrap rounded-md tracking-wide uppercase"
            >
              <i className="ri-add-line text-base" /> Add Custom Field
            </button>
          </div>
        </CollapsibleCard>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <SectionHeader
        icon="ri-home-4-line"
        title="Property Details"
        subtitle="Key facts and specifications for this listing"
      />

      {/* 1. Property Configuration */}
      <CollapsibleCard icon="ri-building-4-line" title="Property Configuration" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <CounterBox
            label="Bedrooms"
            value={bedrooms}
            onDec={() => setBedrooms(Math.max(0, bedrooms - 1))}
            onInc={() => setBedrooms(bedrooms + 1)}
          />
          <CounterBox
            label="Bathrooms"
            value={bathrooms}
            onDec={() => setBathrooms(Math.max(0, bathrooms - 1))}
            onInc={() => setBathrooms(bathrooms + 1)}
          />
          <CounterBox
            label="Total Rooms"
            value={rooms}
            onDec={() => setRooms(Math.max(0, rooms - 1))}
            onInc={() => setRooms(rooms + 1)}
          />
          <CounterBox
            label="Parking"
            value={parking}
            onDec={() => setParking(Math.max(0, parking - 1))}
            onInc={() => setParking(parking + 1)}
          />
        </div>
        <div className="mt-6 pt-6 border-t border-[#f0f3f5]">
          <label className={labelClass}>Special Features</label>
          <input
            type="text"
            value={uniqueFeatures}
            onChange={(e) => setUniqueFeatures(e.target.value)}
            className={inputBase}
            placeholder="e.g. Garage, carport, additional parking bay"
          />
          <p className={hintClass}>Mention garage, carport, or any configuration-specific details here</p>
        </div>
      </CollapsibleCard>

      {/* 2. Building Size */}
      <CollapsibleCard icon="ri-building-2-line" title="Building Size" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>Built-up Area</label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={inputBase}
                placeholder="e.g. 250"
              />
              <select
                value={sizeUnit}
                onChange={(e) => setSizeUnit(e.target.value)}
                className={`${inputBase} cursor-pointer w-28 shrink-0`}
              >
                {SIZE_UNITS_BUILDING.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Balcony Size</label>
            <input
              type="text"
              value={balconySize}
              onChange={(e) => setBalconySize(e.target.value)}
              className={inputBase}
              placeholder="e.g. 12 sqm"
            />
          </div>
          <div>
            <label className={labelClass}>Terrace Size</label>
            <input
              type="text"
              value={terraceSize}
              onChange={(e) => setTerraceSize(e.target.value)}
              className={inputBase}
              placeholder="e.g. 25 sqm"
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* 3. Land Information */}
      {showsLandInfo && (
        <CollapsibleCard icon="ri-landscape-line" title="Land Information" defaultOpen={true}>
          {(() => {
            const plotDisplay = plotLength && plotWidth ? `${plotLength} × ${plotWidth}` : '';
            const isLeasehold = landTitle === 'Leasehold';
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Land Size</label>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      type="text"
                      value={landSize}
                      onChange={(e) => setLandSize(e.target.value)}
                      className={inputBase}
                      placeholder="e.g. 0.5"
                    />
                    <select
                      value={landUnit}
                      onChange={(e) => setLandUnit(e.target.value)}
                      className={`${inputBase} cursor-pointer w-32 shrink-0`}
                    >
                      {LAND_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Plot Dimensions</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={plotLength}
                      onChange={(e) => setPlotLength(e.target.value)}
                      className={inputBase}
                      placeholder="Length e.g. 50"
                    />
                    <input
                      type="text"
                      value={plotWidth}
                      onChange={(e) => setPlotWidth(e.target.value)}
                      className={inputBase}
                      placeholder="Width e.g. 100"
                    />
                  </div>
                  {plotDisplay && (
                    <span className="inline-block mt-3 px-4 py-2 bg-[#0d5959]/5 border border-[#0d5959]/15 text-[13px] font-semibold text-[#0d5959] rounded-md tracking-wide">
                      {plotDisplay} {landUnit || 'ft'}
                    </span>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Land Tenure</label>
                  <select
                    value={landTitle}
                    onChange={(e) => setLandTitle(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select tenure type</option>
                    {LAND_TENURE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {isLeasehold && (
                  <>
                    <div>
                      <label className={labelClass}>Lease Period</label>
                      <input
                        type="text"
                        value={leasePeriod}
                        onChange={(e) => setLeasePeriod(e.target.value)}
                        className={inputBase}
                        placeholder="e.g. 99 Years"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Lease Expiry Date</label>
                      <input
                        type="date"
                        value={leaseExpiryDate}
                        onChange={(e) => setLeaseExpiryDate(e.target.value)}
                        className={inputBase}
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className={labelClass}>Plot Shape</label>
                  <select
                    value={plotShape}
                    onChange={(e) => setPlotShape(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select shape</option>
                    {PLOT_SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Topography</label>
                  <select
                    value={topography}
                    onChange={(e) => setTopography(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select topography</option>
                    {TOPOGRAPHY_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Road Access</label>
                  <select
                    value={roadAccess}
                    onChange={(e) => setRoadAccess(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select road type</option>
                    {ROAD_ACCESS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            );
          })()}
        </CollapsibleCard>
      )}

      {/* 4. Construction Details */}
      <CollapsibleCard icon="ri-tools-line" title="Construction Details" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <div>
            <label className={labelClass}>Year Built</label>
            <input
              type="text"
              value={yearBuilt}
              onChange={(e) => setYearBuilt(e.target.value)}
              className={inputBase}
              placeholder="e.g. 2020"
            />
          </div>
          <div>
            <label className={labelClass}>Renovated Year</label>
            <input
              type="text"
              value={renovatedYear}
              onChange={(e) => setRenovatedYear(e.target.value)}
              className={inputBase}
              placeholder="e.g. 2023"
            />
          </div>
          <CounterBox
            label="Floors"
            value={floors}
            onDec={() => setFloors(Math.max(0, floors - 1))}
            onInc={() => setFloors(floors + 1)}
          />
          <div>
            <label className={labelClass}>Floor Number</label>
            <input
              type="text"
              value={floorNumber}
              onChange={(e) => setFloorNumber(e.target.value)}
              className={inputBase}
              placeholder="e.g. 3rd Floor"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Property Condition</label>
            <select
              value={propertyCondition}
              onChange={(e) => setPropertyCondition(e.target.value)}
              className={selectClass}
            >
              <option value="">Select condition</option>
              {PROPERTY_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </CollapsibleCard>

      {/* 5. Availability */}
      <CollapsibleCard icon="ri-calendar-check-line" title="Availability" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={availabilityStatus}
              onChange={(e) => setAvailabilityStatus(e.target.value)}
              className={selectClass}
            >
              <option value="">Select status</option>
              {AVAILABILITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Available From Date</label>
            <input
              type="date"
              value={availableDate}
              onChange={(e) => setAvailableDate(e.target.value)}
              className={inputBase}
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* 6. Furnishing */}
      <CollapsibleCard icon="ri-sofa-line" title="Furnishing" defaultOpen={true}>
        <div className="space-y-5 pt-3">
          <div className="flex flex-wrap gap-6">
            {FURNISHED_OPTIONS.map((opt) => (
              <RadioOption
                key={opt}
                label={opt}
                value={opt}
                selected={furnishedStatus === opt}
                onChange={setFurnishedStatus}
              />
            ))}
          </div>
          <div className="border-t border-[#f0f3f5] pt-5">
            <label className={labelClass}>Included Items</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-1">
              {FURNISHED_ITEMS.map((item) => (
                <CheckChip
                  key={item}
                  label={item}
                  checked={includedItems.includes(item)}
                  onChange={() => toggleIncludedItem(item)}
                />
              ))}
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* 7. Accessibility */}
      <CollapsibleCard icon="ri-road-map-line" title="Accessibility" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <div>
            <label className={labelClass}>Road Access</label>
            <select
              value={roadAccess}
              onChange={(e) => setRoadAccess(e.target.value)}
              className={selectClass}
            >
              <option value="">Select road type</option>
              {ROAD_ACCESS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Parking Type</label>
            <select
              value={parkingType}
              onChange={(e) => setParkingType(e.target.value)}
              className={selectClass}
            >
              <option value="">Select parking type</option>
              {PARKING_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Wheelchair Accessible</label>
            <div className="flex gap-6 pt-3">
              <RadioOption label="Yes" value="yes" selected={wheelchairAccessible} onChange={() => setWheelchairAccessible(true)} />
              <RadioOption label="No" value="no" selected={!wheelchairAccessible} onChange={() => setWheelchairAccessible(false)} />
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* 8. Reference */}
      <CollapsibleCard icon="ri-key-2-line" title="Reference" defaultOpen={false}>
        <div className="pt-3">
          <label className={labelClass}>Property ID</label>
          <input
            type="text"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className={inputBase}
            placeholder="Auto-generated or manual"
          />
          <p className={hintClass}>Leave empty for auto-generated reference number</p>
        </div>
      </CollapsibleCard>

      {/* 9. Custom Fields */}
      <CollapsibleCard icon="ri-list-settings-line" title="Custom Fields" defaultOpen={false}>
        <div className="pt-3">
          {customFields.length > 0 ? (
            <div className="space-y-3 mb-5">
              {customFields.map((field, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => updateCustomField(idx, 'key', e.target.value)}
                    className={inputBase}
                    placeholder="Field name"
                  />
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                    className={inputBase}
                    placeholder="Field value"
                  />
                  <button
                    onClick={() => removeCustomField(idx)}
                    className="w-10 h-10 flex items-center justify-center border border-[#d1d5db] text-[#7a8a99] hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0 rounded-md"
                  >
                    <i className="ri-delete-bin-line text-sm" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-[#9ba5b1] mb-5">No custom fields added yet.</p>
          )}
          <button
            onClick={addCustomField}
            type="button"
            className="inline-flex items-center gap-2 px-5 py-3 border border-[#d1d5db] text-[13px] font-semibold text-[#7a8a99] hover:border-[#0d1f2d] hover:text-[#0d1f2d] transition-colors cursor-pointer whitespace-nowrap rounded-md tracking-wide uppercase"
          >
            <i className="ri-add-line text-base" /> Add Custom Field
          </button>
        </div>
      </CollapsibleCard>
    </div>
  );
}