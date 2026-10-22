export type TaskStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'paused'
  | 'review_required'
  | 'completed'
  | 'failed'
  | 'stopped';

export type ApplicationStatus =
  | 'applied'
  | 'under_review'
  | 'interview'
  | 'rejected'
  | 'failed'
  | 'review_needed';

export type PlatformName =
  | 'Naukri'
  | 'Internshala'
  | 'Indeed'
  | 'LinkedIn'
  | 'Glassdoor'
  | 'Foundit'
  | 'Shine'
  | 'TimesJobs'
  | 'Wellfound';

export type EmploymentType = 'Full-time' | 'Part-time' | 'Internship' | 'Contract';
export type ExperienceLevel = 'Fresher / Entry Level' | '1-3 Years' | '3-5 Years' | '5+ Years';

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  year: string;
  score?: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  duration: string;
  description: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  currentLocation: string;
  headline: string;
  summary: string;
  skills: string[];
  preferredTitles: string[];
  preferredLocations: string[];
  noticePeriodDays: number;
  education: EducationItem[];
  experience: ExperienceItem[];
  updatedAt: string;
}

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileSizeBytes: number;
  uploadedAt: string;
  isDefault: boolean;
  fileType: 'application/pdf';
}

export interface JobPreferences {
  userId: string;
  targetTitles: string[];
  targetLocations: string[];
  experienceLevel: ExperienceLevel;
  employmentTypes: EmploymentType[];
  minSalaryLakhs: number;
  maxSalaryLakhs: number;
  selectedPlatforms: PlatformName[];
  dailyApplicationLimit: number;
  requireReviewBeforeSubmit: boolean;
  updatedAt: string;
}

export interface AutomationTask {
  id: string;
  userId: string;
  platform: PlatformName | 'All Platforms';
  status: TaskStatus;
  progressPercent: number;
  currentStepMessage: string;
  applicationsAttempted: number;
  applicationsSuccessful: number;
  applicationsFailed: number;
  startedAt?: string;
  completedAt?: string;
  logs: TaskLogEntry[];
}

export interface TaskLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface Application {
  id: string;
  userId: string;
  taskId?: string;
  jobTitle: string;
  company: string;
  platform: PlatformName;
  location: string;
  salary?: string;
  url: string;
  status: ApplicationStatus;
  appliedDate: string;
  notes?: string;
  reviewFlag?: boolean;
  errorMessage?: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'application' | 'task' | 'profile' | 'resume';
  statusBadge?: ApplicationStatus | TaskStatus;
}

export interface DashboardMetrics {
  totalApplied: number;
  successful: number;
  pendingReview: number;
  failedOrSkipped: number;
  dailyStreak: number;
  activeTask?: AutomationTask;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: number;
}
