import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { getActiveRole } from "@/lib/constants";

export function RoleRoute({ allowedRole }) {
  const { profile, loading, profileError } = useAuth();
  if (loading) return <FullPageLoader message="Checking your access…" />;
  if (profileError || !profile)
    return (
      <Navigate to="/unauthorized" replace state={{ reason: profileError }} />
    );
  if (getActiveRole(profile) !== allowedRole)
    return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
