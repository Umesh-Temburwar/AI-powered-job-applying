import { useState, useEffect, useCallback } from 'react';
import type { Application, DashboardMetrics, ActivityItem } from '../types';
import type { ApplicationFilterParams } from '../services';
import type { DashboardSummaryApiResponse } from '../services/api';
import { applicationService } from '../services';
import { getDashboardSummary } from '../services/api';

export function useApplications(initialParams?: ApplicationFilterParams) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(initialParams?.page || 1);
  const [pageSize] = useState<number>(initialParams?.pageSize || 10);
  const [filters, setFilters] = useState<ApplicationFilterParams>(initialParams || {});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await applicationService.getApplications({
        ...filters,
        page,
        pageSize,
      });
      setApplications(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const updateFilters = (newFilters: Partial<ApplicationFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page on filter change
  };

  const exportCsv = async () => {
    return await applicationService.exportToCsv(filters);
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
    exportCsv,
  };
}

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [apiSummary, setApiSummary] = useState<DashboardSummaryApiResponse | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [summary, a] = await Promise.all([
        getDashboardSummary(),
        applicationService.getRecentActivity(),
      ]);
      setApiSummary(summary);
      setActivities(a);
      setMetrics({
        totalApplied: summary.total_applications,
        successful: Math.max(
          0,
          summary.total_applications - summary.pending_review - summary.failed_tasks
        ),
        pendingReview: summary.pending_review,
        failedOrSkipped: summary.failed_tasks,
        dailyStreak: 3,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend API');
    } finally {
      setLoading(false);
    }
  }, []);

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
