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

export interface DashboardSummaryApiResponse {
  mode: 'demo';
  total_applications: number;
  pending_review: number;
  failed_tasks: number;
  automation_status: 'idle' | 'running' | 'paused' | 'review_required' | 'error';
  message: string;
}

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000';
const DEFAULT_TIMEOUT_MS = 6000;

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL;
  const url = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

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
      throw new ApiError(
        typeof data === 'string' && data ? data : `Request failed with status ${response.status}`,
        `HTTP_${response.status}`,
        response.status
      );
    }

    return data as T;
  } catch (err) {
    clearTimeout(timeoutId);
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
      throw new ApiError(
        'Network connection failure. The FastAPI backend server is currently offline or unreachable.',
        'NETWORK_ERROR'
      );
    }
    throw new ApiError(
      err instanceof Error ? err.message : 'Unknown communication error',
      'UNKNOWN_ERROR'
    );
  }
}

export interface UserIdentityResponse {
  id: string;
  email: string | null;
  role: string;
  created_at: string | null;
}

export async function getDashboardSummary(): Promise<DashboardSummaryApiResponse> {
  return apiClient<DashboardSummaryApiResponse>('/api/v1/dashboard/summary');
}

export async function getAuthMe(token: string): Promise<UserIdentityResponse> {
  return apiClient<UserIdentityResponse>('/api/v1/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

