import { isArchived, type Amenity } from '@/lib/amenities';
import RowMoreMenu, { type RowMenuItem } from '@/pages/crm/components/RowMoreMenu';

interface AmenityRowActionsProps {
  amenity: Amenity;
  onEdit: () => void;
  onReviews: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
}

/**
 * Row actions for the Amenities list. Desktop and mobile both consolidate every
 * action into a single compact "⋮" menu (via the shared RowMoreMenu), so the
 * Actions column never steals width from the amenity data itself.
 */
export default function AmenityRowActions({
  amenity,
  onEdit,
  onReviews,
  onArchiveToggle,
  onDelete,
}: AmenityRowActionsProps) {
  const archived = isArchived(amenity);

  const items: RowMenuItem[] = [
    { key: 'edit', icon: 'ri-edit-line', label: 'Edit', onSelect: onEdit },
    { key: 'reviews', icon: 'ri-chat-3-line', label: 'Reviews', onSelect: onReviews },
    {
      key: 'archive',
      icon: archived ? 'ri-inbox-unarchive-line' : 'ri-inbox-archive-line',
      label: archived ? 'Remove from archive' : 'Archive',
      onSelect: onArchiveToggle,
    },
    {
      key: 'delete',
      icon: 'ri-delete-bin-line',
      label: 'Move to Recycle Bin',
      onSelect: onDelete,
      danger: true,
    },
  ];

  return <RowMoreMenu label={amenity.name} items={items} />;
}