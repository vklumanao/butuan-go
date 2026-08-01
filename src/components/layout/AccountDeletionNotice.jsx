import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { getMyAccountDeletionRequest } from "@/services/accountDeletionService";
import { ACCOUNT_DELETION_STATUSES, getActiveRole } from "@/lib/constants";
import { devLog } from "@/lib/errors";
import { formatDateTime } from "@/lib/requestUtils";
import { useAuth } from "@/hooks/useAuth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function AccountDeletionNotice() {
  const { profile } = useAuth();
  const [deletionRequest, setDeletionRequest] = useState(null);

  const loadDeletionRequest = useCallback(async () => {
    const { data, error } = await getMyAccountDeletionRequest();
    if (error) {
      devLog("Account-deletion notice failed", error);
      return;
    }
    setDeletionRequest(
      data?.status === ACCOUNT_DELETION_STATUSES.PENDING ? data : null,
    );
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadDeletionRequest, 0);
    window.addEventListener(
      "butuango:account-deletion-changed",
      loadDeletionRequest,
    );
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(
        "butuango:account-deletion-changed",
        loadDeletionRequest,
      );
    };
  }, [loadDeletionRequest]);

  if (!deletionRequest) return null;

  const profilePath = `/${getActiveRole(profile)}/profile`;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-8">
      <Alert className="border-amber-300 bg-amber-50 text-amber-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Account deletion is pending</p>
              <p className="mt-1 leading-6">
                New marketplace commitments are paused. Scheduled for Admin
                review on {formatDateTime(deletionRequest.scheduled_for, "")}.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to={profilePath}>Review or cancel</Link>
          </Button>
        </div>
      </Alert>
    </div>
  );
}
