import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  CircleCheckBig,
  ClipboardCheck,
  Inbox,
  Play,
  UserCheck,
} from "lucide-react";
import { DashboardPage } from "@/components/common/DashboardPage";
import {
  getRequestorNextActions,
  getRequestorSummary,
} from "@/services/requestService";
import { REQUEST_STATUSES } from "@/lib/requestConstants";
import { formatCurrency } from "@/lib/requestUtils";
import { devLog } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";

const actionDescriptions = {
  [REQUEST_STATUSES.AWAITING_CONFIRMATION]:
    "Review the Runner’s submitted completion and confirm when satisfied.",
  [REQUEST_STATUSES.IN_PROGRESS]:
    "Your assigned Runner is currently working on this request.",
  [REQUEST_STATUSES.ACCEPTED]:
    "A Runner accepted this request and is preparing to start.",
  [REQUEST_STATUSES.OPEN]: "Waiting for a local Runner to accept this request.",
};

function toNextAction(request) {
  return {
    id: request.id,
    title: request.title,
    status: request.status,
    updatedAt: request.updated_at,
    description: actionDescriptions[request.status],
    to: `/requestor/requests/${request.id}`,
    linkLabel:
      request.status === REQUEST_STATUSES.AWAITING_CONFIRMATION
        ? "Review request"
        : "Open request",
  };
}

export function RequestorDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(false);
  const [nextActions, setNextActions] = useState([]);
  const [nextActionsLoading, setNextActionsLoading] = useState(true);
  const [nextActionsError, setNextActionsError] = useState("");

  const applyResults = useCallback(([summaryResult, actionsResult]) => {
    if (summaryResult.error) {
      devLog("Request summary retrieval failed", summaryResult.error);
      setSummaryError(true);
    } else {
      setSummary(summaryResult.data);
      setSummaryError(false);
    }

    if (actionsResult.error) {
      devLog("Requestor next actions retrieval failed", actionsResult.error);
      setNextActionsError(
        "We could not load your priority requests. Check your connection and try again.",
      );
    } else {
      setNextActions((actionsResult.data || []).map(toNextAction));
    }
    setNextActionsLoading(false);
  }, []);

  const loadDashboard = useCallback(async () => {
    setNextActionsLoading(true);
    setNextActionsError("");
    setSummaryError(false);
    const results = await Promise.all([
      getRequestorSummary(user.id),
      getRequestorNextActions(user.id),
    ]);
    applyResults(results);
  }, [applyResults, user.id]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getRequestorSummary(user.id),
      getRequestorNextActions(user.id),
    ]).then((results) => {
      if (active) applyResults(results);
    });
    return () => {
      active = false;
    };
  }, [applyResults, user.id]);

  const statsLoading = !summary && !summaryError;
  const unavailableHelper = summaryError ? "Unavailable right now" : null;
  const currentMonth = new Intl.DateTimeFormat("en-PH", {
    month: "long",
  }).format(new Date());

  return (
    <DashboardPage
      title="Manage the errands you need help with."
      stats={[
        {
          label: "Open Requests",
          value: summary?.open ?? "—",
          helper: unavailableHelper || "Waiting for a local Runner",
          icon: Inbox,
          tone: "blue",
          to: "/requestor/requests?filter=open",
          loading: statsLoading,
        },
        {
          label: "Accepted",
          value: summary?.accepted ?? "—",
          helper: unavailableHelper || "Runner assigned, not started",
          icon: UserCheck,
          tone: "brand",
          to: "/requestor/requests?filter=accepted",
          loading: statsLoading,
        },
        {
          label: "In Progress",
          value: summary?.inProgress ?? "—",
          helper: unavailableHelper || "Currently being completed",
          icon: Play,
          tone: "amber",
          to: "/requestor/requests?filter=in-progress",
          loading: statsLoading,
        },
        {
          label: "Needs Confirmation",
          value: summary?.awaitingConfirmation ?? "—",
          helper: unavailableHelper || "Waiting for your review",
          icon: ClipboardCheck,
          tone: "violet",
          to: "/requestor/requests?filter=awaiting-confirmation",
          loading: statsLoading,
        },
        {
          label: "Due Soon",
          value: summary?.dueSoon ?? "—",
          helper: unavailableHelper || "Due within the next 48 hours",
          icon: CalendarClock,
          tone: "red",
          to: "/requestor/requests?filter=due-soon",
          loading: statsLoading,
        },
        {
          label: "Completed This Month",
          value: summary?.completedThisMonth ?? "—",
          helper: unavailableHelper || `Completed in ${currentMonth}`,
          icon: CircleCheckBig,
          tone: "emerald",
          to: "/requestor/requests?filter=completed-this-month",
          loading: statsLoading,
        },
      ]}
      paymentSummary={{
        title: "Estimated In-Person Payment",
        description:
          "Planned amounts across your open and active requests. ButuanGo does not process these payments.",
        loading: statsLoading,
        items: [
          {
            label: "Purchase budgets",
            value: summary
              ? formatCurrency(summary.plannedExpenseBudget)
              : "—",
            helper: "Estimated errand expenses",
          },
          {
            label: "Runner fees",
            value: summary ? formatCurrency(summary.plannedServiceFees) : "—",
            helper: "Agreed service fees",
          },
          {
            label: "Estimated total",
            value: summary ? formatCurrency(summary.plannedTotal) : "—",
            helper: "Potential amount to prepare",
            highlight: true,
          },
        ],
        note: summaryError
          ? "Payment estimates are unavailable right now. Reload the dashboard to try again."
          : "Estimates are based on request budgets and agreed fees, not confirmed payments. Actual payment happens in person after meeting the Runner.",
      }}
      actionLabel="Create a Request"
      actionTo="/requestor/requests/new"
      emptyTitle="No requests need attention"
      emptyDescription="Create a lawful everyday errand when you need help from a local Runner."
      emptyBadge="Request workspace ready"
      nextActions={nextActions}
      nextActionsLoading={nextActionsLoading}
      nextActionsError={nextActionsError}
      onReloadNextActions={loadDashboard}
    />
  );
}
