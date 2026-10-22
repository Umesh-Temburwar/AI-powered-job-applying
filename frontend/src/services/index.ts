import { MockProfileService } from './mockProfileService';
import { MockResumeService } from './mockResumeService';
import { MockPreferenceService } from './mockPreferenceService';
import { MockTaskService } from './mockTaskService';
import { MockApplicationService } from './mockApplicationService';

export const profileService = new MockProfileService();
export const resumeService = new MockResumeService();
export const preferenceService = new MockPreferenceService();
export const taskService = new MockTaskService();
export const applicationService = new MockApplicationService();

export * from './types';
