import { useState } from 'react';
import { COLORS, AMENITIES, LAND_AMENITIES, getAmenities } from './types';

interface Props {
  amenities: string[];
  setAmenities: React.Dispatch<React.SetStateAction<string[]>>;
  customFeatures: string[];
  setCustomFeatures: React.Dispatch<React.SetStateAction<string[]>>;
  propertyType?: string;
}

export default function FeaturesStep({ amenities, setAmenities, customFeatures, setCustomFeatures, propertyType }: Props) {
  const [customInput, setCustomInput] = useState('');
  const amenityList = getAmenities(propertyType || '');
  const isLand = propertyType === 'land';

  const toggleAmenity = (name: string) => {
    setAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const addCustomFeature = () => {
    if (customInput.trim() && !customFeatures.includes(customInput.trim())) {
      setCustomFeatures([...customFeatures, customInput.trim()]);
      setCustomInput('');
    }
  };

  const removeCustomFeature = (name: string) => {
    setCustomFeatures((prev) => prev.filter((f) => f !== name));
  };

  return (
    <div className="space-y-5">
      {/* Pre-built Features */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-checkbox-multiple-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>{isLand ? 'Land Features & Utilities' : 'Feature Checklist'}</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>{isLand ? 'Select all features this plot offers' : 'Select all amenities this property offers'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {amenityList.map((amenity) => (
            <label
              key={amenity}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all"
              style={
                amenities.includes(amenity)
                  ? { borderColor: COLORS.navy, backgroundColor: '#f0f9ff', color: COLORS.navy }
                  : { borderColor: COLORS.border, color: COLORS.gray }
              }
            >
              <input
                type="checkbox"
                checked={amenities.includes(amenity)}
                onChange={() => toggleAmenity(amenity)}
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ accentColor: COLORS.navy }}
              />
              <span className="text-xs font-medium">{amenity}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Custom Features */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-sparkling-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Custom Features</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Add features not in the list above</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomFeature()}
            className="flex-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white"
            style={{ borderColor: COLORS.border, color: COLORS.navy }}
            placeholder="e.g. Panoramic Views, Smart Lock"
          />
          <button
            onClick={addCustomFeature}
            disabled={!customInput.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors disabled:opacity-40 cursor-pointer hover:bg-gray-50"
            style={{ borderColor: COLORS.border, color: COLORS.navy }}
          >
            <i className="ri-add-line" /> Add
          </button>
        </div>
        {customFeatures.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customFeatures.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
                style={{ borderColor: COLORS.border, color: COLORS.navy }}
                onClick={() => removeCustomFeature(feature)}
              >
                {feature}
                <i className="ri-close-line text-xs hover:text-red-600" />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}