import {
  Check,
  Circle,
  ClipboardCheck,
  PackageCheck,
  Play,
  UserCheck,
} from "lucide-react";
import { REQUEST_STATUSES } from "@/lib/requestConstants";
import { cn } from "@/lib/utils";

const progressSteps = [
  { status: REQUEST_STATUSES.OPEN, label: "Posted", icon: Circle },
  {
    status: REQUEST_STATUSES.ACCEPTED,
    label: "Runner accepted",
    icon: UserCheck,
  },
  {
    status: REQUEST_STATUSES.IN_PROGRESS,
    label: "In progress",
    icon: Play,
  },
  {
    status: REQUEST_STATUSES.AWAITING_CONFIRMATION,
    label: "For confirmation",
    icon: ClipboardCheck,
  },
  {
    status: REQUEST_STATUSES.COMPLETED,
    label: "Completed",
    icon: PackageCheck,
  },
];

const statusIndex = Object.freeze(
  Object.fromEntries(progressSteps.map((step, index) => [step.status, index])),
);

const nextActionCopy = {
  requestor: {
    [REQUEST_STATUSES.OPEN]: {
      eyebrow: "Waiting for a Runner",
      message:
        "Your request is visible using only its general area and approximate map zone. Exact location details stay private until a Runner accepts.",
    },
    [REQUEST_STATUSES.ACCEPTED]: {
      eyebrow: "Runner's turn",
      message:
        "The Runner can now review the private location and payment arrangement, then start the task when ready.",
    },
    [REQUEST_STATUSES.IN_PROGRESS]: {
      eyebrow: "Runner is working",
      message:
        "Watch for price-change requests, receipt evidence, and handoff updates. Respond promptly if the Runner needs approval.",
    },
    [REQUEST_STATUSES.AWAITING_CONFIRMATION]: {
      eyebrow: "Your turn",
      message:
        "Review the completed errand, receipts, and direct payment record, then confirm completion or raise a concern.",
    },
    [REQUEST_STATUSES.COMPLETED]: {
      eyebrow: "Request finished",
      message:
        "The task and direct payment confirmations are complete. You can now leave transaction feedback.",
    },
    [REQUEST_STATUSES.CANCELLED]: {
      eyebrow: "Request closed",
      message:
        "This request was cancelled and no further task action is needed.",
    },
    [REQUEST_STATUSES.FAILED]: {
      eyebrow: "Review needed",
      message:
        "The handoff was reported as failed. Review the failure details and use the dispute option if the record is incorrect.",
    },
  },
  runner: {
    [REQUEST_STATUSES.OPEN]: {
      eyebrow: "Available request",
      message:
        "Review the general area, task details, fee, and payment arrangement. The exact location appears only after you accept.",
    },
    [REQUEST_STATUSES.ACCEPTED]: {
      eyebrow: "Your turn",
      message:
        "Review the private location and payment terms. Confirm any cash-advance limit, then start only when you are ready.",
    },
    [REQUEST_STATUSES.IN_PROGRESS]: {
      eyebrow: "Complete the task",
      message:
        "Finish the errand, document any approved expense, verify the handoff and direct payment, then submit for confirmation.",
    },
    [REQUEST_STATUSES.AWAITING_CONFIRMATION]: {
      eyebrow: "Waiting for the Requestor",
      message:
        "The task has been submitted. The Requestor must review the result and confirm completion.",
    },
    [REQUEST_STATUSES.COMPLETED]: {
      eyebrow: "Task finished",
      message:
        "The Requestor confirmed completion and the direct payment record is complete. You can now leave transaction feedback.",
    },
    [REQUEST_STATUSES.CANCELLED]: {
      eyebrow: "Request closed",
      message:
        "This request was cancelled and no further task action is needed.",
    },
    [REQUEST_STATUSES.FAILED]: {
      eyebrow: "Handoff failed",
      message:
        "Review the recorded failure and respond through the dispute flow if additional resolution is needed.",
    },
  },
};

function getCurrentIndex(request) {
  if (request.status === REQUEST_STATUSES.CANCELLED) {
    return request.accepted_at ? 1 : 0;
  }
  if (request.status === REQUEST_STATUSES.FAILED) return 2;
  return statusIndex[request.status] ?? 0;
}

export function RequestProgressTimeline({ request, role }) {
  const currentIndex = getCurrentIndex(request);
  const isTerminalException = [
    REQUEST_STATUSES.CANCELLED,
    REQUEST_STATUSES.FAILED,
  ].includes(request.status);
  const guidance = nextActionCopy[role]?.[request.status];

  return (
    <section
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="requestProgressHeading"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
            Request progress
          </p>
          <h2
            id="requestProgressHeading"
            className="mt-1 text-lg font-black text-slate-950"
          >
            Where this request is now
          </h2>
        </div>
        <p className="text-xs font-medium text-slate-500">
          Step {Math.min(currentIndex + 1, progressSteps.length)} of{" "}
          {progressSteps.length}
        </p>
      </div>

      <ol
        className="mt-6 grid gap-0 sm:grid-cols-5"
        aria-label="Request progress steps"
      >
        {progressSteps.map((step, index) => {
          const reached = index <= currentIndex;
          const completed =
            index < currentIndex ||
            request.status === REQUEST_STATUSES.COMPLETED;
          const active = index === currentIndex && !isTerminalException;
          const Icon = completed ? Check : step.icon;

          return (
            <li
              key={step.status}
              className="relative flex min-h-16 gap-3 pb-5 last:pb-0 sm:block sm:min-h-0 sm:pb-0 sm:text-center"
            >
              {index < progressSteps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 sm:left-1/2 sm:top-4 sm:h-0.5 sm:w-full",
                    index < currentIndex ? "bg-brand-600" : "bg-slate-200",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 bg-white sm:mx-auto",
                  completed && "border-brand-600 bg-brand-600 text-white",
                  active && "border-brand-600 text-brand-700 ring-4 ring-brand-100",
                  !reached && "border-slate-200 text-slate-400",
                  isTerminalException &&
                    index === currentIndex &&
                    "border-slate-400 text-slate-600 ring-4 ring-slate-100",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={completed ? 3 : 2} />
              </span>
              <div className="min-w-0 pt-1 sm:mt-3 sm:pt-0">
                <p
                  className={cn(
                    "text-sm font-bold",
                    reached ? "text-slate-900" : "text-slate-400",
                  )}
                >
                  {step.label}
                  {active && <span className="sr-only"> (current)</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {guidance && (
        <div
          className={cn(
            "mt-5 rounded-xl border p-4",
            isTerminalException
              ? request.status === REQUEST_STATUSES.FAILED
                ? "border-red-200 bg-red-50"
                : "border-slate-200 bg-slate-50"
              : "border-brand-200 bg-brand-50",
          )}
          aria-live="polite"
        >
          <p className="text-sm font-black text-slate-950">
            {guidance.eyebrow}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {guidance.message}
          </p>
        </div>
      )}
    </section>
  );
}
