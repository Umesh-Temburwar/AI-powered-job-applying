import React, { useState, useEffect } from 'react';
import { useDashboard, useApplications } from '../hooks/useApplications';
import { useTasks } from '../hooks/useTasks';
import { usePreferences } from '../hooks/usePreferences';
import { useConnections } from '../hooks/useConnections';
import { useToast } from '../context/ToastContext';
import { Button, Input, Select, Modal } from '../components/ui';
import type { PlatformName } from '../types';

export const DashboardPage: React.FC = () => {
  const { metrics, error: dashError } = useDashboard();
  const {
    currentTask,
    actionLoading,
    error: taskError,
    startTask,
    cancelTask,
    retryTask,
  } = useTasks();

  const {
    connections,
    loading: connectionsLoading,
    actionLoading: actionPlatform,
    error: connError,
    refreshConnections,
    connectPlatform,
    verifyConnection,
    disconnectPlatform,
  } = useConnections();

  const { preferences } = usePreferences();
  const { showToast } = useToast();

  // Applications table state
  const [portalFilter, setPortalFilter] = useState<string>('all');
  const {
    applications,
    total,
    totalPages,
    page,
    setPage,
    updateFilters,
    loading: appsLoading,
  } = useApplications({ pageSize: 10 });

  // Task Launch Modal & Form State
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

  // Sync saved user preferences
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

  // Handle portal filter change
  const handlePortalFilterChange = (val: string) => {
    setPortalFilter(val);
    updateFilters({ platform: val === 'all' ? undefined : val });
  };

  // Keyword tag handlers
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

  // Location tag handlers
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

  // Start task submit
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
      setValidationError('Live submissions require explicit confirmation.');
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

      showToast(`Task queued on ${selectedPlatform}`, 'success');
      setIsLaunchModalOpen(false);
      setValidationError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to launch automation task';
      setValidationError(msg);
      showToast(msg, 'error');
    }
  };

  // Platform and task options for the modal
  const platformOptions = [
    { value: 'All Platforms', label: 'All Portals' },
    { value: 'Naukri', label: 'Naukri' },
    { value: 'Internshala', label: 'Internshala' },
    { value: 'Indeed', label: 'Indeed' },
    { value: 'LinkedIn', label: 'LinkedIn' },
  ];

  const taskTypeOptions = [
    { value: 'job_apply', label: 'Automated Job Applications' },
    { value: 'profile_update', label: 'Candidate Profile Refresh' },
    { value: 'screening_test', label: 'Screening Simulation' },
  ];

  // Clean status indicator
  const renderStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('submit') || s.includes('applied') || s === 'completed' || s === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-[#166534] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#166534] shrink-0" />
          Submitted
        </span>
      );
    }
    if (s.includes('review') || s === 'pending' || s === 'queued') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-[#B45309] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B45309] shrink-0" />
          Review
        </span>
      );
    }
    if (s.includes('fail') || s.includes('error') || s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-[#B91C1C] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C] shrink-0" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-[#6B6B6B] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-[#6B6B6B] shrink-0" />
        {status}
      </span>
    );
  };

  // Connection action handlers
  const handleConnect = async (platform: string) => {
    try {
      await connectPlatform(platform);
      showToast(`Opened browser login for ${platform}`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to connect ${platform}`, 'error');
    }
  };

  const handleVerify = async (platform: string) => {
    try {
      const res = await verifyConnection(platform);
      if (res?.status === 'connected') {
        showToast(`Verified session on ${platform}`, 'success');
      } else {
        showToast(`No active session on ${platform}. Please log in first.`, 'info');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to verify ${platform}`, 'error');
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      await disconnectPlatform(platform);
      showToast(`Disconnected ${platform}`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to disconnect ${platform}`, 'error');
    }
  };

  const renderConnectionBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#166534] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
            Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#B45309] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B45309] animate-pulse" />
            Connecting
          </span>
        );
      case 'login_required':
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#B45309] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
            Login required
          </span>
        );
      case 'verification_required':
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#B45309] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
            Verification required
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#B91C1C] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]" />
            Error
          </span>
        );
      case 'unsupported':
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6B6B6B] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B6B6B]" />
            Unsupported
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6B6B6B] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B6B6B]" />
            Not connected
          </span>
        );
    }
  };

  const getTaskBannerTitle = () => {
    if (!currentTask) return '';
    const mode = currentTask.dryRun ? 'Dry-run' : 'Live';
    switch (currentTask.status) {
      case 'queued':
        return `Queued: ${currentTask.platform} (${mode}) — Waiting for worker`;
      case 'running':
        return `Running: ${currentTask.platform} (${mode}) — ${currentTask.progressPercent || 0}%`;
      case 'completed':
        return `Completed: ${currentTask.platform} (${mode})`;
      case 'failed':
        return `Failed: ${currentTask.platform} (${mode})`;
      case 'cancelled':
        return `Cancelled: ${currentTask.platform}`;
      default:
        return `${currentTask.status.toUpperCase()}: ${currentTask.platform} (${mode})`;
    }
  };

  return (
    <div className="w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#E5E5E5] mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#111111] leading-tight">
            Dashboard
          </h1>
          <p className="text-[13px] text-[#6B6B6B] mt-0.5">
            Automation Worker Status: {currentTask?.status?.toUpperCase() || 'IDLE'}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsLaunchModalOpen(true)}
        >
          Launch Task
        </Button>
      </div>

      {/* Error Notices */}
      {dashError && (
        <div className="mb-6 p-3 rounded-[6px] border border-[#B91C1C] text-[#B91C1C] text-[13px] bg-[#FFFFFF]">
          {dashError}
        </div>
      )}
      {taskError && (
        <div className="mb-6 p-3 rounded-[6px] border border-[#B45309] text-[#B45309] text-[13px] bg-[#FFFFFF]">
          {taskError}
        </div>
      )}

      {/* Truthful Active Task Banner */}
      {currentTask && currentTask.status !== 'idle' && (
        <div className="mb-6 p-4 rounded-[6px] border border-[#E5E5E5] bg-[#FFFFFF] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#111111]">
                {getTaskBannerTitle()}
              </span>
              <span className="text-[11px] font-mono text-[#6B6B6B] bg-[#F5F5F5] px-1.5 py-0.5 rounded-[3px]">
                ID: {currentTask.id.slice(0, 8)}
              </span>
            </div>
            <div className="text-[12px] text-[#6B6B6B] mt-0.5">
              {currentTask.currentStepMessage || `Progress: ${currentTask.progressPercent || 0}%`}
            </div>
            {currentTask.status === 'failed' && currentTask.errorDetails && (
              <div className="text-[11px] text-[#B91C1C] mt-1">
                Reason: {currentTask.errorDetails}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(currentTask.status === 'queued' || currentTask.status === 'running') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => cancelTask(currentTask.id)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
            )}
            {currentTask.status === 'failed' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => retryTask(currentTask.id)}
                disabled={actionLoading}
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Website Connections Section */}
      <div className="border border-[#E5E5E5] rounded-[6px] bg-[#FFFFFF] p-5 mb-8">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] mb-4">
          <div>
            <h2 className="text-[14px] font-semibold text-[#111111]">
              Website Connections
            </h2>
            <p className="text-[12px] text-[#6B6B6B] mt-0.5">
              Candidate-isolated browser sessions for official job portals. Passwords are never stored.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refreshConnections()}
            disabled={connectionsLoading}
          >
            Refresh
          </Button>
        </div>

        {connError && (
          <div className="mb-4 p-2.5 rounded-[4px] border border-[#B91C1C] text-[#B91C1C] text-[12px] bg-[#FFFFFF]">
            {connError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {connections.map((conn) => {
            const isConnecting = actionPlatform === conn.platform;
            return (
              <div
                key={conn.platform}
                className="p-3.5 rounded-[6px] border border-[#E5E5E5] bg-[#FAFAFA] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#111111]">
                      {conn.platform}
                    </span>
                    {renderConnectionBadge(conn.status)}
                  </div>
                  <p className="text-[11px] text-[#6B6B6B] mt-1.5 line-clamp-2">
                    {conn.error_message ||
                      (conn.last_verified
                        ? `Verified at ${new Date(conn.last_verified).toLocaleTimeString()}`
                        : conn.status === 'connected'
                        ? 'Active verified session'
                        : 'Official browser login flow')}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-[#E5E5E5]">
                  {conn.status !== 'connected' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConnect(conn.platform)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? 'Opening...' : 'Connect'}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleVerify(conn.platform)}
                    disabled={isConnecting}
                  >
                    Verify
                  </Button>
                  {conn.status === 'connected' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDisconnect(conn.platform)}
                      disabled={isConnecting}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats: Single row of 4 plain numbers with 1px vertical dividers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-[#E5E5E5] rounded-[6px] bg-[#FFFFFF] divide-y sm:divide-y-0 sm:divide-x divide-[#E5E5E5] mb-8">
        <div className="p-4 sm:p-5">
          <div className="text-[12px] text-[#6B6B6B]">Total Processed</div>
          <div className="text-[24px] font-bold text-[#111111] mt-1">
            {metrics?.totalApplied ?? 0}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="text-[12px] text-[#6B6B6B]">Submitted</div>
          <div className="text-[24px] font-bold text-[#166534] mt-1">
            {metrics?.successful ?? 0}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="text-[12px] text-[#6B6B6B]">Review Required</div>
          <div className="text-[24px] font-bold text-[#B45309] mt-1">
            {metrics?.pendingReview ?? 0}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="text-[12px] text-[#6B6B6B]">Failed</div>
          <div className="text-[24px] font-bold text-[#B91C1C] mt-1">
            {metrics?.failedOrSkipped ?? 0}
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="space-y-3">
        {/* Filter Bar Above Table */}
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-[#111111]">
            Applications
          </span>
          <div className="w-48">
            <select
              value={portalFilter}
              onChange={(e) => handlePortalFilterChange(e.target.value)}
              className="h-9 w-full bg-[#FFFFFF] border border-[#E5E5E5] rounded-[6px] px-3 text-[13px] text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#166534]"
            >
              <option value="all">All Portals</option>
              <option value="Naukri">Naukri</option>
              <option value="Internshala">Internshala</option>
              <option value="Indeed">Indeed</option>
              <option value="LinkedIn">LinkedIn</option>
            </select>
          </div>
        </div>

        {/* Clean Data Table */}
        <div className="w-full overflow-x-auto border border-[#E5E5E5] rounded-[6px] bg-[#FFFFFF]">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] sticky top-0">
                <th className="py-2.5 px-4 font-medium text-[12px] text-[#6B6B6B]">Job title</th>
                <th className="py-2.5 px-4 font-medium text-[12px] text-[#6B6B6B]">Company</th>
                <th className="py-2.5 px-4 font-medium text-[12px] text-[#6B6B6B]">Portal</th>
                <th className="py-2.5 px-4 font-medium text-[12px] text-[#6B6B6B]">Status</th>
                <th className="py-2.5 px-4 font-medium text-[12px] text-[#6B6B6B]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {appsLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#6B6B6B]">
                    Loading applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#6B6B6B]">
                    No applications found.{' '}
                    <button
                      onClick={() => setIsLaunchModalOpen(true)}
                      className="text-[#166534] font-medium hover:underline cursor-pointer ml-1"
                    >
                      Start run
                    </button>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-[#FAFAFA] transition-colors duration-150"
                  >
                    <td className="py-3 px-4 font-medium text-[#111111]">
                      {app.jobTitle}
                    </td>
                    <td className="py-3 px-4 text-[#6B6B6B]">
                      {app.company}
                    </td>
                    <td className="py-3 px-4 text-[#6B6B6B]">
                      {app.platform}
                    </td>
                    <td className="py-3 px-4">
                      {renderStatus(app.status)}
                    </td>
                    <td className="py-3 px-4 text-[#6B6B6B]">
                      {app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Below Table */}
        <div className="flex items-center justify-between pt-3 text-[13px] text-[#6B6B6B]">
          <div>
            Showing {applications.length} of {total} applications
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="px-2">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Task Queue Launch Modal */}
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
            <div className="p-2.5 rounded-[6px] border border-[#B91C1C] text-[#B91C1C] text-[13px]">
              {validationError}
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

          {/* Job Keywords */}
          <div>
            <label className="block text-[13px] font-medium text-[#111111] mb-1.5">
              Target Job Roles / Keywords
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[12px] bg-[#FAFAFA] border border-[#E5E5E5] text-[#111111]"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="hover:text-[#B91C1C] text-[#6B6B6B] ml-1"
                    aria-label={`Remove keyword ${kw}`}
                  >
                    ×
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
                onClick={handleAddKeyword}
                disabled={!keywordInput.trim() || actionLoading}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Locations */}
          <div>
            <label className="block text-[13px] font-medium text-[#111111] mb-1.5">
              Target Locations
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {locations.map((loc) => (
                <span
                  key={loc}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[12px] bg-[#FAFAFA] border border-[#E5E5E5] text-[#111111]"
                >
                  {loc}
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(loc)}
                    className="hover:text-[#B91C1C] text-[#6B6B6B] ml-1"
                    aria-label={`Remove location ${loc}`}
                  >
                    ×
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
                onClick={handleAddLocation}
                disabled={!locationInput.trim() || actionLoading}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Application Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Application Limit (Per Cycle)"
              type="number"
              min={1}
              max={100}
              value={maxApplications}
              onChange={(e) => setMaxApplications(parseInt(e.target.value, 10) || 1)}
              disabled={actionLoading}
            />

            <div className="pt-6">
              <label className="flex items-center gap-2 text-[13px] text-[#6B6B6B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  disabled={actionLoading}
                  className="rounded-[4px] border-[#E5E5E5] text-[#166534] focus:ring-[#166534]"
                />
                <span>Allow Duplicate / Force Enqueue</span>
              </label>
            </div>
          </div>

          {/* Safety Settings: Dry Run Simulation */}
          <div className="p-3 rounded-[6px] border border-[#E5E5E5] bg-[#FAFAFA] space-y-1">
            <label className="flex items-start gap-2 text-[13px] text-[#111111] cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setDryRun(isChecked);
                  if (isChecked) {
                    setConfirmLiveSubmission(false);
                  }
                }}
                disabled={actionLoading}
                className="mt-0.5 rounded-[4px] border-[#E5E5E5] text-[#166534] focus:ring-[#166534]"
              />
              <div>
                <span className="font-medium block">
                  Enable Dry-Run Simulation Mode (Recommended)
                </span>
                <span className="text-[12px] text-[#6B6B6B]">
                  Performs searches and form filling without final submission.
                </span>
              </div>
            </label>
          </div>

          {!dryRun && (
            <div className="p-3 rounded-[6px] border border-[#B91C1C] bg-[#FFFFFF] space-y-1">
              <label className="flex items-start gap-2 text-[13px] text-[#B91C1C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmLiveSubmission}
                  onChange={(e) => setConfirmLiveSubmission(e.target.checked)}
                  disabled={actionLoading}
                  className="mt-0.5 rounded-[4px] border-[#B91C1C] text-[#B91C1C]"
                />
                <span className="font-medium">
                  I confirm real portal job submission for this run
                </span>
              </label>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E5E5]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsLaunchModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Enqueueing Task...' : 'Enqueue Task (POST /api/v1/tasks)'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
