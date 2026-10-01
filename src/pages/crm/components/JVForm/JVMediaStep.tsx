import type { JVFormState } from './types';
import { JvSection, CheckboxGrid, InheritedChip } from './ui';
import JVImageManager from '@/pages/crm/components/JVImageManager';
import { JV_AMENITY_OPTIONS } from '@/pages/crm/jvOpportunityConstants';
import { isCompleteMedia } from './jvCompletion';

interface Props {
  state: JVFormState;
  update: (p: Partial<JVFormState>) => void;
  inheritedFields?: Set<string>;
}

/* Section 4 — Photos & Amenities.
   Both blocks are prefilled from the linked land listing when one is attached,
   then remain fully editable. Photos live on the JV listing only, so editing
   them here never changes the original land record's images. */
export default function JVMediaStep({ state, update, inheritedFields }: Props) {
  const imagesInherited = inheritedFields?.has('images') ?? false;
  const amenitiesInherited = inheritedFields?.has('amenities') ?? false;

  // Offer the curated list plus any values prefilled from the land record that
  // are not already covered, so inherited amenities are always selectable.
  const amenityOptions = Array.from(new Set([...JV_AMENITY_OPTIONS, ...state.amenities]));

  return (
    <JvSection
      num="4"
      title="Photos & Amenities"
      subtitle="Site photos plus the on-site amenities and utilities — prefilled from the linked land listing where available"
      complete={isCompleteMedia(state)}
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="text-[16px] font-roboto font-bold text-[#001731] uppercase tracking-wide">Site photos</p>
            <InheritedChip show={imagesInherited} />
          </div>
          <JVImageManager images={state.images} onChange={(imgs) => update({ images: imgs })} />
          <p className="text-[14px] font-roboto text-[#6b7684] mt-2 leading-relaxed">
            The first photo is used as the cover. Photos are stored on this JV listing and never overwrite the original land listing&apos;s photos.
          </p>
        </div>

        <div className="border-t border-[#e2e7ec] pt-5">
          <CheckboxGrid
            label="Amenities & on-site utilities"
            hint="Select everything available on site. Prefilled from the linked land listing, then editable."
            inherited={amenitiesInherited}
            options={amenityOptions}
            value={state.amenities}
            onChange={(v) => update({ amenities: v })}
          />
        </div>
      </div>
    </JvSection>
  );
}