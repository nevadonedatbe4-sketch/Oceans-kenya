import { useRef, useState } from 'react';
import { COLORS } from './types';
import { addToast } from '@/pages/crm/components/CRMToast';

interface Props {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  mainImage: string;
  setMainImage: (v: string) => void;
  coverImage: string;
  setCoverImage: (v: string) => void;
  floorPlans: string[];
  setFloorPlans: React.Dispatch<React.SetStateAction<string[]>>;
  videoUrl: string;
  setVideoUrl: (v: string) => void;
  virtualTourUrl: string;
  setVirtualTourUrl: (v: string) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  id?: string;
  uploadImageViaEdgeFunction: (file: File, path: string, bucket?: string) => Promise<{ url: string; path: string }>;
  propertyType?: string;
}

export default function MediaStep({
  images, setImages, mainImage, setMainImage, coverImage, setCoverImage,
  floorPlans, setFloorPlans, videoUrl, setVideoUrl, virtualTourUrl, setVirtualTourUrl,
  uploading, setUploading, id, uploadImageViaEdgeFunction, propertyType,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    let uploaded = 0;
    let failed = 0;
    const newUrls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `listing-${id || 'new'}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = `listings/${fileName}`;
      try {
        const { url } = await uploadImageViaEdgeFunction(file, filePath, 'property-images');
        newUrls.push(url);
        uploaded++;
      } catch (err: any) {
        console.error('Upload error:', err);
        failed++;
      }
    }
    setImages((prev) => [...prev, ...newUrls]);
    if (!mainImage && newUrls.length > 0) setMainImage(newUrls[0]);
    if (!coverImage && newUrls.length > 0) setCoverImage(newUrls[0]);
    setUploading(false);
    if (failed > 0) {
      addToast(`${uploaded} uploaded, ${failed} failed`, 'error');
    } else {
      addToast(`${uploaded} images uploaded`, 'success');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFloorPlanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `floorplan-${id || 'new'}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = `floorplans/${fileName}`;
      try {
        const { url } = await uploadImageViaEdgeFunction(file, filePath, 'property-images');
        newUrls.push(url);
      } catch (err: any) {
        console.error('Upload error:', err);
      }
    }
    setFloorPlans((prev) => [...prev, ...newUrls]);
    setUploading(false);
    addToast(`${newUrls.length} floor plans uploaded`, 'success');
    if (floorPlanInputRef.current) floorPlanInputRef.current.value = '';
  };

  const handleRemoveImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
    if (mainImage === url) setMainImage('');
    if (coverImage === url) setCoverImage('');
  };

  const setMain = (url: string) => {
    setMainImage(url);
    addToast('Main image set', 'success');
  };

  const setCover = (url: string) => {
    setCoverImage(url);
    addToast('Cover image set', 'success');
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setImages((prev) => {
      const newImages = [...prev];
      const [dragged] = newImages.splice(dragIndex, 1);
      newImages.splice(index, 0, dragged);
      return newImages;
    });
    setDragIndex(index);
  };

  return (
    <div className="space-y-5">
      {/* Gallery Images */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Gallery Images</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Drag to reorder. Hover for actions.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer hover:bg-gray-50"
              style={{ borderColor: COLORS.border, color: COLORS.gray }}
            >
              <i className="ri-add-line" /> Add Images
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          </div>
        </div>
        {images.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {images.map((url, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                className={`relative group rounded-lg border overflow-hidden cursor-move ${mainImage === url ? 'ring-2' : ''}`}
                style={mainImage === url ? { ringColor: COLORS.navy } : { borderColor: COLORS.border }}
              >
                <img src={url} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className="w-5 h-5 flex items-center justify-center bg-black/50 text-white text-[10px] font-bold rounded">{idx + 1}</span>
                  {mainImage === url && <span className="text-[10px] font-medium text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: COLORS.navy }}>Main</span>}
                  {coverImage === url && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: COLORS.yellow, color: COLORS.navy }}>Cover</span>}
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setMain(url)} className="w-7 h-7 flex items-center justify-center rounded-md bg-white/90 hover:bg-white cursor-pointer" style={{ color: COLORS.navy }} title="Set as main"><i className="ri-image-line text-xs" /></button>
                  <button onClick={() => setCover(url)} className="w-7 h-7 flex items-center justify-center rounded-md bg-white/90 hover:bg-white cursor-pointer" style={{ color: COLORS.navy }} title="Set as cover"><i className="ri-star-line text-xs" /></button>
                  <button onClick={() => handleRemoveImage(url)} className="w-7 h-7 flex items-center justify-center bg-white/90 rounded-md hover:bg-red-50 hover:text-red-600 cursor-pointer" style={{ color: COLORS.navy }} title="Remove"><i className="ri-delete-bin-line text-xs" /></button>
                </div>
                <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="ri-drag-move-line text-white text-xs" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed rounded-lg" style={{ borderColor: COLORS.border }}>
            <i className="ri-image-line text-3xl mb-2" style={{ color: COLORS.border }} />
            <p className="text-sm font-medium" style={{ color: COLORS.gray }}>No gallery images yet. Add images to this property.</p>
          </div>
        )}
      </div>

      {/* Floor Plans */}
      {propertyType !== 'land' && (
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Floor Plans</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Upload floor plan images</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={floorPlanInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFloorPlanUpload} />
            <button
              onClick={() => floorPlanInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer hover:bg-gray-50"
              style={{ borderColor: COLORS.border, color: COLORS.gray }}
            >
              {uploading ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-upload-cloud-line" />}
              Upload Floor Plans
            </button>
          </div>
        </div>
        {floorPlans.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {floorPlans.map((url, idx) => (
              <div key={idx} className="relative group rounded-lg border overflow-hidden" style={{ borderColor: COLORS.border }}>
                <img src={url} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                <button
                  onClick={() => setFloorPlans((prev) => prev.filter((u) => u !== url))}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/90 rounded-md hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ color: COLORS.navy }}
                >
                  <i className="ri-delete-bin-line text-xs" />
                </button>
                <div className="absolute bottom-2 left-2 text-[10px] text-white font-medium bg-black/50 px-1.5 py-0.5 rounded">Floor {idx + 1}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed rounded-lg" style={{ borderColor: COLORS.border }}>
            <i className="ri-map-2-line text-3xl mb-2" style={{ color: COLORS.border }} />
            <p className="text-sm font-medium" style={{ color: COLORS.gray }}>No floor plans uploaded yet.</p>
          </div>
        )}
      </div>
      )}

      {/* Video & Virtual Tour */}
      <div className="bg-white rounded-lg border p-5 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ borderColor: COLORS.border }}>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Video URL</label>
          <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="YouTube or Vimeo link" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Virtual Tour URL</label>
          <input type="text" value={virtualTourUrl} onChange={(e) => setVirtualTourUrl(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="Matterport or 360 tour link" />
        </div>
      </div>
    </div>
  );
}