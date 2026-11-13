import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return 'Recently';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (err) {
    return 'Recently';
  }
}

export function formatDateFull(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '';
    return format(date, 'MMM d, yyyy');
  } catch (err) {
    return '';
  }
}

// Read time comes from the feed's text, so a feed that only gives an excerpt yields "1 min" (9,496 of
// 9,499 excerpt-only posts on 2026-11-13). Show it only when it's longer than that, rather than show a wrong number.
export function isReadTimeKnown(readTime: number): boolean {
  return readTime > 1;
}

// URL-safe name for a topic, as used in /feed/<slug>.xml: 'AI & ML' -> 'ai-ml'
export function topicSlug(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// The sync button is for the site owner; feeds also sync on a schedule. The API still requires the admin key.
export const ADMIN_SYNC_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ADMIN_SYNC === 'true';
