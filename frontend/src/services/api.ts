export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status?: number;

  constructor(message: string, code = 'API_ERROR', status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface PlatformBreakdownItem {
  platform: string;
  applied: number;
  percentage: number;
  color: string;
}

export interface DashboardSummaryApiResponse {
  mode: string;
  total_applications: number;
  successful_submissions: number;
  pending_review: number;
  failed_tasks: number;
  active_tasks: number;
  automation_status: 'idle' | 'queued' | 'running' | 'paused' | 'review_required' | 'completed' | 'failed' | 'error';
  message: string;
  platform_breakdown: PlatformBreakdownItem[];
}

const DEFAULT_LOCAL_API_URL = 'http://127.0.0.1:8001';
const DEFAULT_PROD_API_URL = 'https://universal-job-apply-bot-1.onrender.com';

export function getBaseApiUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  const isBrowser = typeof window !== 'undefined';
  const isLocalHost =
    isBrowser &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]');

  // 1. If VITE_API_BASE_URL is provided, prioritize it
  if (envUrl) {
    // Edge case safety: If deployed in production on web but envUrl points to localhost,
    // fallback to production cloud backend so the deployed app doesn't fail
    if (isBrowser && !isLocalHost && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return DEFAULT_PROD_API_URL;
    }
    return envUrl;
  }

  // 2. Local development fallback when VITE_API_BASE_URL is not set
  if (import.meta.env.DEV || isLocalHost) {
    return DEFAULT_LOCAL_API_URL;
  }

  // 3. Production fallback when VITE_API_BASE_URL is not set
  return DEFAULT_PROD_API_URL;
}

export function buildApiUrl(endpoint: string): string {
  let baseUrl = getBaseApiUrl().trim();

  // Strip all trailing slashes from baseUrl
  baseUrl = baseUrl.replace(/\/+$/, '');

  // Normalize endpoint with leading slash
  let cleanEndpoint = endpoint.trim();
  if (!cleanEndpoint.startsWith('/')) {
    cleanEndpoint = `/${cleanEndpoint}`;
  }

  if (!baseUrl) {
    return cleanEndpoint;
  }

  // Prevent duplicate prefixes if baseUrl already includes /api/v1 or /api
  if (baseUrl.endsWith('/api/v1') && cleanEndpoint.startsWith('/api/v1/')) {
    cleanEndpoint = cleanEndpoint.slice('/api/v1'.length);
  } else if (baseUrl.endsWith('/api/v1') && cleanEndpoint === '/api/v1') {
    cleanEndpoint = '';
  } else if (baseUrl.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.slice('/api'.length);
  } else if (baseUrl.endsWith('/api') && cleanEndpoint === '/api') {
    cleanEndpoint = '';
  }

  return `${baseUrl}${cleanEndpoint}`;
}

const DEFAULT_TIMEOUT_MS = 35000;

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number; retries?: number } = {}
): Promise<T> {
  const url = buildApiUrl(endpoint);

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.retries ?? (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') ? 3 : 0);

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const reqHeaders: Record<string, string> = {};
  if (!isFormData) {
    reqHeaders['Content-Type'] = 'application/json';
  }
  if (options.headers) {
    Object.assign(reqHeaders, options.headers);
  }
  if (isFormData && reqHeaders['Content-Type']) {
    delete reqHeaders['Content-Type'];
  }

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: reqHeaders,
      });

      clearTimeout(timeoutId);

      // If cloud instance is warming up (502 / 503 / 504), retry automatically
      if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 2500 * attempt));
        continue;
      }

      let data: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        if (typeof data === 'object' && data !== null && 'error' in data) {
          const errObj = (data as { error: ApiErrorDetail }).error;
          throw new ApiError(
            errObj.message || 'API request failed',
            errObj.code || `HTTP_${response.status}`,
            response.status,
            errObj.details
          );
        }
        if (typeof data === 'object' && data !== null && 'detail' in data) {
          const detail = (data as { detail: unknown }).detail;
          const msg =
            typeof detail === 'string'
              ? detail
              : Array.isArray(detail)
              ? detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ')
              : JSON.stringify(detail);
          throw new ApiError(msg, `HTTP_${response.status}`, response.status);
        }
        if (typeof data === 'object' && data !== null && 'message' in data) {
          const msg = (data as { message: string }).message;
          throw new ApiError(msg, `HTTP_${response.status}`, response.status);
        }

        let sanitizedMsg = `Request failed with status ${response.status}`;
        if (typeof data === 'string' && data) {
          if (data.trim().startsWith('<') || data.includes('<html')) {
            sanitizedMsg = response.status === 502
              ? 'Backend server is waking up from idle state (502 Bad Gateway). Please wait a few seconds and refresh.'
              : `Service temporarily unavailable (${response.status}). Please retry shortly.`;
          } else {
            sanitizedMsg = data.slice(0, 300);
          }
        }
        throw new ApiError(sanitizedMsg, `HTTP_${response.status}`, response.status);
      }

      return data as T;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError' && attempt < maxRetries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      if (err instanceof ApiError) {
        throw err;
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError(
          'Request timed out. Please verify the backend FastAPI server is running.',
          'TIMEOUT'
        );
      }
      if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
        if (attempt < maxRetries) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const hint = isLocal ? ' Please ensure the FastAPI backend is running locally on http://127.0.0.1:8001 (e.g. py start_app.py).' : ' The cloud backend container is waking up. Please retry in a few seconds.';
        throw new ApiError(
          `Network connection failure. The FastAPI backend server is currently offline or unreachable.${hint}`,
          'NETWORK_ERROR'
        );
      }
      throw new ApiError(
        err instanceof Error ? err.message : 'Unknown communication error',
        'UNKNOWN_ERROR'
      );
    }
  }
}

export interface UserIdentityResponse {
  id: string;
  email: string | null;
  role: string;
  created_at: string | null;
}

export interface BackendActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: string;
  status_badge?: string;
}

export async function getDashboardSummary(token?: string): Promise<DashboardSummaryApiResponse> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return apiClient<DashboardSummaryApiResponse>('/api/v1/dashboard/summary', { headers });
}

export async function getDashboardActivitiesApi(token: string): Promise<BackendActivityItem[]> {
  return apiClient<BackendActivityItem[]>('/api/v1/dashboard/activities', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getAuthMe(token: string): Promise<UserIdentityResponse> {
  return apiClient<UserIdentityResponse>('/api/v1/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export interface BackendTaskItem {
  id: string;
  user_id: string;
  task_type: string;
  platform: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'idle' | 'paused' | 'review_required';
  progress: number;
  message: string;
  retry_count: number;
  max_retries: number;
  error_details?: string | null;
  dry_run: boolean;
  payload: Record<string, unknown>;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
}

export interface TaskListResponse {
  tasks: BackendTaskItem[];
  total: number;
}

export interface TaskActionResponse {
  success: boolean;
  task_id: string;
  status: string;
  message: string;
}

export interface TaskCreatePayload {
  platform: string;
  task_type?: 'job_apply' | 'profile_update' | 'screening_test';
  dry_run?: boolean;
  user_confirmed_real_submission?: boolean;
  max_applications?: number;
  keywords?: string[];
  locations?: string[];
  force?: boolean;
  headless?: boolean;
}

export async function enqueueTaskApi(
  token: string,
  data: TaskCreatePayload
): Promise<BackendTaskItem> {
  return apiClient<BackendTaskItem>('/api/v1/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function listTasksApi(
  token: string,
  limit = 50,
  offset = 0
): Promise<TaskListResponse> {
  return apiClient<TaskListResponse>(`/api/v1/tasks?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getTaskApi(token: string, taskId: string): Promise<BackendTaskItem> {
  return apiClient<BackendTaskItem>(`/api/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function cancelTaskApi(token: string, taskId: string): Promise<TaskActionResponse> {
  return apiClient<TaskActionResponse>(`/api/v1/tasks/${taskId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function retryTaskApi(token: string, taskId: string): Promise<TaskActionResponse> {
  return apiClient<TaskActionResponse>(`/api/v1/tasks/${taskId}/retry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ============================================================================
// PROFILE & ONBOARDING API
// ============================================================================

export interface BackendEducationItem {
  id?: string;
  degree: string;
  institution: string;
  year?: string;
  score?: string;
  field_of_study?: string;
}

export interface BackendExperienceItem {
  id?: string;
  company: string;
  role: string;
  duration?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  is_current?: boolean;
}

export interface BackendProjectItem {
  id?: string;
  title: string;
  description?: string;
  technologies?: string[];
  url?: string;
}

export interface BackendCertificationItem {
  id?: string;
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
}

export interface BackendAdditionalInfo {
  notice_period_days?: number;
  work_authorization?: string;
  willing_to_relocate?: boolean;
  expected_salary_lakhs?: number | null;
  is_fresher?: boolean;
}

export interface BackendProfileResponse {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  headline?: string | null;
  summary?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  education: BackendEducationItem[];
  experience: BackendExperienceItem[];
  skills: string[];
  projects: BackendProjectItem[];
  certifications: BackendCertificationItem[];
  additional_info: BackendAdditionalInfo;
  is_onboarded: boolean;
  onboarding_step: number;
  onboarded_at?: string | null;
  completion_percentage: number;
  missing_fields: string[];
}

export interface BackendOnboardingStatus {
  is_onboarded: boolean;
  onboarding_step: number;
  completion_percentage: number;
  missing_fields: string[];
  has_resume: boolean;
  has_preferences: boolean;
}

export async function getProfileApi(token: string): Promise<BackendProfileResponse> {
  return apiClient<BackendProfileResponse>('/api/v1/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateProfileApi(
  token: string,
  data: Partial<BackendProfileResponse>
): Promise<BackendProfileResponse> {
  return apiClient<BackendProfileResponse>('/api/v1/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function getOnboardingStatusApi(token: string): Promise<BackendOnboardingStatus> {
  return apiClient<BackendOnboardingStatus>('/api/v1/profile/status', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function autofillProfileApi(
  token: string,
  resumeId?: string
): Promise<BackendProfileResponse> {
  const query = resumeId ? `?resume_id=${encodeURIComponent(resumeId)}` : '';
  return apiClient<BackendProfileResponse>(`/api/v1/profile/autofill${query}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ============================================================================
// RESUMES API
// ============================================================================

export interface BackendResumeItem {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  is_default: boolean;
  created_at: string;
  ocr_needed?: boolean;
}

export interface BackendResumeUploadResponse {
  resume: BackendResumeItem;
  parsed_profile: Partial<BackendProfileResponse>;
  ocr_needed: boolean;
  message: string;
  extracted_skills_count: number;
}

export interface BackendResumeListResponse {
  resumes: BackendResumeItem[];
  primary_resume_id?: string | null;
}

export interface BackendResumeDownloadResponse {
  download_url: string;
  expires_in_seconds: number;
  file_name: string;
}

export async function uploadResumeApi(
  token: string,
  file: File,
  setAsDefault = true
): Promise<BackendResumeUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('set_as_default', String(setAsDefault));

  return apiClient<BackendResumeUploadResponse>('/api/v1/resumes/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    timeoutMs: 30000,
  });
}

export async function listResumesApi(token: string): Promise<BackendResumeListResponse> {
  return apiClient<BackendResumeListResponse>('/api/v1/resumes', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function setDefaultResumeApi(token: string, resumeId: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/v1/resumes/${resumeId}/set-default`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteResumeApi(token: string, resumeId: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/v1/resumes/${resumeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getResumeDownloadUrlApi(
  token: string,
  resumeId: string
): Promise<BackendResumeDownloadResponse> {
  return apiClient<BackendResumeDownloadResponse>(`/api/v1/resumes/${resumeId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ============================================================================
// JOB PREFERENCES API
// ============================================================================

export interface BackendJobPreferences {
  id: string;
  user_id: string;
  job_titles: string[];
  locations: string[];
  experience_level: string;
  employment_types: string[];
  min_salary?: number | null;
  max_salary?: number | null;
  selected_platforms: string[];
  daily_application_limit: number;
  require_manual_review: boolean;
  updated_at?: string | null;
}

export interface BackendPreferenceSuggestions {
  suggested_titles: string[];
  suggested_keywords: string[];
  source_skills: string[];
}

export async function getPreferencesApi(token: string): Promise<BackendJobPreferences> {
  return apiClient<BackendJobPreferences>('/api/v1/preferences', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updatePreferencesApi(
  token: string,
  data: Partial<BackendJobPreferences>
): Promise<BackendJobPreferences> {
  return apiClient<BackendJobPreferences>('/api/v1/preferences', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function suggestPreferencesApi(
  token: string,
  skills: string[]
): Promise<BackendPreferenceSuggestions> {
  return apiClient<BackendPreferenceSuggestions>('/api/v1/preferences/suggest', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ skills }),
  });
}

// ============================================================================
// APPLICATIONS API
// ============================================================================

export interface BackendApplicationItem {
  id: string;
  user_id: string;
  task_id?: string | null;
  job_title: string;
  company: string;
  job_url: string;
  platform: string;
  status: string;
  location?: string | null;
  salary?: string | null;
  notes?: string | null;
  applied_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendApplicationListResponse {
  items: BackendApplicationItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function getApplicationsApi(
  token?: string,
  params?: {
    status?: string;
    platform?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<BackendApplicationListResponse> {
  const q = new URLSearchParams();
  if (params?.status && params.status.toLowerCase() !== 'all') q.set('status', params.status);
  if (params?.platform && params.platform.toLowerCase() !== 'all') q.set('platform', params.platform);
  if (params?.query) q.set('query', params.query);
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('page_size', String(params.pageSize));

  const queryStr = q.toString() ? `?${q.toString()}` : '';
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return apiClient<BackendApplicationListResponse>(`/api/v1/applications${queryStr}`, {
    headers,
  });
}

export async function createApplicationApi(
  token: string,
  data: Partial<BackendApplicationItem>
): Promise<BackendApplicationItem> {
  return apiClient<BackendApplicationItem>('/api/v1/applications', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function deleteApplicationApi(token: string, id: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/v1/applications/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function exportApplicationsCsvApi(token?: string): Promise<string> {
  const url = buildApiUrl('/api/v1/applications/export');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to export CSV');
  return res.text();
}

// ============================================================================
// WEBSITE CONNECTIONS API
// ============================================================================

export type ConnectionStatus =
  | 'not_connected'
  | 'connecting'
  | 'connected'
  | 'login_required'
  | 'verification_required'
  | 'unsupported'
  | 'error';

export interface BackendConnectionItem {
  id?: string | null;
  user_id: string;
  platform: string;
  portal_id?: string | null;
  display_name?: string | null;
  website_url?: string | null;
  login_url?: string | null;
  job_discovery_url?: string | null;
  integration_type?: string | null;
  capabilities?: {
    public_job_discovery?: boolean;
    job_detail_navigation?: boolean;
    application_form_assistance?: boolean;
    application_submission?: boolean;
  } | null;
  restrictions?: string[] | null;
  portal_status?: string | null;
  status: ConnectionStatus;
  account_email?: string | null;
  last_verified?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PortalRegistryApiResponse {
  portals: {
    id: string;
    name: string;
    website_url: string;
    login_url: string;
    job_discovery_url: string;
    integration_type: string;
    capabilities: Record<string, boolean>;
    restrictions: string[];
    status: string;
    notes: string;
  }[];
}

export interface ConnectionListApiResponse {
  connections: BackendConnectionItem[];
}

export interface ConnectionActionApiResponse {
  success: boolean;
  platform: string;
  status: ConnectionStatus;
  message: string;
  connection?: BackendConnectionItem | null;
}

export async function getConnectionsApi(token: string): Promise<ConnectionListApiResponse> {
  return apiClient<ConnectionListApiResponse>('/api/v1/connections', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getPortalRegistryApi(): Promise<PortalRegistryApiResponse> {
  return apiClient<PortalRegistryApiResponse>('/api/v1/connections/registry');
}

export async function openPlatformPortalApi(
  token: string,
  platform: string
): Promise<ConnectionActionApiResponse> {
  return apiClient<ConnectionActionApiResponse>(`/api/v1/connections/${encodeURIComponent(platform)}/open`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function connectPlatformApi(
  token: string,
  platform: string,
  payload?: {
    account_email?: string;
    account_password?: string;
    permission_granted?: boolean;
    launch_browser?: boolean;
  }
): Promise<ConnectionActionApiResponse> {
  return apiClient<ConnectionActionApiResponse>(`/api/v1/connections/${encodeURIComponent(platform)}/connect`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export async function connectAllPortalsApi(
  token: string,
  payload?: {
    permission_granted?: boolean;
    account_email?: string;
  }
): Promise<ConnectionListApiResponse> {
  return apiClient<ConnectionListApiResponse>('/api/v1/connections/connect-all', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export async function syncEnvConnectionsApi(token: string): Promise<ConnectionListApiResponse> {
  return apiClient<ConnectionListApiResponse>('/api/v1/connections/sync-env', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function verifyConnectionApi(
  token: string,
  platform: string,
  liveCheck: boolean = false
): Promise<ConnectionActionApiResponse> {
  return apiClient<ConnectionActionApiResponse>(`/api/v1/connections/${encodeURIComponent(platform)}/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ confirmed: true, live_check: liveCheck }),
  });
}

export async function retryConnectionApi(
  token: string,
  platform: string
): Promise<ConnectionActionApiResponse> {
  return apiClient<ConnectionActionApiResponse>(`/api/v1/connections/${encodeURIComponent(platform)}/retry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function disconnectPlatformApi(
  token: string,
  platform: string
): Promise<ConnectionActionApiResponse> {
  return apiClient<ConnectionActionApiResponse>(`/api/v1/connections/${encodeURIComponent(platform)}/disconnect`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}




