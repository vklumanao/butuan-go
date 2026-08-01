import { AlertTriangle, Check, Circle, Clock3 } from "lucide-react";
import {
  PAYMENT_ARRANGEMENTS,
  PRICE_CHANGE_STATUSES,
  REQUEST_STATUSES,
} from "@/lib/requestConstants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STARTED_STATUSES = [
  REQUEST_STATUSES.IN_PROGRESS,
  REQUEST_STATUSES.AWAITING_CONFIRMATION,
  REQUEST_STATUSES.COMPLETED,
  REQUEST_STATUSES.FAILED,
];

const SUBMITTED_STATUSES = [
  REQUEST_STATUSES.AWAITING_CONFIRMATION,
  REQUEST_STATUSES.COMPLETED,
];

function amountsMatch(first, second) {
  const firstAmount = Number(first);
  const secondAmount = Number(second);
  return Number.isFinite(firstAmount) &&
    Number.isFinite(secondAmount) &&
    firstAmount === secondAmount;
}

function buildChecklist({
  request,
  hasLocation,
  priceChanges,
  receipts,
  handoff,
  settlement,
  disputes,
}) {
  const terms = request.payment_terms;
  const requiresCashAdvance =
    terms?.arrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE;
  const requiresReceipt =
    [
      PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID,
      PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE,
    ].includes(terms?.arrangement) && terms?.receipt_evidence_required !== false;
  const cashAdvanceConfirmed =
    Boolean(terms?.runner_consented_at) &&
    amountsMatch(terms?.runner_consented_amount, terms?.maximum_advance);
  const taskStarted = STARTED_STATUSES.includes(request.status);
  const completionSubmitted = SUBMITTED_STATUSES.includes(request.status);
  const locationReady = hasLocation || taskStarted;
  const cashAdvanceReady = cashAdvanceConfirmed || completionSubmitted;
  const receiptReady = receipts.length > 0 || completionSubmitted;
  const handoffReady = Boolean(handoff?.verified_at) || completionSubmitted;
  const pendingPriceChange = priceChanges.some(
    (change) => change.status === PRICE_CHANGE_STATUSES.PENDING,
  );
  const hasOpenDispute = disputes.some((dispute) => dispute.status === "OPEN");
  const directPaymentConfirmed =
    completionSubmitted ||
    (Boolean(settlement?.runner_confirmed_at) &&
      amountsMatch(
        settlement?.runner_received_amount,
        settlement?.expected_amount,
      ));

  return [
    {
      id: "location",
      label: "Private location ready",
      helper: hasLocation
        ? "Review the exact pickup and delivery details before starting."
        : taskStarted
          ? "Location requirements were validated when this task started."
          : "The Requestor must complete the private location details.",
      complete: locationReady,
      blocked: !locationReady,
      target: "#runner-private-location",
    },
    requiresCashAdvance
      ? {
          id: "cash-advance",
          label: "Cash-advance limit confirmed",
          helper: cashAdvanceReady
            ? "Your consent matches the current maximum advance."
            : "Review and voluntarily confirm the current limit before proceeding.",
          complete: cashAdvanceReady,
          target: "#runner-controls",
        }
      : null,
    {
      id: "start",
      label: "Task started",
      helper: taskStarted
        ? "The Requestor was notified that work is in progress."
        : "Start only when you are ready to perform the errand.",
      complete: taskStarted,
      target: "#runner-controls",
    },
    priceChanges.length > 0
      ? {
          id: "price-change",
          label: "Price changes resolved",
          helper: pendingPriceChange
            ? "Wait for the Requestor's decision or withdraw the pending change."
            : "There are no pending price-change decisions.",
          complete: !pendingPriceChange,
          blocked: pendingPriceChange,
          target: "#runner-payment-evidence",
        }
      : null,
    requiresReceipt
      ? {
          id: "receipt",
          label: "Receipt uploaded",
          helper:
            receipts.length > 0
              ? `${receipts.length} private receipt${receipts.length === 1 ? "" : "s"} attached.`
              : completionSubmitted
                ? "Required receipt evidence was validated before submission."
              : "Upload purchase evidence for the Requestor to review.",
          complete: receiptReady,
          target: "#runner-payment-evidence",
        }
      : null,
    {
      id: "handoff",
      label: "Handoff verified",
      helper: handoff?.verified_at
        ? "The six-digit handoff code was verified."
        : completionSubmitted
          ? "Handoff verification was validated before submission."
        : "Ask the Requestor or recipient for the handoff code at delivery.",
      complete: handoffReady,
      target: "#runner-handoff-settlement",
    },
    {
      id: "payment",
      label: "Direct payment confirmed",
      helper: directPaymentConfirmed
        ? "The agreed amount received from the selected payer is recorded."
        : "Confirm only after receiving the documented amount directly.",
      complete: directPaymentConfirmed,
      target: "#runner-handoff-settlement",
    },
    hasOpenDispute
      ? {
          id: "dispute",
          label: "Open dispute resolved",
          helper:
            "Completion is paused until the dispute is withdrawn or reviewed by an Admin.",
          complete: false,
          blocked: true,
          target: "#runner-handoff-settlement",
        }
      : null,
    {
      id: "submit",
      label: "Submitted for confirmation",
      helper: completionSubmitted
        ? "The Requestor has been asked to review the completed task."
        : "Submit after every required step above is complete.",
      complete: completionSubmitted,
      target: "#runner-controls",
    },
    {
      id: "complete",
      label: "Requestor confirmed completion",
      helper:
        request.status === REQUEST_STATUSES.COMPLETED
          ? "The request is officially completed."
          : "This final step is completed by the Requestor.",
      complete: request.status === REQUEST_STATUSES.COMPLETED,
      target: null,
    },
  ].filter(Boolean);
}

export function RunnerTaskChecklist({
  request,
  hasLocation,
  priceChanges = [],
  receipts = [],
  handoff = null,
  settlement = null,
  disputes = [],
}) {
  const steps = buildChecklist({
    request,
    hasLocation,
    priceChanges,
    receipts,
    handoff,
    settlement,
    disputes,
  });
  const completedCount = steps.filter((step) => step.complete).length;
  const isEndedEarly = request.status === REQUEST_STATUSES.FAILED;
  const nextStep = isEndedEarly
    ? null
    : steps.find((step) => !step.complete) || null;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <section
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="runnerChecklistHeading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
            Runner guide
          </p>
          <h2
            id="runnerChecklistHeading"
            className="mt-1 text-lg font-black text-slate-950"
          >
            Task checklist
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            This updates automatically from the task record. You do not need to
            check anything manually.
          </p>
        </div>
        <p className="shrink-0 text-sm font-bold text-slate-700" aria-live="polite">
          {completedCount} of {steps.length} complete
        </p>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Runner task checklist progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progress}
      >
        <span
          className="block h-full rounded-full bg-brand-600 transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {isEndedEarly && (
        <div className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-bold">Task ended before completion</p>
            <p className="mt-1 text-sm leading-6 text-red-900/80">
              The remaining steps are no longer actionable. Review the failure
              and dispute records below.
            </p>
          </div>
        </div>
      )}

      <ol className="mt-5 grid gap-3 md:grid-cols-2">
        {steps.map((step, index) => {
          const isCurrent = nextStep?.id === step.id;
          const StepIcon = step.complete
            ? Check
            : isCurrent
              ? step.blocked
                ? AlertTriangle
                : Clock3
              : Circle;

          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex gap-3 rounded-xl border p-3.5",
                step.complete && "border-emerald-200 bg-emerald-50/70",
                isCurrent &&
                  (step.blocked
                    ? "border-amber-300 bg-amber-50"
                    : "border-brand-300 bg-brand-50"),
                !step.complete && !isCurrent &&
                  "border-slate-200 bg-slate-50/70",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-white",
                  step.complete && "border-emerald-300 text-emerald-700",
                  isCurrent &&
                    (step.blocked
                      ? "border-amber-300 text-amber-700"
                      : "border-brand-300 text-brand-700"),
                  !step.complete && !isCurrent &&
                    "border-slate-200 text-slate-400",
                )}
              >
                <StepIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Step {index + 1}
                </p>
                <p className="mt-0.5 text-sm font-black text-slate-950">
                  {step.label}
                  {isCurrent && <span className="sr-only"> (next step)</span>}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {step.helper}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {nextStep && (
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Next step
            </p>
            <p className="mt-1 font-black text-slate-950">{nextStep.label}</p>
          </div>
          {nextStep.target ? (
            <Button asChild size="sm" variant="outline">
              <a href={nextStep.target}>Go to this step</a>
            </Button>
          ) : (
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <Clock3 className="h-4 w-4" />
              Waiting for Requestor
            </span>
          )}
        </div>
      )}
    </section>
  );
}
