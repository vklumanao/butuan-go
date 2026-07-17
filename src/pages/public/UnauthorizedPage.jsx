import { Link, useLocation } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getActiveRole, getDashboardPath } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function UnauthorizedPage() {
  const { profile, user } = useAuth();
  const location = useLocation();
  const target =
    user && profile ? getDashboardPath(getActiveRole(profile)) : "/login";
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50">
          <ShieldX className="h-8 w-8 text-red-600" />
        </span>
        <h1 className="mt-6 text-3xl font-black">Access not allowed</h1>
        <p className="mx-auto mt-3 max-w-md text-slate-600">
          {location.state?.reason ||
            "This page belongs to your other workspace. Use the workspace switcher to access it."}
        </p>
        <Button asChild className="mt-7">
          <Link to={target}>
            {user ? "Return to my dashboard" : "Go to login"}
          </Link>
        </Button>
      </div>
    </main>
  );
}
