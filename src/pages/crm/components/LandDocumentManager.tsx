import { useRef, useState } from 'react';
import { uploadFileViaEdgeFunction } from '@/lib/supabase';

export interface LandDocumentDraft {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
}

interface LandDocumentManagerProps {
  documents: LandDocumentDraft[];
  onChange: (documents: LandDocumentDraft[]) => void;
}

const MAX_SIZE = 15 * 1024 * 1024; // 15MB

function formatBytes(bytes: number) {
  if (!bytes) return '0B';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${bytes}B`;
}

/**
 * Supporting-document manager for land records — title deeds, approval letters,
 * survey plans, and similar files. Uploads are sent through the upload-file
 * Edge Function into the property-documents bucket.
 */
export default function LandDocumentManager({ documents, onChange }: LandDocumentManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const oversized = files.find((f) => f.size > MAX_SIZE);
    if (oversized) {
      setError('Each document must be under 15MB.');
      return;
    }

    setUploading(true);
    setError(null);

    const uploaded: LandDocumentDraft[] = [];
    for (const file of files) {
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'file';
        const path = `land-documents/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { url, path: savedPath } = await uploadFileViaEdgeFunction(file, path, 'property-documents');
        uploaded.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          url,
          path: savedPath,
          size: file.size,
          type: file.type || 'application/octet-stream',
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    }
    if (uploaded.length > 0) onChange([...documents, ...uploaded]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDoc = (id: string) => onChange(documents.filter((d) => d.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[#001731] font-roboto text-sm font-medium">Supporting documents</span>
        <span className="text-xs font-roboto text-[#9ca3af]">{documents.length} document{documents.length === 1 ? '' : 's'}</span>
      </div>

      <div className="border-2 border-dashed border-[#e0e4ea] rounded-lg p-6 text-center bg-[#fbfcfe] transition-colors hover:border-[#0d5959]">
        <i className="ri-file-text-line text-2xl text-[#9ca3af]"></i>
        <p className="text-sm font-roboto text-[#636363] mt-1">Title deeds, survey plans, approval letters...</p>
        <input
          ref={fileInputRef}
          type="file"
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
            <><i className="ri-upload-2-line"></i> Add documents</>
          )}
        </button>
        <p className="text-[11px] font-roboto text-[#9ca3af] mt-2">PDF, images, up to 15MB each · multiple selection supported</p>
      </div>

      {error && <p className="text-xs text-red-500 flex items-center gap-1"><i className="ri-error-warning-line"></i>{error}</p>}

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#f0f0f0] bg-[#fbfcfe]">
              <div className="w-9 h-9 rounded-lg bg-[#0d5959]/10 text-[#0d5959] flex items-center justify-center flex-shrink-0">
                <i className="ri-file-text-line text-base" />
              </div>
              <div className="min-w-0 flex-1">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs font-roboto font-semibold text-[#001731] truncate block hover:text-[#0d5959] cursor-pointer">
                  {doc.name}
                </a>
                <p className="text-[10px] font-roboto text-[#9ca3af]">{formatBytes(doc.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeDoc(doc.id)}
                title="Remove"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#636363] hover:text-[#dc2626] hover:bg-red-50 cursor-pointer transition-colors flex-shrink-0"
              >
                <i className="ri-delete-bin-line text-sm" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}