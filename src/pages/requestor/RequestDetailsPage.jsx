import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  getRequestorRequestById,
  getRequestLocation,
  getRequestPaymentDetails,
  getRequestPriceChanges,
  getRequestReceipts,
  getRequestHandoffState,
  getRequestSettlement,
  getRequestFailure,
  getRequestDisputes,
  getRequestParticipants,
  getRequestUpdates,
} from "@/services/requestService";
import { devLog } from "@/lib/errors";
import { formatDateTime } from "@/lib/requestUtils";
import {
  PAYMENT_ARRANGEMENTS,
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
} from "@/lib/requestConstants";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { RequestProgressTimeline } from "@/components/requests/RequestProgressTimeline";
import { RequestorRequestActions } from "@/components/requests/RequestorRequestActions";
import { RequestLocationDetails } from "@/components/requests/RequestLocationDetails";
import { RequestParticipantCard } from "@/components/requests/RequestParticipantCard";
import { InPersonPaymentNotice } from "@/components/requests/InPersonPaymentNotice";
import { PaymentTermsSummary } from "@/components/requests/RequestPaymentTerms";
import { PaymentEvidencePanel } from "@/components/requests/PaymentEvidencePanel";
import { HandoffSettlementPanel } from "@/components/requests/HandoffSettlementPanel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

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

async function getRequestorRequestDetails(requestId, userId) {
  const [
    requestResult,
    updatesResult,
    locationResult,
    paymentDetailsResult,
    priceChangesResult,
    receiptsResult,
    handoffResult,
    settlementResult,
    failureResult,
    disputesResult,
    participantsResult,
  ] = await Promise.all([
    getRequestorRequestById(requestId, userId),
    getRequestUpdates(requestId),
    getRequestLocation(requestId),
    getRequestPaymentDetails(requestId),
    getRequestPriceChanges(requestId),
    getRequestReceipts(requestId),
    getRequestHandoffState(requestId),
    getRequestSettlement(requestId),
    getRequestFailure(requestId),
    getRequestDisputes(requestId),
    getRequestParticipants(requestId),
  ]);
  return {
    requestResult,
    updatesResult,
    locationResult,
    paymentDetailsResult,
    priceChangesResult,
    receiptsResult,
    handoffResult,
    settlementResult,
    failureResult,
    disputesResult,
    participantsResult,
  };
}

export function RequestDetailsPage() {
  const { user } = useAuth();
  const { requestId } = useParams();
  const [request, setRequest] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [location, setLocation] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [priceChanges, setPriceChanges] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [handoff, setHandoff] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [failure, setFailure] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function applyResults({
    requestResult,
    updatesResult,
    locationResult,
    paymentDetailsResult,
    priceChangesResult,
    receiptsResult,
    handoffResult,
    settlementResult,
    failureResult,
    disputesResult,
    participantsResult,
  }) {
    if (requestResult.error) {
      devLog("Request detail retrieval failed", requestResult.error);
      setError(
        requestResult.error.code === "PGRST116"
          ? "This request was not found or you do not have access to it."
          : "We could not load this request. Check your connection and try again.",
      );
      return;
    }
    setRequest(requestResult.data);
    if (updatesResult.error) {
      devLog("Request history retrieval failed", updatesResult.error);
    } else {
      setUpdates(updatesResult.data || []);
    }
    if (locationResult.error) {
      devLog("Private location retrieval failed", locationResult.error);
    } else {
      setLocation(locationResult.data || null);
    }
    if (paymentDetailsResult.error) {
      devLog(
        "Private payment detail retrieval failed",
        paymentDetailsResult.error,
      );
    } else {
      setPaymentDetails(paymentDetailsResult.data || null);
    }
    if (priceChangesResult.error) {
      devLog("Price-change retrieval failed", priceChangesResult.error);
    } else {
      setPriceChanges(priceChangesResult.data || []);
    }
    if (receiptsResult.error) {
      devLog("Receipt retrieval failed", receiptsResult.error);
    } else {
      setReceipts(receiptsResult.data || []);
    }
    if (handoffResult.error) {
      devLog("Handoff retrieval failed", handoffResult.error);
    } else {
      setHandoff(handoffResult.data || null);
    }
    if (settlementResult.error) {
      devLog("Settlement retrieval failed", settlementResult.error);
    } else {
      setSettlement(settlementResult.data || null);
    }
    if (failureResult.error) {
      devLog("Failure retrieval failed", failureResult.error);
    } else {
      setFailure(failureResult.data || null);
    }
    if (disputesResult.error) {
      devLog("Dispute retrieval failed", disputesResult.error);
    } else {
      setDisputes(disputesResult.data || []);
    }
    if (participantsResult.error) {
      devLog("Request participant retrieval failed", participantsResult.error);
    } else {
      setParticipants(participantsResult.data || []);
    }
  }

  async function loadRequest() {
    setLoading(true);
    setError("");
    applyResults(await getRequestorRequestDetails(requestId, user.id));
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    getRequestorRequestDetails(requestId, user.id).then((results) => {
      if (!active) return;
      applyResults(results);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [requestId, user.id]);

  if (loading) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-5xl p-4 sm:p-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-8 h-48 w-full" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-4xl p-4 sm:p-8">
        <Button variant="ghost" asChild className="-ml-3 mb-5">
          <Link to="/requestor/requests">
            <ArrowLeft className="h-4 w-4" />
            Back to My Requests
          </Link>
        </Button>
        <Alert variant="destructive">{error}</Alert>
        <Button variant="outline" className="mt-4" onClick={loadRequest}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const canEditLocation = [
    REQUEST_STATUSES.OPEN,
    REQUEST_STATUSES.ACCEPTED,
  ].includes(request.status);
  const locationEditPath = canEditLocation
    ? `/requestor/requests/${request.id}/location`
    : null;
  const usesPurchaseEvidence = [
    PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID,
    PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE,
  ].includes(request.payment_terms?.arrangement);
  const assignedRunner = participants.find(
    (participant) => participant.participant_type === "runner",
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl overflow-x-hidden p-4 sm:p-8">
      <Button variant="ghost" asChild className="-ml-3 mb-4 max-w-full">
        <Link to="/requestor/requests">
          <ArrowLeft className="h-4 w-4" />
          Back to My Requests
        </Link>
      </Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.status} />
            <span className="text-sm font-medium text-slate-500">
              {request.category?.name || "Uncategorized"}
            </span>
          </div>
          <h1 className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {request.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Posted {formatDateTime(request.created_at, "")}
          </p>
        </div>
      </div>

      <RequestProgressTimeline request={request} role="requestor" />

      <div className="mt-7 grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          <Card>
            <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
              <CardTitle>Request details</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-3 sm:p-6 sm:pt-3">
              <p className="whitespace-pre-wrap break-words leading-7 text-slate-700 [overflow-wrap:anywhere]">
                {request.description}
              </p>
              <div className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">General area</p>
                    <p className="mt-1 break-words text-sm text-slate-600 [overflow-wrap:anywhere]">
                      {request.area}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <div className="min-w-0">
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
            editTo={locationEditPath}
          />

          {(usesPurchaseEvidence || priceChanges.length > 0) && (
            <Card>
              <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
                <CardTitle>Price approval and receipts</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-3 sm:p-6 sm:pt-3">
                <PaymentEvidencePanel
                  request={request}
                  priceChanges={priceChanges}
                  receipts={receipts}
                  role="requestor"
                  userId={user.id}
                  onChanged={loadRequest}
                />
              </CardContent>
            </Card>
          )}

          {(handoff || settlement || failure || disputes.length > 0) && (
            <Card>
              <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
                <CardTitle>Handoff, payment, and resolution</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-3 sm:p-6 sm:pt-3">
                <HandoffSettlementPanel
                  request={request}
                  handoff={handoff}
                  settlement={settlement}
                  failure={failure}
                  disputes={disputes}
                  receipts={receipts}
                  priceChanges={priceChanges}
                  role="requestor"
                  userId={user.id}
                  onChanged={loadRequest}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
              <CardTitle>Status history</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-3 sm:p-6 sm:pt-3">
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
                      <div className="min-w-0 pb-2">
                        <p className="break-words font-semibold text-slate-900">
                          {eventLabel(update)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDateTime(update.created_at, "")}
                        </p>
                        {update.note && (
                          <p className="mt-2 break-words text-sm text-slate-600 [overflow-wrap:anywhere]">
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
        </div>

        <aside className="min-w-0 space-y-5">
          <RequestParticipantCard
            participant={assignedRunner}
            type="runner"
            acceptedAt={request.accepted_at}
            requestId={request.id}
          />
          <Card>
            <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
              <CardTitle>Payment arrangement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-3 sm:p-6 sm:pt-3">
              <PaymentTermsSummary
                terms={request.payment_terms}
                details={paymentDetails}
                expenseBudget={request.expense_budget}
                serviceFee={request.service_fee}
              />
              <InPersonPaymentNotice compact />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <ClipboardList className="h-6 w-6 text-brand-600" />
              <h2 className="mt-3 font-bold">Requestor controls</h2>
              <RequestorRequestActions
                request={request}
                onChanged={loadRequest}
                receipts={receipts}
                settlement={settlement}
                disputes={disputes}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
