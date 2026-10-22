import { useState, useEffect, useCallback } from 'react';
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

export function useApplications(initialParams?: ApplicationFilterParams) {
  const { session, getToken } = useAuth();
  const token = session?.token;

  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(initialParams?.page || 1);
  const [pageSize] = useState<number>(initialParams?.pageSize || 10);
  const [filters, setFilters] = useState<ApplicationFilterParams>(initialParams || {});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    const activeToken = (await getToken?.()) || token;
    if (!activeToken) {
      setApplications([]);
      setTotal(0);
      setTotalPages(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getApplicationsApi(activeToken, {
        ...filters,
        page,
        pageSize,
      });
      setApplications(res.items.map(mapBackendToApplication));
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch applications');
      setApplications([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [getToken, token, filters, page, pageSize]);

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
    if (!activeToken) return '';
    return await exportApplicationsCsvApi(activeToken);
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

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [apiSummary, setApiSummary] = useState<DashboardSummaryApiResponse | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const activeToken = (await getToken?.()) || token;
      const [summary, acts] = await Promise.all([
        getDashboardSummary(activeToken || undefined),
        activeToken ? getDashboardActivitiesApi(activeToken) : Promise.resolve([]),
      ]);

      setApiSummary(summary);
      setActivities(acts.map(mapBackendToActivity));
      setMetrics({
        totalApplied: summary.total_applications,
        successful: summary.successful_submissions,
        pendingReview: summary.pending_review,
        failedOrSkipped: summary.failed_tasks,
        dailyStreak: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend API');
    } finally {
      setLoading(false);
    }
  }, [getToken, token]);

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
