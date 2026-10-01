import { Link } from 'react-router-dom';
import type { ShareObject } from '../types';

const TYPE_ICON: Record<string, string> = {
  property: 'ri-home-4-line',
  listing: 'ri-building-2-line',
  lead: 'ri-user-follow-line',
  client: 'ri-user-star-line',
  contact: 'ri-contacts-book-line',
  viewing: 'ri-eye-line',
  appointment: 'ri-calendar-check-line',
  deal: 'ri-hand-coin-line',
};

const TYPE_LABEL: Record<string, string> = {
  property: 'Property',
  listing: 'Listing',
  lead: 'Lead',
  client: 'Client',
  contact: 'Contact',
  viewing: 'Viewing Appointment',
  appointment: 'Appointment',
  deal: 'Deal',
};

const TYPE_COLOR: Record<string, string> = {
  property: 'text-teal-300 bg-teal-500/15',
  listing: 'text-slate-200 bg-slate-400/15',
  lead: 'text-indigo-300 bg-indigo-500/15',
  client: 'text-emerald-300 bg-emerald-500/15',
  contact: 'text-sky-300 bg-sky-500/15',
  viewing: 'text-amber-300 bg-amber-500/15',
  appointment: 'text-purple-300 bg-purple-500/15',
  deal: 'text-rose-300 bg-rose-500/15',
};

/** A secure CRM context card shared inside Messenger. Clicking through takes the
 *  recipient to the real CRM page, which re-runs normal authorization (PortalGuard + RLS). */
export function ShareCard({ object }: { object: ShareObject }) {
  const inner = (
    <>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${TYPE_COLOR[object.type] || 'bg-[#202c33] text-[#8696a0]'}`}>
        <i className={`${TYPE_ICON[object.type] || 'ri-share-line'} text-base`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8696a0]">{TYPE_LABEL[object.type] || 'Shared'}</p>
        <p className="text-sm font-medium text-[#e9edef] truncate">{object.title}</p>
        {object.subtitle && <p className="text-xs text-[#8696a0] truncate mt-0.5">{object.subtitle}</p>}
      </div>
      <i className="ri-arrow-right-s-line text-[#8696a0] text-lg flex-shrink-0" />
    </>
  );

  const cls = 'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border border-white/10 bg-black/20 hover:bg-black/30 transition-colors text-left cursor-pointer';

  return object.href ? (
    <Link to={object.href} className={cls}>{inner}</Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}