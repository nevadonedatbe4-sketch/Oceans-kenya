import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  pageKey: string;
  fieldKey: string;
  previewWidth?: string;
  previewHeight?: string;
}

export default function ImageUploadField({ label, value, onChange, pageKey, fieldKey, previewWidth = 'w-20', previewHeight = 'h-14' }: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `pages/${pageKey}/${fileName}`;

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
        throw new Error((errData as any)?.error || 'Upload failed');
      }

      const result = await response.json();
      onChange(result.url);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      <div className="flex items-center gap-3">
        <div className={`${previewWidth} ${previewHeight} border border-stone-200 rounded-md flex items-center justify-center bg-stone-50 overflow-hidden shrink-0`}>
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : (
            <i className="ri-image-line text-stone-300 text-lg"></i>
          )}
        </div>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => { onChange(e.target.value); setUploadError(null); }}
            className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white"
            placeholder="https://... or upload below"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 text-xs font-medium border border-stone-200 rounded-md text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5"
          >
            {uploading ? (
              <><span className="w-3.5 h-3.5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></span> Uploading...</>
            ) : (
              <><i className="ri-upload-2-line text-sm"></i> Upload</>
            )}
          </button>
        </div>
      </div>
      {uploadError && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5"><i className="ri-error-warning-line"></i>{uploadError}</p>
      )}
    </div>
  );
}