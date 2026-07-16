import { useState } from 'react';
import { COLORS, EXCHANGE_RATE, SIZE_UNITS, AVAILABILITY_STATUS } from './types';
import type { CustomField } from './types';
import { LAND_TITLE_TYPES } from './types';

interface Props {
  price: string;
  setPrice: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
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
  isPublished: boolean;
  setIsPublished: (v: boolean) => void;
  isPending: boolean;
  setIsPending: (v: boolean) => void;
  // Extended fields
  priceUgx: string;
  setPriceUgx: (v: string) => void;
  autoExchange: boolean;
  setAutoExchange: (v: boolean) => void;
  pricePrefix: string;
  setPricePrefix: (v: string) => void;
  pricePostfix: string;
  setPricePostfix: (v: string) => void;
  secondPrice: string;
  setSecondPrice: (v: string) => void;
  propertyLabel: string;
  setPropertyLabel: (v: string) => void;
  serviceCharge: string;
  setServiceCharge: (v: string) => void;
  availabilityStatus: string;
  setAvailabilityStatus: (v: string) => void;
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
}

export default function DetailsStep({
  price, setPrice, currency, setCurrency, size, setSize, landSize, setLandSize,
  acreage, setAcreage, landTitle, setLandTitle,
  sqft, setSqft, parking, setParking, bedrooms, setBedrooms, bathrooms, setBathrooms,
  isPublished, setIsPublished, isPending, setIsPending,
  priceUgx, setPriceUgx, autoExchange, setAutoExchange,
  pricePrefix, setPricePrefix, pricePostfix, setPricePostfix,
  secondPrice, setSecondPrice, propertyLabel, setPropertyLabel,
  serviceCharge, setServiceCharge, availabilityStatus, setAvailabilityStatus,
  sizeUnit, setSizeUnit, landUnit, setLandUnit, garages, setGarages,
  garageSize, setGarageSize, yearBuilt, setYearBuilt, rooms, setRooms,
  propertyId, setPropertyId, customFields, setCustomFields, propertyType,
}: Props) {
  const isLand = propertyType === 'land';

  const handlePriceChange = (val: string) => {
    setPrice(val);
    if (autoExchange && val) {
      const ugx = Math.round(Number(val) * EXCHANGE_RATE);
      setPriceUgx(String(ugx));
    }
  };

  const handleToggleExchange = (checked: boolean) => {
    setAutoExchange(checked);
    if (checked && price) {
      const ugx = Math.round(Number(price) * EXCHANGE_RATE);
      setPriceUgx(String(ugx));
    }
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

  return (
    <div className="space-y-5">
      {/* Pricing Section */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-price-tag-3-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Pricing</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Set the price and pricing options</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>
              Price (USD)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => handlePriceChange(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
              placeholder="450000"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (&euro;)</option>
              <option value="GBP">GBP (&pound;)</option>
              <option value="UGX">UGX (USh)</option>
              <option value="KES">KES (KSh)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Price Prefix</label>
            <input type="text" value={pricePrefix} onChange={(e) => setPricePrefix(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. From, Starting at" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Price Postfix</label>
            <input type="text" value={pricePostfix} onChange={(e) => setPricePostfix(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. /month, /year" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Second Price</label>
            <input type="number" value={secondPrice} onChange={(e) => setSecondPrice(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="Optional second price" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Property Label</label>
            <input type="text" value={propertyLabel} onChange={(e) => setPropertyLabel(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. Hot Deal, New" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Service Charge</label>
            <input type="number" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. 5000" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Availability Status</label>
            <select
              value={availabilityStatus}
              onChange={(e) => setAvailabilityStatus(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="">Select Status</option>
              {AVAILABILITY_STATUS.map((s) => (
                <option key={s} value={s.toLowerCase()}>{s}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Measurements Section */}
      {isLand ? (
        /* Land-specific measurements */
        <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
              <i className="ri-ruler-line text-lg" style={{ color: COLORS.navy }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Land Measurements</h3>
              <p className="text-xs" style={{ color: COLORS.gray }}>Land area and plot details</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>
                  Land Area <span className="text-red-500">*</span>
                </label>
                <input type="number" value={landSize} onChange={(e) => setLandSize(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. 500" />
              </div>
              <div className="w-24">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Unit</label>
                <select
                  value={landUnit}
                  onChange={(e) => setLandUnit(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
                  style={{ borderColor: COLORS.border, color: COLORS.navy }}
                >
                  {SIZE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Acreage</label>
              <input type="number" step="0.01" value={acreage} onChange={(e) => setAcreage(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. 2.5" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Land Title</label>
              <select
                value={landTitle}
                onChange={(e) => setLandTitle(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
                style={{ borderColor: COLORS.border, color: COLORS.navy }}
              >
                <option value="">Select title type</option>
                {LAND_TITLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Size (sq ft)</label>
              <input type="text" value={sqft} onChange={(e) => setSqft(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. 3500" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Property ID</label>
              <input type="text" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="Auto-generated or manual" />
            </div>
          </div>
        </div>
      ) : (
        /* Building measurements */
        <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
              <i className="ri-ruler-line text-lg" style={{ color: COLORS.navy }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Measurements</h3>
              <p className="text-xs" style={{ color: COLORS.gray }}>Size, land area, and room counts</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Property Size</label>
                <input type="number" value={size} onChange={(e) => setSize(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. 500" />
              </div>
              <div className="w-24">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Unit</label>
                <select
                  value={sizeUnit}
                  onChange={(e) => setSizeUnit(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
                  style={{ borderColor: COLORS.border, color: COLORS.navy }}
                >
                  {SIZE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Land Area</label>
                <input type="number" value={landSize} onChange={(e) => setLandSize(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. 500" />
              </div>
              <div className="w-24">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Unit</label>
                <select
                  value={landUnit}
                  onChange={(e) => setLandUnit(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
                  style={{ borderColor: COLORS.border, color: COLORS.navy }}
                >
                  {SIZE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Size (sq ft)</label>
              <input type="text" value={sqft} onChange={(e) => setSqft(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. 3500" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Bedrooms</label>
              <input type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(Number(e.target.value))} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Bathrooms</label>
              <input type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Parking Spaces</label>
              <input type="number" min={0} value={parking} onChange={(e) => setParking(Number(e.target.value))} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Garages</label>
              <input type="number" min={0} value={garages} onChange={(e) => setGarages(Number(e.target.value))} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Garage Size</label>
              <input type="text" value={garageSize} onChange={(e) => setGarageSize(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. 20x20 ft" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Rooms</label>
              <input type="number" min={0} value={rooms} onChange={(e) => setRooms(Number(e.target.value))} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Year Built</label>
              <input type="number" min={1800} max={2099} value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. 2020" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Property ID</label>
              <input type="text" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="Auto-generated or manual" />
            </div>
          </div>
        </div>
      )}

      {/* Custom Fields */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
              <i className="ri-list-settings-line text-lg" style={{ color: COLORS.navy }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Custom Fields</h3>
              <p className="text-xs" style={{ color: COLORS.gray }}>Add custom key-value fields</p>
            </div>
          </div>
          <button
            onClick={addCustomField}
            className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-gray-50"
            style={{ borderColor: COLORS.border, color: COLORS.navy }}
          >
            <i className="ri-add-line" /> Add Custom Field
          </button>
        </div>
        {customFields.length > 0 ? (
          <div className="space-y-2">
            {customFields.map((field, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => updateCustomField(idx, 'key', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none bg-white"
                  style={{ borderColor: COLORS.border, color: COLORS.navy }}
                  placeholder="Field name"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none bg-white"
                  style={{ borderColor: COLORS.border, color: COLORS.navy }}
                  placeholder="Field value"
                />
                <button
                  onClick={() => removeCustomField(idx)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
                  style={{ color: COLORS.gray }}
                >
                  <i className="ri-delete-bin-line text-sm" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: COLORS.gray }}>No custom fields added yet.</p>
        )}
      </div>
    </div>
  );
}