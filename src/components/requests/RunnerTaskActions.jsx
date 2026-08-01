import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  HandCoins,
  LoaderCircle,
  LogOut,
  Play,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  confirmRequestCashAdvance,
  releaseAcceptedRequest,
  startRequest,
  submitRequestCompletion,
} from "@/services/requestService";
import { releaseTaskSchema } from "@/validation/requestSchema";
import {
  PAYMENT_ARRANGEMENTS,
  PRICE_CHANGE_STATUSES,
  REQUEST_STATUSES,
} from "@/lib/requestConstants";
import { devLog } from "@/lib/errors";
import { formatCurrency, getFriendlyRequestError } from "@/lib/requestUtils";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

const actionConfig = {
  [REQUEST_STATUSES.ACCEPTED]: {
    label: "Start Task",
    busyLabel: "Starting…",
    title: "Start working on this task?",
    description:
      "The Requestor will be notified that work is now in progress. Start only when you are ready to perform the errand.",
    success: "Task started. The Requestor has been notified.",
    action: startRequest,
    icon: Play,
  },
  [REQUEST_STATUSES.IN_PROGRESS]: {
    label: "Submit for Confirmation",
    busyLabel: "Submitting…",
    title: "Submit this task as completed?",
    description:
      "Submit after arriving at the meetup or delivery location and presenting the completed errand and applicable receipts. The Requestor will review the result and verify that the selected payer settled directly with you in person.",
    success: "Completion submitted. Waiting for the Requestor’s confirmation.",
    action: submitRequestCompletion,
    icon: CheckCircle2,
  },
};

function ReleaseTaskAction({ request }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [releaseError, setReleaseError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(releaseTaskSchema),
    defaultValues: { reason: "" },
  });

  function changeDialog(openState) {
    setOpen(openState);
    if (!openState) {
      setReleaseError("");
      reset();
    }
  }

  async function onRelease({ reason }) {
    setReleaseError("");
    const { error } = await releaseAcceptedRequest(request.id, reason);
    if (error) {
      devLog("Runner task release failed", error);
      setReleaseError(getFriendlyRequestError(error, "release this task"));
      return;
    }

    toast.success("Task released. The Requestor has been notified.");
    setOpen(false);
    navigate("/runner/requests", { replace: true });
  }

  return (
    <>
      <Button
        variant="outline"
        className="mt-3 w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
        onClick={() => setOpen(true)}
      >
        <LogOut className="h-4 w-4" />
        Release task
      </Button>
      <Dialog open={open} onOpenChange={changeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release this task?</DialogTitle>
            <DialogDescription>
              Use this only before starting work. The request will return to the
              marketplace, your assignment and private location access will be
              removed, and the Requestor will be notified.
            </DialogDescription>
          </DialogHeader>
          {releaseError && <Alert variant="destructive">{releaseError}</Alert>}
          <form onSubmit={handleSubmit(onRelease)} noValidate>
            <FormField
              id="releaseReason"
              label="Reason for releasing the task"
              error={errors.reason?.message}
            >
              <Textarea
                id="releaseReason"
                placeholder="Briefly explain why you cannot continue with this task."
                maxLength={500}
                {...register("reason")}
              />
            </FormField>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Keep task
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
                {isSubmitting ? "Releasing…" : "Release task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RunnerTaskActions({
  request,
  onChanged,
  hasLocation = true,
  priceChanges = [],
  receipts = [],
  handoff = null,
  settlement = null,
  disputes = [],
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cashAdvanceDialogOpen, setCashAdvanceDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmingAdvance, setConfirmingAdvance] = useState(false);
  const [actionError, setActionError] = useState("");
  const config = actionConfig[request.status];
  const needsCashAdvanceConsent =
    request.status === REQUEST_STATUSES.ACCEPTED &&
    request.payment_terms?.arrangement ===
      PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE &&
    !request.payment_terms.runner_consented_at;
  const pendingPriceChange = priceChanges.some(
    (change) => change.status === PRICE_CHANGE_STATUSES.PENDING,
  );
  const needsRevisedCashAdvanceConsent =
    request.status === REQUEST_STATUSES.IN_PROGRESS &&
    request.payment_terms?.arrangement ===
      PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE &&
    request.payment_terms.runner_consented_amount !==
      request.payment_terms.maximum_advance;
  const requiresReceipt = [
    PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID,
    PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE,
  ].includes(request.payment_terms?.arrangement);
  const missingReceipt =
    request.status === REQUEST_STATUSES.IN_PROGRESS &&
    requiresReceipt &&
    request.payment_terms?.receipt_evidence_required !== false &&
    receipts.length === 0;
  const handoffNotVerified =
    request.status === REQUEST_STATUSES.IN_PROGRESS && !handoff?.verified_at;
  const paymentNotConfirmed =
    request.status === REQUEST_STATUSES.IN_PROGRESS &&
    (!settlement?.runner_confirmed_at ||
      settlement.runner_received_amount !== settlement.expected_amount);
  const hasOpenDispute = disputes.some((dispute) => dispute.status === "OPEN");
  const cannotStart =
    request.status === REQUEST_STATUSES.ACCEPTED &&
    (!hasLocation || needsCashAdvanceConsent);
  const cannotSubmit =
    request.status === REQUEST_STATUSES.IN_PROGRESS &&
    (pendingPriceChange ||
      needsRevisedCashAdvanceConsent ||
      missingReceipt ||
      handoffNotVerified ||
      paymentNotConfirmed ||
      hasOpenDispute);
  const cannotProceed = cannotStart || cannotSubmit;

  async function confirmCashAdvance() {
    setConfirmingAdvance(true);
    setActionError("");
    const { error } = await confirmRequestCashAdvance(request.id);
    setConfirmingAdvance(false);
    if (error) {
      devLog("Runner cash advance consent failed", error);
      setActionError(
        getFriendlyRequestError(error, "confirm this cash advance"),
      );
      return;
    }
    toast.success("Cash advance consent recorded.");
    setCashAdvanceDialogOpen(false);
    await onChanged();
  }

  async function handleAction() {
    setProcessing(true);
    setActionError("");
    const { error } = await config.action(request.id);
    setProcessing(false);

    if (error) {
      devLog("Runner task status update failed", error);
      setActionError(getFriendlyRequestError(error, "update this task"));
      return;
    }

    toast.success(config.success);
    setDialogOpen(false);
    await onChanged();
  }

  if (request.status === REQUEST_STATUSES.AWAITING_CONFIRMATION) {
    return (
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Completion has been submitted. The Requestor must confirm it before this
        task is marked completed.
      </p>
    );
  }

  if (request.status === REQUEST_STATUSES.COMPLETED) {
    return (
      <p className="mt-2 text-sm leading-6 text-slate-600">
        The Requestor confirmed this task as completed.
      </p>
    );
  }

  if (request.status === REQUEST_STATUSES.FAILED) {
    return (
      <p className="mt-2 text-sm leading-6 text-slate-600">
        This task ended with a failed handoff report. Review the report or
        dispute history for the next step.
      </p>
    );
  }

  if (!config) {
    return (
      <p className="mt-2 text-sm leading-6 text-slate-600">
        No Runner action is available for this request.
      </p>
    );
  }

  const Icon = config.icon;

  return (
    <>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {cannotStart
          ? needsCashAdvanceConsent
            ? "Confirm the maximum cash advance before starting this task."
            : "The Requestor must add complete private location details before you can start this task. You may release it if you cannot wait."
          : cannotSubmit
            ? pendingPriceChange
              ? "Wait for the Requestor to decide the price change, or withdraw it, before submitting."
              : needsRevisedCashAdvanceConsent
                ? "Confirm the approved cash-advance limit before submitting."
                : missingReceipt
                  ? "Upload at least one private purchase receipt before submitting."
                  : handoffNotVerified
                    ? "Verify the Requestor's six-digit handoff code before submitting."
                    : paymentNotConfirmed
                      ? "Confirm that you received the documented direct payment before submitting."
                      : "An open dispute must be withdrawn or resolved before submitting."
            : request.status === REQUEST_STATUSES.ACCEPTED
              ? "Start the task when you are ready to begin the errand."
              : "Submit the task when the requested errand has been completed."}
      </p>
      {needsCashAdvanceConsent && (
        <Button
          variant="outline"
          className="mt-4 w-full border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          onClick={() => setCashAdvanceDialogOpen(true)}
        >
          <HandCoins className="h-4 w-4" />
          Review cash advance
        </Button>
      )}
      <Button
        className="mt-5 w-full"
        disabled={cannotProceed}
        title={
          cannotProceed
            ? needsCashAdvanceConsent
              ? "Cash advance consent is required."
              : !hasLocation
                ? "Complete private location details are required."
                : pendingPriceChange
                  ? "The price-change request is still pending."
                  : needsRevisedCashAdvanceConsent
                    ? "The revised cash-advance limit needs your consent."
                    : missingReceipt
                      ? "A purchase receipt is required."
                      : handoffNotVerified
                        ? "Handoff verification is required."
                        : paymentNotConfirmed
                          ? "Direct payment confirmation is required."
                          : "An open dispute is blocking completion."
            : undefined
        }
        onClick={() => setDialogOpen(true)}
      >
        <Icon className="h-4 w-4" />
        {config.label}
      </Button>
      {request.status === REQUEST_STATUSES.ACCEPTED && (
        <ReleaseTaskAction request={request} />
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setActionError("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config.title}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>
          {request.status === REQUEST_STATUSES.IN_PROGRESS && (
            <InPersonPaymentNotice compact />
          )}
          {actionError && <Alert variant="destructive">{actionError}</Alert>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={processing}>
                Not yet
              </Button>
            </DialogClose>
            <Button onClick={handleAction} disabled={processing}>
              {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {processing ? config.busyLabel : config.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cashAdvanceDialogOpen}
        onOpenChange={(open) => {
          setCashAdvanceDialogOpen(open);
          if (!open) setActionError("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your cash advance limit</DialogTitle>
            <DialogDescription>
              Confirm only if you voluntarily agree to use your own money for
              this task.
            </DialogDescription>
          </DialogHeader>
          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            You agree to advance up to{" "}
            <strong>
              {formatCurrency(request.payment_terms?.maximum_advance)}
            </strong>
            . ButuanGo records this consent but does not hold or guarantee the
            reimbursement.
          </Alert>
          {actionError && <Alert variant="destructive">{actionError}</Alert>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={confirmingAdvance}>
                Not yet
              </Button>
            </DialogClose>
            <Button onClick={confirmCashAdvance} disabled={confirmingAdvance}>
              {confirmingAdvance && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              {confirmingAdvance ? "Confirming…" : "I agree to this limit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
