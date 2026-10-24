import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPhoneNumber, isValidUrl, isNonEmptyString } from '../utils/validators';

describe('validators utility', () => {
  describe('isValidEmail', () => {
    it('returns true for standard email formats', () => {
      expect(isValidEmail('candidate@example.com')).toBe(true);
      expect(isValidEmail('john.doe+work@domain.co.in')).toBe(true);
    });

    it('returns false for invalid emails', () => {
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missinguser.com')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('validates 10-digit Indian numbers with and without prefix', () => {
      expect(isValidPhoneNumber('9876543210')).toBe(true);
      expect(isValidPhoneNumber('+91 9876543210')).toBe(true);
      expect(isValidPhoneNumber('91-9876543210')).toBe(true);
    });

    it('rejects malformed numbers', () => {
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber(null)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('validates http and https web URLs', () => {
      expect(isValidUrl('https://naukri.com')).toBe(true);
      expect(isValidUrl('http://localhost:5173')).toBe(true);
    });

    it('rejects invalid or non-http protocols', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('checks string length after trimming', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString('   ')).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
    });
  });
});
