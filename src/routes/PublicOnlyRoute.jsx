import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  getActiveRole,
  getDashboardPath,
  hasCompletedOnboarding,
} from "@/lib/constants";
import { FullPageLoader } from "@/components/common/FullPageLoader";

export function PublicOnlyRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user && profile) {
    return (
      <Navigate
        to={
          hasCompletedOnboarding(profile)
            ? getDashboardPath(getActiveRole(profile))
            : "/onboarding"
        }
        replace
      />
    );
  }
  return <Outlet />;
}
