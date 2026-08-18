import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/useAuth.js';

export default function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.booting) {
    return <div className="boot-screen">Loading console...</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}