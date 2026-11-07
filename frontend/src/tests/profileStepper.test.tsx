import { describe, it, expect } from 'vitest';
import { PROFILE_SECTIONS } from '../pages/ProfilePage';

describe('Profile Page Section Stepper Tests', () => {
  it('defines all 10 distinct sections with proper badges and labels', () => {
    expect(PROFILE_SECTIONS).toHaveLength(10);

    const expectedKeys = [
      'Resume & ATS',
      'Personal Details',
      'Portal Logins',
      'Career Screening',
      'Academics',
      'Target Roles',
      'Key Skills',
      'Projects & Exp',
      'Social Profiles',
      'Bot Launcher',
    ];

    PROFILE_SECTIONS.forEach((sec, idx) => {
      expect(sec.index).toBe(idx);
      expect(sec.shortLabel).toBe(expectedKeys[idx]);
      expect(sec.fullTitle).toBeTruthy();
      expect(sec.desc).toBeTruthy();
      expect(sec.badge).toBeTruthy();
    });
  });

  it('contains resume in step 0 and bot launcher in step 9', () => {
    expect(PROFILE_SECTIONS[0].shortLabel).toBe('Resume & ATS');
    expect(PROFILE_SECTIONS[0].badge).toBe('📄');

    expect(PROFILE_SECTIONS[9].shortLabel).toBe('Bot Launcher');
    expect(PROFILE_SECTIONS[9].badge).toBe('🚀');
  });
});
