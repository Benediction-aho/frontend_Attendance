import { Navigate, useLocation } from 'react-router';

/** "/admin/users/43" → "/app/admin/users/43" (older email links). */
export function AppPrefixRedirect() {
  const loc = useLocation();
  return <Navigate to={`/app${loc.pathname}${loc.search}${loc.hash}`} replace />;
}
