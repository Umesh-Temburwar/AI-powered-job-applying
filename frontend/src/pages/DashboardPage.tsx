import React from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlayCircle,
  FileText,
  Sliders,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useDashboard } from '../hooks/useApplications';
import { useTasks } from '../hooks/useTasks';
import { Card, CardHeader, Badge, Button, ProgressBar, Skeleton } from '../components/ui';

export const DashboardPage: React.FC = () => {
  const {
    metrics,
    apiSummary,
    activities,
    loading: dashLoading,
    error: dashError,
    refreshDashboard,
  } = useDashboard();
  const { currentTask } = useTasks();

  const platformBreakdown = [
    { platform: 'Naukri.com', applied: 48, percentage: 42, color: 'bg-emerald-500' },
    { platform: 'Internshala', applied: 34, percentage: 30, color: 'bg-sky-500' },
    { platform: 'Indeed', applied: 20, percentage: 18, color: 'bg-purple-500' },
    { platform: 'LinkedIn', applied: 12, percentage: 10, color: 'bg-amber-500' },
  ];

  const checklistItems = [
    { label: 'Complete Candidate Profile details', completed: true, link: '/profile' },
    { label: 'Upload default PDF resume (Alex_Vance_Resume.pdf)', completed: true, link: '/resumes' },
    { label: 'Configure target job titles & locations', completed: true, link: '/preferences' },
    { label: 'Run first automated simulation cycle', completed: currentTask?.status !== 'idle', link: '/automation' },
  ];

  return (
    <div className="space-y-6">
      {/* Error state with Retry button */}
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

      {/* Backend API / Sample data disclaimer banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-sky-500/30 bg-sky-950/40 text-sky-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />
          <span className="font-semibold">
            {apiSummary?.mode === 'demo' ? 'Backend API Connected' : 'Sample Data Mode'}
          </span>
          <span className="text-sky-300/80">
            — {apiSummary?.message || 'Metrics displayed reflect sample records. Phase 4/5 connects live database records.'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {apiSummary?.mode === 'demo' && (
            <Badge variant="cyan" size="sm">
              Demo data from API
            </Badge>
          )}
          <Badge variant="default" size="sm">
            Status: {apiSummary?.automation_status || 'idle'}
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
                {metrics?.totalApplied || 114}
              </span>
              <span className="text-[11px] text-theme-muted font-medium">Sample data</span>
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
                {metrics?.successful || 98}
              </span>
              <span className="text-[11px] text-emerald-500/80 font-medium">86% rate</span>
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
                {metrics?.pendingReview || 11}
              </span>
              <span className="text-[11px] text-amber-400/80 font-medium">Requires candidate input</span>
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
                {metrics?.failedOrSkipped || 5}
              </span>
              <span className="text-[11px] text-red-400/80 font-medium">Network / Expired</span>
            </div>
          )}
        </Card>
      </div>

      {/* Middle Row: Automation Runner Card + Platform Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Automation Status Card */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Automation Worker Status"
            subtitle="Background Selenium executor with per-task sandbox profile"
            action={
              <Link to="/automation">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Control Center
                </Button>
              </Link>
            }
          />

          <div className="p-4 rounded-xl border border-theme bg-theme-surface space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">
                  Target Platform
                </span>
                <p className="text-base font-bold text-theme-primary">
                  {currentTask?.platform || 'All Core Platforms (Naukri + Internshala + Indeed)'}
                </p>
              </div>
              <Badge
                variant={
                  currentTask?.status === 'running'
                    ? 'cyan'
                    : currentTask?.status === 'review_required'
                    ? 'warning'
                    : currentTask?.status === 'completed'
                    ? 'success'
                    : 'default'
                }
              >
                Status: {currentTask?.status?.toUpperCase() || 'IDLE'}
              </Badge>
            </div>

            <ProgressBar
              progress={currentTask?.progressPercent || 0}
              label={currentTask?.currentStepMessage || 'Worker ready in stand-by mode.'}
            />

            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <div className="p-2 bg-theme-card rounded-lg">
                <span className="text-theme-muted block">Attempted</span>
                <span className="font-bold text-theme-primary text-sm">
                  {currentTask?.applicationsAttempted || 0}
                </span>
              </div>
              <div className="p-2 bg-theme-card rounded-lg">
                <span className="text-theme-muted block">Verified Steps</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {currentTask?.applicationsSuccessful || 0}
                </span>
              </div>
              <div className="p-2 bg-theme-card rounded-lg">
                <span className="text-theme-muted block">Checkpoints</span>
                <span className="font-bold text-amber-400 text-sm">
                  {currentTask?.applicationsFailed || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-theme-secondary">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-theme-muted" />
              Safety mode enabled: 15-second humanized random intervals
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
            {platformBreakdown.map((item) => (
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
            ))}
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
          <Link to="/automation">
            <Button variant="secondary" size="sm" leftIcon={<PlayCircle className="w-3.5 h-3.5" />}>
              Run Simulation
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
            <Button variant="primary" size="sm" leftIcon={<TrendingUp className="w-3.5 h-3.5" />}>
              CRM Records
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
