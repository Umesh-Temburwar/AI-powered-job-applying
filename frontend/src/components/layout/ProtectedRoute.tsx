import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOnboardingStatus } from '../../hooks/useOnboardingStatus';
import { Skeleton } from '../ui/Skeleton';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowIncompleteOnboarding?: boolean;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowIncompleteOnboarding = false,
  requireAdmin = false,
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isOnboarded, loading: statusLoading } = useOnboardingStatus();
  const location = useLocation();

  // Once the page has resolved the initial check, prevent full-page skeleton on window minimize/maximize
  const [hasResolvedInitialCheck, setHasResolvedInitialCheck] = React.useState(false);

  React.useEffect(() => {
    if (!authLoading && !statusLoading) {
      setHasResolvedInitialCheck(true);
    }
  }, [authLoading, statusLoading]);

  // Only wait for statusLoading if we actually need to decide whether to redirect
  const shouldCheckOnboarding = !allowIncompleteOnboarding && location.pathname !== '/onboarding';

  // Only show full-page blocking skeleton on the very first initial load
  const isInitialLoading =
    !hasResolvedInitialCheck &&
    (authLoading || (user && shouldCheckOnboarding && statusLoading));

  if (isInitialLoading) {
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

  if (!user && !authLoading) {
    return <Navigate to="/login" replace />;
  }

  // Restrict admin routes to authorized administrators only
  if (requireAdmin && user && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect users who haven't finished onboarding to the onboarding wizard
  if (!isOnboarded && shouldCheckOnboarding && hasResolvedInitialCheck) {
    return <Navigate to="/onboarding" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
