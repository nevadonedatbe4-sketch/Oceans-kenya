export const SPECIALISATIONS = [
  'Residential Sales',
  'Residential Lettings',
  'Luxury Property',
  'Commercial Sales',
  'Commercial Leasing',
  'Land',
  'Residential Land',
  'Commercial Land',
  'Agricultural Land',
  'Industrial Land',
  'Development Land',
  'Joint Ventures',
  'New Developments',
  'Property Management',
  'Student Accommodation',
  'Short-Term Rentals',
  'Hospitality',
  'Industrial Property',
  'Warehousing',
  'Office Space',
  'Retail',
  'Mixed Use',
  'Investment Property',
  'Off-Plan Property',
  'Distressed Property',
  'Property Valuation',
  'Relocation',
  'Corporate Real Estate',
];

export const STRENGTHS = [
  'Strong Seller Network',
  'Strong Buyer Network',
  'Strong Land Network',
  'Strong Developer Network',
  'Strong Investor Network',
  'Luxury Market Expertise',
  'Commercial Expertise',
  'Residential Expertise',
  'Lettings Expertise',
  'Negotiation',
  'Property Marketing',
  'Digital Marketing',
  'Social Media',
  'Local Area Knowledge',
  'Diaspora Clients',
  'Corporate Clients',
  'High-Net-Worth Clients',
  'Development Sales',
  'Off-Plan Sales',
  'Land Transactions',
  'Property Management',
  'Lead Generation',
  'Closing Ability',
  'Networking',
  'Referral Network',
];

export interface StatusOption {
  value: string;
  label: string;
  color: string;
}

export const RELATIONSHIP_STATUSES: StatusOption[] = [
  { value: 'new_prospect', label: 'New Prospect', color: '#6b7280' },
  { value: 'researched', label: 'Researched', color: '#0d5959' },
  { value: 'contacted', label: 'Contacted', color: '#c8a45c' },
  { value: 'follow_up_required', label: 'Follow-Up Required', color: '#f58300' },
  { value: 'in_discussion', label: 'In Discussion', color: '#0d9488' },
  { value: 'interested', label: 'Interested', color: '#088135' },
  { value: 'invited', label: 'Invited', color: '#b45309' },
  { value: 'onboarding', label: 'Onboarding', color: '#047857' },
  { value: 'active_agent', label: 'Active Agent', color: '#16a34a' },
  { value: 'declined', label: 'Declined', color: '#dc2626' },
  { value: 'not_interested', label: 'Not Interested', color: '#9ca3af' },
  { value: 'do_not_contact', label: 'Do Not Contact', color: '#b91c1c' },
  { value: 'archived', label: 'Archived', color: '#6b7280' },
];

export const AGENT_TYPES = [
  'Individual Agent',
  'Agency',
  'Developer Sales Agent',
  'Property Manager',
  'Commercial Specialist',
  'Land Specialist',
  'Luxury Specialist',
  'Investment Specialist',
];

export const CONTACT_METHODS = [
  'Phone',
  'WhatsApp',
  'Email',
  'LinkedIn',
  'Instagram',
  'In Person',
  'Referral',
  'Event',
  'Other',
];

export const SOURCES = [
  'Social Media',
  'Website',
  'Existing Network',
  'Manual Research',
  'Referral',
  'Event',
  'Publication',
  'Other',
];

export const AREA_EXPERTISE_LEVELS = ['Expert', 'Strong', 'Good', 'Limited'];

export const KENYA_COUNTIES = [
  'Baringo',
  'Bomet',
  'Bungoma',
  'Busia',
  'Elgeyo Marakwet',
  'Embu',
  'Garissa',
  'Homa Bay',
  'Isiolo',
  'Kajiado',
  'Kakamega',
  'Kericho',
  'Kiambu',
  'Kilifi',
  'Kirinyaga',
  'Kisii',
  'Kisumu',
  'Kitui',
  'Kwale',
  'Laikipia',
  'Lamu',
  'Machakos',
  'Makueni',
  'Mandera',
  'Marsabit',
  'Meru',
  'Migori',
  'Mombasa',
  "Murang'a",
  'Nairobi',
  'Nakuru',
  'Nandi',
  'Narok',
  'Nyamira',
  'Nyandarua',
  'Nyeri',
  'Samburu',
  'Siaya',
  'Taita Taveta',
  'Tana River',
  'Tharaka Nithi',
  'Trans Nzoia',
  'Turkana',
  'Uasin Gishu',
  'Vihiga',
  'Wajir',
  'West Pokot',
];

export const SCORE_FIELDS: { key: string; label: string; max: number }[] = [
  { key: 'reputation_score', label: 'Reputation', max: 5 },
  { key: 'market_knowledge', label: 'Market Knowledge', max: 5 },
  { key: 'listing_quality', label: 'Listing Quality', max: 5 },
  { key: 'responsiveness', label: 'Responsiveness', max: 5 },
  { key: 'professionalism', label: 'Professionalism', max: 5 },
  { key: 'negotiation_strength', label: 'Negotiation', max: 5 },
  { key: 'network_strength', label: 'Network', max: 5 },
  { key: 'digital_presence', label: 'Digital Presence', max: 5 },
  { key: 'overall_potential', label: 'Overall Potential', max: 5 },
];

export function getStatus(status: string): StatusOption {
  return (
    RELATIONSHIP_STATUSES.find((s) => s.value === status) ||
    RELATIONSHIP_STATUSES[0]
  );
}

export const QUICK_FILTERS: { key: string; label: string; predicate: (r: any) => boolean }[] = [
  { key: 'top_agents', label: 'Top Agents', predicate: (r) => (r.quality_score ?? 0) >= 80 },
  { key: 'top_luxury', label: 'Top Luxury Agents', predicate: (r) => (r.specialisations ?? []).includes('Luxury Property') },
  { key: 'top_land', label: 'Top Land Agents', predicate: (r) => (r.specialisations ?? []).some((s: string) => s.includes('Land')) },
  { key: 'top_commercial', label: 'Top Commercial Agents', predicate: (r) => (r.specialisations ?? []).some((s: string) => s.includes('Commercial')) },
  { key: 'top_nairobi', label: 'Top Nairobi Agents', predicate: (r) => r.county === 'Nairobi' },
  { key: 'top_mombasa', label: 'Top Mombasa Agents', predicate: (r) => r.county === 'Mombasa' },
  { key: 'top_kisumu', label: 'Top Kisumu Agents', predicate: (r) => r.county === 'Kisumu' },
  { key: 'developers_agents', label: "Developers' Agents", predicate: (r) => (r.strengths ?? []).includes('Strong Developer Network') },
  { key: 'to_contact', label: 'Agents To Contact', predicate: (r) => ['new_prospect', 'researched'].includes(r.relationship_status) },
  { key: 'follow_ups_due', label: 'Follow-Ups Due', predicate: (r) => !!r.next_follow_up_date },
  { key: 'invited', label: 'Invited Agents', predicate: (r) => r.relationship_status === 'invited' },
  { key: 'active', label: 'Active Agents', predicate: (r) => r.relationship_status === 'active_agent' },
];