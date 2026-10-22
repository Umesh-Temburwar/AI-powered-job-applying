import { useState, useEffect, useCallback } from 'react';
import { getOnboardingStatusApi, type BackendOnboardingStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useOnboardingStatus() {
  const { session, user } = useAuth();
  const token = session?.token;

  const [status, setStatus] = useState<BackendOnboardingStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await getOnboardingStatusApi(token);
      setStatus(res);
    } catch (err) {
      console.warn('Could not fetch onboarding status:', err);
      // If endpoint is temporarily unreachable, default to onboarded to avoid blocking existing users
      setStatus({
        is_onboarded: true,
        onboarding_step: 7,
        completion_percentage: 100,
        missing_fields: [],
        has_resume: true,
        has_preferences: true,
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      checkStatus();
    } else {
      setLoading(false);
    }
  }, [user, checkStatus]);

  return {
    status,
    isOnboarded: status?.is_onboarded ?? true,
    currentStep: status?.onboarding_step ?? 1,
    completionPercentage: status?.completion_percentage ?? 100,
    missingFields: status?.missing_fields ?? [],
    loading,
    error,
    refreshStatus: checkStatus,
  };
}
