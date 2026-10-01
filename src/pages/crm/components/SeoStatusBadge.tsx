/**
 * SeoStatusBadge — the shared "Auto-filled / Customised" pill used on every
 * CRM SEO panel header so Listings, Land, Developments and JV all read the
 * same. Renders "Customised" once any SEO override exists, otherwise
 * "Auto-filled".
 */
interface Props {
  customised: boolean;
}

export default function SeoStatusBadge({ customised }: Props) {
  if (customised) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-[#0d5959] bg-[#e8f5f5] rounded-full whitespace-nowrap">
        <i className="ri-edit-line text-[11px]" />
        Customised
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-[#7a8a99] bg-[#f1f4f6] rounded-full whitespace-nowrap">
      <i className="ri-magic-line text-[11px]" />
      Auto-filled
    </span>
  );
}