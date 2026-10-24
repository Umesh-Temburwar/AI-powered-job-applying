/**
 * Centralized constant declarations for portal configurations, rate limits, and status badges.
 */

export interface PortalMetadata {
  id: string;
  name: string;
  domain: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  defaultMaxDaily: number;
}

export const SUPPORTED_PORTALS: Record<string, PortalMetadata> = {
  naukri: {
    id: 'naukri',
    name: 'Naukri.com',
    domain: 'naukri.com',
    color: '#0078DB',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-400',
    defaultMaxDaily: 50,
  },
  internshala: {
    id: 'internshala',
    name: 'Internshala',
    domain: 'internshala.com',
    color: '#1295D8',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-400',
    defaultMaxDaily: 40,
  },
  indeed: {
    id: 'indeed',
    name: 'Indeed',
    domain: 'indeed.com',
    color: '#2164f3',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-400',
    defaultMaxDaily: 40,
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn Jobs',
    domain: 'linkedin.com',
    color: '#0A66C2',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-400',
    defaultMaxDaily: 35,
  },
};

export const APPLICATION_STATUS_CONFIG = {
  applied: { label: 'Applied', color: 'emerald' },
  screening: { label: 'In Review', color: 'blue' },
  interview: { label: 'Interview Scheduled', color: 'purple' },
  rejected: { label: 'Archived', color: 'zinc' },
  failed: { label: 'Submission Failed', color: 'rose' },
} as const;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_APPLICATIONS_PER_BATCH = 100;
