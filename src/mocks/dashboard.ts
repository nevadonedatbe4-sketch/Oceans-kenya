export interface DashboardStats {
  totalProperties: number;
  activeProperties: number;
  featuredProperties: number;
  publishedProperties: number;
  draftProperties: number;
  totalLeads: number;
  newLeadsWeek: number;
  openLeads: number;
  pendingFollowUps: number;
  totalDeals: number;
  dealsInPipeline: number;
  pipelineValue: number;
  wonDeals: number;
  winRate: number;
  totalAgents: number;
}

export interface RecentLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  source: string | null;
  created_at: string;
}

export interface RecentDeal {
  id: string;
  title: string;
  status: string;
  price: number | null;
  created_at: string;
}

export interface RecentProperty {
  id: string;
  title: string;
  location: string | null;
  price: number | null;
  status: string;
  property_type: string | null;
  is_published: boolean;
  created_at: string;
}

export const mockStats: DashboardStats = {
  totalProperties: 142,
  activeProperties: 98,
  featuredProperties: 24,
  publishedProperties: 120,
  draftProperties: 22,
  totalLeads: 387,
  newLeadsWeek: 23,
  openLeads: 156,
  pendingFollowUps: 89,
  totalDeals: 64,
  dealsInPipeline: 18,
  pipelineValue: 284000000,
  wonDeals: 31,
  winRate: 48,
  totalAgents: 12,
};

export const mockRecentLeads: RecentLead[] = [
  {
    id: '1',
    first_name: 'James',
    last_name: 'Mwangi',
    email: 'james.mwangi@gmail.com',
    phone: '+254 712 345 678',
    status: 'new',
    source: 'Contact page',
    created_at: '2026-05-30T09:15:00Z',
  },
  {
    id: '2',
    first_name: 'Sarah',
    last_name: 'Odhiambo',
    email: 'sarah.o@yahoo.com',
    phone: '+254 723 456 789',
    status: 'contacted',
    source: 'Property detail',
    created_at: '2026-05-29T14:30:00Z',
  },
  {
    id: '3',
    first_name: 'David',
    last_name: 'Kamau',
    email: 'dkamau@gmail.com',
    phone: '+254 734 567 890',
    status: 'viewing',
    source: 'Valuation page',
    created_at: '2026-05-28T11:00:00Z',
  },
  {
    id: '4',
    first_name: 'Amina',
    last_name: 'Hassan',
    email: 'amina.h@outlook.com',
    phone: '+254 745 678 901',
    status: 'negotiating',
    source: 'Buy page',
    created_at: '2026-05-27T16:45:00Z',
  },
  {
    id: '5',
    first_name: 'Peter',
    last_name: 'Njoroge',
    email: 'p.njoroge@gmail.com',
    phone: '+254 756 789 012',
    status: 'new',
    source: 'Rent page',
    created_at: '2026-05-26T08:20:00Z',
  },
  {
    id: '6',
    first_name: 'Grace',
    last_name: 'Wambui',
    email: 'grace.w@icloud.com',
    phone: '+254 767 890 123',
    status: 'contacted',
    source: 'Contact page',
    created_at: '2026-05-25T13:10:00Z',
  },
];

export const mockRecentDeals: RecentDeal[] = [
  {
    id: '1',
    title: 'Karen 5-Bedroom Villa',
    status: 'negotiation',
    price: 85000000,
    created_at: '2026-05-29T10:00:00Z',
  },
  {
    id: '2',
    title: 'Runda Estate Mansion',
    status: 'prospect',
    price: 120000000,
    created_at: '2026-05-28T09:30:00Z',
  },
  {
    id: '3',
    title: 'Kilimani Apartment',
    status: 'offer',
    price: 28000000,
    created_at: '2026-05-27T15:00:00Z',
  },
  {
    id: '4',
    title: 'Lavington Townhouse',
    status: 'due_diligence',
    price: 45000000,
    created_at: '2026-05-26T11:45:00Z',
  },
  {
    id: '5',
    title: 'Westlands Penthouse',
    status: 'negotiation',
    price: 65000000,
    created_at: '2026-05-25T08:15:00Z',
  },
];

export const mockRecentProperties: RecentProperty[] = [
  {
    id: '1',
    title: 'Luxury 5-Bedroom Villa in Karen',
    location: 'Karen, Nairobi',
    price: 85000000,
    status: 'available',
    property_type: 'Villa',
    is_published: true,
    created_at: '2026-05-30T08:00:00Z',
  },
  {
    id: '2',
    title: 'Modern 3-Bed Apartment in Kilimani',
    location: 'Kilimani, Nairobi',
    price: 28000000,
    status: 'available',
    property_type: 'Apartment',
    is_published: true,
    created_at: '2026-05-29T14:00:00Z',
  },
  {
    id: '3',
    title: 'Spacious 4-Bed Townhouse in Lavington',
    location: 'Lavington, Nairobi',
    price: 45000000,
    status: 'available',
    property_type: 'Townhouse',
    is_published: true,
    created_at: '2026-05-28T10:30:00Z',
  },
  {
    id: '4',
    title: 'Prime Land in Runda',
    location: 'Runda, Nairobi',
    price: 95000000,
    status: 'available',
    property_type: 'Land',
    is_published: false,
    created_at: '2026-05-27T16:00:00Z',
  },
];