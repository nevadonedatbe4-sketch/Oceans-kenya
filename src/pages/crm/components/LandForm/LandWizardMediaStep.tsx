import type { JvImageDraft } from '@/pages/crm/components/JVImageManager';
import type { LandDocumentDraft } from '@/pages/crm/components/LandDocumentManager';
import { SectionCard, SectionHeader } from './fields';
import JVImageManager from '@/pages/crm/components/JVImageManager';
import LandDocumentManager from '@/pages/crm/components/LandDocumentManager';

interface Props {
  images: JvImageDraft[];
  setImages: (v: JvImageDraft[]) => void;
  documents: LandDocumentDraft[];
  setDocuments: (v: LandDocumentDraft[]) => void;
}

export default function LandWizardMediaStep({ images, setImages, documents, setDocuments }: Props) {
  return (
    <SectionCard>
      <SectionHeader step={3} title="Media" subtitle="Featured image, gallery, videos, floor plans and supporting documents" />
      <JVImageManager images={images} onChange={setImages} storageBucket="land-listings" />
      <div className="border-t border-[#f0f0f0] my-6" />
      <LandDocumentManager documents={documents} onChange={setDocuments} />
    </SectionCard>
  );
}