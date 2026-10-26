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
    openPortal,
    connectPlatform,
    connectAllPlatforms,
    syncFromEnv,
    verifyConnection,
    retryConnection,
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

  // Platform Connection & Permission Modal State
  const [connectModalPortal, setConnectModalPortal] = useState<any | null>(null);
  const [connectEmail, setConnectEmail] = useState<string>('');
  const [connectPassword, setConnectPassword] = useState<string>('');
  const [connectPermissionGranted, setConnectPermissionGranted] = useState<boolean>(true);
  const [connectModalSubmitting, setConnectModalSubmitting] = useState<boolean>(false);

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
        headless: false,
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
  const handleOpenPortal = async (platform: string) => {
    try {
      await openPortal(platform);
      showToast(`Opening official portal for ${platform}...`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to open ${platform}`, 'error');
    }
  };

  const openConnectModal = (portal: any) => {
    setConnectModalPortal(portal);
    setConnectEmail(portal.account_email || (preferences as any)?.email || '');
    setConnectPassword('');
    setConnectPermissionGranted(true);
  };

  const handleAuthorizeAndConnect = async (launchBrowser: boolean = true) => {
    if (!connectModalPortal) return;
    const targetId = connectModalPortal.portal_id || connectModalPortal.platform;
    setConnectModalSubmitting(true);
    try {
      await connectPlatform(targetId, {
        account_email: connectEmail.trim() || undefined,
        account_password: connectPassword.trim() || undefined,
        permission_granted: connectPermissionGranted,
        launch_browser: launchBrowser,
      });
      showToast(`Connected ${connectModalPortal.display_name || connectModalPortal.platform} with bot automation permissions`, 'success');
      setConnectModalPortal(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to connect ${connectModalPortal.platform}`, 'error');
    } finally {
      setConnectModalSubmitting(false);
    }
  };

  const handleConnectAll = async () => {
    try {
      await connectAllPlatforms({
        permission_granted: true,
      });
      showToast('All platforms connected with bot automation permissions', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to connect all platforms', 'error');
    }
  };

  const handleSyncEnv = async () => {
    try {
      await syncFromEnv();
      showToast('Successfully synced platform credentials from .env', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to sync credentials from .env', 'error');
    }
  };

  const handleConnect = async (platform: string) => {
    try {
      await connectPlatform(platform, {
        permission_granted: true,
        launch_browser: true,
      });
      showToast(`Opened browser login for ${platform}. Please sign in on the official portal.`, 'info');
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

  const handleRetry = async (platform: string) => {
    try {
      const res = await retryConnection(platform);
      if (res?.status === 'connected') {
        showToast(`Verified session on ${platform}`, 'success');
      } else {
        showToast(`Retry check: ${res?.message || 'Login still required.'}`, 'info');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to retry verification for ${platform}`, 'error');
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
            Login Required
          </span>
        );
      case 'verification_required':
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#B45309] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
            Verification Required
          </span>
        );
      case 'unsupported':
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6B6B6B] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B6B6B]" />
            Unsupported
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#B91C1C] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6B6B6B] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B6B6B]" />
            Not Connected
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
        <div className="mb-6 p-3 rounded-[6px] border border-[#B91C1C] text-[#B91C1C] text-[13px] bg-[#FFFFFF] flex items-center justify-between">
          <span>{dashError.trim().startsWith('<') ? 'Backend server is waking up from idle state (502 Bad Gateway). Please wait a few seconds and refresh.' : dashError}</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-4 px-2.5 py-1 text-[12px] font-medium text-[#111111] bg-[#F5F5F5] hover:bg-[#E5E5E5] rounded-[4px] border border-[#E5E5E5] transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      {taskError && (
        <div className="mb-6 p-3 rounded-[6px] border border-[#B45309] text-[#B45309] text-[13px] bg-[#FFFFFF]">
          {taskError.trim().startsWith('<') ? 'Automation worker is reconnecting. Please wait a moment.' : taskError}
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
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncEnv}
              disabled={actionPlatform === 'all' || connectionsLoading}
              title="Sync credentials and emails from root .env"
            >
              Sync from .env
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConnectAll}
              disabled={actionPlatform === 'all' || connectionsLoading}
            >
              {actionPlatform === 'all' ? 'Authorizing All...' : 'Authorize All Portals'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refreshConnections()}
              disabled={connectionsLoading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {connError && (
          <div className="mb-4 p-2.5 rounded-[4px] border border-[#B91C1C] text-[#B91C1C] text-[12px] bg-[#FFFFFF]">
            {connError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {connections.map((conn) => {
            const isConnecting = actionPlatform === (conn.portal_id || conn.platform);
            const isConnected = conn.status === 'connected';
            const canRetry = conn.status === 'error' || conn.status === 'login_required' || conn.status === 'verification_required';
            const targetId = conn.portal_id || conn.platform;

            return (
              <div
                key={targetId}
                className="p-3.5 rounded-[6px] border border-[#E5E5E5] bg-[#FAFAFA] flex flex-col justify-between hover:border-[#D4D4D4] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-semibold text-[#111111]">
                          {conn.display_name || conn.platform}
                        </span>
                        {conn.website_url && (
                          <a
                            href={conn.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#9CA3AF] hover:text-[#4B5563] text-[11px] leading-none"
                            title={`Visit ${conn.display_name || conn.platform}`}
                          >
                            ↗
                          </a>
                        )}
                      </div>
                      <span className="text-[10px] text-[#6B6B6B] block mt-0.5">
                        {conn.integration_type === 'official_api'
                          ? 'Official API'
                          : 'Isolated Browser Profile'}
                      </span>
                    </div>
                    {renderConnectionBadge(conn.status)}
                  </div>

                  {/* Capabilities indicators */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conn.capabilities?.public_job_discovery && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                        Discovery
                      </span>
                    )}
                    {conn.capabilities?.job_detail_navigation && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                        Navigation
                      </span>
                    )}
                    {conn.capabilities?.application_form_assistance && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]">
                        Assist
                      </span>
                    )}
                    {conn.capabilities?.application_submission && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                        Apply
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#6B6B6B] mt-2 line-clamp-3">
                    {conn.error_message ||
                      (conn.last_verified
                        ? `Verified at ${new Date(conn.last_verified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : isConnected
                        ? 'Active verified session'
                        : conn.portal_status === 'in_development'
                        ? 'Profile isolation active. Direct apply in development.'
                        : 'Open portal to sign in on official website.')}
                  </p>
                  {conn.account_email && (
                    <span className="text-[10px] font-mono text-[#15803D] bg-[#F0FDF4] px-1.5 py-0.5 rounded-[3px] block mt-1.5 truncate border border-[#DCFCE7]">
                      {conn.account_email}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-[#E5E5E5]">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenPortal(targetId)}
                    disabled={isConnecting}
                  >
                    Open
                  </Button>

                  {!isConnected && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConnect(targetId)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openConnectModal(conn)}
                    disabled={isConnecting}
                    title="Configure portal account email, password, and automation permissions"
                  >
                    Permissions
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleVerify(targetId)}
                    disabled={isConnecting}
                  >
                    Verify
                  </Button>

                  {canRetry && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRetry(targetId)}
                      disabled={isConnecting}
                    >
                      Retry
                    </Button>
                  )}

                  {isConnected && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDisconnect(targetId)}
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
              {appsLoading && applications.length === 0 ? (
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
              {actionLoading ? 'Starting Bot...' : 'Enqueue Task (POST /api/v1/tasks)'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Platform Connection & Permission Modal */}
      <Modal
        isOpen={!!connectModalPortal}
        onClose={() => setConnectModalPortal(null)}
        title={`Connect ${connectModalPortal?.display_name || connectModalPortal?.platform || 'Platform'}`}
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between p-3 rounded-[6px] bg-[#F0FDF4] border border-[#BBF7D0]">
            <div>
              <span className="text-[13px] font-semibold text-[#166534] block">
                {connectModalPortal?.display_name || connectModalPortal?.platform} Official Connection
              </span>
              <span className="text-[11px] text-[#15803D]">
                Isolated user profile with direct bot automation permissions.
              </span>
            </div>
            {connectModalPortal?.website_url && (
              <a
                href={connectModalPortal.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[#15803D] underline hover:text-[#166534]"
              >
                Visit Site ↗
              </a>
            )}
          </div>

          {/* Explicit User Permission Checkbox */}
          <div className="p-3.5 rounded-[6px] border border-[#E5E5E5] bg-[#FAFAFA]">
            <label className="flex items-start gap-2.5 text-[13px] text-[#111111] cursor-pointer">
              <input
                type="checkbox"
                checked={connectPermissionGranted}
                onChange={(e) => setConnectPermissionGranted(e.target.checked)}
                className="mt-0.5 rounded-[4px] border-[#E5E5E5] text-[#166534] focus:ring-[#166534]"
              />
              <div>
                <span className="font-semibold block text-[#111111]">
                  Grant Automation Permission
                </span>
                <span className="text-[12px] text-[#6B6B6B] leading-relaxed block mt-0.5">
                  I authorize Universal Job Apply Bot to connect to {connectModalPortal?.display_name || connectModalPortal?.platform}, discover vacancies, and submit applications on my behalf matching my target roles.
                </span>
              </div>
            </label>
          </div>

          {/* Account Email */}
          <div>
            <label className="block text-[12px] font-medium text-[#111111] mb-1">
              Portal Account Email / Username
            </label>
            <Input
              type="email"
              placeholder="e.g. your-email@example.com"
              value={connectEmail}
              onChange={(e) => setConnectEmail(e.target.value)}
              disabled={connectModalSubmitting}
            />
            <span className="text-[11px] text-[#6B6B6B] mt-1 block">
              Associated with your {connectModalPortal?.display_name || connectModalPortal?.platform} account.
            </span>
          </div>

          {/* Optional Password */}
          <div>
            <label className="block text-[12px] font-medium text-[#111111] mb-1">
              Portal Password (Optional)
            </label>
            <Input
              type="password"
              placeholder="Enter password for automated login..."
              value={connectPassword}
              onChange={(e) => setConnectPassword(e.target.value)}
              disabled={connectModalSubmitting}
            />
            <span className="text-[11px] text-[#6B6B6B] mt-1 block">
              Optional if already signed into your browser profile. Passwords are never shared.
            </span>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-[#E5E5E5]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConnectModalPortal(null)}
              disabled={connectModalSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleAuthorizeAndConnect(true)}
              disabled={connectModalSubmitting || !connectPermissionGranted}
            >
              Open Browser Login Window
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleAuthorizeAndConnect(false)}
              disabled={connectModalSubmitting || !connectPermissionGranted}
            >
              {connectModalSubmitting ? 'Connecting...' : 'Authorize & Connect'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
