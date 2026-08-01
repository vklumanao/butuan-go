import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brand } from "@/components/layout/Brand";

export function AccountDeletedPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const { error } = await signOut();
    setLoggingOut(false);
    if (error) {
      toast.error("We could not log you out. Please try again.");
      return;
    }
    navigate("/login", { replace: true });
  }

  if (!profile?.anonymized_at) return <Navigate to="/unauthorized" replace />;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <Card className="w-full max-w-xl">
        <CardContent className="p-7 text-center sm:p-10">
          <div className="flex justify-center">
            <Brand />
          </div>
          <span className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-black text-slate-950">
            Account deletion completed
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            Your ButuanGo profile and reusable personal data have been
            anonymized. A pseudonymous transaction and safety record remains so
            completed activity and reports retain their integrity.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            This Google identity cannot create a new ButuanGo account. Contact
            the project administrator if you believe this was processed in
            error.
          </p>
          <Button
            className="mt-7"
            variant="outline"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {loggingOut ? "Logging out..." : "Log out"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
