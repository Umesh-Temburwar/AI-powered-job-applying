import { useState, useEffect, useCallback, useRef } from 'react';
import type { JobPreferences, PlatformName, ExperienceLevel, EmploymentType } from '../types';
import {
  getPreferencesApi,
  updatePreferencesApi,
  suggestPreferencesApi,
  type BackendJobPreferences,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

function mapBackendToPreferences(b: BackendJobPreferences): JobPreferences {
  return {
    userId: b.user_id,
    targetTitles: b.job_titles || [],
    targetLocations: b.locations || [],
    experienceLevel: (b.experience_level as ExperienceLevel) || 'Fresher / Entry Level',
    employmentTypes: (b.employment_types as EmploymentType[]) || ['Full-time'],
    minSalaryLakhs: b.min_salary ?? 6,
    maxSalaryLakhs: b.max_salary ?? 18,
    selectedPlatforms: (b.selected_platforms || ['Naukri', 'Internshala', 'Indeed']) as PlatformName[],
    dailyApplicationLimit: b.daily_application_limit || 25,
    requireReviewBeforeSubmit: b.require_manual_review ?? true,
    updatedAt: b.updated_at || new Date().toISOString(),
  };
}

let cachedPreferencesData: JobPreferences | null = null;

export function usePreferences() {
  const { session, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [preferences, setPreferences] = useState<JobPreferences | null>(() => cachedPreferencesData);
  const [loading, setLoading] = useState<boolean>(!cachedPreferencesData);
  const [error, setError] = useState<string | null>(null);

  const getActiveToken = useCallback(async (): Promise<string | null> => {
    return (await getTokenRef.current?.()) || session?.token || null;
  }, [session?.token]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPreferences = useCallback(async () => {
    const activeToken = await getActiveToken();
    if (!activeToken) {
      if (isMountedRef.current) {
        setPreferences(null);
        setLoading(false);
      }
      return;
    }

    try {
      if (!cachedPreferencesData && isMountedRef.current) {
        setLoading(true);
      }
      if (isMountedRef.current) setError(null);
      const data = await getPreferencesApi(activeToken);
      const mapped = mapBackendToPreferences(data);
      cachedPreferencesData = mapped;
      if (isMountedRef.current) setPreferences(mapped);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch job preferences');
        if (!cachedPreferencesData) {
          setPreferences(null);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [getActiveToken]);

  const updatePreferences = async (updates: Partial<JobPreferences>) => {
    const activeToken = await getActiveToken();
    if (!activeToken) {
      const fallbackPrefs: JobPreferences = {
        ...(preferences || {
          userId: 'local_user',
          targetTitles: [],
          targetLocations: [],
          experienceLevel: 'Fresher / Entry Level' as ExperienceLevel,
          employmentTypes: ['Full-time' as EmploymentType],
          minSalaryLakhs: 6,
          maxSalaryLakhs: 18,
          selectedPlatforms: ['Naukri', 'Internshala', 'Indeed'] as PlatformName[],
          dailyApplicationLimit: 25,
          requireReviewBeforeSubmit: true,
          updatedAt: new Date().toISOString(),
        }),
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      cachedPreferencesData = fallbackPrefs;
      if (isMountedRef.current) setPreferences(fallbackPrefs);
      return fallbackPrefs;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: Partial<BackendJobPreferences> = {};
      if (updates.targetTitles !== undefined) payload.job_titles = updates.targetTitles;
      if (updates.targetLocations !== undefined) payload.locations = updates.targetLocations;
      if (updates.experienceLevel !== undefined) payload.experience_level = updates.experienceLevel;
      if (updates.employmentTypes !== undefined) payload.employment_types = updates.employmentTypes;
      if (updates.minSalaryLakhs !== undefined) payload.min_salary = updates.minSalaryLakhs;
      if (updates.maxSalaryLakhs !== undefined) payload.max_salary = updates.maxSalaryLakhs;
      if (updates.selectedPlatforms !== undefined) payload.selected_platforms = updates.selectedPlatforms;
      if (updates.dailyApplicationLimit !== undefined) payload.daily_application_limit = updates.dailyApplicationLimit;
      if (updates.requireReviewBeforeSubmit !== undefined) payload.require_manual_review = updates.requireReviewBeforeSubmit;

      const updated = await updatePreferencesApi(activeToken, payload);
      const mapped = mapBackendToPreferences(updated);
      cachedPreferencesData = mapped;
      setPreferences(mapped);
      return mapped;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const suggestRoles = async (skills: string[]): Promise<string[]> => {
    const activeToken = await getActiveToken();
    if (!activeToken || skills.length === 0) return [];
    try {
      const res = await suggestPreferencesApi(activeToken, skills);
      return res.suggested_titles || [];
    } catch {
      return [];
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
    suggestRoles,
  };
}
