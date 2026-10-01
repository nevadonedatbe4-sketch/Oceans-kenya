// Shared message-management layer used by both Inbox and Leads.
// Keeps read/unread, star, important, spam, archive, trash, labels and
// sent status consistent across the two tables.

export type MessageTabKey =
  | 'all'
  | 'unread'
  | 'read'
  | 'starred'
  | 'important'
  | 'spam'
  | 'archived'
  | 'sent'
  | 'trash';

export interface MessageTab {
  key: MessageTabKey;
  label: string;
  icon: string;
}

export const MESSAGE_TABS: MessageTab[] = [
  { key: 'all', label: 'All', icon: 'ri-mail-line' },
  { key: 'unread', label: 'Unread', icon: 'ri-mail-unread-line' },
  { key: 'read', label: 'Read', icon: 'ri-mail-open-line' },
  { key: 'starred', label: 'Starred', icon: 'ri-star-line' },
  { key: 'important', label: 'Important', icon: 'ri-flag-line' },
  { key: 'spam', label: 'Spam', icon: 'ri-spam-2-line' },
  { key: 'archived', label: 'Archived', icon: 'ri-archive-line' },
  { key: 'sent', label: 'Sent', icon: 'ri-send-plane-line' },
  { key: 'trash', label: 'Trash', icon: 'ri-delete-bin-line' },
];

// The label system is extendable — add new entries here and they will
// automatically appear in the label picker across both Inbox and Leads.
export const DEFAULT_LABELS: string[] = [
  'Important',
  'Follow Up',
  'Client',
  'New Lead',
  'Viewing',
  'Converted',
  'Lost',
  'Urgent',
];

export interface MessageCounts {
  all: number;
  unread: number;
  read: number;
  starred: number;
  important: number;
  spam: number;
  archived: number;
  sent: number;
  trash: number;
}

export const EMPTY_COUNTS: MessageCounts = {
  all: 0,
  unread: 0,
  read: 0,
  starred: 0,
  important: 0,
  spam: 0,
  archived: 0,
  sent: 0,
  trash: 0,
};