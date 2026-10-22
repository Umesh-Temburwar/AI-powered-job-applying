import type { IPreferenceService } from './types';
import type { JobPreferences } from '../types';
import { INITIAL_MOCK_PREFERENCES } from './mockData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockPreferenceService implements IPreferenceService {
  private preferences: JobPreferences = { ...INITIAL_MOCK_PREFERENCES };

  async getPreferences(): Promise<JobPreferences> {
    await delay(250);
    return { ...this.preferences };
  }

  async updatePreferences(updates: Partial<JobPreferences>): Promise<JobPreferences> {
    await delay(350);

    // Validate minSalary <= maxSalary
    const minSal = updates.minSalaryLakhs ?? this.preferences.minSalaryLakhs;
    const maxSal = updates.maxSalaryLakhs ?? this.preferences.maxSalaryLakhs;
    if (minSal > maxSal) {
      throw new Error('Minimum salary cannot exceed maximum salary.');
    }

    // Validate daily limit
    if (updates.dailyApplicationLimit !== undefined) {
      if (updates.dailyApplicationLimit < 1 || updates.dailyApplicationLimit > 100) {
        throw new Error('Daily application limit must be between 1 and 100.');
      }
    }

    this.preferences = {
      ...this.preferences,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.preferences };
  }
}
