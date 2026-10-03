import { useState } from 'react';
import EntityImage from '@/components/feature/EntityImage';
import type { DevelopmentFloorPlan } from '@/lib/developmentModel';

interface FloorPlansSectionProps {
  /** Real floor-plan / layout attachments collected from the project's units. */
  floorPlans: DevelopmentFloorPlan[];
  /** Project name, used for accessible alt text. */
  name: string;
  /** Opens the enquiry flow with a reason + message. */
  onEnquire: (reason: string, message: string) => void;
}

function isImage(plan: DevelopmentFloorPlan): boolean {
  const type = (plan.type || '').toLowerCase();
  const url = (plan.url || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(type)) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/.test(url);
}

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * FloorPlansSection - the project's floor plans & layouts.
 *
 * Renders the real plans attached to the project's units (images in a gallery
 * with a lightbox, downloadable files as a list). Only actual plan attachments
 * are ever shown - nothing is labelled a "floor plan" unless the CRM says so.
 * Renders nothing when the project carries no plans.
 */
export default function FloorPlansSection({ floorPlans, name, onEnquire }: FloorPlansSectionProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (floorPlans.length === 0) return null;

  const images = floorPlans.filter(isImage);
  const files = floorPlans.filter((p) => !isImage(p));

  return (
    <section
      id="floor-plans"
      className="scroll-mt-[180px] rounded-lg border border-[#e5e5e5] bg-white p-5 md:p-7"
    >
      <h2 className="text-xl md:text-2xl font-bold text-primary mb-1">Floor plans &amp; layouts</h2>
      <p className="text-sm font-roboto text-[#6b7280] mb-5">
        Actual plans and layouts for the unit types at {name}. Tap a plan to view it full size.
      </p>

      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {images.map((plan, idx) => (
            <button
              key={`plan-img-${idx}`}
              type="button"
              onClick={() => setLightbox(plan.url)}
              className="group relative block aspect-[4/3] overflow-hidden border border-[#e5e5e5] bg-stone-50 cursor-pointer"
            >
              <EntityImage
                src={plan.url}
                alt={`${name} - ${plan.label} floor plan`}
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                icon="ri-layout-masonry-line"
              />
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#001731] text-white text-[11px] font-semibold whitespace-nowrap">
                <i className="ri-layout-masonry-line text-xs"></i>
                {plan.label}
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[11px] font-roboto font-medium px-2 py-1 truncate text-left">
                {plan.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="border border-[#eef0f2] rounded-md divide-y divide-[#eef0f2] overflow-hidden">
          {files.map((plan, idx) => (
            <a
              key={`plan-file-${idx}`}
              href={plan.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 md:px-4 py-3 hover:bg-[#f7f8f9] transition-colors cursor-pointer"
            >
              <span className="w-9 h-9 flex items-center justify-center shrink-0 rounded-md bg-primary/5 text-primary">
                <i className="ri-file-pdf-2-line text-base"></i>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-roboto font-semibold text-primary truncate">
                  {plan.name || `${plan.label} floor plan`}
                </span>
                <span className="block text-[11px] font-roboto text-[#888]">
                  {plan.label}
                  {formatSize(plan.size) ? ` \u00b7 ${formatSize(plan.size)}` : ''}
                </span>
              </span>
              <i className="ri-download-2-line text-[#888] text-base shrink-0"></i>
            </a>
          ))}
        </div>
      )}

      <div className="mt-6 pt-5 border-t border-[#f0f0f0]">
        <button
          type="button"
          onClick={() => onEnquire('Floor Plans', `Hello, I would like more detail on the floor plans and layouts at ${name}.`)}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary text-primary text-sm font-semibold rounded-md whitespace-nowrap cursor-pointer hover:bg-primary hover:text-white transition-colors"
        >
          <i className="ri-question-line text-base"></i>Ask about these layouts
        </button>
      </div>

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
            alt={`${name} floor plan`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}