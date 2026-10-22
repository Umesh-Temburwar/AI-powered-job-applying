import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  AlertTriangle,
  Terminal,
  ShieldAlert,
} from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../context/ToastContext';
import {
  Card,
  CardHeader,
  Button,
  Badge,
  ProgressBar,
  Select,
  ConfirmDialog,
  Skeleton,
} from '../components/ui';
import type { PlatformName } from '../types';

export const AutomationPage: React.FC = () => {
  const {
    currentTask,
    history,
    loading,
    actionLoading,
    error,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
  } = useTasks();

  const { showToast } = useToast();

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformName | 'All Platforms'>('All Platforms');
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);

  const isRunning = currentTask?.status === 'running';
  const isPaused = currentTask?.status === 'paused';
  const isReviewRequired = currentTask?.status === 'review_required';
  const isIdle = !currentTask || currentTask.status === 'idle' || currentTask.status === 'completed' || currentTask.status === 'stopped' || currentTask.status === 'failed';

  const handleStartConfirmed = async () => {
    setConfirmStartOpen(false);
    try {
      await startTask(selectedPlatform);
      showToast(`Automation simulation started for ${selectedPlatform}`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to launch task', 'error');
    }
  };

  const handlePause = async () => {
    if (!currentTask) return;
    try {
      await pauseTask(currentTask.id);
      showToast('Automation task paused', 'warning');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to pause', 'error');
    }
  };

  const handleResume = async () => {
    if (!currentTask) return;
    try {
      await resumeTask(currentTask.id);
      showToast('Automation task resumed', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to resume', 'error');
    }
  };

  const handleStop = async () => {
    if (!currentTask) return;
    try {
      await stopTask(currentTask.id);
      showToast('Automation task aborted', 'error');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to stop', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Simulation Banner Notice */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/30 text-amber-200 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-amber-300 mb-0.5">
            Demo Simulation Mode — No Real Applications Are Submitted
          </span>
          <span>
            This view simulates the background worker lifecycle (browser sandbox initialization,
            search parsing, screening checks, and review checkpoints). The real Selenium engine
            runs only via the backend worker in Phase 7.
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Main Automation Control Panel */}
      <Card>
        <CardHeader
          title="Automation Execution Center"
          subtitle="Configure target portal and manage task execution state"
          action={
            <Badge
              variant={
                isRunning
                  ? 'cyan'
                  : isReviewRequired
                  ? 'warning'
                  : isPaused
                  ? 'warning'
                  : currentTask?.status === 'completed'
                  ? 'success'
                  : 'default'
              }
              size="md"
            >
              Task: {currentTask?.status?.toUpperCase() || 'IDLE'}
            </Badge>
          }
        />

        {loading ? (
          <div className="space-y-4">
            <Skeleton height="3rem" />
            <Skeleton height="6rem" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Platform Selector & Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="sm:col-span-1">
                <Select
                  label="Target Job Portal"
                  value={selectedPlatform}
                  disabled={isRunning || isPaused || isReviewRequired}
                  onChange={(e) => setSelectedPlatform(e.target.value as PlatformName | 'All Platforms')}
                  options={[
                    { value: 'All Platforms', label: 'All Core Portals' },
                    { value: 'Naukri', label: 'Naukri.com' },
                    { value: 'Internshala', label: 'Internshala' },
                    { value: 'Indeed', label: 'Indeed India' },
                    { value: 'LinkedIn', label: 'LinkedIn Easy Apply' },
                  ]}
                />
              </div>

              <div className="sm:col-span-2 flex flex-wrap gap-2.5 justify-start sm:justify-end">
                {isIdle && (
                  <Button
                    variant="primary"
                    onClick={() => setConfirmStartOpen(true)}
                    disabled={actionLoading}
                    leftIcon={<Play className="w-4 h-4" />}
                  >
                    Start Simulation Run
                  </Button>
                )}

                {isRunning && (
                  <Button
                    variant="secondary"
                    onClick={handlePause}
                    disabled={actionLoading}
                    leftIcon={<Pause className="w-4 h-4" />}
                  >
                    Pause Task
                  </Button>
                )}

                {(isPaused || isReviewRequired) && (
                  <Button
                    variant="primary"
                    onClick={handleResume}
                    disabled={actionLoading}
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                  >
                    {isReviewRequired ? 'Confirm & Continue' : 'Resume Task'}
                  </Button>
                )}

                {(isRunning || isPaused || isReviewRequired) && (
                  <Button
                    variant="danger"
                    onClick={handleStop}
                    disabled={actionLoading}
                    leftIcon={<Square className="w-4 h-4" />}
                  >
                    Stop & Wipe Sandbox
                  </Button>
                )}
              </div>
            </div>

            {/* Current Step Progress Card */}
            <div className="p-4 rounded-xl border border-theme bg-theme-surface/70 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-theme-secondary uppercase tracking-wider">
                  Active Execution Step
                </span>
                <span className="text-[11px] text-theme-muted font-mono">
                  Task ID: {currentTask?.id || 'idle-standby'}
                </span>
              </div>

              <ProgressBar
                progress={currentTask?.progressPercent || 0}
                label={currentTask?.currentStepMessage || 'No active simulation running.'}
                color={isReviewRequired ? 'amber' : isRunning ? 'cyan' : 'emerald'}
              />

              {/* Review Required Alert Bar */}
              {isReviewRequired && (
                <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/50 text-amber-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Screening questionnaire checkpoint reached. Click "Confirm &amp; Continue" to approve responses.
                    </span>
                  </div>
                  <Button size="sm" variant="primary" onClick={handleResume}>
                    Approve
                  </Button>
                </div>
              )}

              {/* Step counter stats */}
              <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
                <div className="p-3 bg-theme-card border border-theme rounded-lg">
                  <span className="text-theme-muted block">Listings Scanned</span>
                  <span className="text-lg font-bold text-theme-primary">
                    {currentTask?.applicationsAttempted || 0}
                  </span>
                </div>
                <div className="p-3 bg-theme-card border border-theme rounded-lg">
                  <span className="text-theme-muted block">Simulated Steps Verified</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {currentTask?.applicationsSuccessful || 0}
                  </span>
                </div>
                <div className="p-3 bg-theme-card border border-theme rounded-lg">
                  <span className="text-theme-muted block">Review Checkpoints</span>
                  <span className="text-lg font-bold text-amber-400">
                    {currentTask?.applicationsFailed || 0}
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
          title="Simulated Terminal & Event Stream"
          subtitle="Real-time execution log from the automation worker process"
          action={
            <span className="text-xs text-theme-muted flex items-center gap-1.5 font-mono">
              <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
              stdout / stderr stream
            </span>
          }
        />

        <div className="rounded-xl border border-theme bg-[#060D1E] p-4 font-mono text-xs text-slate-300 max-h-72 overflow-y-auto space-y-1.5 shadow-inner">
          {!currentTask?.logs || currentTask.logs.length === 0 ? (
            <p className="text-slate-600 text-center py-6">Logs will appear here when task runs.</p>
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
          title="Past Task Runs"
          subtitle="Audit log of prior simulation runs"
        />

        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-xs text-theme-muted text-center py-4">No task history recorded yet.</p>
          ) : (
            history.map((hist) => (
              <div
                key={hist.id}
                className="p-3.5 rounded-xl border border-theme bg-theme-surface/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-theme-primary">{hist.platform}</span>
                    <Badge variant={hist.status === 'completed' ? 'success' : 'default'} size="sm">
                      {hist.status}
                    </Badge>
                  </div>
                  <p className="text-theme-muted mt-0.5">{hist.currentStepMessage}</p>
                </div>
                <div className="text-right text-theme-muted shrink-0">
                  <span>Completed at {new Date(hist.completedAt || Date.now()).toLocaleTimeString()}</span>
                  <p className="text-emerald-400 font-mono mt-0.5">
                    {hist.applicationsSuccessful} verified steps
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Start Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmStartOpen}
        onClose={() => setConfirmStartOpen(false)}
        onConfirm={handleStartConfirmed}
        title="Start Simulation Run"
        description={`This will launch a simulated background automation cycle for ${selectedPlatform}. Notice: this is a frontend simulation; no external job portal requests or actual submissions will occur.`}
        confirmLabel="Confirm & Launch"
      />
    </div>
  );
};
