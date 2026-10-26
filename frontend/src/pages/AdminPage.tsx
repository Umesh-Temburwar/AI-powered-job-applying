import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Activity,
  Server,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Sliders,
  Globe,
  Clock,
  Zap,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  fetchAdminStats,
  fetchPortalConfigs,
  updatePortalConfigApi,
  fetchCandidatesApi,
  updateCandidateStatusApi,
  fetchAuditLogsApi,
} from '../services/adminService';
import type {
  AdminSystemStats,
  PortalAdminConfig,
  CandidateAdminItem,
  SystemAuditLogItem,
} from '../services/adminService';

let cachedAdminData: {
  stats: AdminSystemStats;
  portals: PortalAdminConfig[];
  candidates: CandidateAdminItem[];
  logs: SystemAuditLogItem[];
} | null = null;

export const AdminPage: React.FC = () => {
  const { showToast } = useToast();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'portals' | 'candidates' | 'logs'>('overview');

  // Loading States
  const [loadingStats, setLoadingStats] = useState(() => !cachedAdminData);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Data States
  const [stats, setStats] = useState<AdminSystemStats | null>(() => cachedAdminData?.stats || null);
  const [portals, setPortals] = useState<PortalAdminConfig[]>(() => cachedAdminData?.portals || []);
  const [candidates, setCandidates] = useState<CandidateAdminItem[]>(() => cachedAdminData?.candidates || []);
  const [logs, setLogs] = useState<SystemAuditLogItem[]>(() => cachedAdminData?.logs || []);

  // Search & Filter States
  const [candidateSearch, setCandidateSearch] = useState('');
  const [logFilterLevel, setLogFilterLevel] = useState<string>('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Selected Portal for Modal Editing
  const [editingPortal, setEditingPortal] = useState<PortalAdminConfig | null>(null);
  const [editLimit, setEditLimit] = useState<number>(50);
  const [editDelay, setEditDelay] = useState<number>(25);
  const [editStatus, setEditStatus] = useState<string>('operational');
  const [editEnabled, setEditEnabled] = useState<boolean>(true);

  // Initial Load
  const loadAllData = async () => {
    try {
      if (!cachedAdminData) {
        setLoadingStats(true);
      }

      const [statsData, portalsData, candidatesData, logsData] = await Promise.all([
        fetchAdminStats(),
        fetchPortalConfigs(),
        fetchCandidatesApi(1, 50),
        fetchAuditLogsApi(100),
      ]);

      cachedAdminData = {
        stats: statsData,
        portals: portalsData,
        candidates: candidatesData.candidates,
        logs: logsData.logs,
      };

      setStats(statsData);
      setPortals(portalsData);
      setCandidates(candidatesData.candidates);
      setLogs(logsData.logs);
    } catch (err) {
      console.error('Error loading admin telemetry:', err);
      showToast('Failed loading live administrative data.', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Quick Toggle Portal Status
  const handleTogglePortal = async (portal: PortalAdminConfig) => {
    try {
      setActionLoading(`portal-${portal.id}`);
      const updated = await updatePortalConfigApi(portal.id, {
        is_enabled: !portal.is_enabled,
      });
      setPortals((prev) => prev.map((p) => (p.id === portal.id ? updated : p)));
      showToast(
        `${portal.name} is now ${updated.is_enabled ? 'enabled' : 'disabled'}`,
        'success'
      );
    } catch {
      showToast(`Failed to toggle ${portal.name}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Open Edit Modal
  const openEditModal = (portal: PortalAdminConfig) => {
    setEditingPortal(portal);
    setEditLimit(portal.daily_limit);
    setEditDelay(portal.delay_seconds);
    setEditStatus(portal.status);
    setEditEnabled(portal.is_enabled);
  };

  // Save Modal Edits
  const handleSavePortalConfig = async () => {
    if (!editingPortal) return;
    try {
      setActionLoading('save-modal');
      const updated = await updatePortalConfigApi(editingPortal.id, {
        is_enabled: editEnabled,
        daily_limit: editLimit,
        delay_seconds: editDelay,
        status: editStatus,
      });
      setPortals((prev) => prev.map((p) => (p.id === editingPortal.id ? updated : p)));
      showToast(`${editingPortal.name} configuration updated.`, 'success');
      setEditingPortal(null);
    } catch {
      showToast('Failed saving portal configuration.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle Candidate Status
  const handleToggleCandidateStatus = async (cand: CandidateAdminItem) => {
    const nextStatus = cand.status === 'active' ? 'suspended' : 'active';
    try {
      setActionLoading(`cand-${cand.id}`);
      await updateCandidateStatusApi(cand.id, nextStatus);
      setCandidates((prev) =>
        prev.map((c) => (c.id === cand.id ? { ...c, status: nextStatus } : c))
      );
      showToast(`Candidate ${cand.full_name} status set to ${nextStatus}.`, 'success');
    } catch {
      showToast('Failed updating candidate status.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    if (!candidateSearch.trim()) return candidates;
    const q = candidateSearch.toLowerCase();
    return candidates.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.target_titles.some((t) => t.toLowerCase().includes(q))
    );
  }, [candidates, candidateSearch]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesLevel = logFilterLevel === 'ALL' || log.level === logFilterLevel;
      const matchesSearch =
        !logSearch.trim() ||
        log.portal.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.details.toLowerCase().includes(logSearch.toLowerCase());
      return matchesLevel && matchesSearch;
    });
  }, [logs, logFilterLevel, logSearch]);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E5E5] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111111] tracking-tight">
                Admin Command Center
              </h1>
              <p className="text-sm text-[#6B6B6B]">
                Master telemetry, platform throttles, candidate accounts, and audit streams.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System {stats?.system_status || 'Operational'}
          </div>
          <button
            onClick={loadAllData}
            disabled={loadingStats}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#111111] bg-white border border-[#E5E5E5] rounded-lg hover:bg-[#FAFAFA] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Candidates Card */}
        <div className="p-4 bg-white border border-[#E5E5E5] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-xs font-medium uppercase tracking-wider">Candidates</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#111111]">
            {stats?.total_candidates ?? '--'}
          </div>
          <div className="mt-1 text-xs text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            All registered profiles
          </div>
        </div>

        {/* Total Applications Card */}
        <div className="p-4 bg-white border border-[#E5E5E5] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-xs font-medium uppercase tracking-wider">Applications</span>
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#111111]">
            {stats?.total_applications ?? '--'}
          </div>
          <div className="mt-1 text-xs text-blue-600 font-medium">
            +{stats?.applied_today ?? 0} dispatched today
          </div>
        </div>

        {/* Success Rate Card */}
        <div className="p-4 bg-white border border-[#E5E5E5] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-xs font-medium uppercase tracking-wider">Success Rate</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#111111]">
            {stats?.success_rate_percent ?? 95.0}%
          </div>
          <div className="mt-1 text-xs text-[#6B6B6B]">
            {stats?.failed_applications ?? 0} errors handled
          </div>
        </div>

        {/* Active Daemons Card */}
        <div className="p-4 bg-white border border-[#E5E5E5] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-xs font-medium uppercase tracking-wider">Worker Daemons</span>
            <Server className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#111111]">
            {stats?.active_workers ?? 1} Master
          </div>
          <div className="mt-1 text-xs text-purple-700 font-medium">
            {stats?.active_tasks ?? 0} active job queue
          </div>
        </div>

        {/* Connected Portals Card */}
        <div className="p-4 bg-white border border-[#E5E5E5] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-xs font-medium uppercase tracking-wider">Live Portals</span>
            <Globe className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#111111]">
            {portals.filter((p) => p.is_enabled).length} / {portals.length || 8}
          </div>
          <div className="mt-1 text-xs text-indigo-600 font-medium">
            Multi-portal active
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-[#E5E5E5]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          Portal Telemetry ({portals.length})
        </button>
        <button
          onClick={() => setActiveTab('portals')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'portals'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          Rate Limits & Cooldowns
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'candidates'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          Candidate Accounts ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          Audit Stream ({logs.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & PORTAL TELEMETRY */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {portals.map((p) => (
              <div
                key={p.id}
                className="p-5 bg-white border border-[#E5E5E5] rounded-xl shadow-xs hover:border-emerald-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#111111]">{p.name}</span>
                    <button
                      onClick={() => handleTogglePortal(p)}
                      disabled={actionLoading === `portal-${p.id}`}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        p.is_enabled ? 'bg-emerald-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          p.is_enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'operational'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="text-xs text-[#6B6B6B]">
                      {p.total_connected_users} Users Active
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-[#6B6B6B] line-clamp-2">
                    {p.notes || 'Automated multi-step application submission enabled.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#F0F0F0] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#6B6B6B]">Cap: </span>
                    <span className="font-semibold text-[#111111]">{p.daily_limit}/day</span>
                  </div>
                  <button
                    onClick={() => openEditModal(p)}
                    className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Configure
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PORTAL RATE LIMITS & COOLDOWNS */}
      {activeTab === 'portals' && (
        <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#111111]">
                Portal Safeguards & Cooldowns
              </h2>
              <p className="text-xs text-[#6B6B6B]">
                Configure human pacing delay and per-user daily submission ceiling for each job portal.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#6B6B6B] text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Portal Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Daily Cap</th>
                  <th className="py-3 px-4">Human Delay</th>
                  <th className="py-3 px-4">Success Rate</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {portals.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#111111] flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#6B6B6B]" />
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.is_enabled
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#111111] font-medium">
                      {p.daily_limit} apps / day
                    </td>
                    <td className="py-3.5 px-4 text-[#111111] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#6B6B6B]" />
                      {p.delay_seconds} seconds
                    </td>
                    <td className="py-3.5 px-4 text-emerald-700 font-semibold">
                      {p.success_rate}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(p)}
                        className="px-3 py-1 text-xs font-medium text-[#111111] bg-white border border-[#E5E5E5] rounded-md hover:bg-[#FAFAFA] transition-colors shadow-2xs cursor-pointer"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CANDIDATE ACCOUNTS */}
      {activeTab === 'candidates' && (
        <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#111111]">Candidate Accounts</h2>
              <p className="text-xs text-[#6B6B6B]">
                Monitor connected platform states, total applications sent, and toggle account access.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#6B6B6B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidates or skills..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-[#E5E5E5] rounded-lg focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#6B6B6B] text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Target Titles</th>
                  <th className="py-3 px-4">Connected Portals</th>
                  <th className="py-3 px-4">Applications</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {filteredCandidates.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#111111]">{c.full_name}</div>
                      <div className="text-xs text-[#6B6B6B]">{c.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.target_titles.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-sm bg-gray-100 text-[11px] text-[#333333]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.connected_portals.map((cp, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-emerald-50 text-[11px] text-emerald-800 font-medium"
                          >
                            {cp}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#111111]">
                      {c.applications_count}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleCandidateStatus(c)}
                        disabled={actionLoading === `cand-${c.id}`}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          c.status === 'active'
                            ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {c.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT STREAM */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#E5E5E5] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#111111]">System Audit Logs</h2>
              <p className="text-xs text-[#6B6B6B]">
                Real-time operational events, anti-detection cooldowns, and job submissions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={logFilterLevel}
                onChange={(e) => setLogFilterLevel(e.target.value)}
                className="text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 focus:outline-hidden"
              >
                <option value="ALL">All Levels</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
              </select>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#6B6B6B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-[#E5E5E5] rounded-lg focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#E5E5E5]">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-[#FAFAFA] transition-colors flex items-start gap-3">
                <div className="mt-0.5">
                  {log.level === 'SUCCESS' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                  {log.level === 'INFO' && <Activity className="w-4 h-4 text-blue-600" />}
                  {log.level === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  {log.level === 'ERROR' && <XCircle className="w-4 h-4 text-red-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.level === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700'
                          : log.level === 'WARNING'
                          ? 'bg-amber-50 text-amber-700'
                          : log.level === 'ERROR'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="font-semibold text-xs text-[#111111]">{log.portal}</span>
                    <span className="text-xs text-[#6B6B6B]">•</span>
                    <span className="text-xs font-medium text-[#333333]">{log.action}</span>
                    <span className="text-[11px] text-[#888888] ml-auto">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#555555]">{log.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: EDIT PORTAL CONTROLS */}
      {editingPortal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <h3 className="text-base font-bold text-[#111111]">
                Configure {editingPortal.name}
              </h3>
              <button
                onClick={() => setEditingPortal(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-1">
                  Portal Status
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditEnabled(!editEnabled)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      editEnabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    {editEnabled ? 'Enabled & Active' : 'Disabled (Paused)'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-1">
                  Daily Application Limit ({editLimit} apps/day)
                </label>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={editLimit}
                  onChange={(e) => setEditLimit(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-1">
                  Human Delay Safeguard ({editDelay}s cooldown)
                </label>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={editDelay}
                  onChange={(e) => setEditDelay(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <p className="text-[11px] text-[#6B6B6B] mt-1">
                  Simulates realistic human pause between opening job listings and submitting.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-1">
                  Health Override
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full text-xs border border-[#E5E5E5] rounded-lg p-2 focus:outline-hidden"
                >
                  <option value="operational">Operational</option>
                  <option value="degraded">Degraded</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setEditingPortal(null)}
                className="px-4 py-2 text-xs font-medium text-[#6B6B6B] hover:text-[#111111]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePortalConfig}
                disabled={actionLoading === 'save-modal'}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {actionLoading === 'save-modal' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
