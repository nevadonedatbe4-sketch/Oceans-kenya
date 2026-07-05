import { useRef, useState } from 'react';
import { COLORS, generateSlug, PROPERTY_TYPES, PURPOSE_OPTIONS, SALE_SUB_TYPES, RENT_SUB_TYPES } from './types';

interface Props {
  title: string;
  setTitle: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  propertyType: string;
  setPropertyType: (v: string) => void;
  subType: string;
  setSubType: (v: string) => void;
  purpose: string;
  setPurpose: (v: string) => void;
  isEdit: boolean;
}

export default function DescriptionStep({
  title, setTitle, slug, setSlug, description, setDescription,
  propertyType, setPropertyType, subType, setSubType, purpose, setPurpose, isEdit,
}: Props) {
  const descRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState('3');
  const [fontFamily, setFontFamily] = useState('Inter');

  const handleTitleChange = (t: string) => {
    setTitle(t);
    if (!isEdit && !slug) {
      setSlug(generateSlug(t));
    }
  };

  const applyFormat = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (descRef.current) setDescription(descRef.current.innerHTML);
  };

  const handleDescInput = () => {
    if (descRef.current) setDescription(descRef.current.innerHTML);
  };

  const handleFontFamily = (ff: string) => {
    setFontFamily(ff);
    applyFormat('fontName', ff);
  };

  const handleFontSize = (fs: string) => {
    setFontSize(fs);
    applyFormat('fontSize', fs);
  };

  return (
    <div className="space-y-5">
      {/* Property Title */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-file-text-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Property Title</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>A compelling headline attracts more buyers</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white"
            style={{ borderColor: COLORS.border, color: COLORS.navy }}
            placeholder="Untitled Draft"
          />
        </div>
      </div>

      {/* Classification */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-folder-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Classification</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Define the type, purpose, and sub-type of this property</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>
              Property Type <span className="text-red-500">*</span>
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="">Select Type</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t.toLowerCase().replace(/\s/g, '_')}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>
              Purpose <span className="text-red-500">*</span>
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              {PURPOSE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>
              Sub-Type
            </label>
            <select
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="">Select Sub-Type</option>
              {purpose === 'sale' && (
                <optgroup label="Sale Types">
                  {SALE_SUB_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </optgroup>
              )}
              {purpose === 'rent' && (
                <optgroup label="Rent Types">
                  {RENT_SUB_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
        {/* Slug */}
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>
            Slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">oceans.co.ke/property/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="flex-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
              placeholder="url-friendly-name"
            />
          </div>
        </div>
      </div>

      {/* Description with Rich Text */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-article-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Description</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Tell the story of this property</p>
          </div>
        </div>
        <div className="flex items-center gap-1 mb-2 p-2 rounded-lg border" style={{ backgroundColor: COLORS.bg, borderColor: COLORS.border }}>
          <button onClick={() => applyFormat('bold')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white cursor-pointer text-sm font-bold" style={{ color: COLORS.navy }} title="Bold">B</button>
          <button onClick={() => applyFormat('italic')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white cursor-pointer text-sm italic" style={{ color: COLORS.navy }} title="Italic">I</button>
          <button onClick={() => applyFormat('underline')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white cursor-pointer text-sm underline" style={{ color: COLORS.navy }} title="Underline">U</button>
          <div className="w-px h-5 mx-1" style={{ backgroundColor: COLORS.border }} />
          <select
            value={fontFamily}
            onChange={(e) => handleFontFamily(e.target.value)}
            className="text-xs border rounded px-1 py-0.5 bg-white cursor-pointer"
            style={{ borderColor: COLORS.border, color: COLORS.navy }}
          >
            <option value="Inter">Inter</option>
            <option value="DM Sans">DM Sans</option>
            <option value="Prata">Prata</option>
          </select>
          <select
            value={fontSize}
            onChange={(e) => handleFontSize(e.target.value)}
            className="text-xs border rounded px-1 py-0.5 bg-white cursor-pointer"
            style={{ borderColor: COLORS.border, color: COLORS.navy }}
          >
            <option value="3">Normal</option>
            <option value="5">Large</option>
            <option value="7">Extra Large</option>
          </select>
        </div>
        <div
          ref={descRef}
          contentEditable
          onInput={handleDescInput}
          className="w-full min-h-[200px] px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white"
          style={{ borderColor: COLORS.border, color: COLORS.navy, fontFamily: `${fontFamily}, sans-serif` }}
          dangerouslySetInnerHTML={{ __html: description }}
          data-placeholder="Welcome to this stunning property nestled in the heart of... The open-plan living area flows seamlessly into..."
        />
        <p className="text-[10px] mt-1 text-right" style={{ color: COLORS.gray }}>{description.replace(/<[^>]*>/g, '').length} characters</p>
      </div>
    </div>
  );
}