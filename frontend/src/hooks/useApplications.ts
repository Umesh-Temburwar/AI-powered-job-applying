import { useState, useEffect, useCallback, useRef } from 'react';
import type { Application, DashboardMetrics, ActivityItem } from '../types';
import {
  getApplicationsApi,
  createApplicationApi,
  deleteApplicationApi,
  exportApplicationsCsvApi,
  getDashboardSummary,
  getDashboardActivitiesApi,
  type DashboardSummaryApiResponse,
  type BackendApplicationItem,
  type BackendActivityItem,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface ApplicationFilterParams {
  status?: string;
  platform?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

function mapBackendToApplication(b: BackendApplicationItem): Application {
  return {
    id: b.id,
    userId: b.user_id,
    jobTitle: b.job_title,
    company: b.company,
    platform: b.platform as any,
    location: b.location || 'Not specified',
    salary: b.salary || 'Not disclosed',
    url: b.job_url,
    status: b.status as any,
    appliedDate: b.applied_at || b.created_at,
    notes: b.notes || undefined,
  };
}

function mapBackendToActivity(b: BackendActivityItem): ActivityItem {
  return {
    id: b.id,
    title: b.title,
    description: b.description,
    timestamp: b.timestamp ? new Date(b.timestamp).toLocaleString() : 'Recent',
    type: (b.type as any) || 'application',
    statusBadge: b.status_badge as any,
  };
}

interface CachedApplicationsData {
  key: string;
  items: Application[];
  total: number;
  totalPages: number;
  timestamp: number;
}

let cachedApplicationsByUserId: Record<string, CachedApplicationsData> = {};

export function clearCachedApplications() {
  cachedApplicationsByUserId = {};
}

interface CachedDashboardData {
  metrics: DashboardMetrics;
  apiSummary: DashboardSummaryApiResponse;
  activities: ActivityItem[];
  timestamp: number;
}

let cachedDashboardByUserId: Record<string, CachedDashboardData> = {};

export function clearCachedDashboard() {
  cachedDashboardByUserId = {};
}

export function useApplications(initialParams?: ApplicationFilterParams) {
  const { session, user, getToken } = useAuth();
  const userId = user?.id || session?.user?.id || '';
  const token = session?.token;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [page, setPage] = useState<number>(initialParams?.page || 1);
  const [pageSize] = useState<number>(initialParams?.pageSize || 10);
  const [filters, setFilters] = useState<ApplicationFilterParams>(initialParams || {});

  const currentCacheKey = `${userId}-${filters.status || ''}-${filters.platform || ''}-${filters.query || ''}-${page}-${pageSize}`;
  const userCached = userId ? cachedApplicationsByUserId[userId] : null;
  const hasMatchedCache = Boolean(userCached && userCached.key === currentCacheKey);

  const [applications, setApplications] = useState<Application[]>(() =>
    hasMatchedCache ? userCached!.items : []
  );
  const [total, setTotal] = useState<number>(() =>
    hasMatchedCache ? userCached!.total : 0
  );
  const [totalPages, setTotalPages] = useState<number>(() =>
    hasMatchedCache ? userCached!.totalPages : 1
  );
  const [loading, setLoading] = useState<boolean>(() => !Boolean(hasMatchedCache));
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchApplications = useCallback(async () => {
    const activeToken = (await getTokenRef.current?.()) || token;
    if (!userId || !activeToken) {
      if (isMountedRef.current) {
        setApplications([]);
        setTotal(0);
        setTotalPages(1);
        setLoading(false);
      }
      return;
    }

    try {
      if (!userCached && isMountedRef.current) {
        setLoading(true);
      }
      if (isMountedRef.current) setError(null);
      const res = await getApplicationsApi(activeToken || undefined, {
        ...filters,
        page,
        pageSize,
      });
      const mapped = res.items.map(mapBackendToApplication);
      if (userId) {
        cachedApplicationsByUserId[userId] = {
          key: currentCacheKey,
          items: mapped,
          total: res.total,
          totalPages: res.total_pages,
          timestamp: Date.now(),
        };
      }
      if (isMountedRef.current && typeof window !== 'undefined') {
        setApplications(mapped);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      }
    } catch (err) {
      if (isMountedRef.current && typeof window !== 'undefined') {
        setError(err instanceof Error ? err.message : 'Failed to fetch applications');
        if (!userCached) {
          setApplications([]);
          setTotal(0);
        }
      }
    } finally {
      if (isMountedRef.current && typeof window !== 'undefined') {
        setLoading(false);
      }
    }
  }, [token, userId, filters, page, pageSize, currentCacheKey]);

  useEffect(() => {
    if (!userId) {
      setApplications([]);
      setTotal(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }
    const cached = cachedApplicationsByUserId[userId];
    if (cached && cached.key === currentCacheKey) {
      setApplications(cached.items);
      setTotal(cached.total);
      setTotalPages(cached.totalPages);
    } else {
      setApplications([]);
      setTotal(0);
      setTotalPages(1);
    }
    fetchApplications();
  }, [userId, fetchApplications]);

  const updateFilters = (newFilters: Partial<ApplicationFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const createApplication = async (data: Partial<BackendApplicationItem>) => {
    const activeToken = (await getToken?.()) || token;
    if (!activeToken) throw new Error('Not authenticated');
    const created = await createApplicationApi(activeToken, data);
    await fetchApplications();
    return mapBackendToApplication(created);
  };

  const deleteApplication = async (id: string) => {
    const activeToken = (await getToken?.()) || token;
    if (!activeToken) throw new Error('Not authenticated');
    await deleteApplicationApi(activeToken, id);
    await fetchApplications();
  };

  const exportCsv = async () => {
    const activeToken = (await getToken?.()) || token;
    return await exportApplicationsCsvApi(activeToken || undefined);
  };

  return {
    applications,
    total,
    totalPages,
    page,
    setPage,
    filters,
    updateFilters,
    loading,
    error,
    refreshApplications: fetchApplications,
    createApplication,
    deleteApplication,
    exportCsv,
  };
}

export function useDashboard() {
  const { session, user, getToken } = useAuth();
  const userId = user?.id || session?.user?.id || '';
  const token = session?.token;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const userDashboardCached = userId ? cachedDashboardByUserId[userId] : null;

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(() =>
    userDashboardCached ? userDashboardCached.metrics : null
  );
  const [apiSummary, setApiSummary] = useState<DashboardSummaryApiResponse | null>(() =>
    userDashboardCached ? userDashboardCached.apiSummary : null
  );
  const [activities, setActivities] = useState<ActivityItem[]>(() =>
    userDashboardCached ? userDashboardCached.activities : []
  );
  const [loading, setLoading] = useState<boolean>(() => !Boolean(userDashboardCached));
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) {
      setMetrics(null);
      setApiSummary(null);
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      if (!userDashboardCached) {
        setLoading(true);
      }
      setError(null);
      const activeToken = (await getTokenRef.current?.()) || token;
      const [summary, acts] = await Promise.all([
        getDashboardSummary(activeToken || undefined),
        activeToken ? getDashboardActivitiesApi(activeToken) : Promise.resolve([]),
      ]);

      const mappedActivities = acts.map(mapBackendToActivity);
      const computedMetrics: DashboardMetrics = {
        totalApplied: summary.total_applications,
        successful: summary.successful_submissions,
        pendingReview: summary.pending_review,
        failedOrSkipped: summary.failed_tasks,
        dailyStreak: 0,
      };

      if (userId) {
        cachedDashboardByUserId[userId] = {
          metrics: computedMetrics,
          apiSummary: summary,
          activities: mappedActivities,
          timestamp: Date.now(),
        };
      }

      setApiSummary(summary);
      setActivities(mappedActivities);
      setMetrics(computedMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend API');
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    if (!userId) {
      setMetrics(null);
      setApiSummary(null);
      setActivities([]);
      setLoading(false);
      return;
    }
    const cached = cachedDashboardByUserId[userId];
    if (cached) {
      setMetrics(cached.metrics);
      setApiSummary(cached.apiSummary);
      setActivities(cached.activities);
    } else {
      setMetrics(null);
      setApiSummary(null);
      setActivities([]);
    }
    fetchDashboardData();
  }, [userId, fetchDashboardData]);

  return {
    metrics,
    apiSummary,
    activities,
    loading,
    error,
    refreshDashboard: fetchDashboardData,
  };
}
