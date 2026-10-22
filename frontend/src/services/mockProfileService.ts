import type { IProfileService } from './types';
import type { UserProfile } from '../types';
import { INITIAL_MOCK_PROFILE } from './mockData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockProfileService implements IProfileService {
  private profile: UserProfile = { ...INITIAL_MOCK_PROFILE };

  async getProfile(): Promise<UserProfile> {
    await delay(250);
    return { ...this.profile };
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    await delay(350);
    this.profile = {
      ...this.profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.profile };
  }
}
