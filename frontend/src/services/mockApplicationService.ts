import type {
  IApplicationService,
  ApplicationFilterParams,
  PaginatedApplications,
} from './types';
import type {
  Application,
  DashboardMetrics,
  ActivityItem,
} from '../types';
import {
  INITIAL_MOCK_APPLICATIONS,
  INITIAL_MOCK_ACTIVITY,
} from './mockData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockApplicationService implements IApplicationService {
  private applications: Application[] = [...INITIAL_MOCK_APPLICATIONS];
  private activities: ActivityItem[] = [...INITIAL_MOCK_ACTIVITY];

  async getApplications(params?: ApplicationFilterParams): Promise<PaginatedApplications> {
    await delay(250);

    let filtered = [...this.applications];

    if (params?.query) {
      const q = params.query.toLowerCase().trim();
      filtered = filtered.filter(
        (app) =>
          app.jobTitle.toLowerCase().includes(q) ||
          app.company.toLowerCase().includes(q) ||
          app.location.toLowerCase().includes(q)
      );
    }

    if (params?.platform && params.platform !== 'All') {
      filtered = filtered.filter((app) => app.platform === params.platform);
    }

    if (params?.status && params.status !== 'All') {
      filtered = filtered.filter((app) => app.status === params.status);
    }

    // Sorting
    const sortBy = params?.sortBy || 'date';
    const sortOrder = params?.sortOrder || 'desc';

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime();
      } else if (sortBy === 'company') {
        comparison = a.company.localeCompare(b.company);
      } else if (sortBy === 'title') {
        comparison = a.jobTitle.localeCompare(b.jobTitle);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getApplicationById(id: string): Promise<Application | null> {
    await delay(150);
    const found = this.applications.find((a) => a.id === id);
    return found ? { ...found } : null;
  }

  async exportToCsv(params?: ApplicationFilterParams): Promise<string> {
    await delay(200);
    const { items } = await this.getApplications({ ...params, page: 1, pageSize: 10000 });

    const escapeCsv = (str: string) => {
      if (!str) return '""';
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const headers = ['Job Title', 'Company', 'Platform', 'Location', 'Salary', 'Status', 'Applied Date', 'URL'];
    const rows = items.map((app) => [
      escapeCsv(app.jobTitle),
      escapeCsv(app.company),
      escapeCsv(app.platform),
      escapeCsv(app.location),
      escapeCsv(app.salary || 'N/A'),
      escapeCsv(app.status),
      escapeCsv(new Date(app.appliedDate).toLocaleString()),
      escapeCsv(app.url),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    await delay(200);
    const total = this.applications.length;
    const successful = this.applications.filter((a) => a.status === 'applied' || a.status === 'interview').length;
    const pendingReview = this.applications.filter((a) => a.status === 'review_needed' || a.status === 'under_review').length;
    const failedOrSkipped = this.applications.filter((a) => a.status === 'failed' || a.status === 'rejected').length;

    return {
      totalApplied: total,
      successful,
      pendingReview,
      failedOrSkipped,
      dailyStreak: 3,
    };
  }

  async getRecentActivity(): Promise<ActivityItem[]> {
    await delay(200);
    return [...this.activities];
  }
}
