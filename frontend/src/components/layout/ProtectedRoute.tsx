import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../ui/Skeleton';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowIncompleteOnboarding?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  redirectTo,
}) => {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
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
    return <Navigate to={redirectTo || '/login'} replace />;
  }

  // Restrict admin routes to authorized administrators only
  if (requireAdmin && user && !user.isAdmin) {
    return <Navigate to="/applications" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
