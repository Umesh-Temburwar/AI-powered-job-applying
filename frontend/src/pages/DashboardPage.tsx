import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlayCircle,
  Play,
  Square,
  RotateCcw,
  FileText,
  Sliders,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
  RefreshCw,
  X,
  Target,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useDashboard } from '../hooks/useApplications';
import { useTasks } from '../hooks/useTasks';
import { usePreferences } from '../hooks/usePreferences';
import { useProfile } from '../hooks/useProfile';
import { useResumes } from '../hooks/useResumes';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';
import { useToast } from '../context/ToastContext';
import {
  Card,
  CardHeader,
  Badge,
  Button,
  ProgressBar,
  Skeleton,
  Modal,
  Select,
  Input,
  Checkbox,
} from '../components/ui';
import type { PlatformName } from '../types';

export const DashboardPage: React.FC = () => {
  const {
    metrics,
    apiSummary,
    activities,
    loading: dashLoading,
    error: dashError,
    refreshDashboard,
  } = useDashboard();

  const {
    currentTask,
    loading: tasksLoading,
    actionLoading,
    error: taskError,
    startTask,
    cancelTask,
    retryTask,
    refreshTasks,
  } = useTasks();

  const { preferences } = usePreferences();
  const { profile } = useProfile();
  const { resumes, defaultResume } = useResumes();
  const { isOnboarded, completionPercentage, missingFields } = useOnboardingStatus();
  const { showToast } = useToast();

  // Dynamic Task Launch Modal & Form State
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformName | 'All Platforms'>('All Platforms');
  const [taskType, setTaskType] = useState<'job_apply' | 'profile_update' | 'screening_test'>('job_apply');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [maxApplications, setMaxApplications] = useState<number>(25);
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [confirmLiveSubmission, setConfirmLiveSubmission] = useState<boolean>(false);
  const [force, setForce] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync saved user preferences when loaded
  useEffect(() => {
    if (preferences) {
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

  // Keyword tags handling
  const handleAddKeyword = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
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

  // Location tags handling
  const handleAddLocation = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const val = locationInput.trim();
    if (val && !locations.includes(val)) {
      setLocations((prev) => [...prev, val]);
      setLocationInput('');
    }
  };

  const handleRemoveLocation = (tag: string) => {
    setLocations((prev) => prev.filter((l) => l !== tag));
  };

  // Dynamic POST /api/v1/tasks Enqueue Handler
  const handleStartTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    if (keywords.length === 0) {
      setValidationError('Please specify at least one job keyword or role title.');
      return;
    }

    if (maxApplications < 1 || maxApplications > 100) {
      setValidationError('Maximum application limit must be between 1 and 100.');
      return;
    }

    if (!dryRun && !confirmLiveSubmission) {
      setValidationError('Live submissions require explicit user confirmation. Please check the safety box below.');
      return;
    }

    try {
      await startTask({
        platform: selectedPlatform,
        taskType,
        dryRun,
        userConfirmedRealSubmission: confirmLiveSubmission,
        maxApplications,
        keywords,
        locations: locations.length > 0 ? locations : ['Remote'],
        force,
      });

      showToast(
        `Task queued successfully on ${selectedPlatform} (${dryRun ? 'Dry-Run Simulation' : 'Live'})`,
        'success'
      );
      setIsLaunchModalOpen(false);
      setValidationError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to launch automation task';
      setValidationError(msg);
      showToast(msg, 'error');
    }
  };

  // Task Cancellation
  const handleCancelTask = async (taskId: string) => {
    try {
      await cancelTask(taskId);
      showToast('Task cancellation requested successfully.', 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel task';
      showToast(msg, 'error');
    }
  };

  // Task Retry
  const handleRetryTask = async (taskId: string) => {
    try {
      await retryTask(taskId);
      showToast('Task re-enqueued for retry.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to retry task';
      showToast(msg, 'error');
    }
  };

  const platformBreakdown = apiSummary?.platform_breakdown || [];


  const platformOptions = [
    { value: 'All Platforms', label: 'All Core Platforms (Naukri + Internshala + Indeed)' },
    { value: 'Naukri', label: 'Naukri.com' },
    { value: 'Internshala', label: 'Internshala' },
    { value: 'Indeed', label: 'Indeed' },
    { value: 'LinkedIn', label: 'LinkedIn' },
  ];

  const taskTypeOptions = [
    { value: 'job_apply', label: 'Automated Job Applications (ATS Match)' },
    { value: 'profile_update', label: 'Candidate Profile Refresh & Sync' },
    { value: 'screening_test', label: 'Screening Questionnaire Simulation' },
  ];

  const getStatusBadgeVariant = (status?: string): 'default' | 'success' | 'warning' | 'danger' | 'cyan' => {
    switch (status) {
      case 'running':
        return 'cyan';
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'cancelled':
        return 'warning';
      case 'review_required':
        return 'warning';
      default:
        return 'default';
    }
  };

  const checklistItems = [
    {
      label: `Candidate Profile Details (${profile?.fullName || (profile?.email ? profile.email.split('@')[0] : 'Incomplete')})`,
      completed: Boolean(profile && profile.fullName && (profile.skills?.length || 0) > 0),
      link: '/profile',
    },
    {
      label: defaultResume
        ? `Primary Resume: ${defaultResume.fileName}`
        : resumes && resumes.length > 0
        ? `Uploaded: ${resumes[0].fileName}`
        : 'Upload PDF / DOCX Resume',
      completed: Boolean(defaultResume || (resumes && resumes.length > 0)),
      link: '/resumes',
    },
    {
      label: `Job Search Preferences (${preferences?.targetTitles?.length ? `${preferences.targetTitles.length} roles` : 'Not set'})`,
      completed: Boolean(preferences && (preferences.targetTitles?.length || 0) > 0),
      link: '/preferences',
    },
    {
      label: 'Run first automated simulation cycle',
      completed: Boolean(currentTask && currentTask.status !== 'idle'),
      link: '/automation',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Smart Onboarding Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-theme bg-theme-surface/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-theme-card flex items-center justify-center text-[var(--accent)] border border-theme shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-theme-primary">
                {isOnboarded ? 'Candidate Profile Active & Verified' : 'Profile Onboarding In Progress'}
              </h3>
              <Badge variant={isOnboarded ? 'success' : 'warning'} size="sm">
                {completionPercentage}% Complete
              </Badge>
            </div>
            <p className="text-xs text-theme-muted mt-0.5">
              {isOnboarded
                ? `Default resume: ${defaultResume?.fileName || 'Attached'} · ${preferences?.targetTitles?.length || 0} target roles configured.`
                : missingFields && missingFields.length > 0
                ? `Missing recommendations: ${missingFields.slice(0, 3).join(', ')}.`
                : 'Complete the step-by-step wizard to maximize ATS matching accuracy.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/onboarding">
            <Button variant={isOnboarded ? 'outline' : 'primary'} size="sm" className="text-xs">
              {isOnboarded ? 'Review Profile Wizard' : 'Resume Onboarding →'}
            </Button>
          </Link>
        </div>
      </div>
      {/* Backend API Error Banner */}
      {dashError && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-red-500/40 bg-red-950/40 text-red-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-semibold">Backend API Error:</span>
            <span>{dashError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshDashboard()}
            className="text-xs border-red-500/50 hover:bg-red-900/30 text-red-200 shrink-0"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Task Queue Hook Error Banner */}
      {taskError && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/40 text-amber-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">Task Queue Status:</span>
            <span>{taskError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshTasks()}
            className="text-xs border-amber-500/50 hover:bg-amber-900/30 text-amber-200 shrink-0"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Queue
          </Button>
        </div>
      )}

      {/* Backend API / Connected Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-sky-500/30 bg-sky-950/40 text-sky-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />
          <span className="font-semibold">
            {apiSummary?.mode === 'live' ? 'Live Candidate Session' : 'Backend API Connected'}
          </span>
          <span className="text-sky-300/80">
            — {apiSummary?.message || 'Task queue connected to POST /api/v1/tasks. Multi-user safety enabled.'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="cyan" size="sm">
            {apiSummary?.mode === 'live' ? 'Live Session' : 'API Active'}
          </Badge>
          <Badge variant="default" size="sm">
            Worker: {currentTask?.status?.toUpperCase() || apiSummary?.automation_status?.toUpperCase() || 'IDLE'}
          </Badge>
        </div>
      </div>

      {/* Top 4 Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-theme-secondary uppercase tracking-wider">
              Total Processed
            </span>
            <div className="w-8 h-8 rounded-lg bg-theme-surface flex items-center justify-center text-[var(--accent)]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          {dashLoading ? (
            <Skeleton height="2rem" className="mt-2 w-16" />
          ) : (
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-theme-primary">
                {metrics?.totalApplied ?? 0}
              </span>
              <span className="text-[11px] text-theme-muted font-medium">
                {metrics?.totalApplied ? 'Live recorded' : 'No records yet'}
              </span>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-theme-secondary uppercase tracking-wider">
              Successful Submissions
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {dashLoading ? (
            <Skeleton height="2rem" className="mt-2 w-16" />
          ) : (
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                {metrics?.successful ?? 0}
              </span>
              <span className="text-[11px] text-emerald-500/80 font-medium">
                {metrics?.totalApplied && metrics.totalApplied > 0
                  ? `${Math.round(((metrics.successful ?? 0) / metrics.totalApplied) * 100)}% rate`
                  : '0% rate'}
              </span>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-theme-secondary uppercase tracking-wider">
              Review Required
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/60 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          {dashLoading ? (
            <Skeleton height="2rem" className="mt-2 w-16" />
          ) : (
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-400">
                {metrics?.pendingReview ?? 0}
              </span>
              <span className="text-[11px] text-amber-400/80 font-medium">
                {metrics?.pendingReview ? 'Requires candidate input' : 'Zero pending'}
              </span>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-theme-secondary uppercase tracking-wider">
              Failed / Blocked
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-950/60 flex items-center justify-center text-red-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          {dashLoading ? (
            <Skeleton height="2rem" className="mt-2 w-16" />
          ) : (
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-red-400">
                {metrics?.failedOrSkipped ?? 0}
              </span>
              <span className="text-[11px] text-red-400/80 font-medium">
                {metrics?.failedOrSkipped ? 'Errors logged' : 'Zero failures'}
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Middle Row: Automation Runner Card + Platform Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Automation Status Card with Real Queue Controls */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Automation Worker Status"
            subtitle="Background Selenium executor with per-task sandbox profile"
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refreshTasks()}
                  disabled={tasksLoading}
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${tasksLoading ? 'animate-spin' : ''}`} />}
                  aria-label="Refresh Queue"
                >
                  Sync
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsLaunchModalOpen(true)}
                  leftIcon={<Play className="w-3.5 h-3.5" />}
                >
                  Launch Task
                </Button>
                <Link to="/automation">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Control Center
                  </Button>
                </Link>
              </div>
            }
          />

          {tasksLoading && !currentTask ? (
            <div className="p-4 rounded-xl border border-theme bg-theme-surface space-y-3">
              <Skeleton height="1.5rem" className="w-1/3" />
              <Skeleton height="2rem" className="w-full" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Skeleton height="3rem" />
                <Skeleton height="3rem" />
                <Skeleton height="3rem" />
              </div>
            </div>
          ) : currentTask ? (
            <div className="p-4 rounded-xl border border-theme bg-theme-surface space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">
                      Target Platform
                    </span>
                    <Badge variant={currentTask.dryRun ? 'success' : 'warning'} size="sm">
                      {currentTask.dryRun ? 'Dry-Run Simulation' : 'Live Submission'}
                    </Badge>
                  </div>
                  <p className="text-base font-bold text-theme-primary mt-0.5">
                    {currentTask.platform}
                    <span className="text-xs font-normal text-theme-muted ml-2">
                      ({(currentTask.taskType || 'job_apply').replace('_', ' ')})
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(currentTask.status)}>
                    {currentTask.status === 'running' && (
                      <RefreshCw className="w-3 h-3 animate-spin mr-1 inline" />
                    )}
                    Status: {currentTask.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Progress Bar */}
              <ProgressBar
                progress={currentTask.progressPercent || 0}
                label={currentTask.currentStepMessage || 'Task processing...'}
              />

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div className="p-2 bg-theme-card rounded-lg">
                  <span className="text-theme-muted block">Attempted</span>
                  <span className="font-bold text-theme-primary text-sm">
                    {currentTask.applicationsAttempted || 0}
                  </span>
                </div>
                <div className="p-2 bg-theme-card rounded-lg">
                  <span className="text-theme-muted block">Verified Steps</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {currentTask.applicationsSuccessful || 0}
                  </span>
                </div>
                <div className="p-2 bg-theme-card rounded-lg">
                  <span className="text-theme-muted block">
                    {currentTask.status === 'failed' ? 'Retries' : 'Checkpoints'}
                  </span>
                  <span className="font-bold text-amber-400 text-sm">
                    {(currentTask.retryCount ?? 0) > 0
                      ? `${currentTask.retryCount}/${currentTask.maxRetries ?? 3}`
                      : currentTask.applicationsFailed || 0}
                  </span>
                </div>
              </div>

              {/* Failed Error Message & Retry Control */}
              {currentTask.status === 'failed' && (
                <div className="p-3 rounded-lg border border-red-500/40 bg-red-950/40 text-red-200 text-xs space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Execution Failed</span>
                        <p className="text-red-300">
                          {currentTask.errorDetails || currentTask.currentStepMessage || 'Task terminated with an error.'}
                        </p>
                      </div>
                    </div>
                    {(currentTask.retryCount ?? 0) < (currentTask.maxRetries ?? 3) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetryTask(currentTask.id)}
                        disabled={actionLoading}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        className="border-red-500/50 hover:bg-red-900/30 text-red-200 shrink-0"
                      >
                        Retry Task
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Active Task Cancellation Control */}
              {(currentTask.status === 'queued' || currentTask.status === 'running') && (
                <div className="flex items-center justify-between pt-2 border-t border-theme/60 text-xs">
                  <span className="text-theme-secondary flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-theme-muted" />
                    Task is currently in worker queue
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelTask(currentTask.id)}
                    disabled={actionLoading}
                    leftIcon={<Square className="w-3.5 h-3.5" />}
                    className="text-xs border-amber-500/50 text-amber-300 hover:bg-amber-950/30"
                  >
                    Cancel Task
                  </Button>
                </div>
              )}

              {/* Completed / Cancelled Actions */}
              {(currentTask.status === 'completed' || currentTask.status === 'cancelled') && (
                <div className="flex items-center justify-between pt-2 border-t border-theme/60 text-xs">
                  <span className="text-theme-muted">
                    Execution finished at {currentTask.completedAt ? new Date(currentTask.completedAt).toLocaleTimeString() : 'N/A'}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsLaunchModalOpen(true)}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    New Simulation Run
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-theme bg-theme-surface/40 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-theme-card flex items-center justify-center mx-auto text-theme-muted">
                <PlayCircle className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-theme-primary">No Active Automation Task</h4>
                <p className="text-xs text-theme-secondary max-w-md mx-auto mt-1">
                  The task queue is currently idle. Launch a background dry-run simulation to automatically match ATS keywords and fill applications.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsLaunchModalOpen(true)}
                leftIcon={<Play className="w-3.5 h-3.5" />}
              >
                Configure & Launch Task
              </Button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-theme-secondary">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-theme-muted" />
              Safety mode enabled: 15-second humanized random intervals · Dry-run safe
            </span>
            <Link to="/automation" className="text-[var(--accent)] hover:underline font-semibold">
              View task live terminal logs →
            </Link>
          </div>
        </Card>

        {/* Platform Share Visual Chart */}
        <Card>
          <CardHeader
            title="Applications by Portal"
            subtitle="Distribution of processed candidate submissions"
          />

          <div className="space-y-4">
            {platformBreakdown.length > 0 ? (
              platformBreakdown.map((item) => (
                <div key={item.platform} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-theme-primary">{item.platform}</span>
                    <span className="text-theme-secondary font-mono">
                      {item.applied} jobs ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-theme-surface overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 px-4 rounded-xl border border-dashed border-theme bg-theme-surface/30">
                <Briefcase className="w-8 h-8 text-theme-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs text-theme-secondary font-medium">No application records found yet</p>
                <p className="text-[11px] text-theme-muted mt-1">
                  Launch an automation task or log applications to see your platform distribution.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-theme">
            <Link to="/applications">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Browse Full Applications Table →
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Bottom Row: Getting Started Checklist + Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Onboarding Checklist */}
        <Card>
          <CardHeader
            title="Candidate Setup Checklist"
            subtitle="Complete these milestones to maximize ATS match accuracy"
          />

          <div className="space-y-3">
            {checklistItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.link}
                className="flex items-center justify-between p-3 rounded-xl border border-theme bg-theme-surface/50 hover:bg-theme-card transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      item.completed
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-medium ${
                      item.completed ? 'text-theme-primary' : 'text-theme-secondary'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-theme-muted group-hover:text-[var(--accent)] transition-colors" />
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Activity Log */}
        <Card>
          <CardHeader
            title="Recent Platform Activity"
            subtitle="Audit log of automation events and status transitions"
            action={
              <Link to="/applications">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              </Link>
            }
          />

          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-xs text-theme-muted text-center py-6">No recent activity logged.</p>
            ) : (
              activities.slice(0, 4).map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl border border-theme bg-theme-surface/30"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-theme-primary">{act.title}</p>
                    <p className="text-[11px] text-theme-secondary">{act.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-theme-muted block">{act.timestamp}</span>
                    {act.statusBadge && (
                      <span className="inline-block mt-1">
                        <Badge
                          variant={
                            act.statusBadge === 'applied'
                              ? 'success'
                              : act.statusBadge === 'review_needed'
                              ? 'warning'
                              : act.statusBadge === 'interview'
                              ? 'cyan'
                              : 'default'
                          }
                          size="sm"
                        >
                          {act.statusBadge}
                        </Badge>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="p-4 rounded-xl border border-theme bg-theme-card flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-medium text-theme-secondary">Quick Shortcuts:</span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsLaunchModalOpen(true)}
            leftIcon={<PlayCircle className="w-3.5 h-3.5" />}
          >
            Launch Task
          </Button>
          <Link to="/automation">
            <Button variant="secondary" size="sm" leftIcon={<Play className="w-3.5 h-3.5" />}>
              Full Control Center
            </Button>
          </Link>
          <Link to="/resumes">
            <Button variant="secondary" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
              Manage Resumes
            </Button>
          </Link>
          <Link to="/preferences">
            <Button variant="secondary" size="sm" leftIcon={<Sliders className="w-3.5 h-3.5" />}>
              Target Keywords
            </Button>
          </Link>
          <Link to="/applications">
            <Button variant="secondary" size="sm" leftIcon={<TrendingUp className="w-3.5 h-3.5" />}>
              CRM Records
            </Button>
          </Link>
        </div>
      </div>

      {/* Dynamic Task Queue Launch Modal (Connected to POST /api/v1/tasks) */}
      <Modal
        isOpen={isLaunchModalOpen}
        onClose={() => {
          if (!actionLoading) {
            setIsLaunchModalOpen(false);
            setValidationError(null);
          }
        }}
        title="Launch Automation Task (Dry-Run Simulation)"
        maxWidth="lg"
      >
        <form onSubmit={handleStartTask} className="space-y-4">
          {validationError && (
            <div className="p-3 rounded-lg border border-red-500/40 bg-red-950/40 text-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Target Platform"
              options={platformOptions}
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as PlatformName | 'All Platforms')}
              disabled={actionLoading}
            />

            <Select
              label="Task Type"
              options={taskTypeOptions}
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as 'job_apply' | 'profile_update' | 'screening_test')}
              disabled={actionLoading}
            />
          </div>

          {/* Dynamic Job Keywords */}
          <div>
            <label className="block text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-1.5">
              Target Job Roles / Keywords
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-7">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-theme-surface border border-theme text-theme-primary font-medium"
                >
                  <Target className="w-3 h-3 text-[var(--accent)]" />
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="hover:text-red-400 p-0.5 text-theme-muted"
                    aria-label={`Remove keyword ${kw}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type keyword and press Enter (e.g. React Developer)..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleAddKeyword}
                disabled={actionLoading}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddKeyword}
                disabled={!keywordInput.trim() || actionLoading}
              >
                Add
              </Button>
            </div>
            <p className="text-[11px] text-theme-muted mt-1">
              Synchronized from your profile preferences. Add or adjust roles dynamically for this run.
            </p>
          </div>

          {/* Dynamic Preferred Locations */}
          <div>
            <label className="block text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-1.5">
              Target Locations
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-7">
              {locations.map((loc) => (
                <span
                  key={loc}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-theme-surface border border-theme text-theme-primary font-medium"
                >
                  <MapPin className="w-3 h-3 text-sky-400" />
                  {loc}
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(loc)}
                    className="hover:text-red-400 p-0.5 text-theme-muted"
                    aria-label={`Remove location ${loc}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type location and press Enter (e.g. Remote, Pune)..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={handleAddLocation}
                disabled={actionLoading}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddLocation}
                disabled={!locationInput.trim() || actionLoading}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Application Limits & Force Duplicate Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Application Limit (Per Cycle)"
              type="number"
              min={1}
              max={100}
              value={maxApplications}
              onChange={(e) => setMaxApplications(parseInt(e.target.value, 10) || 1)}
              disabled={actionLoading}
              helperText="Safety limit: capped between 1 and 100 applications"
            />

            <div className="pt-6">
              <Checkbox
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                disabled={actionLoading}
                label="Allow Duplicate / Force Enqueue"
                description="Overrides active task collision check"
              />
            </div>
          </div>

          {/* Safety Settings: Dry Run Simulation */}
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-emerald-300">Safety Verification Guard</span>
            </div>
            <Checkbox
              checked={dryRun}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setDryRun(isChecked);
                if (isChecked) {
                  setConfirmLiveSubmission(false);
                }
              }}
              disabled={actionLoading}
              label="Enable Dry-Run Simulation Mode (Recommended)"
              description="Performs keyword search, ATS scoring, and form filling without final submission or portal mutation."
            />
          </div>

          {/* Explicit Confirmation when Dry Run is turned OFF */}
          {!dryRun && (
            <div className="p-3.5 rounded-xl border border-red-500/40 bg-red-950/30 space-y-2">
              <div className="flex items-center gap-2 text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-xs font-semibold">Caution: Live Application Submissions</span>
              </div>
              <p className="text-[11px] text-red-200/90">
                Real applications will be submitted to employers. Never run live mode for testing.
              </p>
              <Checkbox
                checked={confirmLiveSubmission}
                onChange={(e) => setConfirmLiveSubmission(e.target.checked)}
                disabled={actionLoading}
                label="I confirm real portal job submission for this run"
              />
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-theme">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsLaunchModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={actionLoading}
              leftIcon={<Play className="w-4 h-4" />}
            >
              {actionLoading ? 'Enqueueing Task...' : 'Enqueue Task (POST /api/v1/tasks)'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
