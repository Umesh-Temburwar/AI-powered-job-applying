import { useState, useEffect, useCallback } from 'react';
import type { AutomationTask, PlatformName } from '../types';
import { taskService } from '../services';

export function useTasks() {
  const [currentTask, setCurrentTask] = useState<AutomationTask | null>(null);
  const [history, setHistory] = useState<AutomationTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskState = useCallback(async () => {
    try {
      const [task, hist] = await Promise.all([
        taskService.getCurrentTask(),
        taskService.getTaskHistory(),
      ]);
      setCurrentTask(task);
      setHistory(hist);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve task data');
    } finally {
      setLoading(false);
    }
  }, []);

  const startTask = async (platform: PlatformName | 'All Platforms') => {
    try {
      setActionLoading(true);
      setError(null);
      const started = await taskService.startTask(platform);
      setCurrentTask(started);
      return started;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start simulation';
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const pauseTask = async (taskId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      const paused = await taskService.pauseTask(taskId);
      setCurrentTask(paused);
      return paused;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to pause simulation';
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const resumeTask = async (taskId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      const resumed = await taskService.resumeTask(taskId);
      setCurrentTask(resumed);
      return resumed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resume simulation';
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const stopTask = async (taskId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      const stopped = await taskService.stopTask(taskId);
      setCurrentTask(stopped);
      await fetchTaskState();
      return stopped;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to stop simulation';
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskState();
    // Poll task progress while running or paused
    const interval = setInterval(fetchTaskState, 1500);
    return () => clearInterval(interval);
  }, [fetchTaskState]);

  return {
    currentTask,
    history,
    loading,
    actionLoading,
    error,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    refreshTasks: fetchTaskState,
  };
}
