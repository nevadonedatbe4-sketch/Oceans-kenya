/**
 * SeoSearchPreview — a Google-style search-result preview used by every CRM
 * SEO panel so all four forms show the exact same snippet treatment.
 */
interface Props {
  slug: string;
  title: string;
  description: string;
  breadcrumb?: string;
  site?: string;
}

export default function SeoSearchPreview({
  slug,
  title,
  description,
  breadcrumb = 'property',
  site = 'oceanske.com',
}: Props) {
  return (
    <div className="pt-5 border-t border-[#eef1f4]">
      <p className="text-[12px] font-bold text-[#7a8a99] uppercase tracking-widest mb-3">Search Preview</p>
      <div className="border border-[#e8ecf0] rounded-lg p-4 bg-[#fafbfc]">
        <p className="text-[12px] text-[#5f6368] truncate">
          {site} <span className="text-[#9aa0a6]">› {breadcrumb} › {slug}</span>
        </p>
        <p className="text-[17px] text-[#1a0dab] font-medium leading-snug mt-0.5 truncate">
          {title}
        </p>
        <p className="text-[13px] text-[#4d5156] leading-relaxed mt-0.5 line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  );
}