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

let cachedApplicationsData: CachedApplicationsData | null = null;

interface CachedDashboardData {
  metrics: DashboardMetrics;
  apiSummary: DashboardSummaryApiResponse;
  activities: ActivityItem[];
  timestamp: number;
}

let cachedDashboardData: CachedDashboardData | null = null;

export function useApplications(initialParams?: ApplicationFilterParams) {
  const { session, getToken } = useAuth();
  const token = session?.token;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [page, setPage] = useState<number>(initialParams?.page || 1);
  const [pageSize] = useState<number>(initialParams?.pageSize || 10);
  const [filters, setFilters] = useState<ApplicationFilterParams>(initialParams || {});

  const currentCacheKey = `${filters.status || ''}-${filters.platform || ''}-${filters.query || ''}-${page}-${pageSize}`;
  const hasMatchedCache = cachedApplicationsData && cachedApplicationsData.key === currentCacheKey;

  const [applications, setApplications] = useState<Application[]>(() =>
    hasMatchedCache ? cachedApplicationsData!.items : (cachedApplicationsData?.items || [])
  );
  const [total, setTotal] = useState<number>(() =>
    hasMatchedCache ? cachedApplicationsData!.total : (cachedApplicationsData?.total || 0)
  );
  const [totalPages, setTotalPages] = useState<number>(() =>
    hasMatchedCache ? cachedApplicationsData!.totalPages : (cachedApplicationsData?.totalPages || 1)
  );
  // Never block UI with full skeleton if we already have any cached items
  const [loading, setLoading] = useState<boolean>(!cachedApplicationsData);
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
    // Active token optional; backend defaults to candidate profile if omitted

    try {
      if (!cachedApplicationsData && isMountedRef.current) {
        setLoading(true);
      }
      if (isMountedRef.current) setError(null);
      const res = await getApplicationsApi(activeToken || undefined, {
        ...filters,
        page,
        pageSize,
      });
      const mapped = res.items.map(mapBackendToApplication);
      cachedApplicationsData = {
        key: currentCacheKey,
        items: mapped,
        total: res.total,
        totalPages: res.total_pages,
        timestamp: Date.now(),
      };
      if (isMountedRef.current && typeof window !== 'undefined') {
        setApplications(mapped);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      }
    } catch (err) {
      if (isMountedRef.current && typeof window !== 'undefined') {
        setError(err instanceof Error ? err.message : 'Failed to fetch applications');
        if (!cachedApplicationsData) {
          setApplications([]);
          setTotal(0);
        }
      }
    } finally {
      if (isMountedRef.current && typeof window !== 'undefined') {
        setLoading(false);
      }
    }
  }, [token, filters, page, pageSize, currentCacheKey]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

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
  const { session, getToken } = useAuth();
  const token = session?.token;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(() =>
    cachedDashboardData ? cachedDashboardData.metrics : null
  );
  const [apiSummary, setApiSummary] = useState<DashboardSummaryApiResponse | null>(() =>
    cachedDashboardData ? cachedDashboardData.apiSummary : null
  );
  const [activities, setActivities] = useState<ActivityItem[]>(() =>
    cachedDashboardData ? cachedDashboardData.activities : []
  );
  const [loading, setLoading] = useState<boolean>(!cachedDashboardData);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      if (!cachedDashboardData) {
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

      cachedDashboardData = {
        metrics: computedMetrics,
        apiSummary: summary,
        activities: mappedActivities,
        timestamp: Date.now(),
      };

      setApiSummary(summary);
      setActivities(mappedActivities);
      setMetrics(computedMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend API');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    metrics,
    apiSummary,
    activities,
    loading,
    error,
    refreshDashboard: fetchDashboardData,
  };
}
