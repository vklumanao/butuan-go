import { useCallback, useEffect, useState } from "react";
import { DashboardPage } from "@/components/common/DashboardPage";
import {
  getRunnerNextActions,
  getRunnerSummary,
} from "@/services/requestService";
import { REQUEST_STATUSES } from "@/lib/requestConstants";
import { devLog } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";

const actionDescriptions = {
  [REQUEST_STATUSES.IN_PROGRESS]:
    "Complete the errand, then submit it for Requestor confirmation.",
  [REQUEST_STATUSES.ACCEPTED]:
    "Review the private details and start when you are ready.",
  [REQUEST_STATUSES.AWAITING_CONFIRMATION]:
    "Completion was submitted and is waiting for the Requestor’s confirmation.",
  [REQUEST_STATUSES.FAILED]:
    "The handoff was reported as failed. Review its record or dispute history.",
};

function toNextAction(request) {
  const linkLabels = {
    [REQUEST_STATUSES.IN_PROGRESS]: "Continue task",
    [REQUEST_STATUSES.ACCEPTED]: "Open task",
    [REQUEST_STATUSES.AWAITING_CONFIRMATION]: "View task",
    [REQUEST_STATUSES.FAILED]: "Review failed task",
  };
  return {
    id: request.id,
    title: request.title,
    status: request.status,
    updatedAt: request.updated_at,
    description: actionDescriptions[request.status],
    to: `/runner/tasks/${request.id}`,
    linkLabel: linkLabels[request.status],
  };
}

export function RunnerDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [nextActions, setNextActions] = useState([]);
  const [nextActionsLoading, setNextActionsLoading] = useState(true);
  const [nextActionsError, setNextActionsError] = useState("");

  const applyResults = useCallback(([summaryResult, actionsResult]) => {
    if (summaryResult.error) {
      devLog("Runner summary retrieval failed", summaryResult.error);
    } else {
      setSummary(summaryResult.data);
    }

    if (actionsResult.error) {
      devLog("Runner next actions retrieval failed", actionsResult.error);
      setNextActionsError(
        "We could not load your priority tasks. Check your connection and try again.",
      );
    } else {
      setNextActions((actionsResult.data || []).map(toNextAction));
    }
    setNextActionsLoading(false);
  }, []);

  const loadDashboard = useCallback(async () => {
    setNextActionsLoading(true);
    setNextActionsError("");
    const results = await Promise.all([
      getRunnerSummary(user.id),
      getRunnerNextActions(user.id),
    ]);
    applyResults(results);
  }, [applyResults, user.id]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getRunnerSummary(user.id),
      getRunnerNextActions(user.id),
    ]).then((results) => {
      if (active) applyResults(results);
    });
    return () => {
      active = false;
    };
  }, [applyResults, user.id]);

  const executionActiveTask = nextActions.find((task) =>
    [REQUEST_STATUSES.ACCEPTED, REQUEST_STATUSES.IN_PROGRESS].includes(
      task.status,
    ),
  );

  return (
    <DashboardPage
      title="Your place to find and manage local tasks."
      stats={[
        { label: "Available Requests", value: summary?.available ?? "—" },
        { label: "Accepted Tasks", value: summary?.accepted ?? "—" },
        { label: "In Progress", value: summary?.inProgress ?? "—" },
        { label: "Completed Tasks", value: summary?.completed ?? "—" },
      ]}
      actionLabel="Browse Available Requests"
      actionTo="/runner/requests"
      emptyTitle="No tasks need attention"
      emptyDescription="Browse available requests and accept an errand you are prepared to complete."
      emptyBadge="Runner workspace ready"
      nextActions={nextActions}
      nextActionsLoading={nextActionsLoading}
      nextActionsError={nextActionsError}
      onReloadNextActions={loadDashboard}
      workspaceNotice={
        executionActiveTask
          ? {
              title: "Active task limit reached",
              description:
                "Finish or submit your current task before accepting another request. You may continue browsing available requests.",
              to: executionActiveTask.to,
              linkLabel: "Open active task",
            }
          : null
      }
    />
  );
}
