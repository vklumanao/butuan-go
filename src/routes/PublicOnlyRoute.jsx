import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getActiveRole, getDashboardPath } from "@/lib/constants";
import { FullPageLoader } from "@/components/common/FullPageLoader";

export function PublicOnlyRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user && profile)
    return <Navigate to={getDashboardPath(getActiveRole(profile))} replace />;
  return <Outlet />;
}
