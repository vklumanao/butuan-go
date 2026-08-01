import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  CircleAlert,
  LoaderCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  cancelAccountDeletion,
  getMyAccountDeletionRequest,
  requestAccountDeletion,
} from "@/services/accountDeletionService";
import { ACCOUNT_DELETION_STATUSES } from "@/lib/constants";
import { devLog } from "@/lib/errors";
import { formatDateTime } from "@/lib/requestUtils";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CONFIRMATION_PHRASE = "DELETE MY ACCOUNT";

function dispatchDeletionChange() {
  window.dispatchEvent(new Event("butuango:account-deletion-changed"));
}

export function AccountDeletionPanel() {
  const [deletionRequest, setDeletionRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [statusCheckedAt, setStatusCheckedAt] = useState(0);

  const loadDeletionRequest = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const { data, error } = await getMyAccountDeletionRequest();
    if (error) {
      devLog("Account-deletion status failed", error);
      setLoadError("Account-deletion controls are temporarily unavailable.");
    } else {
      setDeletionRequest(data);
      setStatusCheckedAt(Date.now());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadDeletionRequest, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDeletionRequest]);

  function openDialog() {
    setConfirmation("");
    setReason("");
    setActionError("");
    setDialogOpen(true);
  }

  function changeDialog(open) {
    if (!submitting) setDialogOpen(open);
  }

  async function submitDeletionRequest() {
    setActionError("");
    if (confirmation !== CONFIRMATION_PHRASE) {
      setActionError(`Type ${CONFIRMATION_PHRASE} exactly to continue.`);
      return;
    }

    setSubmitting(true);
    const { error } = await requestAccountDeletion({ confirmation, reason });
    setSubmitting(false);
    if (error) {
      devLog("Account-deletion request failed", error);
      setActionError(
        error.message || "Your account-deletion request could not be created.",
      );
      return;
    }

    setDialogOpen(false);
    await loadDeletionRequest();
    dispatchDeletionChange();
    toast.success("Account deletion requested. You have seven days to cancel.");
  }

  async function cancelRequest() {
    const confirmed = window.confirm(
      "Cancel your pending account-deletion request and restore the ability to create or accept new requests?",
    );
    if (!confirmed) return;

    setCancelling(true);
    const { error } = await cancelAccountDeletion();
    setCancelling(false);
    if (error) {
      devLog("Account-deletion cancellation failed", error);
      toast.error(
        error.message || "The deletion request could not be cancelled.",
      );
      return;
    }

    await loadDeletionRequest();
    dispatchDeletionChange();
    toast.success("Your account-deletion request was cancelled.");
  }

  const pending = deletionRequest?.status === ACCOUNT_DELETION_STATUSES.PENDING;
  const cancellationOpen =
    pending &&
    new Date(deletionRequest.scheduled_for).getTime() > statusCheckedAt;
  const blockerCount = pending
    ? Number(deletionRequest.active_request_count || 0) +
      Number(deletionRequest.open_dispute_count || 0) +
      Number(deletionRequest.open_report_count || 0)
    : 0;

  return (
    <>
      <Card className="mt-6 border-red-200">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-red-950">Delete account</CardTitle>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Request removal of your personal profile data after a seven-day
                cancellation period.
              </p>
            </div>
            <Badge className="bg-red-100 text-red-800">Danger zone</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Checking deletion status...
            </p>
          )}

          {!loading && loadError && (
            <Alert variant="destructive">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p>{loadError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={loadDeletionRequest}
                  >
                    Try again
                  </Button>
                </div>
              </div>
            </Alert>
          )}

          {!loading && !loadError && pending && (
            <div className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50 text-amber-950">
                <div className="flex items-start gap-3">
                  <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">Deletion request pending</p>
                    <p className="mt-1 leading-6">
                      New requests and task acceptance are paused. Continue to
                      finish any existing responsibility.
                    </p>
                    <p className="mt-2 text-xs font-semibold">
                      Scheduled for review:{" "}
                      {formatDateTime(deletionRequest.scheduled_for, "")}
                    </p>
                  </div>
                </div>
              </Alert>

              {blockerCount > 0 && (
                <Alert variant="destructive">
                  Processing is blocked by{" "}
                  {deletionRequest.active_request_count} active request(s),{" "}
                  {deletionRequest.open_dispute_count} open dispute(s), and{" "}
                  {deletionRequest.open_report_count} open safety report(s).
                </Alert>
              )}

              {cancellationOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelRequest}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  {cancelling ? "Cancelling..." : "Cancel deletion request"}
                </Button>
              ) : (
                <p className="text-sm leading-6 text-slate-600">
                  The cancellation period has ended. An Admin can now process
                  the request after confirming that no blockers remain.
                </p>
              )}
            </div>
          )}

          {!loading && !loadError && !pending && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                You cannot request deletion while you have active requests, open
                disputes, or open safety reports. Completed transaction and
                audit records remain under a non-identifying account label.
              </p>
              <Button
                type="button"
                variant="destructive"
                className="shrink-0"
                onClick={openDialog}
              >
                <Trash2 className="h-4 w-4" />
                Request account deletion
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={changeDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request account deletion?</DialogTitle>
            <DialogDescription>
              This starts a seven-day cancellation period and immediately pauses
              new marketplace commitments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <Alert className="border-red-200 bg-red-50 text-red-950">
              <p className="font-bold">What happens after processing</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-6">
                <li>
                  Name, contact details, Google photo, and saved addresses are
                  removed.
                </li>
                <li>Private location snapshots you supplied are redacted.</li>
                <li>
                  Transaction, dispute, safety, and audit history remains
                  pseudonymous.
                </li>
                <li>
                  The authentication identity is retained as a protected safety
                  record so the same Google identity cannot recreate the deleted
                  account.
                </li>
              </ul>
            </Alert>

            {actionError && <Alert variant="destructive">{actionError}</Alert>}

            <div>
              <Label htmlFor="accountDeletionReason">Reason (optional)</Label>
              <Textarea
                id="accountDeletionReason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                className="mt-2 min-h-24"
                placeholder="You may tell us why you are leaving."
              />
              <p className="mt-1 text-right text-xs text-slate-500">
                {reason.length}/500
              </p>
            </div>

            <div>
              <Label htmlFor="accountDeletionConfirmation">
                Type {CONFIRMATION_PHRASE} to confirm
              </Label>
              <Input
                id="accountDeletionConfirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-2 border-red-300"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>
                Keep account
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={submitDeletionRequest}
              disabled={submitting || confirmation !== CONFIRMATION_PHRASE}
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {submitting ? "Submitting..." : "Start deletion period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
