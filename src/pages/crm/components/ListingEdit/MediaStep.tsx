import { useRef, useState, useCallback } from 'react';
import { addToast } from '@/pages/crm/components/CRMToast';
import { isLandType } from './types';

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
  isPhotosRequired?: boolean;
}

const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) => (
  <div className="mb-5">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
        <i className={`${icon} text-white text-sm`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-jost text-sm font-bold text-[#0d1f2d] uppercase tracking-[0.5px]">
          {title}
        </h4>
        <p className="text-xs text-[#7a8a99] mt-0.5 leading-snug">{subtitle}</p>
      </div>
    </div>
    <div className="h-px bg-[#d1d5db] mt-3" />
  </div>
);

const inputBase =
  'w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] placeholder:font-normal rounded-md';

export default function MediaStep({
  images, setImages, mainImage, setMainImage, coverImage, setCoverImage,
  floorPlans, setFloorPlans, videoUrl, setVideoUrl, virtualTourUrl, setVirtualTourUrl,
  uploading, setUploading, id, uploadImageViaEdgeFunction, propertyType,
  isPhotosRequired,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const processFiles = useCallback(async (files: FileList) => {
    setUploading(true);
    let uploaded = 0;
    let failed = 0;
    const newUrls: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        failed++;
        continue;
      }
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
    if (failed > 0 && uploaded > 0) {
      addToast(`${uploaded} uploaded, ${failed} failed`, 'error');
    } else if (failed > 0) {
      addToast(`Upload failed for ${failed} file(s)`, 'error');
    } else {
      addToast(`${uploaded} images uploaded`, 'success');
    }
  }, [id, mainImage, coverImage, setImages, setMainImage, setCoverImage, setUploading, uploadImageViaEdgeFunction]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    processFiles(files);
  }, [processFiles]);

  const handleFloorPlanUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (newUrls.length > 0) addToast(`${newUrls.length} floor plan(s) uploaded`, 'success');
    if (floorPlanInputRef.current) floorPlanInputRef.current.value = '';
  }, [id, setFloorPlans, setUploading, uploadImageViaEdgeFunction]);

  const handleRemoveImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
    if (mainImage === url) setMainImage(images.filter((u) => u !== url)[0] || '');
    if (coverImage === url) setCoverImage(images.filter((u) => u !== url)[0] || '');
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

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  return (
    <div className="w-full space-y-10 md:space-y-12">
      {/* Photos & Media Section */}
      <section className="pb-2">
        <SectionHeader
          icon="ri-image-2-line"
          title="Photos & Media"
          subtitle="Upload high-quality images · drag to reorder · star for cover"
        />
      </section>

      {/* Photo Tips */}
      <section className="pb-2">
        <div className="border-l-2 border-[#0d5959] pl-5 py-1">
          <p className="text-xs font-bold text-[#1a1e24] mb-2 uppercase tracking-widest">Photo tips</p>
          <ul className="text-xs text-[#7a8a99] space-y-1.5 font-light">
            <li>Upload multiple photos at once — drag &amp; drop or click to browse</li>
            <li>Drag thumbnails to reorder — the first image appears on property cards</li>
            <li>Click the <i className="ri-star-line text-[#0d5959]" /> star on any photo to set it as the cover image</li>
            <li>Recommended: at least 5 photos · landscape orientation · min 1200px wide</li>
          </ul>
        </div>
      </section>

      <div className="space-y-6">
        {/* Drop Zone */}
        <div
          role="button"
          aria-label="Upload images"
          tabIndex={0}
          className={`relative border-2 border-dashed transition-all cursor-pointer select-none ${
            dragOver
              ? 'border-[#0d5959]/70 bg-[#0d5959]/5'
              : 'border-[#d1d5db] bg-[#f4f6f8] hover:border-[#0d5959]/50 hover:bg-[#0d5959]/3'
          }`}
          style={{ minHeight: '180px' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        >
          <input
            ref={fileInputRef}
            id="_r_media_"
            accept="image/*"
            multiple
            className="hidden"
            type="file"
            onChange={handleFileInput}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            <div className={`w-14 h-14 flex items-center justify-center transition-colors ${
              dragOver ? 'bg-[#0d5959]/10' : 'bg-[#e2e6eb]'
            }`}>
              {uploading ? (
                <i className="ri-loader-4-line text-2xl animate-spin text-[#7a8a99]" />
              ) : (
                <i className={`ri-upload-cloud-2-line text-2xl transition-colors ${dragOver ? 'text-[#0d5959]' : 'text-[#7a8a99]'}`} />
              )}
            </div>
            <div className="text-center">
              <p className={`text-sm font-bold transition-colors ${dragOver ? 'text-[#0d5959]' : 'text-[#1a1e24]'}`}>
                {uploading ? 'Uploading...' : 'Drag &amp; drop photos here'}
              </p>
              <p className="text-xs text-[#7a8a99] mt-1">
                or <span className="text-[#0d5959] font-bold">click to browse</span> — select multiple at once
              </p>
              <p className="text-xs text-[#9ba5b1] mt-1">JPG, PNG, WEBP supported</p>
            </div>
          </div>
        </div>

        {/* Uploaded Images Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((url, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`relative group overflow-hidden cursor-move transition-all ${
                  mainImage === url ? 'ring-2 ring-[#0d5959]' : 'border border-[#d1d5db]'
                } ${dragIndex === idx ? 'opacity-50 scale-95' : ''}`}
              >
                <img src={url} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />

                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className="w-5 h-5 flex items-center justify-center bg-black/50 text-white text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  {mainImage === url && (
                    <span className="text-[10px] font-bold text-white px-1.5 py-0.5 bg-[#0d5959]">Main</span>
                  )}
                  {coverImage === url && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#d3bb6e] text-[#0d1f2d]">Cover</span>
                  )}
                </div>

                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMainImage(url); }}
                    className="w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-white cursor-pointer text-[#1a1e24]"
                    title="Set as main"
                  >
                    <i className="ri-image-line text-xs" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCoverImage(url); }}
                    className="w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-white cursor-pointer text-[#1a1e24]"
                    title="Set as cover"
                  >
                    <i className="ri-star-line text-xs" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(url); }}
                    className="w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-red-50 hover:text-red-600 cursor-pointer text-[#1a1e24]"
                    title="Remove"
                  >
                    <i className="ri-delete-bin-line text-xs" />
                  </button>
                </div>

                <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="ri-drag-move-line text-white text-xs" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video Tour URL */}
        <div className="pt-4 border-t border-[#d1d5db]">
          <label className="block text-sm font-bold text-[#1a1e24] mb-2 flex items-center gap-2">
            <i className="ri-video-line text-[#0d5959]" />
            Video Tour URL <span className="text-[#7a8a99] font-normal">(optional)</span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
              <i className="ri-links-line text-[#9ba5b1] text-base" />
            </div>
            <input
              placeholder="Paste YouTube or Vimeo URL…"
              className={`${inputBase} pl-11 pr-10`}
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
              {videoUrl && (<i className="ri-check-line text-green-500 text-sm" />)}
            </div>
          </div>
          <p className="text-xs text-[#7a8a99] mt-2">
            Supports: <span className="text-red-500 font-bold">YouTube</span> and <span className="text-sky-500 font-bold">Vimeo</span> — paste any share or watch URL
          </p>
        </div>

        {/* Floor Plans */}
        {!isLandType(propertyType || '') && (
          <div className="pt-4 border-t border-[#d1d5db]">
            <label className="block text-sm font-bold text-[#1a1e24] mb-2 flex items-center gap-2">
              <i className="ri-layout-2-line text-[#0d5959]" />
              Floor Plans <span className="text-[#7a8a99] font-normal">(optional)</span>
            </label>

            <div className="flex items-center gap-3 mb-3">
              <input
                ref={floorPlanInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFloorPlanUpload}
              />
              <button
                type="button"
                onClick={() => floorPlanInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold border transition-all cursor-pointer whitespace-nowrap bg-white text-[#1a1e24] border-[#d1d5db] hover:border-[#0d5959] hover:text-[#0d5959] disabled:opacity-50"
              >
                {uploading ? (
                  <i className="ri-loader-4-line animate-spin text-xs" />
                ) : (
                  <i className="ri-upload-cloud-line text-xs" />
                )}
                Upload Floor Plans
              </button>
            </div>

            {floorPlans.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {floorPlans.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group overflow-hidden border border-[#d1d5db]"
                  >
                    <img src={url} alt={`Floor plan ${idx + 1}`} className="w-full aspect-[4/3] object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                    <button
                      onClick={() => setFloorPlans((prev) => prev.filter((u) => u !== url))}
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[#1a1e24]"
                    >
                      <i className="ri-delete-bin-line text-xs" />
                    </button>
                    <div className="absolute bottom-2 left-2 text-[10px] text-white font-bold bg-black/50 px-1.5 py-0.5">
                      Floor {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Virtual Tour URL */}
        <div className="pt-4 border-t border-[#d1d5db]">
          <label className="block text-sm font-bold text-[#1a1e24] mb-2 flex items-center gap-2">
            <i className="ri-global-line text-[#0d5959]" />
            Virtual Tour URL <span className="text-[#7a8a99] font-normal">(optional)</span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
              <i className="ri-links-line text-[#9ba5b1] text-base" />
            </div>
            <input
              placeholder="Paste Matterport or 360 tour URL…"
              className={`${inputBase} pl-11 pr-10`}
              type="url"
              value={virtualTourUrl}
              onChange={(e) => setVirtualTourUrl(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
              {virtualTourUrl && (<i className="ri-check-line text-green-500 text-sm" />)}
            </div>
          </div>
          <p className="text-xs text-[#7a8a99] mt-2">
            Supports Matterport and other 360° virtual tour platforms
          </p>
        </div>
      </div>
    </div>
  );
}