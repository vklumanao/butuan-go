import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MessageSquareText,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  listAdminUserFeedback,
  updateAdminUserFeedback,
} from "@/services/adminService";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
} from "@/lib/feedbackConstants";
import { ROLE_LABELS } from "@/lib/constants";
import { devLog } from "@/lib/errors";
import { formatDateTime } from "@/lib/requestUtils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/AdminState";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PAGE_SIZE = 20;
const statusFilters = ["ALL", ...Object.values(FEEDBACK_STATUSES)];
const categoryFilters = ["ALL", ...Object.values(FEEDBACK_CATEGORIES)];
const reviewStatuses = [
  FEEDBACK_STATUSES.REVIEWED,
  FEEDBACK_STATUSES.PLANNED,
  FEEDBACK_STATUSES.RESOLVED,
  FEEDBACK_STATUSES.DISMISSED,
];

function statusClass(status) {
  if (status === FEEDBACK_STATUSES.NEW) return "bg-amber-100 text-amber-900";
  if (status === FEEDBACK_STATUSES.PLANNED) return "bg-sky-100 text-sky-900";
  if (status === FEEDBACK_STATUSES.RESOLVED) {
    return "bg-emerald-100 text-emerald-900";
  }
  if (status === FEEDBACK_STATUSES.DISMISSED) {
    return "bg-slate-200 text-slate-700";
  }
  return "bg-violet-100 text-violet-900";
}

function categoryLabel(category) {
  return FEEDBACK_CATEGORY_LABELS[category] || category;
}

export function AdminFeedbackPage() {
  const [status, setStatus] = useState(FEEDBACK_STATUSES.NEW);
  const [category, setCategory] = useState("ALL");
  const [page, setPage] = useState(0);
  const [feedback, setFeedback] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [outcome, setOutcome] = useState(FEEDBACK_STATUSES.REVIEWED);
  const [adminNote, setAdminNote] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: feedbackError } = await listAdminUserFeedback({
      status,
      category,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });
    if (feedbackError) {
      devLog("Admin product feedback retrieval failed", feedbackError);
      setError("We could not load the protected product-feedback inbox.");
      setFeedback([]);
      setTotalCount(0);
    } else {
      const rows = data || [];
      if (rows.length === 0 && page > 0) {
        setPage((current) => current - 1);
        setLoading(false);
        return;
      }
      setFeedback(rows);
      setTotalCount(Number(rows[0]?.total_count) || 0);
    }
    setLoading(false);
  }, [category, page, status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadFeedback, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadFeedback]);

  function chooseStatus(nextStatus) {
    setStatus(nextStatus);
    setPage(0);
  }

  function chooseCategory(nextCategory) {
    setCategory(nextCategory);
    setPage(0);
  }

  function openReview(item) {
    setSelected(item);
    setOutcome(
      item.status === FEEDBACK_STATUSES.NEW
        ? FEEDBACK_STATUSES.REVIEWED
        : item.status,
    );
    setAdminNote(item.admin_note || "");
    setReviewError("");
  }

  function changeDialog(open) {
    if (!open && !saving) setSelected(null);
  }

  async function saveReview() {
    const cleanNote = adminNote.trim();
    setReviewError("");
    if (cleanNote.length < 5) {
      setReviewError("Enter an internal review note with at least 5 characters.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await updateAdminUserFeedback({
      feedbackId: selected.id,
      status: outcome,
      adminNote: cleanNote,
    });
    setSaving(false);

    if (updateError) {
      devLog("Admin product feedback update failed", updateError);
      setReviewError(
        updateError.message || "The feedback review could not be saved.",
      );
      return;
    }

    setSelected(null);
    toast.success("Feedback status and internal note saved.");
    loadFeedback();
  }

  const firstRecord = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastRecord = Math.min((page + 1) * PAGE_SIZE, totalCount);
  const hasPreviousPage = page > 0;
  const hasNextPage = lastRecord < totalCount;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <AdminPageHeader
        title="Product feedback"
        description="Review bugs, suggestions, and confusing experiences submitted from inside ButuanGo. Page context is included only when the user chooses to share it."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={category}
              onChange={(event) => chooseCategory(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-600"
              aria-label="Filter feedback category"
            >
              {categoryFilters.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL" ? "All categories" : categoryLabel(item)}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => chooseStatus(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-600"
              aria-label="Filter feedback status"
            >
              {statusFilters.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL"
                    ? "All statuses"
                    : FEEDBACK_STATUS_LABELS[item] || item}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <Alert className="mt-6 border-sky-200 bg-sky-50 text-sky-950">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="leading-6">
            Feedback may describe a frustrating experience. Treat it as product
            input, keep internal notes factual, and do not use it as an account
            violation report.
          </p>
        </div>
      </Alert>

      <div className="mt-6">
        {loading && <AdminLoadingState message="Loading product feedback..." />}
        {!loading && error && (
          <AdminErrorState message={error} onRetry={loadFeedback} />
        )}
        {!loading && !error && feedback.length === 0 && (
          <AdminEmptyState
            title="No matching feedback"
            description="There are no product-feedback entries for the selected filters."
          />
        )}
        {!loading && !error && feedback.length > 0 && (
          <div className="space-y-4">
            {feedback.map((item) => (
              <Card
                key={item.id}
                className={
                  item.status === FEEDBACK_STATUSES.NEW
                    ? "border-amber-200"
                    : ""
                }
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusClass(item.status)}>
                          {FEEDBACK_STATUS_LABELS[item.status] || item.status}
                        </Badge>
                        <Badge>{categoryLabel(item.category)}</Badge>
                        <Badge className="bg-slate-100 text-slate-700">
                          {ROLE_LABELS[item.workspace_role] ||
                            item.workspace_role}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(item.created_at, "")}
                        </span>
                      </div>
                      <p className="mt-4 max-w-4xl whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
                        {item.message}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => openReview(item)}>
                      <MessageSquareText className="h-4 w-4" />
                      {item.status === FEEDBACK_STATUSES.NEW
                        ? "Review"
                        : "Update"}
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-3 border-t border-slate-200 pt-4 text-sm lg:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Submitted by
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {item.submitter_name}
                      </p>
                      <p className="mt-1 break-all text-slate-600">
                        {item.submitter_email}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Shared page context
                      </p>
                      {item.page_path ? (
                        <>
                          <p className="mt-1 font-bold text-slate-900">
                            {item.page_title || "Untitled page"}
                          </p>
                          <p className="mt-1 break-all font-mono text-xs text-slate-600">
                            {item.page_path}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-slate-600">
                          The user did not include page context.
                        </p>
                      )}
                    </div>
                  </div>

                  {item.admin_note && (
                    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
                      <p className="font-bold">Internal Admin note</p>
                      <p className="mt-1 whitespace-pre-wrap leading-6">
                        {item.admin_note}
                      </p>
                      <p className="mt-2 text-xs text-violet-800">
                        {item.reviewer_name || "Admin"} -{" "}
                        {formatDateTime(item.reviewed_at, "")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {!loading && !error && totalCount > 0 && (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Showing {firstRecord}-{lastRecord} of {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPreviousPage}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNextPage}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={changeDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Review product feedback</DialogTitle>
            <DialogDescription>
              Choose an internal status and record a factual note. The change
              will be included in the Admin audit log.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-bold text-slate-950">
                  {categoryLabel(selected.category)}
                </p>
                <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">
                  {selected.message}
                </p>
              </div>

              {reviewError && (
                <Alert variant="destructive">{reviewError}</Alert>
              )}

              <div>
                <Label htmlFor="feedbackOutcome">Internal status</Label>
                <select
                  id="feedbackOutcome"
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  {reviewStatuses.map((item) => (
                    <option key={item} value={item}>
                      {FEEDBACK_STATUS_LABELS[item]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="feedbackAdminNote">Internal Admin note</Label>
                <Textarea
                  id="feedbackAdminNote"
                  className="mt-2 min-h-32"
                  maxLength={1500}
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  placeholder="Record what was reviewed and the reason for this status."
                />
                <p className="mt-1 text-right text-xs text-slate-500">
                  {adminNote.length}/1500
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={saveReview} disabled={saving}>
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Save review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
