import { Navigate, useLocation } from 'react-router-dom';
import { useClientSession } from '../context/ClientSessionContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useClientSession();
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
