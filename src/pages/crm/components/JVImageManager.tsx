import { useRef, useState } from 'react';
import { uploadImageViaEdgeFunction } from '@/lib/supabase';

export interface JvImageDraft {
  id?: string;
  url: string;
  alt: string;
  sortOrder: number;
  isCover: boolean;
  storagePath?: string;
}

interface JVImageManagerProps {
  images: JvImageDraft[];
  onChange: (images: JvImageDraft[]) => void;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Multi-image manager for JV projects.
 * Supports drag-and-drop + file picker, multiple selection, upload progress,
 * reordering, cover selection, alt text, and deletion. The complete image list
 * is always preserved — never reduced to a single "first" image.
 */
export default function JVImageManager({ images, onChange }: JVImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const invalidType = files.find((f) => !ACCEPTED_TYPES.includes(f.type));
    if (invalidType) {
      setUploadError('Only JPG, PNG and WEBP images are supported.');
      return;
    }
    const oversized = files.find((f) => f.size > MAX_SIZE);
    if (oversized) {
      setUploadError('Each image must be under 10MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const uploaded: JvImageDraft[] = [];

    for (const file of files) {
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `jv-projects/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { url, path } = await uploadImageViaEdgeFunction(file, fileName, 'jv-projects');
        uploaded.push({
          url,
          alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
          sortOrder: 0,
          isCover: false,
          storagePath: path,
        });
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      }
    }

    if (uploaded.length > 0) {
      const next = [...images, ...uploaded].map((img, idx) => ({
        ...img,
        sortOrder: idx + 1,
        isCover: images.length === 0 && idx === 0 ? true : img.isCover,
      }));
      onChange(next);
    }

    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((img, idx) => ({ ...img, sortOrder: idx + 1 })));
  };

  const handleImageDragStart = (index: number) => setDragIndex(index);

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(index);
    onChange(next.map((img, idx) => ({ ...img, sortOrder: idx + 1 })));
  };

  const handleImageDragEnd = () => setDragIndex(null);

  const setCover = (index: number) => {
    onChange(images.map((img, idx) => ({ ...img, isCover: idx === index })));
  };

  const removeImage = (index: number) => {
    const next = images.filter((_, idx) => idx !== index);
    // If the cover was removed, promote the first remaining image to cover.
    if (next.length > 0 && !next.some((img) => img.isCover)) {
      next[0] = { ...next[0], isCover: true };
    }
    onChange(next.map((img, idx) => ({ ...img, sortOrder: idx + 1 })));
  };

  const updateAlt = (index: number, alt: string) => {
    onChange(images.map((img, idx) => (idx === index ? { ...img, alt } : img)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[#001731] font-roboto text-sm font-medium">Project images</label>
        <span className="text-xs font-roboto text-[#9ca3af]">
          {images.length} image{images.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Upload drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-[#e0e4ea] rounded-lg p-6 text-center bg-[#fbfcfe] transition-colors hover:border-[#0d5959]"
      >
        <i className="ri-image-add-line text-2xl text-[#9ca3af]"></i>
        <p className="text-sm font-roboto text-[#636363] mt-1">Drag &amp; drop images here, or</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-roboto bg-[#0d5959] hover:bg-[#0d5959]/90 text-white transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {uploading ? (
            <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Uploading...</>
          ) : (
            <><i className="ri-upload-2-line"></i> Add images</>
          )}
        </button>
        <p className="text-[11px] font-roboto text-[#9ca3af] mt-2">JPG, PNG or WEBP · up to 10MB each · multiple selection supported</p>
      </div>

      {uploadError && (
        <p className="text-xs text-red-500 flex items-center gap-1"><i className="ri-error-warning-line"></i>{uploadError}</p>
      )}

      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id || `${img.url}-${idx}`}
              draggable
              onDragStart={() => handleImageDragStart(idx)}
              onDragOver={(e) => handleImageDragOver(e, idx)}
              onDragEnd={handleImageDragEnd}
              className={`relative rounded-lg overflow-hidden border-2 group ${
                img.isCover ? 'border-[#0d5959]' : 'border-[#f0f0f0]'
              } ${dragIndex === idx ? 'opacity-50' : ''}`}
            >
              <div className="relative h-28 bg-[#f7f8fa]">
                <img
                  src={img.url}
                  alt={img.alt || `Image ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {img.isCover && (
                  <span className="absolute top-2 left-2 bg-[#0d5959] text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded-full">
                    Cover
                  </span>
                )}
                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(img.url)}
                    title="Preview"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[#001731] cursor-pointer hover:bg-[#f0f0f0]"
                  >
                    <i className="ri-eye-line text-sm"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCover(idx)}
                    title="Set as cover"
                    className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer ${img.isCover ? 'bg-[#0d5959] text-white' : 'bg-white text-[#001731] hover:bg-[#f0f0f0]'}`}
                  >
                    <i className={`${img.isCover ? 'ri-star-fill' : 'ri-star-line'} text-sm`}></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    title="Delete"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[#dc2626] cursor-pointer hover:bg-red-50"
                  >
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>
              </div>
              {/* Order / alt controls */}
              <div className="p-2 bg-white">
                <div className="flex items-center gap-1 mb-1.5">
                  <button
                    type="button"
                    onClick={() => moveImage(idx, -1)}
                    disabled={idx === 0}
                    className="w-6 h-6 flex items-center justify-center rounded text-[#636363] hover:bg-[#f0f0f0] cursor-pointer disabled:opacity-30"
                    title="Move left"
                  >
                    <i className="ri-arrow-left-s-line text-sm"></i>
                  </button>
                  <span className="flex-1 text-center text-[10px] font-roboto text-[#9ca3af]">{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => moveImage(idx, 1)}
                    disabled={idx === images.length - 1}
                    className="w-6 h-6 flex items-center justify-center rounded text-[#636363] hover:bg-[#f0f0f0] cursor-pointer disabled:opacity-30"
                    title="Move right"
                  >
                    <i className="ri-arrow-right-s-line text-sm"></i>
                  </button>
                </div>
                <input
                  type="text"
                  value={img.alt}
                  onChange={(e) => updateAlt(idx, e.target.value)}
                  placeholder="Alt text"
                  className="w-full border border-[#f0f0f0] rounded px-2 py-1 text-[11px] font-roboto text-[#001731] focus:outline-none focus:border-[#0d5959]"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox preview */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh]">
            <img src={lightboxUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
              className="absolute -top-3 -right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white text-[#001731] cursor-pointer hover:bg-[#f0f0f0]"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}