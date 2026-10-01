import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDragDropUpload } from '@/hooks/useDragDropUpload';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  pageKey: string;
  fieldKey: string;
  previewWidth?: string;
  previewHeight?: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function ImageUploadField({ label, value, onChange, pageKey, fieldKey, previewWidth = 'w-20', previewHeight = 'h-14' }: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<string> => {
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
      throw new Error((errData as { error?: string })?.error || 'Upload failed');
    }

    const result = await response.json();
    return result.url as string;
  };

  const processFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Sorry, only JPG, PNG, WebP and GIF images are supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const url = await uploadFile(file);
      onChange(url);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
  };

  const { isDragging, handlers } = useDragDropUpload(processFiles);

  const handleRemove = () => {
    setUploadError(null);
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      <div
        {...handlers}
        className={`flex items-center gap-3 rounded-lg border border-dashed p-3 transition-colors ${
          isDragging ? 'border-[#0d5959] bg-[#eef7f5]' : 'border-transparent'
        }`}
      >
        <div className={`${previewWidth} ${previewHeight} border border-stone-200 rounded-md flex items-center justify-center bg-stone-50 overflow-hidden shrink-0`}>
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : (
            <i className="ri-image-line text-stone-300 text-lg"></i>
          )}
        </div>
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          {value ? (
            <p className="flex-1 text-xs text-emerald-600 flex items-center gap-1.5"><i className="ri-checkbox-circle-line"></i>Uploaded</p>
          ) : (
            <p className="flex-1 text-xs text-stone-400 flex items-center gap-1.5"><i className="ri-drag-drop-line"></i>Drag &amp; drop an image here, or click Upload</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif"
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
              <><i className="ri-upload-2-line text-sm"></i> {value ? 'Replace' : 'Upload'}</>
            )}
          </button>
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-2 text-xs font-medium border border-stone-200 rounded-md text-stone-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <i className="ri-delete-bin-line text-sm"></i> Remove
            </button>
          )}
        </div>
      </div>
      {uploadError && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5"><i className="ri-error-warning-line"></i>{uploadError}</p>
      )}
    </div>
  );
}