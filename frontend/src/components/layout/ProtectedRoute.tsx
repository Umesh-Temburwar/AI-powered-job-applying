import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOnboardingStatus } from '../../hooks/useOnboardingStatus';
import { Skeleton } from '../ui/Skeleton';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowIncompleteOnboarding?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowIncompleteOnboarding = false,
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isOnboarded, loading: statusLoading } = useOnboardingStatus();
  const location = useLocation();

  // Only wait for statusLoading if we actually need to decide whether to redirect
  const shouldCheckOnboarding = !allowIncompleteOnboarding && location.pathname !== '/onboarding';

  if (authLoading || (user && shouldCheckOnboarding && statusLoading)) {
    return (
      <div className="min-h-screen bg-theme-base flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton height="3rem" className="w-full" />
          <Skeleton height="8rem" className="w-full" />
          <Skeleton height="2rem" className="w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect users who haven't finished onboarding to the onboarding wizard
  if (!isOnboarded && shouldCheckOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
