/**
 * Validation utilities for candidate onboarding forms, connections, and portal credentials.
 */

/**
 * Validates standard email address format.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

/**
 * Validates international and 10-digit Indian mobile numbers.
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  // Accepts +91XXXXXXXXXX, 91XXXXXXXXXX, or 10 digit numbers
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const regex = /^(\+?\d{1,3})?[6-9]\d{9}$/;
  return regex.test(cleaned);
}

/**
 * Validates HTTP/HTTPS web URLs.
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Checks if a string has non-empty content after trimming.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
