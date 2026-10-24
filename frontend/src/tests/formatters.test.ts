import { describe, it, expect } from 'vitest';
import { formatDate, formatRelativeTime, formatSalary } from '../utils/formatters';

describe('formatters utility', () => {
  describe('formatDate', () => {
    it('returns N/A for null or invalid dates', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate('')).toBe('N/A');
      expect(formatDate('invalid-date-string')).toBe('N/A');
    });

    it('formats a valid ISO date string properly', () => {
      const res = formatDate('2026-10-24T12:00:00Z');
      expect(res).toContain('2026');
      expect(res).toContain('Oct');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns Recently for empty inputs', () => {
      expect(formatRelativeTime(null)).toBe('Recently');
    });

    it('returns Just now for current timestamps', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('Just now');
    });
  });

  describe('formatSalary', () => {
    it('handles empty or null salary', () => {
      expect(formatSalary(null)).toBe('Not disclosed');
      expect(formatSalary('')).toBe('Not disclosed');
    });

    it('formats numbers into LPA format when over 100,000', () => {
      expect(formatSalary(600000)).toBe('₹6 LPA');
      expect(formatSalary(1250000)).toBe('₹12.5 LPA');
    });
  });
});
