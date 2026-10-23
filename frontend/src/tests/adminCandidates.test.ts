import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchCandidatesApi,
  fetchAdminStats,
  fetchPortalConfigs,
} from '../services/adminService';

// Mock apiClient to simulate network fallback or API responses
vi.mock('../services/api', () => ({
  apiClient: vi.fn().mockRejectedValue(new Error('Network error/No backend')),
  getBaseApiUrl: vi.fn().mockReturnValue('http://127.0.0.1:8001'),
}));

// Mock supabaseClient
vi.mock('../lib/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'fake-admin-token',
            user: { email: 'umeshtemburwar2002@gmail.com' },
          },
        },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            count: 3,
            data: [
              {
                id: '0ff8ac23-96d8-419e-9cff-ffd3b3430f17',
                full_name: 'Umesh Temburwar',
                email: 'umeshtemburwar2002@gmail.com',
                created_at: '2026-10-22T21:53:58.571629+00',
                is_onboarded: true,
                skills: ['React.js', 'Node.js', 'Python'],
                headline: 'Full Stack Developer',
              },
              {
                id: '976be0cd-85a2-4274-9a87-598328337d7a',
                full_name: 'Vaibhav Waghalkar',
                email: 'vaibhavwaghalkar3@gmail.com',
                created_at: '2026-10-23T08:09:12.536507+00',
                is_onboarded: false,
                skills: ['Python', 'FastAPI', 'React.js'],
                headline: 'AI Full-stack Developer',
              },
            ],
            error: null,
          }),
        };
      }
      if (table === 'applications') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { user_id: '0ff8ac23-96d8-419e-9cff-ffd3b3430f17', status: 'applied', applied_at: new Date().toISOString() },
              { user_id: '976be0cd-85a2-4274-9a87-598328337d7a', status: 'completed', applied_at: new Date().toISOString() },
            ],
            error: null,
          }),
        };
      }
      if (table === 'platform_connections') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { user_id: '0ff8ac23-96d8-419e-9cff-ffd3b3430f17', platform: 'Naukri.com', status: 'connected' },
              { user_id: '976be0cd-85a2-4274-9a87-598328337d7a', platform: 'Internshala', status: 'connected' },
            ],
            error: null,
          }),
        };
      }
      if (table === 'portal_configs') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { id: 'naukri', name: 'Naukri.com', is_enabled: true, daily_limit: 50, delay_seconds: 25 },
            ],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  },
}));

describe('Admin Candidates and Telemetry Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retrieves all candidates including other registered users like Vaibhav Waghalkar', async () => {
    const res = await fetchCandidatesApi(1, 20);

    expect(res).toBeDefined();
    expect(res.candidates.length).toBeGreaterThanOrEqual(2);

    const emails = res.candidates.map((c) => c.email.toLowerCase());
    expect(emails).toContain('vaibhavwaghalkar3@gmail.com');
    expect(emails).toContain('umeshtemburwar2002@gmail.com');

    const vaibhav = res.candidates.find((c) => c.email === 'vaibhavwaghalkar3@gmail.com');
    expect(vaibhav).toBeDefined();
    expect(vaibhav?.full_name).toBe('Vaibhav Waghalkar');
    expect(vaibhav?.connected_portals).toContain('Internshala');
  });

  it('filters candidates correctly when a search query is passed', async () => {
    const res = await fetchCandidatesApi(1, 20, 'Vaibhav');
    expect(res.candidates.length).toBe(1);
    expect(res.candidates[0].email).toBe('vaibhavwaghalkar3@gmail.com');
  });

  it('calculates admin stats properly with multiple registered candidates', async () => {
    const stats = await fetchAdminStats();
    expect(stats.total_candidates).toBeGreaterThanOrEqual(3);
    expect(stats.system_status).toBe('operational');
  });

  it('fetches portal configurations', async () => {
    const portals = await fetchPortalConfigs();
    expect(portals.length).toBeGreaterThan(0);
    expect(portals[0].name).toBe('Naukri.com');
  });
});
