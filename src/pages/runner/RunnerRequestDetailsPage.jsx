import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  LoaderCircle,
  MapPin,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  acceptRequest,
  getRunnerCapacity,
  getRunnerRequestById,
  getRequestLocation,
  getRequestParticipants,
  getRequestUpdates,
} from "@/services/requestService";
import {
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
} from "@/lib/requestConstants";
import { devLog } from "@/lib/errors";
import {
  formatCurrency,
  formatDateTime,
  getFriendlyRequestError,
} from "@/lib/requestUtils";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { RunnerTaskActions } from "@/components/requests/RunnerTaskActions";
import { RequestLocationDetails } from "@/components/requests/RequestLocationDetails";
import { RequestParticipantCard } from "@/components/requests/RequestParticipantCard";
import { InPersonPaymentNotice } from "@/components/requests/InPersonPaymentNotice";
import { Alert } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";

function eventLabel(update) {
  if (update.event_type === "CREATED") return "Request created";
  if (update.event_type === "UPDATED") return "Request details updated";
  if (
    update.from_status === REQUEST_STATUSES.ACCEPTED &&
    update.to_status === REQUEST_STATUSES.OPEN
  ) {
    return "Runner released task";
  }
  if (
    update.from_status === REQUEST_STATUSES.ACCEPTED &&
    update.to_status === REQUEST_STATUSES.CANCELLED
  ) {
    return "Request cancelled before start";
  }
  if (update.to_status) {
    return `Status changed to ${REQUEST_STATUS_LABELS[update.to_status] || update.to_status}`;
  }
  return "Request updated";
}

async function getRunnerRequestDetails(requestId, userId) {
  const [requestResult, capacityResult] = await Promise.all([
    getRunnerRequestById(requestId, userId),
    getRunnerCapacity(userId),
  ]);
  if (
    requestResult.error ||
    requestResult.data?.status === REQUEST_STATUSES.OPEN
  ) {
    return {
      requestResult,
      updatesResult: null,
      locationResult: null,
      participantsResult: null,
      capacityResult,
    };
  }
  const [updatesResult, locationResult, participantsResult] = await Promise.all(
    [
      getRequestUpdates(requestId),
      getRequestLocation(requestId),
      getRequestParticipants(requestId),
    ],
  );
  return {
    requestResult,
    updatesResult,
    locationResult,
    participantsResult,
    capacityResult,
  };
}

export function RunnerRequestDetailsPage() {
  const { user } = useAuth();
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [location, setLocation] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [capacityError, setCapacityError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [actionError, setActionError] = useState("");

  async function loadRequest() {
    setLoading(true);
    setError("");
    const {
      requestResult,
      updatesResult,
      locationResult,
      participantsResult,
      capacityResult,
    } = await getRunnerRequestDetails(requestId, user.id);

    if (requestResult.error) {
      devLog("Runner request detail retrieval failed", requestResult.error);
      setError(
        "This request was not found, is no longer available, or you do not have access to it.",
      );
    } else {
      setRequest(requestResult.data);
      if (updatesResult?.error) {
        devLog("Runner request history retrieval failed", updatesResult.error);
      } else if (updatesResult) {
        setUpdates(updatesResult.data || []);
      } else {
        setUpdates([]);
      }
      if (locationResult?.error) {
        devLog(
          "Runner private location retrieval failed",
          locationResult.error,
        );
      } else {
        setLocation(locationResult?.data || null);
      }
      if (participantsResult?.error) {
        devLog("Runner participant retrieval failed", participantsResult.error);
      } else {
        setParticipants(participantsResult?.data || []);
      }
      if (capacityResult.error) {
        devLog("Runner capacity retrieval failed", capacityResult.error);
        setCapacityError(true);
      } else {
        setActiveTask(capacityResult.data || null);
        setCapacityError(false);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    getRunnerRequestDetails(requestId, user.id).then(
      ({
        requestResult,
        updatesResult,
        locationResult,
        participantsResult,
        capacityResult,
      }) => {
        if (!active) return;
        if (requestResult.error) {
          devLog("Runner request detail retrieval failed", requestResult.error);
          setError(
            "This request was not found, is no longer available, or you do not have access to it.",
          );
        } else {
          setRequest(requestResult.data);
          if (updatesResult?.error) {
            devLog(
              "Runner request history retrieval failed",
              updatesResult.error,
            );
          } else if (updatesResult) {
            setUpdates(updatesResult.data || []);
          } else {
            setUpdates([]);
          }
          if (locationResult?.error) {
            devLog(
              "Runner private location retrieval failed",
              locationResult.error,
            );
          } else {
            setLocation(locationResult?.data || null);
          }
          if (participantsResult?.error) {
            devLog(
              "Runner participant retrieval failed",
              participantsResult.error,
            );
          } else {
            setParticipants(participantsResult?.data || []);
          }
          if (capacityResult.error) {
            devLog("Runner capacity retrieval failed", capacityResult.error);
            setCapacityError(true);
          } else {
            setActiveTask(capacityResult.data || null);
            setCapacityError(false);
          }
        }
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [requestId, user.id]);

  async function handleAccept() {
    setAccepting(true);
    setActionError("");
    const { data, error: acceptError } = await acceptRequest(requestId);
    setAccepting(false);
    if (acceptError) {
      devLog("Request acceptance failed", acceptError);
      setActionError(
        getFriendlyRequestError(acceptError, "accept this request"),
      );
      return;
    }
    toast.success("Request accepted. It is now in My Tasks.");
    setAcceptOpen(false);
    navigate(`/runner/tasks/${data.id}`, { replace: true });
    await loadRequest();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-8 h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-8">
        <Alert variant="destructive">{error}</Alert>
        <div className="mt-4 flex gap-3">
          <Button asChild>
            <Link to="/runner/requests">Back to available requests</Link>
          </Button>
          <Button variant="outline" onClick={loadRequest}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isOpen = request.status === REQUEST_STATUSES.OPEN;
  const isAtCapacity = isOpen && Boolean(activeTask);
  const backTo = isOpen ? "/runner/requests" : "/runner/tasks";
  const requestorParticipant = participants.find(
    (participant) => participant.participant_type === "requestor",
  );

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <Button variant="ghost" asChild className="-ml-3 mb-4">
        <Link to={backTo}>
          <ArrowLeft className="h-4 w-4" />
          {isOpen ? "Back to Available Requests" : "Back to My Tasks"}
        </Link>
      </Button>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.status} />
            <span className="text-sm text-slate-500">
              {request.category?.name || "Uncategorized"}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            {request.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Posted {formatDateTime(request.created_at, "")}
          </p>
        </div>
        {isOpen && (
          <Button
            size="lg"
            disabled={isAtCapacity}
            title={
              isAtCapacity
                ? "Finish or submit your current task before accepting another request."
                : undefined
            }
            onClick={() => setAcceptOpen(true)}
          >
            Accept Request
          </Button>
        )}
      </div>

      {isAtCapacity && (
        <Alert className="mt-6 border-amber-200 bg-amber-50 text-amber-900">
          <p className="font-semibold">You already have an active task</p>
          <p className="mt-1 leading-6">
            Finish or submit <strong>{activeTask.title}</strong> before
            accepting another request. You can still browse available work.
          </p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link to={`/runner/tasks/${activeTask.id}`}>Open active task</Link>
          </Button>
        </Alert>
      )}

      {isOpen && capacityError && (
        <Alert className="mt-6 border-amber-200 bg-amber-50 text-amber-900">
          We could not check your current task capacity. The database will still
          prevent an additional active assignment.
        </Alert>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap leading-7 text-slate-700">
                {request.description}
              </p>
              <div className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 shrink-0 text-brand-600" />
                  <div>
                    <p className="text-sm font-semibold">General area</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {request.area}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CalendarClock className="h-5 w-5 shrink-0 text-brand-600" />
                  <div>
                    <p className="text-sm font-semibold">Due date</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateTime(request.due_at)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <RequestLocationDetails
            location={location}
            locked={isOpen}
            onRefresh={!isOpen && !location ? loadRequest : null}
          />

          {!isOpen && (
            <Card>
              <CardHeader>
                <CardTitle>Status history</CardTitle>
              </CardHeader>
              <CardContent>
                {updates.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    No history entries are available yet.
                  </p>
                ) : (
                  <ol className="space-y-5">
                    {updates.map((update, index) => (
                      <li key={update.id} className="relative flex gap-4">
                        <div className="flex flex-col items-center">
                          <span className="mt-1 h-3 w-3 rounded-full bg-brand-600 ring-4 ring-brand-100" />
                          {index < updates.length - 1 && (
                            <span className="mt-2 h-full w-px bg-slate-200" />
                          )}
                        </div>
                        <div className="pb-2">
                          <p className="font-semibold text-slate-900">
                            {eventLabel(update)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDateTime(update.created_at, "")}
                          </p>
                          {update.note && (
                            <p className="mt-2 text-sm text-slate-600">
                              {update.note}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          {!isOpen && (
            <RequestParticipantCard
              participant={requestorParticipant}
              type="requestor"
            />
          )}
          <Card>
            <CardHeader>
              <CardTitle>In-person payment arrangement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between gap-4">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <WalletCards className="h-4 w-4" />
                  Estimated errand expense
                </span>
                <strong>{formatCurrency(request.expense_budget)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <CircleDollarSign className="h-4 w-4" />
                  Agreed Runner fee
                </span>
                <strong>{formatCurrency(request.service_fee)}</strong>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-4">
                <span className="font-semibold">Estimated in-person total</span>
                <strong className="text-brand-700">
                  {formatCurrency(
                    Number(request.expense_budget) +
                      Number(request.service_fee),
                  )}
                </strong>
              </div>
              <InPersonPaymentNotice compact />
            </CardContent>
          </Card>

          {!isOpen && (
            <Card>
              <CardContent className="p-5">
                <ClipboardCheck className="h-6 w-6 text-brand-600" />
                <h2 className="mt-3 font-bold">Runner controls</h2>
                <RunnerTaskActions
                  request={request}
                  onChanged={loadRequest}
                  hasLocation={Boolean(location)}
                />
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader className="mb-5 pr-8">
            <DialogTitle>Accept this request?</DialogTitle>
            <DialogDescription>
              You will become the assigned Runner. Only one Runner can accept an
              open request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <InPersonPaymentNotice compact />
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              Some errands may require you to temporarily cover the purchase
              cost. Accept only if you understand the estimated expense and are
              comfortable with that arrangement. Keep the official receipt.
            </Alert>
            {actionError && <Alert variant="destructive">{actionError}</Alert>}
          </div>
          <DialogFooter className="mt-5">
            <DialogClose asChild>
              <Button variant="outline" disabled={accepting}>
                Not yet
              </Button>
            </DialogClose>
            <Button onClick={handleAccept} disabled={accepting}>
              {accepting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {accepting ? "Accepting…" : "Accept request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
