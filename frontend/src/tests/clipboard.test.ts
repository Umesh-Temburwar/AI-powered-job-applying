import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard } from '../utils/clipboard';

describe('copyToClipboard utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when text is empty', async () => {
    const result = await copyToClipboard('');
    expect(result).toBe(false);
  });

  it('uses navigator.clipboard if available', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });

    const success = await copyToClipboard('Test copied text');
    expect(success).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith('Test copied text');
  });

  it('falls back to document.execCommand when clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const mockExec = vi.fn().mockReturnValue(true);
    document.execCommand = mockExec;

    const success = await copyToClipboard('Fallback copied text');
    expect(success).toBe(true);
    expect(mockExec).toHaveBeenCalledWith('copy');
  });
});

