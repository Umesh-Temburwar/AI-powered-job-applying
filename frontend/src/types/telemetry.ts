/**
 * Automation telemetry and performance metric types.
 */

export interface SystemTelemetry {
  timestamp: string;
  uptimeSeconds: number;
  activeWorkerCount: number;
  totalCandidates: number;
  totalApplicationsToday: number;
  portalHealth: Record<string, 'healthy' | 'degraded' | 'offline'>;
  rateLimitStatus: {
    portal: string;
    remainingQuota: number;
    resetInSeconds: number;
  }[];
}

export interface AutomationExecutionLog {
  id: string;
  taskId: string;
  platform: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PortalAnalyticsSummary {
  portal: string;
  appliedCount: number;
  successRate: number;
  averageTimePerApplicationSec: number;
  lastActive: string | null;
}
