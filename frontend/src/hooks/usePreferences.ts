import { useState, useEffect, useCallback } from 'react';
import type { JobPreferences } from '../types';
import { preferenceService } from '../services';

export function usePreferences() {
  const [preferences, setPreferences] = useState<JobPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await preferenceService.getPreferences();
      setPreferences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = async (updates: Partial<JobPreferences>) => {
    try {
      setLoading(true);
      setError(null);
      const updated = await preferenceService.updatePreferences(updates);
      setPreferences(updated);
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    refreshPreferences: fetchPreferences,
    updatePreferences,
  };
}
