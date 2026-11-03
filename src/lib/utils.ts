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

// The sync button is for the site owner; feeds also sync on a schedule. The API still requires the admin key.
export const ADMIN_SYNC_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ADMIN_SYNC === 'true';
