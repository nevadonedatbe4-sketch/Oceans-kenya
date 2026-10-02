import type { EcoBlock } from '@/lib/ecosystemBlocks';
import ContextualProperties from '@/pages/blog/components/ContextualProperties';
import FeaturedDevelopmentsBlock from '@/pages/blog/components/FeaturedDevelopmentsBlock';
import ServiceProvidersBlock from '@/pages/blog/components/ServiceProvidersBlock';

interface EcosystemBlocksProps {
  blocks: EcoBlock[];
  /** The guide's own areas - used when a block leaves its areas blank. */
  defaultAreas: string[];
  className?: string;
}

/**
 * EcosystemBlocks - the single dispatcher that turns a post's editor-configured
 * `eco_blocks` into live, interactive sections:
 *
 *   • listings      → live sale inventory in the chosen (or guide's) areas
 *   • developments  → new / off-plan projects, drawn from the same listings
 *   • services      → vetted service providers from the amenities directory
 *
 * Every block is a real data surface with its own CTA, so a reader who is
 * convinced has somewhere meaningful to click next - and the internal links
 * (area searches, developments, directory) are the SEO win.
 */
export default function EcosystemBlocks({ blocks, defaultAreas, className = '' }: EcosystemBlocksProps) {
  const enabled = blocks.filter((b) => b.enabled);
  if (enabled.length === 0) return null;

  return (
    <div className={className}>
      {enabled.map((block) => {
        const areas = block.type === 'services'
          ? block.areas
          : (block.areas.length > 0 ? block.areas : defaultAreas);
        const id = `eco-${block.type}`;
        const sectionClass = 'scroll-mt-24 mt-14 md:mt-16 pt-10 border-t-2 border-primary/10';

        if (block.type === 'listings') {
          return (
            <div key={id} id={id} className={sectionClass}>
              <ContextualProperties
                areas={areas}
                heading={block.heading}
                subheading={block.subheading}
              />
            </div>
          );
        }

        if (block.type === 'developments') {
          return (
            <div key={id} id={id} className={sectionClass}>
              <FeaturedDevelopmentsBlock
                areas={areas}
                limit={block.limit}
                heading={block.heading}
                subheading={block.subheading}
              />
            </div>
          );
        }

        return (
          <div key={id} id={id} className={sectionClass}>
            <ServiceProvidersBlock
              categories={block.categories}
              subcategories={block.subcategories}
              areas={block.areas}
              limit={block.limit}
              heading={block.heading}
              subheading={block.subheading}
            />
          </div>
        );
      })}
    </div>
  );
}