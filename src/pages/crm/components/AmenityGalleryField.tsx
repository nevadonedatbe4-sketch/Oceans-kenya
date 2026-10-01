import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AmenityGalleryFieldProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

export default function AmenityGalleryField({ value, onChange }: AmenityGalleryFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `pages/amenities/${fileName}`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', filePath);
    formData.append('bucket', 'property-images');

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-image`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => undefined);
      throw new Error((errData as { error?: string })?.error || 'Upload failed');
    }
    const result = await response.json();
    return result.url as string;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadFile(file);
        urls.push(url);
      }
      onChange([...value, ...urls]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateUrl = (index: number, url: string) => {
    const next = [...value];
    next[index] = url;
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">
        Gallery
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {value.map((url, i) => (
          <div key={i} className="border border-[#e8edf2] rounded-lg overflow-hidden">
            <div className="aspect-[4/3] bg-stone-100">
              {url ? (
                <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="ri-image-line text-stone-300 text-xl"></i>
                </div>
              )}
            </div>
            <div className="p-2 space-y-1.5">
              <input
                type="text"
                value={url}
                onChange={(e) => updateUrl(i, e.target.value)}
                className="w-full px-2 py-1.5 border border-[#e8edf2] rounded text-xs font-roboto focus:outline-none focus:border-[#0d5959]"
                placeholder="https://..."
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="w-6 h-6 flex items-center justify-center rounded text-[#7a8a99] hover:bg-stone-100 cursor-pointer disabled:opacity-30"
                    title="Move up"
                  >
                    <i className="ri-arrow-up-s-line text-sm"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === value.length - 1}
                    className="w-6 h-6 flex items-center justify-center rounded text-[#7a8a99] hover:bg-stone-100 cursor-pointer disabled:opacity-30"
                    title="Move down"
                  >
                    <i className="ri-arrow-down-wide-fill text-sm"></i>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="w-6 h-6 flex items-center justify-center rounded text-red-500 hover:bg-red-50 cursor-pointer"
                  title="Remove"
                >
                  <i className="ri-delete-bin-line text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add tile */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="aspect-[4/3] border-2 border-dashed border-[#e8edf2] rounded-lg flex flex-col items-center justify-center gap-1 text-[#7a8a99] hover:border-[#0d5959] hover:text-[#0d5959] transition-colors cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <span className="w-5 h-5 border-2 border-[#0d5959] border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <>
              <i className="ri-add-line text-xl"></i>
              <span className="text-xs font-roboto">Add image</span>
            </>
          )}
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
      {uploadError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <i className="ri-error-warning-line"></i>
          {uploadError}
        </p>
      )}
    </div>
  );
}