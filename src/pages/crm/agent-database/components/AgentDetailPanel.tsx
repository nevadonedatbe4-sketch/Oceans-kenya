import { useState } from 'react';
import type { AgentDatabaseRecord } from '../types';
import { getStatus, SCORE_FIELDS } from '../constants';

interface Props {
  record: AgentDatabaseRecord;
  converting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
}

function DetailSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="pt-4 first:pt-0">
      <div className="flex items-center gap-2 mb-2">
        <i className={`${icon} text-[#0d5959] text-sm`} />
        <h4 className="font-jost text-xs font-semibold text-[#1a1a1a] uppercase tracking-wider">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-gray-50 last:border-0">
      <span className="text-xs font-roboto text-[#9ca3af] flex-shrink-0">{label}</span>
      <span className="text-xs font-roboto text-[#1a1a1a] text-right break-words">{value}</span>
    </div>
  );
}

function TagList({ items }: { items: string[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((i) => (
        <span key={i} className="inline-flex px-2 py-0.5 bg-[#0d5959]/8 text-[#0d5959] text-[11px] font-medium rounded-full">{i}</span>
      ))}
    </div>
  );
}

export default function AgentDetailPanel({ record, converting, onEdit, onDelete, onConvert }: Props) {
  const status = getStatus(record.relationship_status);
  const socials = record.social_links || {};
  const socialEntries = Object.entries(socials).filter(([, v]) => v);
  const expertise = Object.entries(record.area_expertise || {});

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {record.profile_photo ? (
            <img src={record.profile_photo} alt={record.full_name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#0d5959]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#0d5959] text-lg font-semibold">{record.full_name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-jost text-base text-[#1a1a1a] leading-snug">{record.full_name}</h3>
            {record.agency && <p className="text-xs font-roboto text-[#6b7280] mt-0.5">{record.agency}</p>}
            {record.job_title && <p className="text-xs font-roboto text-[#9ca3af]">{record.job_title}</p>}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                {status.label}
              </span>
              {record.quality_score !== null && record.quality_score !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#c8a45c]/15 text-[#8a6d2f]">
                  <i className="ri-star-fill text-[9px]" /> {record.quality_score}/100
                </span>
              )}
              {record.agent_account_id && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700">
                  <i className="ri-shield-check-line text-[10px]" /> Linked Account
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Areas */}
        {(record.primary_area || (record.areas_served && record.areas_served.length > 0)) && (
          <div>
            {record.primary_area && (
              <p className="text-xs font-roboto text-[#1a1a1a]">
                <span className="text-[#9ca3af]">Primary Area:</span> {record.primary_area}
              </p>
            )}
            {record.areas_served && record.areas_served.length > 0 && (
              <div className="mt-1.5">
                <TagList items={record.areas_served} />
              </div>
            )}
          </div>
        )}

        <DetailSection title="Contact" icon="ri-phone-line">
          <Row label="Phone" value={record.phone} />
          <Row label="WhatsApp" value={record.whatsapp} />
          <Row label="Email" value={record.email} />
          <Row label="Secondary Email" value={record.secondary_email} />
          <Row label="Website" value={record.website ? <a href={record.website} target="_blank" rel="noopener noreferrer" className="text-[#0d5959] hover:underline">{record.website}</a> : null} />
          {socialEntries.map(([k, v]) => (
            <Row key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={String(v)} />
          ))}
        </DetailSection>

        <DetailSection title="Location" icon="ri-map-pin-line">
          <Row label="County" value={record.county} />
          <Row label="City / Town" value={record.city} />
          <Row label="Office Location" value={record.office_location} />
          <Row label="Address" value={record.physical_address} />
          <Row label="Coverage" value={record.geographic_coverage} />
        </DetailSection>

        <DetailSection title="Specialisation" icon="ri-award-line">
          <TagList items={record.specialisations} />
        </DetailSection>

        <DetailSection title="Strengths" icon="ri-star-line">
          <TagList items={record.strengths} />
        </DetailSection>

        {expertise.length > 0 && (
          <DetailSection title="Area Expertise" icon="ri-map-2-line">
            <div className="flex flex-wrap gap-1.5">
              {expertise.map(([area, level]) => (
                <span key={area} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#c8a45c]/15 text-[#8a6d2f] text-[11px] font-medium rounded-full">
                  {area} <span className="opacity-70">•</span> {level}
                </span>
              ))}
            </div>
          </DetailSection>
        )}

        <DetailSection title="Private Assessment" icon="ri-lock-line">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
            <div className="col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-roboto text-[#9ca3af]">Quality Score</span>
                <span className="text-sm font-jost font-bold text-[#0d5959]">{record.quality_score ?? '—'}<span className="text-xs text-[#9ca3af] font-roboto">/100</span></span>
              </div>
            </div>
            {SCORE_FIELDS.map((f) => {
              const v = (record as any)[f.key];
              return (
                <div key={f.key} className="flex items-center justify-between">
                  <span className="text-xs font-roboto text-[#9ca3af]">{f.label}</span>
                  <span className="text-xs font-roboto font-semibold text-[#1a1a1a]">{v ?? '—'}<span className="text-[#9ca3af] font-normal">/5</span></span>
                </div>
              );
            })}
          </div>
          {record.super_admin_notes && (
            <div className="bg-[#f7f8fa] rounded-lg p-3">
              <p className="text-xs font-roboto text-[#4b5563] leading-relaxed whitespace-pre-wrap">{record.super_admin_notes}</p>
            </div>
          )}
        </DetailSection>

        <DetailSection title="Outreach" icon="ri-chat-3-line">
          <Row label="First Contact" value={record.first_contact_date} />
          <Row label="Last Contact" value={record.last_contact_date} />
          <Row label="Next Follow-Up" value={record.next_follow_up_date} />
          <Row label="Contact Method" value={record.contact_method} />
          <Row label="Contacted By" value={record.contacted_by} />
          <Row label="Preferred Method" value={record.preferred_contact_method} />
          {record.outreach_notes && <Row label="Outreach Notes" value={record.outreach_notes} />}
          {record.follow_up_notes && <Row label="Follow-Up Notes" value={record.follow_up_notes} />}
        </DetailSection>

        <DetailSection title="Source" icon="ri-radar-line">
          <Row label="Source" value={record.source} />
          <Row label="Source URL" value={record.source_url} />
          <Row label="Referral By" value={record.referral_by} />
          <Row label="Event" value={record.event} />
          <Row label="Publication" value={record.publication} />
          {record.how_found && <Row label="How Found" value={record.how_found} />}
          {record.why_valuable && <Row label="Why Valuable" value={record.why_valuable} />}
        </DetailSection>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 p-4 border-t border-[#f0f0f0] shrink-0">
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto text-[#1a1a1a] hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-edit-line" /> Edit
        </button>
        <button
          onClick={onConvert}
          disabled={converting || !!record.agent_account_id}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 ${
            record.agent_account_id ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-[#0d5959] text-white hover:bg-[#0b4a4a]'
          }`}
        >
          {converting ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
          ) : record.agent_account_id ? (
            <><i className="ri-shield-check-line" /> Agent Account Created</>
          ) : (
            <><i className="ri-user-add-line" /> Invite / Create Agent</>
          )}
        </button>
        <button
          onClick={onDelete}
          className="p-2.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
          title="Delete prospect"
        >
          <i className="ri-delete-bin-line" />
        </button>
      </div>
    </div>
  );
}