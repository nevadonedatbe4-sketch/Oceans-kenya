export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  source: string | null;
  budget: number | null;
  notes: string | null;
  client_type: string | null;
  move_in_date: string | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
  is_starred: boolean;
  is_important: boolean;
  priority: string;
  next_follow_up_at: string | null;
  reply_status: string | null;
  is_read: boolean;
  is_archived: boolean;
  is_spam: boolean;
}

export interface Agent {
  id: string;
  name: string;
}

export interface LeadCounts {
  all: number;
  new: number;
  contacted: number;
  viewing: number;
  negotiating: number;
  converted: number;
  lost: number;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string;
  sender_id: string | null;
  agent_id: string | null;
  body: string;
  delivery_status: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_name: string;
  action: string;
  module: string;
  record_id: string;
  record_title: string;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  created_at: string;
}

export const statusOptions = ['new', 'contacted', 'viewing', 'negotiating', 'converted', 'lost'];

export const statusLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  viewing: 'Viewing',
  negotiating: 'Negotiating',
  converted: 'Converted',
  lost: 'Lost',
};

export const statusColors: Record<string, string> = {
  new: 'bg-primary/10 text-primary',
  contacted: 'bg-golden/15 text-golden',
  viewing: 'bg-accent/10 text-accent',
  negotiating: 'bg-amber-100 text-amber-800',
  converted: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
};

export const clientTypeOptions = ['renter', 'landlord', 'buyer', 'seller', 'investor'];

export const clientTypeLabels: Record<string, string> = {
  renter: 'Renter',
  landlord: 'Landlord',
  buyer: 'Buyer',
  seller: 'Seller',
  investor: 'Investor',
};

export const clientTypeColors: Record<string, string> = {
  renter: 'bg-accent/10 text-accent',
  landlord: 'bg-golden/15 text-golden',
  buyer: 'bg-primary/10 text-primary',
  seller: 'bg-amber-100 text-amber-800',
  investor: 'bg-slate-200 text-slate-700',
};

export const sourceOptions = ['website', 'whatsapp', 'referral', 'social', 'email', 'phone', 'walk_in', 'manual', 'property_portal'];