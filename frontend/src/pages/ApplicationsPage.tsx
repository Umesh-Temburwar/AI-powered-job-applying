import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Briefcase,
  Building,
  MapPin,
  AlertCircle,
  Info,
  RotateCw,
  CheckCircle2,
  Clock,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { useApplications } from '../hooks/useApplications';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../context/ToastContext';
import { playRetroSound } from '../utils/soundEffects';
import {
  Card,
  CardHeader,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  EmptyState,
  Skeleton,
} from '../components/ui';
import type { Application, PlatformName, ApplicationStatus } from '../types';

export const ApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    applications,
    total,
    totalPages,
    page,
    setPage,
    filters,
    updateFilters,
    loading,
    error,
    exportCsv,
  } = useApplications({ page: 1, pageSize: 8 });

  const {
    currentTask,
    actionLoading: taskActionLoading,
    error: taskError,
    cancelTask,
    retryTask,
  } = useTasks();

  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState(filters.query || '');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [exporting, setExporting] = useState(false);
  const [dismissedTaskId, setDismissedTaskId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const pageTopRef = useRef<HTMLDivElement>(null);

  // Helper to reliably pin scroll to the very top across all browsers & scroll containers
  const scrollToPageTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    pageTopRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, []);

  // Automatically scroll to the top of the page on mount so user sees 'Applications Ledger & Live Automation'
  useEffect(() => {
    scrollToPageTop();
  }, [scrollToPageTop]);

  const isTaskActive = currentTask?.status === 'running' || currentTask?.status === 'queued';
  const showTaskBanner = Boolean(
    currentTask &&
    currentTask.status !== 'idle' &&
    (isTaskActive || dismissedTaskId !== currentTask.id)
  );

  // When a bot task is launched or active, keep page pinned to the upper side
  // so 'Applications Ledger & Live Automation' header and live banner are immediately visible
  useEffect(() => {
    if (isTaskActive) {
      scrollToPageTop();
      const t1 = setTimeout(scrollToPageTop, 50);
      const t2 = setTimeout(scrollToPageTop, 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isTaskActive, currentTask?.id, scrollToPageTop]);

  const getTaskBannerTitle = (task: typeof currentTask) => {
    if (!task) return '';
    const mode = task.dryRun ? 'Dry-run' : 'Live';
    switch (task.status) {
      case 'queued':
        return `Queued: ${task.platform} (${mode}) — Waiting for worker`;
      case 'running':
        return `Running: ${task.platform} (${mode}) — ${task.progressPercent || 0}%`;
      case 'completed':
        return `Completed: ${task.platform} (${mode})`;
      case 'failed':
        return `Failed: ${task.platform} (${mode})`;
      case 'cancelled':
        return `Cancelled: ${task.platform}`;
      default:
        return `${task.status.toUpperCase()}: ${task.platform} (${mode})`;
    }
  };

  const PIPELINE_STAGES = [
    { id: 1, name: '1. Profile Check', threshold: 10, desc: 'Verifying candidate resume & criteria' },
    { id: 2, name: '2. Browser Engine', threshold: 25, desc: 'Stealth automation browser launch' },
    { id: 3, name: '3. Portal Auth', threshold: 45, desc: 'Candidate session verification & login' },
    { id: 4, name: '4. Job Screening', threshold: 70, desc: 'Scanning & matching vacancies' },
    { id: 5, name: '5. Apply & Sync', threshold: 100, desc: 'Submitting application & syncing ledger' },
  ];

  const handleCancelTask = async (taskId: string) => {
    try {
      playRetroSound('click');
      await cancelTask(taskId);
      showToast('Bot task cancelled by user', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel task', 'error');
    }
  };

  const handleRetryTask = async (taskId: string) => {
    try {
      playRetroSound('click');
      await retryTask(taskId);
      showToast('Retrying bot automation task...', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to retry task', 'error');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ query: searchQuery });
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const csvData = await exportCsv();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `universal_job_applications_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Exported applications to CSV', 'success');
    } catch (err) {
      showToast('Failed to export CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadgeVariant = (status: ApplicationStatus) => {
    switch (status) {
      case 'applied':
        return 'success';
      case 'interview':
        return 'cyan';
      case 'review_needed':
        return 'warning';
      case 'under_review':
        return 'info';
      case 'rejected':
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div ref={pageTopRef} id="applications-page-top" className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header with Worker Status and Launch Bot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            Applications Ledger & Live Automation
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time multi-platform bot execution, active process monitor, and Supabase CRM ledger.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border border-[var(--border-color)] bg-[var(--bg-card)] text-xs font-mono">
            {isTaskActive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-500 font-bold uppercase">BOT RUNNING</span>
              </>
            ) : currentTask?.status === 'failed' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-red-400 font-bold uppercase">BOT FAILED</span>
              </>
            ) : currentTask?.status === 'cancelled' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-zinc-500 shrink-0" />
                <span className="text-zinc-400 font-bold uppercase">BOT CANCELLED</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500/60 shrink-0" />
                <span className="text-[var(--text-secondary)] font-bold uppercase">WORKER IDLE</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              playRetroSound('click');
              navigate('/profile');
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider retro-shadow transition-all cursor-pointer"
            title="Configure profile credentials, target roles, and launch bot"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>🚀 Start / Launch Bot</span>
          </button>
        </div>
      </div>

      {/* Task Error Banner if Worker Disconnected */}
      {taskError && (
        <div className="p-3 rounded-none border border-amber-600/70 bg-amber-950/20 text-amber-300 text-xs font-mono">
          {taskError.trim().startsWith('<') ? 'Automation worker is reconnecting. Please wait a moment.' : taskError}
        </div>
      )}

      {/* Bot Execution Status & Live Process Monitor */}
      {showTaskBanner && currentTask && (
        <div
          ref={bannerRef}
          id="active-task-banner"
          data-testid="active-task-banner"
          className={`p-4 rounded-none border-2 ${
            currentTask.status === 'failed'
              ? 'border-red-600/70 bg-red-950/20'
              : currentTask.status === 'running'
              ? 'border-emerald-600/70 bg-emerald-950/20'
              : currentTask.status === 'queued'
              ? 'border-amber-600/70 bg-amber-950/20'
              : 'border-[var(--border-color)] bg-[var(--bg-card)]'
          } transition-all space-y-3`}
        >
          {/* Banner Top Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[var(--text-primary)]">
                  {getTaskBannerTitle(currentTask)}
                </span>
                <span className="text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--bg-card-hover)] px-2 py-0.5 rounded-none border border-[var(--border-color)]">
                  ID: {currentTask.id.slice(0, 8)}
                </span>
                {isTaskActive && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5">
                    <RotateCw className="w-3 h-3 animate-spin" /> LIVE
                  </span>
                )}
              </div>
              <div className="text-[13px] text-[var(--text-secondary)] mt-1 font-mono">
                {currentTask.currentStepMessage || `Progress: ${currentTask.progressPercent || 0}%`}
              </div>
              {currentTask.status === 'failed' && currentTask.errorDetails && (
                <div className="text-[12px] text-red-400 mt-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Reason: {currentTask.errorDetails}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isTaskActive && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCancelTask(currentTask.id)}
                  disabled={taskActionLoading}
                >
                  {taskActionLoading ? 'Cancelling...' : 'Cancel Task'}
                </Button>
              )}
              {currentTask.status === 'failed' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleRetryTask(currentTask.id)}
                  disabled={taskActionLoading}
                >
                  {taskActionLoading ? 'Retrying...' : 'Retry Task'}
                </Button>
              )}
              {!isTaskActive && (
                <button
                  type="button"
                  onClick={() => setDismissedTaskId(currentTask.id)}
                  className="px-2.5 py-1 text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                  title="Dismiss notification"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar (when active or has progress) */}
          {(isTaskActive || (currentTask.progressPercent || 0) > 0) && (
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] mb-1">
                <span>Automation Execution Progress</span>
                <span className="font-bold text-[var(--text-primary)]">{currentTask.progressPercent || 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 border border-[var(--border-color)] overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    currentTask.status === 'failed'
                      ? 'bg-red-500'
                      : currentTask.status === 'cancelled'
                      ? 'bg-zinc-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, currentTask.progressPercent || 0))}%` }}
                />
              </div>
            </div>
          )}

          {/* Step-by-Step Execution Pipeline Process */}
          {isTaskActive && (
            <div className="pt-2 border-t border-[var(--border-color)]/60">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center justify-between">
                <span>Active Process Pipeline Stages</span>
                <button
                  type="button"
                  onClick={() => setShowLogs(!showLogs)}
                  className="text-emerald-400 hover:text-emerald-300 underline lowercase font-sans text-xs cursor-pointer"
                >
                  {showLogs ? 'Hide terminal logs' : 'View live terminal logs'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PIPELINE_STAGES.map((stage) => {
                  const percent = currentTask.progressPercent || 0;
                  const isDone = percent >= stage.threshold;
                  const isCurrent = !isDone && (stage.id === 1 || percent >= PIPELINE_STAGES[stage.id - 2].threshold);

                  return (
                    <div
                      key={stage.id}
                      className={`p-2 border text-xs font-mono transition-all ${
                        isDone
                          ? 'border-emerald-600/50 bg-emerald-950/20 text-emerald-300'
                          : isCurrent
                          ? 'border-cyan-500 bg-cyan-950/30 text-cyan-200 ring-1 ring-cyan-500/40'
                          : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        )}
                        <span className="truncate">{stage.name}</span>
                      </div>
                      <p className="text-[10px] opacity-75 mt-0.5 truncate">{stage.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Collapsible Live Process Logs */}
              {showLogs && (
                <div className="mt-3 p-3 bg-black/80 border border-slate-700 font-mono text-[11px] text-emerald-400 rounded-none max-h-48 overflow-y-auto space-y-1">
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800 text-slate-400 text-[10px]">
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3" /> Live Automation Log Stream
                    </span>
                    <span>Task ID: {currentTask.id.slice(0, 8)}</span>
                  </div>
                  {currentTask.logs && currentTask.logs.length > 0 ? (
                    currentTask.logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                        <span className={log.level === 'error' ? 'text-red-400' : log.level === 'success' ? 'text-emerald-300' : 'text-slate-300'}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic">No detailed log entries yet. Waiting for worker output...</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sample Data Disclaimer */}
      <div className="p-3.5 rounded-none border border-sky-500/30 bg-sky-950/40 text-sky-200 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            Application records live-sync across Supabase Cloud CRM, your multi-platform automation bots, and CSV exports.
          </span>
        </div>
        <Badge variant="cyan" size="sm">
          CRM Tracker
        </Badge>
      </div>

      {error && (
        <div className="p-4 rounded-none bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Filter and Search Bar Card */}
      <Card>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title, company, or city..."
              leftIcon={<Search className="w-4 h-4" />}
            />
            <Button type="submit" variant="secondary" size="md">
              Search
            </Button>
          </form>

          {/* Filters & Export */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-36">
              <Select
                value={filters.platform || 'All'}
                onChange={(e) => updateFilters({ platform: e.target.value as PlatformName | 'All' })}
                options={[
                  { value: 'All', label: 'All Portals' },
                  { value: 'Naukri', label: 'Naukri' },
                  { value: 'Internshala', label: 'Internshala' },
                  { value: 'Indeed', label: 'Indeed' },
                  { value: 'LinkedIn', label: 'LinkedIn' },
                  { value: 'Glassdoor', label: 'Glassdoor' },
                ]}
              />
            </div>

            <div className="w-36">
              <Select
                value={filters.status || 'All'}
                onChange={(e) => updateFilters({ status: e.target.value as ApplicationStatus | 'All' })}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'applied', label: 'Applied' },
                  { value: 'interview', label: 'Interview' },
                  { value: 'review_needed', label: 'Review Needed' },
                  { value: 'under_review', label: 'Under Review' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleExportCsv}
              isLoading={exporting}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Table Card (Desktop) & Cards List (Mobile) */}
      <Card className="overflow-hidden p-0">
        <div className="p-5 border-b border-theme flex items-center justify-between">
          <CardHeader
            title="Logged Applications"
            subtitle={`Showing ${applications.length} of ${total} records`}
            className="mb-0"
          />
          <span className="text-xs text-theme-muted font-mono">
            Page {page} of {totalPages}
          </span>
        </div>

        {loading && applications.length === 0 ? (
          <div className="p-6 space-y-4">
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
          </div>
        ) : applications.length === 0 ? (
          <div className="p-8">
            {total === 0 && !filters.query && (!filters.platform || filters.platform === 'All') && (!filters.status || filters.status === 'All') ? (
              <EmptyState
                icon={<Briefcase className="w-6 h-6" />}
                title="You haven't recorded any job applications yet"
                description="When your background automation tasks apply to jobs or you record applications, they will appear in this tracker."
                actionLabel="Configure Candidate Profile & Start Bot"
                onAction={() => navigate('/profile')}
              />
            ) : (
              <EmptyState
                icon={<Briefcase className="w-6 h-6" />}
                title="No Applications Match Filters"
                description="Try adjusting your keyword query, portal selection, or status filters."
                actionLabel="Clear Filters"
                onAction={() => {
                  setSearchQuery('');
                  updateFilters({ query: '', platform: 'All', status: 'All' });
                }}
              />
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-theme bg-theme-surface/50 text-xs font-semibold text-theme-secondary uppercase tracking-wider">
                    <th className="py-3.5 px-5">Role & Company</th>
                    <th className="py-3.5 px-4">Portal</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Salary</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="hover:bg-theme-card-hover transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-5">
                        <p className="font-bold text-theme-primary group-hover:text-[var(--accent)] transition-colors">
                          {app.jobTitle}
                        </p>
                        <p className="text-xs text-theme-secondary flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3" />
                          {app.company}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <Badge variant="cyan" size="sm">
                          {app.platform}
                        </Badge>
                      </td>

                      <td className="py-4 px-4 text-xs text-theme-secondary">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-theme-muted" />
                          {app.location}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs text-theme-secondary font-mono">
                        {app.salary || 'Not specified'}
                      </td>

                      <td className="py-4 px-4">
                        <Badge variant={getStatusBadgeVariant(app.status)} size="sm">
                          {app.status.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="py-4 px-4 text-xs text-theme-muted whitespace-nowrap">
                        {new Date(app.appliedDate).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApp(app);
                          }}
                          aria-label="View application details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-theme">
              {applications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className="p-4 space-y-2 hover:bg-theme-card-hover cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-theme-primary">{app.jobTitle}</h4>
                      <p className="text-xs text-theme-secondary flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3" />
                        {app.company}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(app.status)} size="sm">
                      {app.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-theme-muted pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {app.location}
                    </span>
                    <Badge variant="default" size="sm">
                      {app.platform}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-theme bg-theme-surface/30 flex items-center justify-between">
              <span className="text-xs text-theme-muted">
                Showing page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Application Details Drawer Modal */}
      <Modal
        isOpen={selectedApp !== null}
        onClose={() => setSelectedApp(null)}
        title="Application Details"
        maxWidth="lg"
        footer={
          <>
            {selectedApp?.url && (
              <a
                href={selectedApp.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex"
              >
                <Button variant="outline" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Open Original Listing
                </Button>
              </a>
            )}
            <Button variant="primary" size="sm" onClick={() => setSelectedApp(null)}>
              Close
            </Button>
          </>
        }
      >
        {selectedApp && (
          <div className="space-y-5 text-sm">
            <div className="flex items-start justify-between gap-4 border-b border-theme pb-4">
              <div>
                <h3 className="text-lg font-bold text-theme-primary">{selectedApp.jobTitle}</h3>
                <p className="text-sm text-theme-secondary font-medium mt-0.5">
                  {selectedApp.company}
                </p>
              </div>
              <Badge variant={getStatusBadgeVariant(selectedApp.status)} size="md">
                {selectedApp.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-theme-surface rounded-xl">
                <span className="text-theme-muted block mb-1">Platform</span>
                <span className="font-semibold text-theme-primary">{selectedApp.platform}</span>
              </div>
              <div className="p-3 bg-theme-surface rounded-xl">
                <span className="text-theme-muted block mb-1">Location</span>
                <span className="font-semibold text-theme-primary">{selectedApp.location}</span>
              </div>
              <div className="p-3 bg-theme-surface rounded-xl">
                <span className="text-theme-muted block mb-1">Salary Range</span>
                <span className="font-semibold text-theme-primary font-mono">
                  {selectedApp.salary || 'Not specified'}
                </span>
              </div>
              <div className="p-3 bg-theme-surface rounded-xl">
                <span className="text-theme-muted block mb-1">Applied Timestamp</span>
                <span className="font-semibold text-theme-primary">
                  {new Date(selectedApp.appliedDate).toLocaleString()}
                </span>
              </div>
            </div>

            {selectedApp.notes && (
              <div className="p-3.5 bg-theme-surface rounded-xl">
                <span className="text-xs font-semibold text-theme-secondary uppercase tracking-wider block mb-1">
                  Submission Notes
                </span>
                <p className="text-xs text-theme-secondary leading-relaxed">
                  {selectedApp.notes}
                </p>
              </div>
            )}

            {selectedApp.errorMessage && (
              <div className="p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200">
                <span className="font-bold block mb-1 flex items-center gap-1.5 text-red-300">
                  <AlertCircle className="w-3.5 h-3.5" /> Portal Notice / Error Details
                </span>
                <p>{selectedApp.errorMessage}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
