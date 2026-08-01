import { useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Clipboard,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Scale,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  acknowledgeRequestFailure,
  confirmRequestSettlementReceived,
  openRequestDispute,
  regenerateRequestHandoffCode,
  reportRequestFailure,
  verifyRequestHandoff,
  withdrawRequestDispute,
} from "@/services/requestService";
import {
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_STATUS_LABELS,
  FAILURE_REASON_LABELS,
  PAYMENT_PAYER_LABELS,
  REQUEST_STATUSES,
} from "@/lib/requestConstants";
import { devLog } from "@/lib/errors";
import {
  formatCurrency,
  formatDateTime,
  getFriendlyRequestError,
} from "@/lib/requestUtils";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DISPUTE_ELIGIBLE_STATUSES = [
  REQUEST_STATUSES.IN_PROGRESS,
  REQUEST_STATUSES.AWAITING_CONFIRMATION,
  REQUEST_STATUSES.COMPLETED,
  REQUEST_STATUSES.FAILED,
];

function disputeStatusClass(status) {
  if (status === "OPEN") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "RESOLVED")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "DISMISSED")
    return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-slate-200 bg-white text-slate-600";
}

export function HandoffSettlementPanel({
  request,
  handoff,
  settlement,
  failure,
  disputes = [],
  receipts = [],
  priceChanges = [],
  role,
  userId,
  onChanged,
}) {
  const [handoffCode, setHandoffCode] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAcknowledged, setPaymentAcknowledged] = useState(false);
  const [failureDialogOpen, setFailureDialogOpen] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const [failureDescription, setFailureDescription] = useState("");
  const [acknowledgeDialogOpen, setAcknowledgeDialogOpen] = useState(false);
  const [acknowledgmentNote, setAcknowledgmentNote] = useState("");
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [panelError, setPanelError] = useState("");

  const isRunner = role === "runner";
  const isRequestor = role === "requestor";
  const isInProgress = request.status === REQUEST_STATUSES.IN_PROGRESS;
  const openDispute = disputes.find((dispute) => dispute.status === "OPEN");
  const handoffVerified = Boolean(handoff?.verified_at);
  const runnerPaymentConfirmed = Boolean(settlement?.runner_confirmed_at);
  const requestorPaymentConfirmed = Boolean(settlement?.requestor_confirmed_at);
  const canOpenDispute =
    DISPUTE_ELIGIBLE_STATUSES.includes(request.status) && !openDispute;
  const payerLabel =
    PAYMENT_PAYER_LABELS[request.payment_terms?.payer_type] || "Selected payer";
  const purchaseReceiptRequired =
    request.payment_terms?.receipt_evidence_required !== false &&
    ["MERCHANT_PREPAID", "RUNNER_ADVANCE"].includes(
      request.payment_terms?.arrangement,
    );
  const pendingPriceChange = priceChanges.some(
    (change) => change.status === "PENDING",
  );
  const currentAdvanceConsent =
    request.payment_terms?.arrangement !== "RUNNER_ADVANCE" ||
    (request.payment_terms?.runner_consented_at &&
      request.payment_terms?.runner_consented_amount ===
        request.payment_terms?.maximum_advance);
  const paymentEvidenceReady =
    (!purchaseReceiptRequired || receipts.length > 0) &&
    !pendingPriceChange &&
    currentAdvanceConsent;

  function showError(error, action) {
    devLog(`Phase 3 ${action} failed`, error);
    setPanelError(getFriendlyRequestError(error, action));
  }

  async function refreshAfter(message) {
    setPanelError("");
    toast.success(message);
    await onChanged();
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(handoff.handoff_code);
      toast.success("Handoff code copied.");
    } catch (error) {
      devLog("Handoff code copy failed", error);
      toast.error("Copy the six-digit code manually.");
    }
  }

  async function regenerateCode() {
    if (
      !window.confirm(
        "Generate a new handoff code? The previous code will stop working.",
      )
    ) {
      return;
    }
    setBusyAction("regenerate");
    setPanelError("");
    const { error } = await regenerateRequestHandoffCode(request.id);
    setBusyAction("");
    if (error) {
      showError(error, "regenerate the handoff code");
      return;
    }
    await refreshAfter("A new handoff code was generated.");
  }

  async function verifyCode(event) {
    event.preventDefault();
    setPanelError("");
    if (!/^[0-9]{6}$/.test(handoffCode)) {
      setPanelError("Enter the complete six-digit handoff code.");
      return;
    }

    setBusyAction("verify");
    const { data, error } = await verifyRequestHandoff(request.id, handoffCode);
    setBusyAction("");
    if (error) {
      showError(error, "verify the handoff code");
      return;
    }
    setHandoffCode("");
    if (data?.verified) {
      await refreshAfter("Handoff verified.");
      return;
    }
    setPanelError(
      data?.locked
        ? "Code locked after five incorrect attempts. Ask the Requestor to generate a new code."
        : `Incorrect code. ${data?.attempts_remaining ?? 0} attempt${
            data?.attempts_remaining === 1 ? "" : "s"
          } remaining.`,
    );
    await onChanged();
  }

  async function confirmPayment() {
    setBusyAction("payment");
    setPanelError("");
    const { error } = await confirmRequestSettlementReceived(
      request.id,
      settlement?.expected_amount,
    );
    setBusyAction("");
    if (error) {
      showError(error, "confirm the direct payment");
      return;
    }
    setPaymentDialogOpen(false);
    setPaymentAcknowledged(false);
    await refreshAfter("Direct payment confirmation recorded.");
  }

  async function reportFailure(event) {
    event.preventDefault();
    setPanelError("");
    if (!failureReason) {
      setPanelError("Choose why the handoff failed.");
      return;
    }
    if (failureDescription.trim().length < 10) {
      setPanelError("Describe what happened in at least 10 characters.");
      return;
    }

    setBusyAction("failure");
    const { error } = await reportRequestFailure(
      request.id,
      failureReason,
      failureDescription,
    );
    setBusyAction("");
    if (error) {
      showError(error, "report this failed handoff");
      return;
    }
    setFailureDialogOpen(false);
    setFailureReason("");
    setFailureDescription("");
    await refreshAfter("Failed handoff recorded. The Requestor was notified.");
  }

  async function acknowledgeFailure() {
    if (acknowledgmentNote.trim().length === 1) {
      setPanelError(
        "Write at least two characters in the note, or leave it blank.",
      );
      return;
    }
    setBusyAction("acknowledge");
    setPanelError("");
    const { error } = await acknowledgeRequestFailure(
      failure.id,
      acknowledgmentNote,
    );
    setBusyAction("");
    if (error) {
      showError(error, "acknowledge this failed handoff");
      return;
    }
    setAcknowledgeDialogOpen(false);
    setAcknowledgmentNote("");
    await refreshAfter("Failed handoff acknowledged.");
  }

  async function openDisputeCase(event) {
    event.preventDefault();
    setPanelError("");
    if (!disputeCategory) {
      setPanelError("Choose a dispute category.");
      return;
    }
    if (disputeDescription.trim().length < 10) {
      setPanelError("Describe the issue in at least 10 characters.");
      return;
    }

    setBusyAction("dispute");
    const { error } = await openRequestDispute(
      request.id,
      disputeCategory,
      disputeDescription,
    );
    setBusyAction("");
    if (error) {
      showError(error, "open this dispute");
      return;
    }
    setDisputeDialogOpen(false);
    setDisputeCategory("");
    setDisputeDescription("");
    await refreshAfter(
      "Dispute opened. Completion is paused while it is under review.",
    );
  }

  async function withdrawDispute(dispute) {
    if (
      !window.confirm("Withdraw this dispute and resume the normal workflow?")
    )
      return;
    setBusyAction(`withdraw-${dispute.id}`);
    setPanelError("");
    const { error } = await withdrawRequestDispute(dispute.id);
    setBusyAction("");
    if (error) {
      showError(error, "withdraw this dispute");
      return;
    }
    await refreshAfter("Dispute withdrawn.");
  }

  return (
    <div className="space-y-6">
      {handoff && (
        <section>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-800">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-950">Secure handoff code</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Confirms that the Runner reached the intended handoff.
              </p>
            </div>
          </div>

          {handoffVerified ? (
            <Alert className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-950">
              <BadgeCheck className="mb-2 h-5 w-5" />
              <p className="font-bold">Handoff verified</p>
              <p className="mt-1 text-sm">
                Verified {formatDateTime(handoff.verified_at, "")}
              </p>
            </Alert>
          ) : isRequestor && isInProgress ? (
            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-sm font-semibold text-brand-950">
                Your private six-digit code
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="rounded-lg bg-white px-4 py-2 text-2xl font-black tracking-[0.3em] text-slate-950 ring-1 ring-brand-200">
                  {handoff.handoff_code}
                </code>
                <Button size="sm" variant="outline" onClick={copyCode}>
                  <Clipboard className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              <p className="mt-3 text-sm leading-6 text-brand-950/80">
                Share this only when the item or service is accepted and the
                selected payer is ready to settle. Do not place it in the public
                request description.
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                disabled={busyAction === "regenerate"}
                onClick={regenerateCode}
              >
                {busyAction === "regenerate" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Generate a new code
              </Button>
            </div>
          ) : isRunner && isInProgress && paymentEvidenceReady ? (
            <form
              className="mt-4 rounded-xl border border-slate-200 p-4"
              onSubmit={verifyCode}
            >
              <label
                htmlFor="handoffCode"
                className="text-sm font-semibold text-slate-900"
              >
                Enter Requestor's code
              </label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="handoffCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={handoffCode}
                  placeholder="000000"
                  className="text-center text-lg font-bold tracking-[0.2em]"
                  disabled={
                    handoff.attempts_remaining === 0 || busyAction === "verify"
                  }
                  onChange={(event) =>
                    setHandoffCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                />
                <Button
                  type="submit"
                  disabled={
                    handoff.attempts_remaining === 0 || busyAction === "verify"
                  }
                >
                  {busyAction === "verify" && (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  )}
                  Verify
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {handoff.attempts_remaining} attempt
                {handoff.attempts_remaining === 1 ? "" : "s"} remaining.
              </p>
              {handoff.attempts_remaining === 0 && (
                <p className="mt-2 text-sm text-amber-800">
                  Ask the Requestor to generate a new code.
                </p>
              )}
            </form>
          ) : isRunner && isInProgress ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              Complete the receipt, price-approval, and current cash-advance
              consent requirements before asking for the handoff code.
            </p>
          ) : null}
        </section>
      )}

      {settlement && (
        <section className="border-t border-slate-200 pt-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-800">
              <Banknote className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-950">
                Direct payment confirmation
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {payerLabel}:{" "}
                <strong>{formatCurrency(settlement.expected_amount)}</strong>
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div
              className={`rounded-xl border p-3 ${
                runnerPaymentConfirmed
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-sm font-bold text-slate-900">
                Runner confirmation
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {runnerPaymentConfirmed
                  ? `Received ${formatDateTime(
                      settlement.runner_confirmed_at,
                      "",
                    )}`
                  : "Not confirmed yet"}
              </p>
            </div>
            <div
              className={`rounded-xl border p-3 ${
                requestorPaymentConfirmed
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-sm font-bold text-slate-900">
                Requestor confirmation
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {requestorPaymentConfirmed
                  ? `Confirmed ${formatDateTime(
                      settlement.requestor_confirmed_at,
                      "",
                    )}`
                  : "Confirmed during final completion"}
              </p>
            </div>
          </div>

          {isRunner &&
            isInProgress &&
            handoffVerified &&
            !runnerPaymentConfirmed &&
            paymentEvidenceReady &&
            !openDispute && (
              <Button
                className="mt-4 w-full"
                onClick={() => {
                  setPanelError("");
                  setPaymentDialogOpen(true);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm payment received
              </Button>
            )}
          {isRunner &&
            isInProgress &&
            handoffVerified &&
            !runnerPaymentConfirmed &&
            !paymentEvidenceReady && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                Complete the receipt, price-approval, and current cash-advance
                consent requirements before confirming direct payment.
              </p>
            )}
        </section>
      )}

      {failure && (
        <section className="border-t border-slate-200 pt-5">
          <Alert className="border-red-200 bg-red-50 text-red-950">
            <AlertTriangle className="mb-2 h-5 w-5" />
            <p className="font-bold">
              {FAILURE_REASON_LABELS[failure.reason_code] ||
                failure.reason_code}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
              {failure.description}
            </p>
            <p className="mt-2 text-xs text-red-800">
              Reported {formatDateTime(failure.created_at, "")}
            </p>
            {failure.acknowledgment_note && (
              <p className="mt-3 border-t border-red-200 pt-3 text-sm">
                Requestor note: {failure.acknowledgment_note}
              </p>
            )}
          </Alert>
          {isRequestor && !failure.acknowledged_at && (
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => setAcknowledgeDialogOpen(true)}
            >
              Acknowledge report
            </Button>
          )}
        </section>
      )}

      {openDispute && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <Scale className="mb-2 h-5 w-5" />
          <p className="font-bold">Completion is paused by an open dispute</p>
          <p className="mt-1 text-sm leading-6">
            Category:{" "}
            {DISPUTE_CATEGORY_LABELS[openDispute.category] ||
              openDispute.category}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
            {openDispute.description}
          </p>
          {openDispute.opened_by === userId && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              disabled={busyAction === `withdraw-${openDispute.id}`}
              onClick={() => withdrawDispute(openDispute)}
            >
              {busyAction === `withdraw-${openDispute.id}` && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              Withdraw dispute
            </Button>
          )}
        </Alert>
      )}

      {disputes.length > 0 && (
        <section className="border-t border-slate-200 pt-5">
          <h3 className="font-bold text-slate-950">Dispute history</h3>
          <div className="mt-3 space-y-3">
            {disputes.map((dispute) => (
              <div
                key={dispute.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {DISPUTE_CATEGORY_LABELS[dispute.category] ||
                      dispute.category}
                  </p>
                  <Badge
                    variant="outline"
                    className={disputeStatusClass(dispute.status)}
                  >
                    {DISPUTE_STATUS_LABELS[dispute.status] || dispute.status}
                  </Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {dispute.description}
                </p>
                {dispute.resolution_note && (
                  <p className="mt-2 border-t border-slate-200 pt-2 text-sm text-slate-600">
                    Resolution: {dispute.resolution_note}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {formatDateTime(dispute.created_at, "")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-5">
        {isRunner &&
          isInProgress &&
          !handoffVerified &&
          !runnerPaymentConfirmed && (
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={() => {
                setPanelError("");
                setFailureDialogOpen(true);
              }}
            >
              <XCircle className="h-4 w-4" />
              Report failed handoff
            </Button>
          )}
        {canOpenDispute && (
          <Button
            variant="outline"
            onClick={() => {
              setPanelError("");
              setDisputeDialogOpen(true);
            }}
          >
            <Scale className="h-4 w-4" />
            Open dispute
          </Button>
        )}
      </div>

      {panelError && <Alert variant="destructive">{panelError}</Alert>}

      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (!open) {
            setPaymentAcknowledged(false);
            setPanelError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm direct payment received?</DialogTitle>
            <DialogDescription>
              Confirm only after the selected payer has handed you the complete
              documented amount.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
              <p className="text-sm">Documented direct payment</p>
              <p className="mt-1 text-2xl font-black">
                {formatCurrency(settlement?.expected_amount)}
              </p>
            </Alert>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={paymentAcknowledged}
                onChange={(event) =>
                  setPaymentAcknowledged(event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
              />
              <span>
                I personally received the complete amount shown above directly
                from the selected payer.
              </span>
            </label>
            {panelError && <Alert variant="destructive">{panelError}</Alert>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={busyAction === "payment"}>
                Not yet
              </Button>
            </DialogClose>
            <Button
              disabled={!paymentAcknowledged || busyAction === "payment"}
              onClick={confirmPayment}
            >
              {busyAction === "payment" && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              Confirm received
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={failureDialogOpen}
        onOpenChange={(open) => {
          setFailureDialogOpen(open);
          if (!open) setPanelError("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a failed handoff?</DialogTitle>
            <DialogDescription>
              This permanently marks the task as failed and frees your active
              task slot. Use it only when the handoff code and payment have not
              been confirmed.
            </DialogDescription>
          </DialogHeader>
          <Alert className="border-red-200 bg-red-50 text-red-950">
            <ShieldAlert className="mb-2 h-5 w-5" />
            This action cannot be undone in the current milestone. Either
            participant may open a dispute afterward.
          </Alert>
          <form className="space-y-4" onSubmit={reportFailure}>
            <div>
              <label
                htmlFor="failureReason"
                className="text-sm font-semibold text-slate-900"
              >
                Reason
              </label>
              <select
                id="failureReason"
                value={failureReason}
                className="mt-2 flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
                onChange={(event) => setFailureReason(event.target.value)}
              >
                <option value="">Choose a reason</option>
                {Object.entries(FAILURE_REASON_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="failureDescription"
                className="text-sm font-semibold text-slate-900"
              >
                What happened?
              </label>
              <Textarea
                id="failureDescription"
                className="mt-2"
                maxLength={1000}
                value={failureDescription}
                placeholder="Record the attempts made and what prevented the handoff."
                onChange={(event) => setFailureDescription(event.target.value)}
              />
            </div>
            {panelError && <Alert variant="destructive">{panelError}</Alert>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Keep task active
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={busyAction === "failure"}
              >
                {busyAction === "failure" && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Mark delivery failed
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={acknowledgeDialogOpen}
        onOpenChange={(open) => {
          setAcknowledgeDialogOpen(open);
          if (!open) {
            setAcknowledgmentNote("");
            setPanelError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledge the failed handoff</DialogTitle>
            <DialogDescription>
              This records that you reviewed the Runner's report. It does not
              mean you agree with it and does not close a dispute.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label
              htmlFor="acknowledgmentNote"
              className="text-sm font-semibold text-slate-900"
            >
              Note{" "}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <Textarea
              id="acknowledgmentNote"
              className="mt-2"
              maxLength={500}
              value={acknowledgmentNote}
              onChange={(event) => setAcknowledgmentNote(event.target.value)}
            />
          </div>
          {panelError && <Alert variant="destructive">{panelError}</Alert>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={busyAction === "acknowledge"}
              onClick={acknowledgeFailure}
            >
              {busyAction === "acknowledge" && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={disputeDialogOpen}
        onOpenChange={(open) => {
          setDisputeDialogOpen(open);
          if (!open) setPanelError("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a dispute</DialogTitle>
            <DialogDescription>
              Completion will pause until you withdraw the dispute or an Admin
              resolves it. Provide factual details only.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={openDisputeCase}>
            <div>
              <label
                htmlFor="disputeCategory"
                className="text-sm font-semibold text-slate-900"
              >
                Category
              </label>
              <select
                id="disputeCategory"
                value={disputeCategory}
                className="mt-2 flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
                onChange={(event) => setDisputeCategory(event.target.value)}
              >
                <option value="">Choose a category</option>
                {Object.entries(DISPUTE_CATEGORY_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label
                htmlFor="disputeDescription"
                className="text-sm font-semibold text-slate-900"
              >
                Describe the issue
              </label>
              <Textarea
                id="disputeDescription"
                className="mt-2"
                maxLength={1500}
                value={disputeDescription}
                placeholder="Explain what happened and what records support your report."
                onChange={(event) => setDisputeDescription(event.target.value)}
              />
            </div>
            {panelError && <Alert variant="destructive">{panelError}</Alert>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={busyAction === "dispute"}>
                {busyAction === "dispute" && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Open dispute
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
