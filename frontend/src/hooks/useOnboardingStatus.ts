import { useState, useEffect, useCallback } from 'react';
import { getOnboardingStatusApi, type BackendOnboardingStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

let memoryCachedStatus: BackendOnboardingStatus | null = null;

export function markOnboardingCompletedLocally(): void {
  const completedStatus: BackendOnboardingStatus = {
    is_onboarded: true,
    onboarding_step: 7,
    completion_percentage: 100,
    missing_fields: [],
    has_resume: true,
    has_preferences: true,
  };
  memoryCachedStatus = completedStatus;
  try {
    sessionStorage.setItem('onboarding_status_cache', JSON.stringify(completedStatus));
    localStorage.setItem('onboarding_completed', 'true');
  } catch {
    // Ignore quota errors
  }
}

export function clearOnboardingCache(): void {
  memoryCachedStatus = null;
  try {
    sessionStorage.removeItem('onboarding_status_cache');
    localStorage.removeItem('onboarding_completed');
  } catch {
    // Ignore quota errors
  }
}

export function useOnboardingStatus() {
  const { session, user } = useAuth();
  const token = session?.token;
  const userId = user?.id;

  const [status, setStatus] = useState<BackendOnboardingStatus | null>(() => {
    if (memoryCachedStatus) return memoryCachedStatus;
    try {
      const cached = sessionStorage.getItem('onboarding_status_cache');
      if (cached) {
        memoryCachedStatus = JSON.parse(cached);
        return memoryCachedStatus;
      }
    } catch {
      return null;
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (memoryCachedStatus) return false;
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
      if (isInitial && !status && !memoryCachedStatus) {
        setLoading(true);
      }
      setError(null);
      const res = await getOnboardingStatusApi(token);
      memoryCachedStatus = res;
      setStatus(res);
      try {
        sessionStorage.setItem('onboarding_status_cache', JSON.stringify(res));
        if (res.is_onboarded) {
          localStorage.setItem('onboarding_completed', 'true');
        }
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
      memoryCachedStatus = fallback;
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

  const hasLocalCompleted = typeof window !== 'undefined' && localStorage.getItem('onboarding_completed') === 'true';
  const effectiveIsOnboarded = hasLocalCompleted || (status?.is_onboarded ?? true);

  return {
    status,
    isOnboarded: effectiveIsOnboarded,
    currentStep: status?.onboarding_step ?? 1,
    completionPercentage: status?.completion_percentage ?? 100,
    missingFields: status?.missing_fields ?? [],
    loading,
    error,
    refreshStatus: () => checkStatus(false),
  };
}
