import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cancelRequestSchema } from "@/validation/requestSchema";
import {
  cancelRequestBeforeStart,
  confirmRequestCompletion,
} from "@/services/requestService";
import { PAYMENT_ARRANGEMENTS, REQUEST_STATUSES } from "@/lib/requestConstants";
import { devLog } from "@/lib/errors";
import { formatCurrency, getFriendlyRequestError } from "@/lib/requestUtils";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InPersonPaymentNotice } from "@/components/requests/InPersonPaymentNotice";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function RequestorRequestActions({
  request,
  onChanged,
  receipts = [],
  settlement = null,
  disputes = [],
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [receiptsReviewed, setReceiptsReviewed] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(cancelRequestSchema),
    defaultValues: { reason: "" },
  });

  async function onCancel({ reason }) {
    setActionError("");
    const { error } = await cancelRequestBeforeStart(request.id, reason);
    if (error) {
      devLog("Request cancellation failed", error);
      setActionError(getFriendlyRequestError(error, "cancel your request"));
      return;
    }
    toast.success(
      request.status === REQUEST_STATUSES.ACCEPTED
        ? "Request cancelled. The assigned Runner has been notified."
        : "Your request has been cancelled.",
    );
    setCancelOpen(false);
    reset();
    await onChanged();
  }

  async function onConfirmCompletion() {
    setConfirming(true);
    setActionError("");
    const { error } = await confirmRequestCompletion(
      request.id,
      receiptsReviewed,
      paymentConfirmed,
    );
    setConfirming(false);
    if (error) {
      devLog("Completion confirmation failed", error);
      setActionError(
        getFriendlyRequestError(error, "confirm completion of this request"),
      );
      return;
    }
    toast.success("Task completion confirmed. The Runner has been notified.");
    setConfirmOpen(false);
    await onChanged();
  }

  function changeCancelDialog(open) {
    setCancelOpen(open);
    if (!open) {
      setActionError("");
      reset();
    }
  }

  function changeConfirmDialog(open) {
    setConfirmOpen(open);
    if (!open) {
      setActionError("");
      setReceiptsReviewed(false);
      setPaymentConfirmed(false);
    }
  }

  const requiresReceiptReview =
    [
      PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID,
      PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE,
    ].includes(request.payment_terms?.arrangement) &&
    request.payment_terms?.receipt_evidence_required !== false;
  const hasOpenDispute = disputes.some((dispute) => dispute.status === "OPEN");

  if (request.status === REQUEST_STATUSES.AWAITING_CONFIRMATION) {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The Runner submitted this task as completed. Confirm only after you
          have reviewed the result.
        </p>
        {hasOpenDispute && (
          <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-950">
            Completion is paused until the open dispute is withdrawn or
            resolved.
          </Alert>
        )}
        <Button
          className="mt-5 w-full"
          disabled={hasOpenDispute}
          onClick={() => setConfirmOpen(true)}
        >
          <CheckCircle2 className="h-4 w-4" />
          Confirm Completion
        </Button>

        <Dialog open={confirmOpen} onOpenChange={changeConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm task completion?</DialogTitle>
              <DialogDescription>
                Confirm only after receiving the item or service, reviewing
                applicable receipts, and verifying that the selected payer
                settled the agreed amount directly with the Runner. This
                permanently marks the request as completed and notifies the
                Runner.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {requiresReceiptReview && (
                <>
                  <Alert className="border-sky-200 bg-sky-50 text-sky-950">
                    The Runner uploaded {receipts.length} private receipt
                    {receipts.length === 1 ? "" : "s"}. Open and compare the
                    receipt total before confirming.
                  </Alert>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-700">
                    <input
                      type="checkbox"
                      checked={receiptsReviewed}
                      onChange={(event) =>
                        setReceiptsReviewed(event.target.checked)
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                    />
                    <span>
                      I reviewed the uploaded receipt evidence and its purchase
                      amount.
                    </span>
                  </label>
                </>
              )}
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
                The Runner confirmed receiving{" "}
                <strong>{formatCurrency(settlement?.expected_amount)}</strong>{" "}
                directly from the selected payer.
              </Alert>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-700">
                <input
                  type="checkbox"
                  checked={paymentConfirmed}
                  onChange={(event) =>
                    setPaymentConfirmed(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                />
                <span>
                  I confirm that the selected payer settled the documented
                  amount directly with the Runner.
                </span>
              </label>
              <InPersonPaymentNotice compact />
              {actionError && (
                <Alert variant="destructive">{actionError}</Alert>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={confirming}>
                  Review again
                </Button>
              </DialogClose>
              <Button
                onClick={onConfirmCompletion}
                disabled={
                  confirming ||
                  !paymentConfirmed ||
                  (requiresReceiptReview && !receiptsReviewed)
                }
              >
                {confirming && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {confirming ? "Confirming…" : "Confirm completion"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const canCancelBeforeStart = [
    REQUEST_STATUSES.OPEN,
    REQUEST_STATUSES.ACCEPTED,
  ].includes(request.status);

  if (!canCancelBeforeStart) {
    const message =
      request.status === REQUEST_STATUSES.COMPLETED
        ? "This request has been completed."
        : request.status === REQUEST_STATUSES.FAILED
          ? "The Runner reported that the handoff failed. Review the failure and dispute records above."
          : "The assigned Runner is handling this request. Its details can no longer be edited or cancelled.";
    return <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>;
  }

  const hasAssignedRunner = request.status === REQUEST_STATUSES.ACCEPTED;

  return (
    <>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {hasAssignedRunner
          ? "The Runner has not started yet. You may still cancel, but the task cannot be reopened afterward."
          : "You can change details or cancel while the request is still open."}
      </p>
      <div className="mt-5 grid gap-3">
        {!hasAssignedRunner && (
          <Button variant="outline" asChild>
            <Link to={`/requestor/requests/${request.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit request
            </Link>
          </Button>
        )}
        <Button variant="destructive" onClick={() => setCancelOpen(true)}>
          <Trash2 className="h-4 w-4" />
          {hasAssignedRunner ? "Cancel before start" : "Cancel request"}
        </Button>
      </div>
      <Dialog open={cancelOpen} onOpenChange={changeCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasAssignedRunner
                ? "Cancel before the Runner starts?"
                : "Cancel this request?"}
            </DialogTitle>
            <DialogDescription>
              {hasAssignedRunner
                ? "This permanently closes the request, removes the Runner assignment, revokes their private location access, and notifies them."
                : "This action closes the request and removes it from the Runner marketplace. It cannot be reopened."}
            </DialogDescription>
          </DialogHeader>
          {actionError && <Alert variant="destructive">{actionError}</Alert>}
          <form onSubmit={handleSubmit(onCancel)}>
            <FormField
              id="cancelReason"
              label="Reason for cancellation"
              error={errors.reason?.message}
            >
              <Textarea
                id="cancelReason"
                placeholder="Briefly explain why this request is being cancelled."
                maxLength={500}
                {...register("reason")}
              />
            </FormField>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Keep request
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Cancelling…" : "Cancel request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
