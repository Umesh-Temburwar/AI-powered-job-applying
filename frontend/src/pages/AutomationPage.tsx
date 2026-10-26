import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Square,
  AlertTriangle,
  Terminal,
  ShieldAlert,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Database,
  X,
  Sliders,
  Target,
  MapPin,
} from 'lucide-react';
import { useTasks, type StartTaskOptions } from '../hooks/useTasks';
import { usePreferences } from '../hooks/usePreferences';
import { useToast } from '../context/ToastContext';
import {
  Card,
  CardHeader,
  Button,
  Badge,
  ProgressBar,
  Select,
  Input,
  Checkbox,
  ConfirmDialog,
  Skeleton,
} from '../components/ui';
import type { PlatformName } from '../types';

export const AutomationPage: React.FC = () => {
  const {
    currentTask,
    history,
    loading: tasksLoading,
    actionLoading,
    error: taskError,
    isLiveBackend,
    startTask,
    cancelTask,
    retryTask,
    refreshTasks,
  } = useTasks();

  const { preferences, loading: prefsLoading } = usePreferences();
  const { showToast } = useToast();

  // Dynamic Form State pre-populated from Saved Preferences
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformName | 'All Platforms'>(() =>
    preferences?.selectedPlatforms && preferences.selectedPlatforms.length > 0 ? preferences.selectedPlatforms[0] : 'All Platforms'
  );
  const [taskType, setTaskType] = useState<'job_apply' | 'profile_update' | 'screening_test'>('job_apply');
  const [keywords, setKeywords] = useState<string[]>(() => preferences?.targetTitles || []);
  const [keywordInput, setKeywordInput] = useState('');
  const [locations, setLocations] = useState<string[]>(() => preferences?.targetLocations || []);
  const [locationInput, setLocationInput] = useState('');
  const [maxApplications, setMaxApplications] = useState<number>(() => preferences?.dailyApplicationLimit || 25);
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [confirmLiveSubmission, setConfirmLiveSubmission] = useState<boolean>(false);
  const [force, setForce] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState<boolean>(true);

  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize or synchronize form state from user's saved preferences
  useEffect(() => {
    if (preferences && keywords.length === 0) {
      if (preferences.targetTitles && preferences.targetTitles.length > 0) {
        setKeywords(preferences.targetTitles);
      }

      if (preferences.targetLocations && preferences.targetLocations.length > 0) {
        setLocations(preferences.targetLocations);
      }

      if (preferences.dailyApplicationLimit) {
        setMaxApplications(preferences.dailyApplicationLimit);
      }

      if (preferences.selectedPlatforms && preferences.selectedPlatforms.length > 0) {
        setSelectedPlatform(preferences.selectedPlatforms[0]);
      }
    }
  }, [preferences]);

  const isQueued = currentTask?.status === 'queued';
  const isRunning = currentTask?.status === 'running';
  const isFailed = currentTask?.status === 'failed';
  const isCancelled = currentTask?.status === 'cancelled';
  const isCompleted = currentTask?.status === 'completed';
  const isIdle = !currentTask || isCompleted || isCancelled || (!isQueued && !isRunning && !isFailed);

  // Keyword manipulation
  const handleAddKeyword = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const val = keywordInput.trim();
    if (val && !keywords.includes(val)) {
      setKeywords((prev) => [...prev, val]);
      setKeywordInput('');
      setValidationError(null);
    }
  };

  const handleRemoveKeyword = (tag: string) => {
    setKeywords((prev) => prev.filter((k) => k !== tag));
  };

  // Location manipulation
  const handleAddLocation = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const val = locationInput.trim();
    if (val && !locations.includes(val)) {
      setLocations((prev) => [...prev, val]);
      setLocationInput('');
    }
  };

  const handleRemoveLocation = (tag: string) => {
    setLocations((prev) => prev.filter((l) => l !== tag));
  };

  // Launch validation & prompt
  const handleInitiateTask = () => {
    setValidationError(null);

    if (keywords.length === 0) {
      setValidationError('Please specify at least one job role or keyword.');
      return;
    }

    if (maxApplications < 1 || maxApplications > 100) {
      setValidationError('Maximum applications must be between 1 and 100.');
      return;
    }

    if (!dryRun && !confirmLiveSubmission) {
      setValidationError('Live submissions require explicit user confirmation. Check the safety box below.');
      return;
    }

    setConfirmStartOpen(true);
  };

  const handleStartConfirmed = async () => {
    setConfirmStartOpen(false);
    try {
      const taskOptions: StartTaskOptions = {
        platform: selectedPlatform,
        taskType,
        dryRun,
        userConfirmedRealSubmission: !dryRun && confirmLiveSubmission,
        maxApplications,
        keywords,
        locations,
        force,
      };

      await startTask(taskOptions);
      showToast(`Automation task dynamically queued for ${selectedPlatform}`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to enqueue task', 'error');
    }
  };

  const handleCancel = async (taskId?: string) => {
    const id = taskId || currentTask?.id;
    if (!id) return;
    try {
      await cancelTask(id);
      showToast('Task cancellation requested', 'warning');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to cancel task', 'error');
    }
  };

  const handleRetry = async (taskId?: string) => {
    const id = taskId || currentTask?.id;
    if (!id) return;
    try {
      await retryTask(id);
      showToast('Task re-enqueued for retry', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to retry task', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Dry Run Safety Notice Banner */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/30 text-amber-200 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-amber-300 mb-0.5">
            Safe Automation Mode — Dry-Run Simulation Active by Default
          </span>
          <span>
            Tasks are executed by the background automation worker using your customized preferences. In dry-run mode,
            job matching, listing reviews, and answers are simulated without sending live applications.
          </span>
        </div>
      </div>

      {(taskError || validationError) && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{validationError || taskError}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setValidationError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Automation Control Panel */}
      <Card>
        <CardHeader
          title="Dynamic Automation Execution Center"
          subtitle="Configure real-time targeting parameters derived from your preferences"
          action={
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                  isLiveBackend
                    ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                    : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}
              >
                <Database className="w-3 h-3" />
                {isLiveBackend ? 'Supabase Queue Live' : 'Demo Mode'}
              </span>

              <Badge
                variant={
                  isRunning
                    ? 'cyan'
                    : isQueued
                    ? 'warning'
                    : isCompleted
                    ? 'success'
                    : isFailed
                    ? 'danger'
                    : 'default'
                }
                size="md"
              >
                Status: {currentTask?.status?.toUpperCase() || 'IDLE'}
              </Badge>
            </div>
          }
        />

        {(tasksLoading && !currentTask) || (prefsLoading && !preferences) ? (
          <div className="space-y-4">
            <Skeleton height="3rem" />
            <Skeleton height="8rem" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Dynamic Configuration Form Panel */}
            <div className="p-4 rounded-xl border border-theme bg-theme-surface/50 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-theme">
                <span className="text-xs font-bold text-theme-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Task Parameters (Pre-filled from Preferences)
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  {showConfig ? 'Collapse Form' : 'Expand Form'}
                </button>
              </div>

              {showConfig && (
                <div className="space-y-4 pt-1">
                  {/* Row 1: Platform & Task Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Target Portal"
                      value={selectedPlatform}
                      disabled={isRunning || isQueued}
                      onChange={(e) => setSelectedPlatform(e.target.value as PlatformName | 'All Platforms')}
                      options={[
                        { value: 'All Platforms', label: 'All Core Portals' },
                        { value: 'Naukri', label: 'Naukri.com' },
                        { value: 'Internshala', label: 'Internshala' },
                        { value: 'Indeed', label: 'Indeed India' },
                        { value: 'LinkedIn', label: 'LinkedIn Easy Apply' },
                      ]}
                    />

                    <Select
                      label="Automation Task Type"
                      value={taskType}
                      disabled={isRunning || isQueued}
                      onChange={(e) => setTaskType(e.target.value as 'job_apply' | 'profile_update' | 'screening_test')}
                      options={[
                        { value: 'job_apply', label: 'Automated Job Application Cycle' },
                        { value: 'profile_update', label: 'Profile & Key Skills Freshness Updater' },
                        { value: 'screening_test', label: 'Screening Questionnaire Compatibility Check' },
                      ]}
                    />
                  </div>

                  {/* Row 2: Target Keywords / Roles */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-theme-secondary flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Target Job Roles & Keywords
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-theme bg-theme-card min-h-[2.5rem]">
                      {keywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-theme-surface border border-theme text-theme-primary"
                        >
                          {kw}
                          {!isRunning && !isQueued && (
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword(kw)}
                              className="text-theme-muted hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                      {!isRunning && !isQueued && (
                        <input
                          type="text"
                          placeholder="Type title & press Enter..."
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={handleAddKeyword}
                          className="bg-transparent border-none outline-none text-xs text-theme-primary placeholder-theme-muted px-2 py-0.5 flex-1 min-w-[140px]"
                        />
                      )}
                    </div>
                  </div>

                  {/* Row 3: Target Locations & Max Applications */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-medium text-theme-secondary flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                        Preferred Locations
                      </label>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-theme bg-theme-card min-h-[2.5rem]">
                        {locations.map((loc) => (
                          <span
                            key={loc}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-theme-surface border border-theme text-theme-primary"
                          >
                            {loc}
                            {!isRunning && !isQueued && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLocation(loc)}
                                className="text-theme-muted hover:text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))}
                        {!isRunning && !isQueued && (
                          <input
                            type="text"
                            placeholder="Add location & press Enter..."
                            value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            onKeyDown={handleAddLocation}
                            className="bg-transparent border-none outline-none text-xs text-theme-primary placeholder-theme-muted px-2 py-0.5 flex-1 min-w-[120px]"
                          />
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <Input
                        label="Max Applications"
                        type="number"
                        min={1}
                        max={100}
                        value={maxApplications}
                        disabled={isRunning || isQueued}
                        onChange={(e) => setMaxApplications(parseInt(e.target.value, 10) || 1)}
                      />
                    </div>
                  </div>

                  {/* Row 4: Safety Checkboxes */}
                  <div className="pt-2 border-t border-theme flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        label="Dry-Run Mode (Recommended)"
                        checked={dryRun}
                        disabled={isRunning || isQueued}
                        onChange={(e) => {
                          setDryRun(e.target.checked);
                          if (e.target.checked) setConfirmLiveSubmission(false);
                        }}
                      />

                      <Checkbox
                        label="Force execution (Allow duplicate)"
                        checked={force}
                        disabled={isRunning || isQueued}
                        onChange={(e) => setForce(e.target.checked)}
                      />
                    </div>

                    {!dryRun && (
                      <div className="p-2.5 rounded-lg border border-red-500/40 bg-red-950/40 text-red-200">
                        <Checkbox
                          label="I confirm real live submission to external portals"
                          checked={confirmLiveSubmission}
                          disabled={isRunning || isQueued}
                          onChange={(e) => setConfirmLiveSubmission(e.target.checked)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap gap-2.5 justify-end">
              <Button
                variant="ghost"
                onClick={refreshTasks}
                disabled={actionLoading}
                leftIcon={<RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />}
              >
                Refresh Queue
              </Button>

              {isIdle && (
                <Button
                  variant="primary"
                  onClick={handleInitiateTask}
                  disabled={actionLoading}
                  leftIcon={<Play className="w-4 h-4" />}
                >
                  Enqueue Task with Current Settings
                </Button>
              )}

              {(isRunning || isQueued) && (
                <Button
                  variant="danger"
                  onClick={() => handleCancel()}
                  disabled={actionLoading}
                  leftIcon={<Square className="w-4 h-4" />}
                >
                  Cancel Task
                </Button>
              )}

              {isFailed && (
                <Button
                  variant="primary"
                  onClick={() => handleRetry()}
                  disabled={actionLoading}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                >
                  Retry Task
                </Button>
              )}
            </div>

            {/* Current Task Progress Card */}
            <div className="p-4 rounded-xl border border-theme bg-theme-surface/70 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-theme-secondary uppercase tracking-wider flex items-center gap-1.5">
                  {isQueued && <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                  {isRunning && <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />}
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  {currentTask ? `${currentTask.platform} (${currentTask.taskType || 'job_apply'})` : 'No Active Task'}
                </span>
                <span className="text-[11px] text-theme-muted font-mono">
                  ID: {currentTask?.id || 'standby'}
                </span>
              </div>

              <ProgressBar
                progress={currentTask?.progressPercent || 0}
                label={currentTask?.currentStepMessage || 'Queue is currently idle. Configure parameters above and enqueue a task.'}
                color={
                  isFailed
                    ? 'red'
                    : isQueued
                    ? 'amber'
                    : isRunning
                    ? 'cyan'
                    : 'emerald'
                }
              />

              {/* Error Details alert when failed */}
              {isFailed && currentTask?.errorDetails && (
                <div className="p-3 rounded-lg border border-red-500/40 bg-red-950/40 text-red-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Error: {currentTask.errorDetails}</span>
                  </div>
                  <Button size="sm" variant="primary" onClick={() => handleRetry()}>
                    Retry Now
                  </Button>
                </div>
              )}

              {/* Dynamic Task statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center text-xs">
                <div className="p-3 bg-theme-card border border-theme rounded-lg">
                  <span className="text-theme-muted block">Applications Target</span>
                  <span className="text-lg font-bold text-theme-primary">
                    {currentTask?.applicationsAttempted || maxApplications}
                  </span>
                </div>
                <div className="p-3 bg-theme-card border border-theme rounded-lg">
                  <span className="text-theme-muted block">Retries Used</span>
                  <span className="text-lg font-bold text-amber-400">
                    {currentTask?.retryCount || 0} / {currentTask?.maxRetries || 3}
                  </span>
                </div>
                <div className="p-3 bg-theme-card border border-theme rounded-lg">
                  <span className="text-theme-muted block">Target Roles</span>
                  <span className="text-xs font-semibold text-theme-primary truncate block mt-1">
                    {keywords.slice(0, 2).join(', ') || 'Auto-matched'}
                  </span>
                </div>
                <div className="p-3 bg-theme-card border border-theme rounded-lg">
                  <span className="text-theme-muted block">Execution Mode</span>
                  <span className="text-xs font-bold text-emerald-400 mt-1 block">
                    {currentTask?.dryRun !== false ? 'Dry-Run (Safe)' : 'Live Submissions'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Live Terminal Log Viewer */}
      <Card>
        <CardHeader
          title="Automation Worker Event Stream"
          subtitle="Real-time progress checkpoints and queue events"
          action={
            <span className="text-xs text-theme-muted flex items-center gap-1.5 font-mono">
              <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
              worker stdout
            </span>
          }
        />

        <div className="rounded-xl border border-theme bg-[#060D1E] p-4 font-mono text-xs text-slate-300 max-h-72 overflow-y-auto space-y-1.5 shadow-inner">
          {!currentTask?.logs || currentTask.logs.length === 0 ? (
            <p className="text-slate-600 text-center py-6">No logs for current task. Enqueue a task to see real-time events.</p>
          ) : (
            currentTask.logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                <span
                  className={`font-semibold shrink-0 uppercase text-[10px] px-1 rounded ${
                    log.level === 'info'
                      ? 'text-sky-400 bg-sky-950/60'
                      : log.level === 'warn'
                      ? 'text-amber-400 bg-amber-950/60'
                      : log.level === 'error'
                      ? 'text-red-400 bg-red-950/60'
                      : 'text-emerald-400 bg-emerald-950/60'
                  }`}
                >
                  {log.level}
                </span>
                <span
                  className={
                    log.level === 'error'
                      ? 'text-red-300'
                      : log.level === 'warn'
                      ? 'text-amber-200'
                      : log.level === 'success'
                      ? 'text-emerald-300'
                      : 'text-slate-200'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Task Execution History */}
      <Card>
        <CardHeader
          title="Past Task Runs & Queue History"
          subtitle="Audit log of prior background automation executions"
        />

        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-xs text-theme-muted text-center py-6">
              No automation tasks yet. Configure your job preferences above to get started.
            </p>
          ) : (
            history.map((hist) => (
              <div
                key={hist.id}
                className="p-3.5 rounded-xl border border-theme bg-theme-surface/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-theme-primary">{hist.platform}</span>
                    <Badge
                      variant={
                        hist.status === 'completed'
                          ? 'success'
                          : hist.status === 'failed'
                          ? 'danger'
                          : hist.status === 'cancelled'
                          ? 'default'
                          : 'cyan'
                      }
                      size="sm"
                    >
                      {hist.status}
                    </Badge>
                    <span className="text-[11px] text-theme-muted font-mono">{hist.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-theme-muted mt-0.5">{hist.currentStepMessage}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-theme-muted shrink-0">
                    <span>{hist.completedAt ? new Date(hist.completedAt).toLocaleTimeString() : 'In Queue'}</span>
                    <p className="text-emerald-400 font-mono mt-0.5">
                      {hist.dryRun !== false ? 'Dry-Run' : 'Live Submission'}
                    </p>
                  </div>
                  {hist.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleRetry(hist.id)}
                      disabled={actionLoading}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Start Confirmation Dialog with Dynamic Summary */}
      <ConfirmDialog
        isOpen={confirmStartOpen}
        onClose={() => setConfirmStartOpen(false)}
        onConfirm={handleStartConfirmed}
        title="Enqueue Automation Task"
        description={`This will enqueue an automation task for ${selectedPlatform} (${taskType}) targeting ${keywords.length} roles in ${locations.length} locations with a limit of ${maxApplications} applications. Execution mode: ${dryRun ? 'Safe Dry-Run' : 'LIVE SUBMISSION'}.`}
        confirmLabel="Confirm & Enqueue"
      />
    </div>
  );
};
