/**
 * Date and currency formatting utilities for the Dashboard and Applications CRM.
 */

/**
 * Format ISO date string into readable local representation (e.g., 'Oct 24, 2026').
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Returns a human-friendly relative time string (e.g., 'Just now', '5m ago', '2h ago', '3d ago').
 */
export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Recently';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return 'Recently';

    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return formatDate(d.toISOString());
  } catch {
    return 'Recently';
  }
}

/**
 * Format salary numbers into standard Indian CTC / international currency display.
 */
export function formatSalary(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return 'Not disclosed';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return String(amount);

  if (num >= 100000) {
    const lakhs = (num / 100000).toFixed(1).replace(/\.0$/, '');
    return `₹${lakhs} LPA`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}
