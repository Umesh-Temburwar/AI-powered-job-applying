import { describe, it, expect, vi } from 'vitest';
import { copyToClipboard } from '../utils/clipboard';

describe('copyToClipboard utility', () => {
  it('returns false when text is empty', async () => {
    const result = await copyToClipboard('');
    expect(result).toBe(false);
  });

  it('uses navigator.clipboard if available', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    const success = await copyToClipboard('Test copied text');
    expect(success).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith('Test copied text');
  });
});
