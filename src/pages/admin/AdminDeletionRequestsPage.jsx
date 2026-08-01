import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  completeAdminAccountAnonymization,
  listAdminAccountDeletionRequests,
} from "@/services/adminService";
import { ACCOUNT_DELETION_STATUSES, ROLE_LABELS } from "@/lib/constants";
import { devLog } from "@/lib/errors";
import { formatDateTime } from "@/lib/requestUtils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/AdminState";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const PAGE_SIZE = 10;
const CONFIRMATION_PHRASE = "ANONYMIZE";
const deletionStatuses = ["PENDING", "ALL", "COMPLETED", "CANCELLED"];

function statusLabel(status) {
  if (status === ACCOUNT_DELETION_STATUSES.PENDING) return "Pending";
  if (status === ACCOUNT_DELETION_STATUSES.COMPLETED) return "Completed";
  if (status === ACCOUNT_DELETION_STATUSES.CANCELLED) return "Cancelled";
  return status;
}

function StatusBadge({ request, statusCheckedAt }) {
  if (request.status === ACCOUNT_DELETION_STATUSES.COMPLETED) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completed
      </Badge>
    );
  }
  if (request.status === ACCOUNT_DELETION_STATUSES.CANCELLED) {
    return <Badge className="bg-slate-200 text-slate-800">Cancelled</Badge>;
  }
  if (request.eligible_for_completion) {
    return (
      <Badge className="bg-red-100 text-red-800">
        <Trash2 className="h-3.5 w-3.5" />
        Ready
      </Badge>
    );
  }
  const due = new Date(request.scheduled_for).getTime() <= statusCheckedAt;
  return (
    <Badge className="bg-amber-100 text-amber-900">
      {due ? (
        <CircleAlert className="h-3.5 w-3.5" />
      ) : (
        <CalendarClock className="h-3.5 w-3.5" />
      )}
      {due ? "Blocked" : "Cancellation period"}
    </Badge>
  );
}

export function AdminDeletionRequestsPage() {
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [requests, setRequests] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [actionError, setActionError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusCheckedAt, setStatusCheckedAt] = useState(0);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: requestError } =
      await listAdminAccountDeletionRequests({
        status,
        limit: PAGE_SIZE + 1,
        offset: (page - 1) * PAGE_SIZE,
      });
    if (requestError) {
      devLog("Admin account-deletion queue failed", requestError);
      setError("We could not load the protected account-deletion queue.");
    } else {
      const rows = data || [];
      setRequests(rows.slice(0, PAGE_SIZE));
      setHasNextPage(rows.length > PAGE_SIZE);
      setStatusCheckedAt(Date.now());
    }
    setLoading(false);
  }, [page, status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadRequests, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRequests]);

  function changeStatus(event) {
    setPage(1);
    setStatus(event.target.value);
  }

  function openReview(request) {
    setSelected(request);
    setConfirmation("");
    setActionError("");
  }

  function changeDialog(open) {
    if (!open && !processing) setSelected(null);
  }

  async function completeAnonymization() {
    setActionError("");
    if (confirmation !== CONFIRMATION_PHRASE) {
      setActionError(`Type ${CONFIRMATION_PHRASE} exactly to continue.`);
      return;
    }

    setProcessing(true);
    const { error: processError } = await completeAdminAccountAnonymization({
      deletionRequestId: selected.id,
      confirmation,
    });
    setProcessing(false);
    if (processError) {
      devLog("Admin account anonymization failed", processError);
      setActionError(
        processError.message || "The account could not be anonymized.",
      );
      return;
    }

    setSelected(null);
    toast.success("The account was anonymized and the action was audited.");
    loadRequests();
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <AdminPageHeader
        title="Account deletion requests"
        description="Process user-requested anonymization only after the seven-day cancellation period and all transaction or safety blockers are resolved."
        actions={
          <select
            value={status}
            onChange={changeStatus}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-600"
            aria-label="Filter account-deletion status"
          >
            {deletionStatuses.map((item) => (
              <option key={item} value={item}>
                {item === "ALL" ? "All deletion requests" : statusLabel(item)}
              </option>
            ))}
          </select>
        }
      />

      <Alert className="mt-6 border-red-200 bg-red-50 text-red-950">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="leading-6">
            Completion removes reusable personal data and replaces the profile
            with a pseudonymous transaction-history record. The action cannot be
            reversed from the Admin dashboard.
          </p>
        </div>
      </Alert>

      <div className="mt-6">
        {loading && (
          <AdminLoadingState message="Loading deletion requests..." />
        )}
        {!loading && error && (
          <AdminErrorState message={error} onRetry={loadRequests} />
        )}
        {!loading && !error && requests.length === 0 && (
          <AdminEmptyState
            title="No matching deletion requests"
            description="There are no account-deletion requests in this state."
          />
        )}
        {!loading && !error && requests.length > 0 && (
          <div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3.5 font-bold">Account</th>
                        <th className="px-4 py-3.5 font-bold">Requested</th>
                        <th className="px-4 py-3.5 font-bold">Scheduled</th>
                        <th className="px-4 py-3.5 font-bold">Status</th>
                        <th className="px-4 py-3.5 font-bold">Blockers</th>
                        <th className="px-5 py-3.5 text-right font-bold">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {requests.map((request) => (
                        <tr
                          key={request.id}
                          className="align-top hover:bg-slate-50/70"
                        >
                          <td className="max-w-72 px-5 py-4">
                            <p className="font-bold text-slate-950">
                              {request.full_name}
                            </p>
                            <p
                              className="mt-1 truncate text-xs text-slate-600"
                              title={request.email}
                            >
                              {request.email}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {ROLE_LABELS[request.role] || request.role}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-700">
                            {formatDateTime(request.requested_at, "")}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-700">
                            {formatDateTime(request.scheduled_for, "")}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge
                              request={request}
                              statusCheckedAt={statusCheckedAt}
                            />
                          </td>
                          <td className="px-4 py-4 text-xs leading-5 text-slate-600">
                            <p>
                              {request.active_request_count} active request(s)
                            </p>
                            <p>{request.open_dispute_count} open dispute(s)</p>
                            <p>{request.open_report_count} open report(s)</p>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {request.eligible_for_completion ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openReview(request)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Review
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">
                                {request.status ===
                                ACCOUNT_DELETION_STATUSES.PENDING
                                  ? "Not ready"
                                  : "No action"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <nav
              className="mt-4 flex items-center justify-between gap-3"
              aria-label="Deletion-request pagination"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <p className="text-sm font-semibold text-slate-600">
                Page {page}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((current) => current + 1)}
                disabled={!hasNextPage}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={changeDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete account anonymization?</DialogTitle>
            <DialogDescription>
              Verify the account and request dates before performing this
              irreversible application-level action.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-bold text-slate-950">{selected.full_name}</p>
                <p className="mt-1 break-all text-slate-600">
                  {selected.email}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Requested {formatDateTime(selected.requested_at, "")} ·
                  Cancellation period ended{" "}
                  {formatDateTime(selected.scheduled_for, "")}
                </p>
              </div>

              <Alert className="border-red-200 bg-red-50 text-red-950">
                Personal profile fields, saved addresses, notifications, and
                supplied private locations will be removed or redacted. The
                pseudonymous transaction and safety record will remain, and
                application access will be permanently read-only.
              </Alert>

              {actionError && (
                <Alert variant="destructive">{actionError}</Alert>
              )}

              <div>
                <Label htmlFor="anonymizeConfirmation">
                  Type {CONFIRMATION_PHRASE} to confirm
                </Label>
                <Input
                  id="anonymizeConfirmation"
                  value={confirmation}
                  onChange={(event) =>
                    setConfirmation(event.target.value.toUpperCase())
                  }
                  className="mt-2 border-red-300"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={processing}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={completeAnonymization}
              disabled={processing || confirmation !== CONFIRMATION_PHRASE}
            >
              {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {processing ? "Anonymizing..." : "Anonymize account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
