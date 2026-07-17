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
import { REQUEST_STATUSES } from "@/lib/requestConstants";
import { devLog } from "@/lib/errors";
import { getFriendlyRequestError } from "@/lib/requestUtils";
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

export function RequestorRequestActions({ request, onChanged }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirming, setConfirming] = useState(false);
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
    const { error } = await confirmRequestCompletion(request.id);
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
    if (!open) setActionError("");
  }

  if (request.status === REQUEST_STATUSES.AWAITING_CONFIRMATION) {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The Runner submitted this task as completed. Confirm only after you
          have reviewed the result.
        </p>
        <Button className="mt-5 w-full" onClick={() => setConfirmOpen(true)}>
          <CheckCircle2 className="h-4 w-4" />
          Confirm Completion
        </Button>
        <Dialog open={confirmOpen} onOpenChange={changeConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm task completion?</DialogTitle>
              <DialogDescription>
                Confirm only after receiving the item or service, reviewing
                applicable receipts, and settling the agreed amount directly
                with the Runner in person. This permanently marks the request
                as completed and notifies the Runner.
              </DialogDescription>
            </DialogHeader>
            <InPersonPaymentNotice compact />
            {actionError && <Alert variant="destructive">{actionError}</Alert>}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={confirming}>
                  Review again
                </Button>
              </DialogClose>
              <Button onClick={onConfirmCompletion} disabled={confirming}>
                {confirming && <LoaderCircle className="h-4 w-4 animate-spin" />}
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
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Cancelling…" : "Cancel request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
