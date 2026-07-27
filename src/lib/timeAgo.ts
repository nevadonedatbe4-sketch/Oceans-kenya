export function formatTimeAgo(createdAt: string | Date): string {
  const now = new Date();
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const diffMs = now.getTime() - created.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `Added ${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `Added ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 0) return 'Added today';
  if (diffDays === 1) return 'Added yesterday';
  if (diffDays < 7) return `Added ${diffDays} days ago`;
  if (diffWeeks === 1) return 'Added 1 week ago';
  if (diffWeeks < 4) return `Added ${diffWeeks} weeks ago`;
  if (diffMonths === 1) return 'Added 1 month ago';
  if (diffMonths < 12) return `Added ${diffMonths} months ago`;
  if (diffYears === 1) return 'Added 1 year ago';
  return `Added ${diffYears} years ago`;
}