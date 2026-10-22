import type {
  UserProfile,
  Resume,
  JobPreferences,
  AutomationTask,
  Application,
  ActivityItem,
  DashboardMetrics,
  PlatformName,
  ApplicationStatus,
} from '../types';

export interface IProfileService {
  getProfile(): Promise<UserProfile>;
  updateProfile(profile: Partial<UserProfile>): Promise<UserProfile>;
}

export interface IResumeService {
  getResumes(): Promise<Resume[]>;
  uploadResume(file: File): Promise<Resume>;
  setDefaultResume(id: string): Promise<void>;
  deleteResume(id: string): Promise<void>;
}

export interface IPreferenceService {
  getPreferences(): Promise<JobPreferences>;
  updatePreferences(prefs: Partial<JobPreferences>): Promise<JobPreferences>;
}

export interface ITaskService {
  getCurrentTask(): Promise<AutomationTask | null>;
  startTask(platform: PlatformName | 'All Platforms'): Promise<AutomationTask>;
  pauseTask(taskId: string): Promise<AutomationTask>;
  resumeTask(taskId: string): Promise<AutomationTask>;
  stopTask(taskId: string): Promise<AutomationTask>;
  getTaskHistory(): Promise<AutomationTask[]>;
}

export interface ApplicationFilterParams {
  query?: string;
  platform?: PlatformName | 'All';
  status?: ApplicationStatus | 'All';
  sortBy?: 'date' | 'company' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedApplications {
  items: Application[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IApplicationService {
  getApplications(params?: ApplicationFilterParams): Promise<PaginatedApplications>;
  getApplicationById(id: string): Promise<Application | null>;
  exportToCsv(params?: ApplicationFilterParams): Promise<string>;
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getRecentActivity(): Promise<ActivityItem[]>;
}
