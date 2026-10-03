import { useState } from 'react';
import EntityImage from '@/components/feature/EntityImage';

/** A single attachment as captured in the CRM `documents` jsonb column. */
export interface DocItem {
  url?: string;
  name?: string;
  type?: string;
  size?: number;
  category?: string;
}

interface PropertyDocumentsProps {
  /** The CRM `documents` array (floor plans, brochures, plans, …). */
  documents?: DocItem[] | null;
  /** Legacy `floor_plans` array of bare URLs, if any record still uses it. */
  floorPlans?: string[] | null;
  /** Listing title, used for accessible alt text. */
  title: string;
}

function isUsableUrl(value: unknown): boolean {
  const s = String(value || '').trim();
  return /^https?:\/\//i.test(s);
}

function isImage(doc: DocItem): boolean {
  const type = String(doc.type || '').toLowerCase();
  const url = String(doc.url || '').toLowerCase();
  const category = String(doc.category || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(type)) return true;
  if (category.includes('floor') || category.includes('plan')) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/.test(url);
}

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function prettyCategory(category?: string, name?: string): string {
  const c = String(category || '').toLowerCase();
  if (c.includes('floor') || c.includes('plan')) return 'Floor plan';
  if (c.includes('brochure')) return 'Brochure';
  const n = String(name || '');
  const ext = n.includes('.') ? n.split('.').pop()?.toUpperCase() : '';
  return ext ? `${ext} document` : 'Document';
}

/**
 * PropertyDocuments - renders the floor plans / brochures / attachments an
 * agent attached to a listing. Extracted straight from the CRM `documents`
 * payload (floor plans live there with category "floorplans"); the legacy
 * `floor_plans` URL array is still honoured when present.
 *
 * Renders nothing at all when there is no usable attachment, so a listing
 * without documents never shows an empty section.
 */
export default function PropertyDocuments({ documents, floorPlans, title }: PropertyDocumentsProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const docs = (Array.isArray(documents) ? documents : []).filter(
    (d) => d && isUsableUrl(d.url),
  );

  // Fold legacy bare-URL floor plans into the same shape.
  const legacy = (Array.isArray(floorPlans) ? floorPlans : [])
    .filter((u) => isUsableUrl(u))
    .map<DocItem>((url) => ({ url, name: 'Floor plan', category: 'floorplans', type: 'image' }));

  const all = [...docs, ...legacy];
  if (all.length === 0) return null;

  const images = all.filter(isImage);
  const files = all.filter((d) => !isImage(d));

  return (
    <section className="mb-6 md:mb-8">
      <div id="section-documents" className="mb-3 md:mb-5 scroll-mt-24">
        <h2 className="font-title text-[17px] md:text-[18px] font-semibold tracking-normal text-primary pb-2 md:pb-3 border-b border-[#e5e7eb]">
          Floor Plans &amp; Documents
        </h2>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3 mb-3">
          {images.map((doc, idx) => (
            <button
              key={`img-${idx}`}
              type="button"
              onClick={() => setLightbox(String(doc.url))}
              className="group relative block aspect-[4/3] overflow-hidden rounded-md border border-[#e5e5e5] bg-stone-50 cursor-pointer"
            >
              <EntityImage
                src={String(doc.url)}
                alt={`${title} - ${doc.name || 'floor plan'}`}
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                icon="ri-layout-masonry-line"
              />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[11px] font-roboto font-medium px-2 py-1 truncate text-left">
                {doc.name || prettyCategory(doc.category, doc.name)}
              </span>
            </button>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="bg-white border-2 border-stone-300 rounded-[2px] divide-y divide-stone-100">
          {files.map((doc, idx) => (
            <a
              key={`file-${idx}`}
              href={String(doc.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 md:px-4 py-2.5 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <span className="w-9 h-9 flex items-center justify-center shrink-0 rounded-md bg-primary/5 text-primary">
                <i className="ri-file-text-line text-base"></i>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-roboto font-semibold text-primary truncate">
                  {doc.name || prettyCategory(doc.category, doc.name)}
                </span>
                <span className="block text-[11px] font-roboto text-[#888]">
                  {prettyCategory(doc.category, doc.name)}
                  {formatSize(doc.size) ? ` · ${formatSize(doc.size)}` : ''}
                </span>
              </span>
              <i className="ri-download-2-line text-[#888] text-base shrink-0"></i>
            </a>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute top-4 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
            onClick={() => setLightbox(null)}
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
          <img
            src={lightbox}
            alt={`${title} floor plan`}
            className="max-w-full max-h-full object-contain rounded-md"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}