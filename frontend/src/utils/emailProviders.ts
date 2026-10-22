export interface EmailProviderInfo {
  providerName: string;
  webmailUrl: string;
  buttonLabel: string;
}

const PROVIDER_ALLOWLIST: Record<string, { providerName: string; webmailUrl: string; buttonLabel: string }> = {
  'gmail.com': {
    providerName: 'Gmail',
    webmailUrl: 'https://mail.google.com',
    buttonLabel: 'Open Gmail',
  },
  'googlemail.com': {
    providerName: 'Gmail',
    webmailUrl: 'https://mail.google.com',
    buttonLabel: 'Open Gmail',
  },
  'outlook.com': {
    providerName: 'Outlook',
    webmailUrl: 'https://outlook.live.com/mail/',
    buttonLabel: 'Open Outlook',
  },
  'hotmail.com': {
    providerName: 'Outlook',
    webmailUrl: 'https://outlook.live.com/mail/',
    buttonLabel: 'Open Outlook',
  },
  'live.com': {
    providerName: 'Outlook',
    webmailUrl: 'https://outlook.live.com/mail/',
    buttonLabel: 'Open Outlook',
  },
  'msn.com': {
    providerName: 'Outlook',
    webmailUrl: 'https://outlook.live.com/mail/',
    buttonLabel: 'Open Outlook',
  },
  'yahoo.com': {
    providerName: 'Yahoo Mail',
    webmailUrl: 'https://mail.yahoo.com',
    buttonLabel: 'Open Yahoo Mail',
  },
  'ymail.com': {
    providerName: 'Yahoo Mail',
    webmailUrl: 'https://mail.yahoo.com',
    buttonLabel: 'Open Yahoo Mail',
  },
  'proton.me': {
    providerName: 'Proton Mail',
    webmailUrl: 'https://mail.proton.me',
    buttonLabel: 'Open Proton Mail',
  },
  'protonmail.com': {
    providerName: 'Proton Mail',
    webmailUrl: 'https://mail.proton.me',
    buttonLabel: 'Open Proton Mail',
  },
  'icloud.com': {
    providerName: 'iCloud Mail',
    webmailUrl: 'https://www.icloud.com/mail',
    buttonLabel: 'Open iCloud Mail',
  },
};

/**
 * Returns webmail destination for strictly allowlisted domains only.
 * Returns null for any custom or unverified domain (no guessing).
 */
export function getEmailProviderInfo(email?: string | null): EmailProviderInfo | null {
  if (!email || typeof email !== 'string') return null;

  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return null;

  const domain = parts[1];
  return PROVIDER_ALLOWLIST[domain] || null;
}
