import { useRef } from 'react';
import { COLORS, DocumentFile, formatFileSize } from './types';
import { addToast } from '@/pages/crm/components/CRMToast';
import { uploadFileViaEdgeFunction } from '@/lib/supabase';

interface Props {
  documents: DocumentFile[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  id?: string;
}

const ATTACHMENT_TYPES = [
  { id: 'brochure', label: 'Property Brochure', icon: 'ri-file-text-line', accept: '.pdf', color: '#f0f9ff' },
  { id: 'floorplans', label: 'Floor Plans', icon: 'ri-layout-line', accept: '.pdf,.jpg,.jpeg,.png', color: '#f0f9ff' },
  { id: 'title_deed', label: 'Title Deed', icon: 'ri-shield-check-line', accept: '.pdf', color: '#fef2f2' },
  { id: 'payment_plans', label: 'Payment Plans', icon: 'ri-money-dollar-circle-line', accept: '.pdf,.xls,.xlsx', color: '#f0fdf4' },
  { id: 'prospectus', label: 'Investment Prospectus', icon: 'ri-bar-chart-line', accept: '.pdf', color: '#fefce8' },
  { id: 'additional', label: 'Additional Files', icon: 'ri-attachment-line', accept: '.pdf,.doc,.docx,.xls,.xlsx,.zip', color: '#f5f3ff' },
];

export default function AttachmentsStep({
  documents, setDocuments, uploading, setUploading, id,
}: Props) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleUpload = async (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newDocs: DocumentFile[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'pdf';
      const fileName = `${category}-${id || 'new'}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = `documents/${category}/${fileName}`;
      try {
        const { url } = await uploadFileViaEdgeFunction(file, filePath, 'property-documents');
        newDocs.push({ name: file.name, url, size: file.size, type: ext, category });
      } catch (err: any) {
        console.error('Document upload error:', err);
      }
    }
    setDocuments((prev) => [...prev, ...newDocs]);
    setUploading(false);
    addToast(`${newDocs.length} documents uploaded`, 'success');
    if (fileInputRefs.current[category]) {
      fileInputRefs.current[category].value = '';
    }
  };

  const handleRemoveDocument = (url: string) => {
    setDocuments((prev) => prev.filter((d) => d.url !== url));
  };

  const getDocsByCategory = (cat: string) => documents.filter((d) => d.category === cat);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-file-list-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Documents & Brochures</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Upload categorized documents for this property</p>
          </div>
        </div>

        <div className="space-y-4">
          {ATTACHMENT_TYPES.map((type) => {
            const typeDocs = getDocsByCategory(type.id);
            return (
              <div key={type.id} className="border rounded-lg p-4" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: type.color }}>
                      <i className={`${type.icon} text-sm`} style={{ color: COLORS.navy }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold" style={{ color: COLORS.navy }}>{type.label}</h4>
                      <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded" style={{ color: COLORS.gray, backgroundColor: COLORS.bg }}>
                        {type.accept}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={(el) => { fileInputRefs.current[type.id] = el; }}
                      type="file"
                      accept={type.accept}
                      multiple
                      className="hidden"
                      onChange={(e) => handleUpload(type.id, e)}
                    />
                    <button
                      onClick={() => fileInputRefs.current[type.id]?.click()}
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer hover:bg-gray-50"
                      style={{ borderColor: COLORS.border, color: COLORS.gray }}
                    >
                      {uploading ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-upload-cloud-line" />}
                      Upload
                    </button>
                  </div>
                </div>
                {typeDocs.length > 0 ? (
                  <div className="space-y-2">
                    {typeDocs.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: COLORS.border }}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: type.color }}>
                          <i className={type.icon} style={{ color: COLORS.navy }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: COLORS.navy }}>{doc.name}</p>
                          <p className="text-xs" style={{ color: COLORS.gray }}>{formatFileSize(doc.size)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer transition-colors" style={{ color: COLORS.gray }}>
                            <i className="ri-download-line text-sm" />
                          </a>
                          <button
                            onClick={() => handleRemoveDocument(doc.url)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
                            style={{ color: COLORS.gray }}
                          >
                            <i className="ri-delete-bin-line text-sm" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-lg" style={{ borderColor: COLORS.border }}>
                    <p className="text-xs" style={{ color: COLORS.gray }}>No files uploaded yet</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}