import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <LoadingSpinner message="Checking authentication session..." />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
