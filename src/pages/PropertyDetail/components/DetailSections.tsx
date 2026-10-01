import { Fragment } from 'react';
import type { DetailSection } from '@/lib/propertyDetail/types';
import ReadMore from '@/components/feature/ReadMore';

/**
 * Renders the type-aware detail sections produced by a property-type mapper as
 * ONE unified key/value table (with per-section header rows), instead of a
 * stack of separate cards.
 *
 * The same primitive is reused for the sidebar "Quick Facts" panel so every
 * spec surface on the detail page shares one visual language.
 *
 * Sections that carry no data are skipped, and every value is presented exactly
 * as it was captured in the CRM - the mapper never converts units or invents
 * defaults, so the page only ever shows what is actually on the record.
 */
function hasContent(s: DetailSection): boolean {
  return Boolean(
    (s.fields && s.fields.length > 0)
      || (s.tagGroups && s.tagGroups.some((g) => g.items.length > 0))
      || (s.paragraphs && s.paragraphs.some((p) => p.text.trim())),
  );
}

interface PropertyDetailSectionsProps {
  sections: DetailSection[];
  /** Panel title shown in the header bar. */
  title?: string;
  /** Header bar icon (Remix Icon class). */
  headerIcon?: string;
}

export default function PropertyDetailSections({
  sections,
  title = 'Property Details',
  headerIcon = 'ri-file-list-3-line',
}: PropertyDetailSectionsProps) {
  const visible = sections.filter(hasContent);
  if (visible.length === 0) return null;

  return (
    <div className="border-2 border-primary/20 rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-2.5 px-5 md:px-6 py-4 bg-primary border-b-2 border-primary/20">
        <span className="w-5 h-5 flex items-center justify-center text-teal">
          <i className={headerIcon}></i>
        </span>
        <h2 className="font-roboto font-bold text-white text-base md:text-lg">{title}</h2>
      </div>

      <table className="w-full border-collapse">
        <tbody>
          {visible.map((section) => {
            const fields = section.fields ?? [];
            const tagGroups = (section.tagGroups ?? []).filter((g) => g.items.length > 0);
            const paragraphs = (section.paragraphs ?? []).filter((p) => p.text.trim());
            return (
              <Fragment key={section.id}>
                {section.title ? (
                  <tr className="bg-primary/10">
                    <th
                      colSpan={2}
                      scope="colgroup"
                      className="text-left px-5 md:px-6 py-3 border-y-2 border-primary/20"
                    >
                      <span className="flex items-center gap-2 font-roboto font-bold text-primary text-sm md:text-base uppercase tracking-wider">
                        <span className="w-4 h-4 flex items-center justify-center text-accent">
                          <i className={section.icon}></i>
                        </span>
                        {section.title}
                      </span>
                    </th>
                  </tr>
                ) : null}

                {fields.map((f, idx) => (
                  <tr key={`field-${idx}`} className="border-b border-primary/15">
                    <td className="w-[42%] align-top px-5 md:px-6 py-3 text-sm md:text-base font-roboto font-semibold text-primary/70">
                      {f.label}
                    </td>
                    <td
                      className={`align-top px-5 md:px-6 py-3 text-sm md:text-base font-roboto font-bold break-words ${
                        f.emphasis ? 'text-accent' : 'text-primary'
                      }`}
                    >
                      {f.value}
                    </td>
                  </tr>
                ))}

                {tagGroups.map((g, idx) => (
                  <tr key={`group-${idx}`} className="border-b border-primary/15">
                    <td className="w-[42%] align-top px-5 md:px-6 py-3 text-sm md:text-base font-roboto font-semibold text-primary/70">
                      {g.label}
                    </td>
                    <td className="align-top px-5 md:px-6 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {g.items.map((item, i) => (
                          <span
                            key={`${item}-${i}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/5 border border-primary/20 text-sm font-roboto font-medium text-primary"
                          >
                            <i className="ri-checkbox-circle-fill text-[11px] text-accent"></i>
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}

                {paragraphs.map((p, idx) => (
                  <tr key={`para-${idx}`} className="border-b border-primary/15">
                    {p.label ? (
                      <td className="w-[42%] align-top px-5 md:px-6 py-3 text-sm md:text-base font-roboto font-semibold text-primary/70">
                        {p.label}
                      </td>
                    ) : null}
                    <td
                      colSpan={p.label ? 1 : 2}
                      className="align-top px-5 md:px-6 py-3 text-sm md:text-base font-roboto text-primary leading-relaxed break-words"
                    >
                      <ReadMore text={p.text} limit={320} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}