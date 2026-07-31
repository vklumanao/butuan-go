import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getActiveRole,
  getDashboardPath,
  hasCompletedOnboarding,
} from "@/lib/constants";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { Button } from "@/components/ui/button";

export function AuthCallbackPage() {
  const { user, profile, loading, profileError } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user && profile) {
      navigate(
        hasCompletedOnboarding(profile)
          ? getDashboardPath(getActiveRole(profile))
          : "/onboarding",
        { replace: true },
      );
    }
  }, [loading, user, profile, navigate]);
  if (loading || (user && !profileError))
    return <FullPageLoader message="Confirming your account…" />;
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center">
      <div>
        <CircleAlert className="mx-auto h-12 w-12 text-accent-600" />
        <h1 className="mt-5 text-2xl font-black">
          We couldn’t complete Google sign-in
        </h1>
        <p className="mx-auto mt-3 max-w-md text-slate-600">
          {profileError ||
            "Google sign-in may have been cancelled or the callback configuration is invalid. Return to login and try again."}
        </p>
        <Button asChild className="mt-6">
          <Link to="/login">Go to login</Link>
        </Button>
      </div>
    </main>
  );
}
