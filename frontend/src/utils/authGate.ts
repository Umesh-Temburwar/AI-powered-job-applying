/**
 * Centralized Master Access Password Verifier
 * Used across HomePageGate, BotLaunchPasswordModal, and SiteAccessGate.
 */

const SALT = 'universal_job_bot_secure_salt_2026';

// Cryptographic SHA-256 hashes for authorized master passwords:
// 1. "umesh" -> 1ab3384539470876f7b2ed061d9705ffeda83e7a512e5b5dd01b945b9a9b4720
// 2. "umesh@123" -> 4b263082436b7a7c37eca4ee51793fc884f4123a682f03ba629d521ed42ff6d2
export const AUTHORIZED_HASHES = [
  '1ab3384539470876f7b2ed061d9705ffeda83e7a512e5b5dd01b945b9a9b4720',
  '4b263082436b7a7c37eca4ee51793fc884f4123a682f03ba629d521ed42ff6d2',
];

/**
 * Computes a salted SHA-256 digest using native browser WebCrypto API.
 */
export async function hashAccessPassword(rawKey: string): Promise<string> {
  const normalized = SALT + rawKey.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const cryptoObj =
    (typeof window !== 'undefined' && window.crypto?.subtle) || globalThis.crypto?.subtle;

  if (cryptoObj) {
    const buffer = await cryptoObj.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple hash for environments without WebCrypto
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/**
 * Verifies if the provided raw password matches any authorized master access key.
 */
export async function verifyMasterPassword(rawPassword: string): Promise<boolean> {
  const trimmed = rawPassword.trim();
  if (!trimmed) return false;

  const normalized = trimmed.toLowerCase();
  if (normalized === 'umesh' || normalized === 'umesh@123') {
    return true;
  }

  try {
    const computedHash = await hashAccessPassword(trimmed);
    return AUTHORIZED_HASHES.includes(computedHash);
  } catch {
    return normalized === 'umesh' || normalized === 'umesh@123';
  }
}

