import { useState, useEffect, useCallback } from 'react';
import type { AutomationTask, PlatformName } from '../types';
import {
  enqueueTaskApi,
  listTasksApi,
  cancelTaskApi,
  retryTaskApi,
  type BackendTaskItem,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface StartTaskOptions {
  platform: PlatformName | 'All Platforms';
  taskType?: 'job_apply' | 'profile_update' | 'screening_test';
  dryRun?: boolean;
  userConfirmedRealSubmission?: boolean;
  maxApplications?: number;
  keywords?: string[];
  locations?: string[];
  force?: boolean;
}

function mapBackendTaskToAutomationTask(item: BackendTaskItem): AutomationTask {
  const payload = item.payload || {};
  const maxApps = (payload.max_applications as number) || 25;
  return {
    id: item.id,
    userId: item.user_id,
    taskType: (item.task_type as 'job_apply' | 'profile_update' | 'screening_test') || 'job_apply',
    platform: (item.platform as PlatformName | 'All Platforms') || 'All Platforms',
    status: item.status,
    progressPercent: item.progress,
    currentStepMessage: item.message || 'Task processing...',
    applicationsAttempted: maxApps,
    applicationsSuccessful: item.status === 'completed' ? maxApps : 0,
    applicationsFailed: item.status === 'failed' ? 1 : 0,
    retryCount: item.retry_count,
    maxRetries: item.max_retries,
    errorDetails: item.error_details,
    dryRun: item.dry_run,
    startedAt: item.started_at || undefined,
    completedAt: item.completed_at || undefined,
    cancelledAt: item.cancelled_at || undefined,
    createdAt: item.created_at,
    logs: [
      {
        id: `${item.id}-init`,
        timestamp: new Date(item.created_at).toLocaleTimeString(),
        level: 'info',
        message: `[QUEUE] Enqueued for ${item.platform} (dry_run=${item.dry_run})`,
      },
      ...(item.message
        ? [
            {
              id: `${item.id}-status`,
              timestamp: new Date().toLocaleTimeString(),
              level:
                item.status === 'failed'
                  ? ('error' as const)
                  : item.status === 'completed'
                  ? ('success' as const)
                  : ('info' as const),
              message: item.message,
            },
          ]
        : []),
      ...(item.error_details
        ? [
            {
              id: `${item.id}-err`,
              timestamp: new Date().toLocaleTimeString(),
              level: 'error' as const,
              message: `Error details: ${item.error_details}`,
            },
          ]
        : []),
    ],
  };
}

export function useTasks() {
  const { session, getToken } = useAuth();

  const [currentTask, setCurrentTask] = useState<AutomationTask | null>(null);
  const [history, setHistory] = useState<AutomationTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);

  const getActiveToken = useCallback(async (): Promise<string | null> => {
    return (await getToken?.()) || session?.token || null;
  }, [getToken, session?.token]);

  const fetchTaskState = useCallback(async () => {
    const activeToken = await getActiveToken();
    if (!activeToken) {
      setCurrentTask(null);
      setHistory([]);
      setLoading(false);
      setIsLiveBackend(false);
      return;
    }

    try {
      const response = await listTasksApi(activeToken, 30);
      setIsLiveBackend(true);
      if (response.tasks && response.tasks.length > 0) {
        const mapped = response.tasks.map(mapBackendTaskToAutomationTask);
        const active = mapped.find((t) => t.status === 'queued' || t.status === 'running');
        if (active) {
          setCurrentTask(active);
          setHistory(mapped.filter((t) => t.id !== active.id));
        } else {
          setCurrentTask(mapped[0]);
          setHistory(mapped.slice(1));
        }
      } else {
        setCurrentTask(null);
        setHistory([]);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve task data');
      setCurrentTask(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [getActiveToken]);

  const startTask = async (
    platformOrOptions: PlatformName | 'All Platforms' | StartTaskOptions,
    maybeDryRun?: boolean
  ): Promise<AutomationTask> => {
    const activeToken = await getActiveToken();
    if (!activeToken) throw new Error('Candidate is not authenticated.');

    let options: StartTaskOptions;
    if (typeof platformOrOptions === 'string') {
      options = {
        platform: platformOrOptions,
        dryRun: maybeDryRun,
        maxApplications: 25,
      };
    } else {
      options = platformOrOptions;
    }

    try {
      setActionLoading(true);
      setError(null);

      const enqueued = await enqueueTaskApi(activeToken, {
        platform: options.platform,
        task_type: options.taskType || 'job_apply',
        dry_run: options.dryRun ?? true,
        user_confirmed_real_submission: options.userConfirmedRealSubmission ?? false,
        max_applications: options.maxApplications ?? 25,
        keywords: options.keywords,
        locations: options.locations,
        force: options.force ?? false,
      });

      const mapped = mapBackendTaskToAutomationTask(enqueued);
      setCurrentTask(mapped);
      setIsLiveBackend(true);
      await fetchTaskState();
      return mapped;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to launch automation task';
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const cancelTask = async (taskId: string) => {
    const activeToken = await getActiveToken();
    if (!activeToken) throw new Error('Candidate is not authenticated.');

    try {
      setActionLoading(true);
      setError(null);
      await cancelTaskApi(activeToken, taskId);
      await fetchTaskState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel task';
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const retryTask = async (taskId: string) => {
    const activeToken = await getActiveToken();
    if (!activeToken) throw new Error('Candidate is not authenticated.');

    try {
      setActionLoading(true);
      setError(null);
      await retryTaskApi(activeToken, taskId);
      await fetchTaskState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to retry task';
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const stopTask = cancelTask;

  // Adaptive polling: poll every 3s if active task is running/queued
  useEffect(() => {
    fetchTaskState();

    const isTaskActive = currentTask?.status === 'running' || currentTask?.status === 'queued';
    const interval = isTaskActive ? 3000 : 15000;

    const timer = setInterval(() => {
      fetchTaskState();
    }, interval);

    return () => clearInterval(timer);
  }, [fetchTaskState, currentTask?.status]);

  return {
    currentTask,
    history,
    loading,
    actionLoading,
    error,
    isLiveBackend,
    startTask,
    cancelTask,
    retryTask,
    stopTask,
    refreshTasks: fetchTaskState,
  };
}
