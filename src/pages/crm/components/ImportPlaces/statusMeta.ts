import type { RowStatus } from '@/lib/importPlaces';

export const STATUS_META: Record<RowStatus, { label: string; className: string; icon: string; hint: string }> = {
  ready: {
    label: 'Ready to import',
    className: 'bg-emerald-50 text-emerald-700',
    icon: 'ri-checkbox-circle-line',
    hint: 'All required fields look good.',
  },
  warning: {
    label: 'Will import (has notes)',
    className: 'bg-amber-50 text-amber-700',
    icon: 'ri-information-line',
    hint: 'This row will be imported regardless — the notes are just for your awareness.',
  },
  error: {
    label: 'Cannot import',
    className: 'bg-red-50 text-red-700',
    icon: 'ri-close-circle-line',
    hint: 'Missing required information.',
  },
};