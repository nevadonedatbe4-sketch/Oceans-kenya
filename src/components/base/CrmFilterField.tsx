import type { ReactNode } from 'react';

/**
 * CrmFilterField - a labelled filter control used inside the expandable
 * "Refine Results" panel shared by the CRM list pages.
 *
 * It keeps the label styling identical across My Properties, Land Listings,
 * New Developments and the JV Desk so every CRM's filter panel reads the same.
 *
 * tone:
 *   'contrast' -> dark-on-mobile / light-on-desktop (Listings, Land, Developments)
 *   'light'    -> always light (JV Desk)
 */
export interface CrmFilterFieldProps {
  label: string;
  children: ReactNode;
  tone?: 'contrast' | 'light';
}

export default function CrmFilterField({ label, children, tone = 'light' }: CrmFilterFieldProps) {
  const labelClass = tone === 'contrast'
    ? 'text-white lg:text-[#374151]'
    : 'text-[#6b7684]';
  return (
    <div className="flex flex-col gap-1.5">
      <label className={`text-xs font-bold uppercase tracking-wide ${labelClass}`}>{label}</label>
      {children}
    </div>
  );
}