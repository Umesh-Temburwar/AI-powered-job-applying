import { useState, useEffect, useCallback } from 'react';
import { getOnboardingStatusApi, type BackendOnboardingStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useOnboardingStatus() {
  const { session, user } = useAuth();
  const token = session?.token;
  const userId = user?.id;

  const [status, setStatus] = useState<BackendOnboardingStatus | null>(() => {
    try {
      const cached = sessionStorage.getItem('onboarding_status_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('onboarding_status_cache');
    } catch {
      return true;
    }
  });

  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async (isInitial = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      if (isInitial && !status) {
        setLoading(true);
      }
      setError(null);
      const res = await getOnboardingStatusApi(token);
      setStatus(res);
      try {
        sessionStorage.setItem('onboarding_status_cache', JSON.stringify(res));
      } catch {
        // Ignore quota errors
      }
    } catch (err) {
      console.warn('Could not fetch onboarding status:', err);
      // If endpoint is temporarily unreachable, default to onboarded to avoid blocking existing users
      const fallback: BackendOnboardingStatus = {
        is_onboarded: true,
        onboarding_step: 7,
        completion_percentage: 100,
        missing_fields: [],
        has_resume: true,
        has_preferences: true,
      };
      setStatus(fallback);
      try {
        sessionStorage.setItem('onboarding_status_cache', JSON.stringify(fallback));
      } catch {
        // Ignore quota errors
      }
    } finally {
      setLoading(false);
    }
  }, [token, status]);

  useEffect(() => {
    if (userId && token) {
      checkStatus(!status);
    } else if (!userId) {
      setLoading(false);
    }
  }, [userId, token]);

  return {
    status,
    isOnboarded: status?.is_onboarded ?? true,
    currentStep: status?.onboarding_step ?? 1,
    completionPercentage: status?.completion_percentage ?? 100,
    missingFields: status?.missing_fields ?? [],
    loading,
    error,
    refreshStatus: () => checkStatus(false),
  };
}
