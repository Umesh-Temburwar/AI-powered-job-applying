/**
 * Cooldown & Pending Email Storage Utilities
 *
 * Requirements:
 * - 60s cooldown stored as an epoch timestamp in sessionStorage so it survives page reloads.
 * - Countdown is derived from Date.now() on every tick.
 * - Non-sensitive email address stored in sessionStorage (never passwords or tokens).
 */

export const RESEND_COOLDOWN_KEY = 'ujb_auth_resend_cooldown_expiry';
export const PENDING_EMAIL_KEY = 'ujb_pending_verification_email';

/**
 * Returns remaining seconds until cooldown expires.
 * Always derived from Date.now().
 */
export function getRemainingCooldown(): number {
  try {
    const raw = sessionStorage.getItem(RESEND_COOLDOWN_KEY);
    if (!raw) return 0;
    const expiry = parseInt(raw, 10);
    if (isNaN(expiry)) return 0;
    const remainingMs = expiry - Date.now();
    return Math.max(0, Math.ceil(remainingMs / 1000));
  } catch {
    return 0;
  }
}

/**
 * Sets cooldown expiry timestamp in sessionStorage.
 * @param seconds Number of seconds to enforce cooldown (default: 60s).
 */
export function setCooldownExpiry(seconds = 60): number {
  const expiry = Date.now() + seconds * 1000;
  try {
    sessionStorage.setItem(RESEND_COOLDOWN_KEY, expiry.toString());
  } catch {
    // SessionStorage may fail in private mode, handled gracefully
  }
  return seconds;
}

/**
 * Clears active cooldown timestamp.
 */
export function clearCooldown(): void {
  try {
    sessionStorage.removeItem(RESEND_COOLDOWN_KEY);
  } catch {}
}

/**
 * Stores the pending verification email in sessionStorage (never passwords/tokens).
 */
export function savePendingEmail(email: string): void {
  try {
    if (email && email.trim()) {
      sessionStorage.setItem(PENDING_EMAIL_KEY, email.trim().toLowerCase());
    }
  } catch {}
}

/**
 * Retrieves the pending verification email from sessionStorage.
 */
export function getPendingEmail(): string | null {
  try {
    const email = sessionStorage.getItem(PENDING_EMAIL_KEY);
    return email ? email.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Clears the pending verification email from sessionStorage.
 */
export function clearPendingEmail(): void {
  try {
    sessionStorage.removeItem(PENDING_EMAIL_KEY);
  } catch {}
}
