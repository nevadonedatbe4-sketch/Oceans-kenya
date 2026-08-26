import { useRef } from 'react';
import { DocumentFile, formatFileSize } from './types';
import { addToast } from '@/pages/crm/components/CRMToast';
import { uploadFileViaEdgeFunction } from '@/lib/supabase';

interface Props {
  documents: DocumentFile[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  id?: string;
  purpose?: string;
  propertyType?: string;
  isAdmin?: boolean;
}

const ATTACHMENT_TYPES = [
  { id: 'brochure', label: 'Property Brochure', icon: 'ri-file-text-line', accept: '.pdf', color: '#f0f9ff' },
  { id: 'floorplans', label: 'Floor Plans', icon: 'ri-layout-line', accept: '.pdf,.jpg,.jpeg,.png', color: '#f0f9ff' },
  { id: 'title_deed', label: 'Title Deed', icon: 'ri-shield-check-line', accept: '.pdf', color: '#fef2f2' },
  { id: 'payment_plans', label: 'Payment Plans', icon: 'ri-money-dollar-circle-line', accept: '.pdf,.xls,.xlsx', color: '#f0fdf4' },
  { id: 'prospectus', label: 'Investment Prospectus', icon: 'ri-bar-chart-line', accept: '.pdf', color: '#fefce8' },
  { id: 'additional', label: 'Additional Files', icon: 'ri-attachment-line', accept: '.pdf,.doc,.docx,.xls,.xlsx,.zip', color: '#f5f3ff' },
];

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

export default function AttachmentsStep({
  documents, setDocuments, uploading, setUploading, id, purpose, propertyType, isAdmin,
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
    <div className="w-full space-y-10 md:space-y-12">
      <section className="pb-2">
        <SectionHeader
          icon="ri-file-list-line"
          title="Documents & Brochures"
          subtitle="Upload categorized documents for this property"
        />

        <div className="border border-[#d1d5db] bg-white p-5 md:p-6 space-y-4">
          {ATTACHMENT_TYPES.map((type) => {
            const typeDocs = getDocsByCategory(type.id);
            return (
              <div key={type.id} className="border border-[#d1d5db] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 flex items-center justify-center shrink-0 border border-[#d1d5db] bg-white">
                      <i className={`${type.icon} text-sm text-[#5a6a7a]`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1a1e24]">{type.label}</h4>
                      <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-[#f4f6f8] text-[#7a8a99]">
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
                      className="inline-flex items-center gap-1.5 px-3 py-2 border text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer bg-white border-[#d1d5db] text-[#7a8a99] hover:border-[#0d1f2d] hover:text-[#0d1f2d]"
                    >
                      {uploading ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-upload-cloud-line" />}
                      Upload
                    </button>
                  </div>
                </div>
                {typeDocs.length > 0 ? (
                  <div className="space-y-2">
                    {typeDocs.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 border border-[#d1d5db]">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0 border border-[#d1d5db] bg-white">
                          <i className={type.icon} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-[#1a1e24]">{doc.name}</p>
                          <p className="text-xs text-[#7a8a99]">{formatFileSize(doc.size)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 flex items-center justify-center hover:bg-[#f6f7f9] cursor-pointer transition-colors text-[#7a8a99]"
                          >
                            <i className="ri-download-line text-sm" />
                          </a>
                          <button
                            onClick={() => handleRemoveDocument(doc.url)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors text-[#7a8a99]"
                          >
                            <i className="ri-delete-bin-line text-sm" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-[#d1d5db]">
                    <p className="text-xs text-[#7a8a99]">No files uploaded yet</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}