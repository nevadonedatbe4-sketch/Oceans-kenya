import { useRef, useState, useCallback } from 'react';
import { DevelopmentFormState } from './types';
import { addToast } from '@/pages/crm/components/CRMToast';
import { inputBase, SectionHeader } from './ui';

interface Props {
  form: DevelopmentFormState;
  update: (patch: Partial<DevelopmentFormState>) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  id?: string;
}

export default function DevelopmentMediaStep({ form, update, uploading, setUploading, id }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Supabase via edge function (same helper as listings)
  const uploader = async (file: File, path: string): Promise<string> => {
    const mod = await import('@/lib/supabase');
    const { url } = await mod.uploadImageViaEdgeFunction(file, path, 'property-images');
    return url;
  };

  const processFiles = useCallback(async (files: FileList) => {
    setUploading(true);
    let uploaded = 0;
    let failed = 0;
    const newUrls: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) { failed++; continue; }
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `dev-${id || 'new'}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      try {
        const url = await uploader(file, `developments/${fileName}`);
        newUrls.push(url);
        uploaded++;
      } catch { failed++; }
    }
    update({ gallery: [...form.gallery, ...newUrls] });
    if (!form.mainImage && newUrls.length > 0) update({ mainImage: newUrls[0], coverImage: form.coverImage || newUrls[0] });
    setUploading(false);
    if (failed > 0 && uploaded > 0) addToast(`${uploaded} uploaded, ${failed} failed`, 'error');
    else if (failed > 0) addToast(`Upload failed for ${failed} file(s)`, 'error');
    else if (uploaded > 0) addToast(`${uploaded} images uploaded`, 'success');
  }, [id, form.gallery, form.mainImage, form.coverImage, update, setUploading]);

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
      try {
        const url = await uploader(file, `floorplans/dev-${id || 'new'}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`);
        newUrls.push(url);
      } catch { /* ignore */ }
    }
    update({ floorPlans: [...form.floorPlans, ...newUrls] });
    setUploading(false);
    if (newUrls.length > 0) addToast(`${newUrls.length} floor plan(s) uploaded`, 'success');
    if (floorPlanInputRef.current) floorPlanInputRef.current.value = '';
  }, [id, form.floorPlans, update, setUploading]);

  const removeImage = (url: string) => {
    const next = form.gallery.filter((u) => u !== url);
    update({ gallery: next });
    if (form.mainImage === url) update({ mainImage: next[0] || '' });
    if (form.coverImage === url) update({ coverImage: next[0] || '' });
  };

  return (
    <div className="w-full space-y-6">
      <SectionHeader icon="ri-image-2-line" title="Photos & Media" subtitle="Upload hero photos, floor plans and video tour" />

      <div className="border-l-2 border-[#0d5959] pl-5 py-1 mb-4">
        <p className="text-xs font-bold text-[#1a1e24] mb-2 uppercase tracking-widest">Need at least one photo to publish</p>
        <p className="text-xs text-[#7a8a99] font-light">Set the main image as the first uploaded item; star any image as the cover.</p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        aria-label="Upload images"
        tabIndex={0}
        className={`relative border-2 border-dashed transition-all cursor-pointer select-none ${dragOver ? 'border-[#0d5959]/70 bg-[#0d5959]/5' : 'border-[#d1d5db] bg-[#f4f6f8] hover:border-[#0d5959]/50 hover:bg-[#0d5959]/3'}`}
        style={{ minHeight: '180px' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
      >
        <input ref={fileInputRef} accept="image/*" multiple className="hidden" type="file" onChange={handleFileInput} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
          <div className={`w-14 h-14 flex items-center justify-center transition-colors ${dragOver ? 'bg-[#0d5959]/10' : 'bg-[#e2e6eb]'}`}>
            {uploading ? (
              <i className="ri-loader-4-line text-2xl animate-spin text-[#7a8a99]" />
            ) : (
              <i className={`ri-upload-cloud-2-line text-2xl transition-colors ${dragOver ? 'text-[#0d5959]' : 'text-[#7a8a99]'}`} />
            )}
          </div>
          <div className="text-center">
            <p className={`text-sm font-bold transition-colors ${dragOver ? 'text-[#0d5959]' : 'text-[#1a1e24]'}`}>
              {uploading ? 'Uploading...' : 'Drag & drop photos here'}
            </p>
            <p className="text-xs text-[#7a8a99] mt-1">or <span className="text-[#0d5959] font-bold">click to browse</span> — select multiple at once</p>
          </div>
        </div>
      </div>

      {/* Gallery grid */}
      {form.gallery.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {form.gallery.map((url, idx) => (
            <div key={idx} className={`relative group overflow-hidden ${form.mainImage === url ? 'ring-2 ring-[#0d5959]' : 'border border-[#d1d5db]'}`}>
              <img src={url} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className="w-5 h-5 flex items-center justify-center bg-black/50 text-white text-[10px] font-bold">{idx + 1}</span>
                {form.mainImage === url && <span className="text-[10px] font-bold text-white px-1.5 py-0.5 bg-[#0d5959]">Main</span>}
                {form.coverImage === url && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#d3bb6e] text-[#0d1f2d]">Cover</span>}
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); update({ mainImage: url }); }} className="w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-white cursor-pointer text-[#1a1e24]" title="Set as main">
                  <i className="ri-image-line text-xs" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); update({ coverImage: url }); }} className="w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-white cursor-pointer text-[#1a1e24]" title="Set as cover">
                  <i className="ri-star-line text-xs" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeImage(url); }} className="w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-red-50 hover:text-red-600 cursor-pointer text-[#1a1e24]" title="Remove">
                  <i className="ri-delete-bin-line text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floor plans */}
      <div className="pt-4 border-t border-[#d1d5db]">
        <label className="block text-base font-bold text-[#1a1e24] mb-2 flex items-center gap-2">
          <i className="ri-layout-2-line text-[#0d5959]" /> Floor Plans <span className="text-[#7a8a99] font-normal">(optional)</span>
        </label>
        <input ref={floorPlanInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFloorPlanUpload} />
        <button type="button" onClick={() => floorPlanInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold border transition-all cursor-pointer whitespace-nowrap bg-white text-[#1a1e24] border-[#d1d5db] hover:border-[#0d5959] hover:text-[#0d5959] disabled:opacity-50">
          {uploading ? <i className="ri-loader-4-line animate-spin text-xs" /> : <i className="ri-upload-cloud-line text-xs" />} Upload Floor Plans
        </button>
        {form.floorPlans.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
            {form.floorPlans.map((url, idx) => (
              <div key={idx} className="relative group overflow-hidden border border-[#d1d5db]">
                <img src={url} alt={`Floor plan ${idx + 1}`} className="w-full aspect-[4/3] object-cover" loading="lazy" />
                <button onClick={() => update({ floorPlans: form.floorPlans.filter((u) => u !== url) })} className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[#1a1e24]">
                  <i className="ri-delete-bin-line text-xs" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video */}
      <div className="pt-4 border-t border-[#d1d5db]">
        <label className="block text-base font-bold text-[#1a1e24] mb-2 flex items-center gap-2">
          <i className="ri-video-line text-[#0d5959]" /> Video Tour URL <span className="text-[#7a8a99] font-normal">(optional)</span>
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
            <i className="ri-links-line text-[#9ba5b1] text-base" />
          </div>
          <input placeholder="Paste YouTube or Vimeo URL…" className={`${inputBase} pl-11 pr-10`} type="url" value={form.videoUrl} onChange={(e) => update({ videoUrl: e.target.value })} />
        </div>
      </div>
    </div>
  );
}