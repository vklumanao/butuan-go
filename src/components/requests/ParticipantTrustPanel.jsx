import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  Flag,
  LoaderCircle,
  ShieldCheck,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  ACCOUNT_REPORT_CATEGORIES,
  ACCOUNT_REPORT_CATEGORY_LABELS,
} from "@/lib/requestConstants";
import { devLog } from "@/lib/errors";
import {
  getRequestTrustContext,
  setAccountBlock,
  submitAccountReport,
  submitRequestRating,
} from "@/services/trustService";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const ratingOptions = [1, 2, 3, 4, 5];

function TrustMetric({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  );
}

export function ParticipantTrustPanel({ requestId, participant, type }) {
  const participantId = participant?.user_id;
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState(
    ACCOUNT_REPORT_CATEGORIES.UNSAFE_BEHAVIOR,
  );
  const [reportDetails, setReportDetails] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSaving, setReportSaving] = useState(false);
  const [blockSaving, setBlockSaving] = useState(false);

  const loadContext = useCallback(async () => {
    if (!requestId || !participantId) return;
    setLoading(true);
    setLoadError("");
    const { data, error } = await getRequestTrustContext(
      requestId,
      participantId,
    );
    if (error) {
      devLog("Participant trust context failed", error);
      setLoadError("Trust details are temporarily unavailable.");
    } else {
      setContext(data);
    }
    setLoading(false);
  }, [participantId, requestId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadContext, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadContext]);

  async function saveRating() {
    setRatingError("");
    if (!ratingOptions.includes(rating)) {
      setRatingError("Choose a rating from 1 to 5 stars.");
      return;
    }
    const trimmedComment = ratingComment.trim();
    if (trimmedComment.length === 1) {
      setRatingError("Add at least 2 characters or leave the comment blank.");
      return;
    }

    setRatingSaving(true);
    const { error } = await submitRequestRating({
      requestId,
      rating,
      comment: trimmedComment,
    });
    setRatingSaving(false);
    if (error) {
      devLog("Request rating failed", error);
      setRatingError(error.message || "The rating could not be saved.");
      return;
    }

    setRatingOpen(false);
    toast.success("Your rating was recorded.");
    loadContext();
  }

  async function saveReport() {
    const details = reportDetails.trim();
    setReportError("");
    if (details.length < 10) {
      setReportError("Describe the concern using at least 10 characters.");
      return;
    }

    setReportSaving(true);
    const { error } = await submitAccountReport({
      requestId,
      userId: participantId,
      category: reportCategory,
      details,
    });
    setReportSaving(false);
    if (error) {
      devLog("Account safety report failed", error);
      setReportError(error.message || "The safety report could not be sent.");
      return;
    }

    setReportOpen(false);
    setReportDetails("");
    toast.success("Your private safety report was sent for Admin review.");
    loadContext();
  }

  async function toggleBlock() {
    const nextBlocked = !context.blocked_by_me;
    const action = nextBlocked ? "block" : "unblock";
    const confirmed = window.confirm(
      nextBlocked
        ? `Block ${participant.full_name} from future matching? Existing request responsibilities will remain visible.`
        : `Allow future matching with ${participant.full_name} again?`,
    );
    if (!confirmed) return;

    setBlockSaving(true);
    const { error } = await setAccountBlock({
      requestId,
      userId: participantId,
      blocked: nextBlocked,
    });
    setBlockSaving(false);
    if (error) {
      devLog(`Account ${action} failed`, error);
      toast.error(error.message || `The account could not be ${action}ed.`);
      return;
    }

    toast.success(
      nextBlocked
        ? "This account will be excluded from future matching."
        : "Future matching is allowed again.",
    );
    loadContext();
  }

  if (loading) {
    return (
      <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading trust summary...
      </div>
    );
  }

  if (loadError || !context) {
    return (
      <p className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
        {loadError || "Trust details are unavailable."}
      </p>
    );
  }

  const averageRating = Number(context.average_rating || 0);
  const ratingCount = Number(context.rating_count || 0);
  const completedCount =
    Number(context.completed_as_requestor || 0) +
    Number(context.completed_as_runner || 0);

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-700" />
          <p className="text-sm font-bold text-slate-900">Trust summary</p>
        </div>
        {context.blocked_by_me && (
          <Badge className="bg-red-100 text-red-800">Blocked</Badge>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <TrustMetric
          label="Rating"
          value={ratingCount ? `${averageRating.toFixed(1)} / 5` : "No ratings"}
        />
        <TrustMetric label="Completed" value={completedCount} />
      </div>
      {ratingCount > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          Based on {ratingCount} completed-request rating
          {ratingCount === 1 ? "" : "s"}.
        </p>
      )}
      {(Number(context.cancelled_as_requestor) > 0 ||
        Number(context.failed_as_runner) > 0) && (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Activity context: {Number(context.cancelled_as_requestor)} cancelled
          request(s) as Requestor and {Number(context.failed_as_runner)} failed
          task(s) as Runner. Counts alone do not establish fault.
        </p>
      )}

      {context.my_rating ? (
        <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
          You rated this participant {context.my_rating}/5.
          {context.my_rating_comment && (
            <p className="mt-1 break-words">{context.my_rating_comment}</p>
          )}
        </div>
      ) : (
        context.can_rate && (
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={() => setRatingOpen(true)}
          >
            <Star className="h-4 w-4" />
            Rate this {type === "runner" ? "Runner" : "Requestor"}
          </Button>
        )
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="text-red-700"
          onClick={() => setReportOpen(true)}
          disabled={!context.can_report}
        >
          <Flag className="h-4 w-4" />
          {context.can_report ? "Report" : "Reported"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className={context.blocked_by_me ? "" : "text-red-700"}
          onClick={toggleBlock}
          disabled={blockSaving}
        >
          <Ban className="h-4 w-4" />
          {blockSaving
            ? "Saving..."
            : context.blocked_by_me
              ? "Unblock"
              : "Block"}
        </Button>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Blocking affects future matching only. It does not cancel or hide this
        request.
      </p>

      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate this transaction</DialogTitle>
            <DialogDescription>
              Submit one factual rating for {participant.full_name}. Ratings
              cannot be edited after submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {ratingError && <Alert variant="destructive">{ratingError}</Alert>}
            <fieldset>
              <legend className="text-sm font-bold text-slate-800">
                Rating
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {ratingOptions.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={rating === option ? "default" : "outline"}
                    size="icon"
                    onClick={() => setRating(option)}
                    aria-label={`${option} star${option === 1 ? "" : "s"}`}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </fieldset>
            <div>
              <Label htmlFor="ratingComment">Comment (optional)</Label>
              <Textarea
                id="ratingComment"
                value={ratingComment}
                onChange={(event) => setRatingComment(event.target.value)}
                className="mt-2 min-h-28"
                maxLength={500}
                placeholder="Share concise, factual feedback about the transaction."
              />
              <p className="mt-1 text-right text-xs text-slate-500">
                {ratingComment.length}/500
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={ratingSaving}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={saveRating} disabled={ratingSaving}>
              {ratingSaving ? "Submitting..." : "Submit rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a private safety report</DialogTitle>
            <DialogDescription>
              The reported participant will not see your report. An Admin can
              review it alongside the related request record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {reportError && <Alert variant="destructive">{reportError}</Alert>}
            <div>
              <Label htmlFor="reportCategory">Concern</Label>
              <select
                id="reportCategory"
                value={reportCategory}
                onChange={(event) => setReportCategory(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                {Object.entries(ACCOUNT_REPORT_CATEGORY_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label htmlFor="reportDetails">What happened?</Label>
              <Textarea
                id="reportDetails"
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                className="mt-2 min-h-32"
                maxLength={1000}
                placeholder="Describe specific behavior, when it happened, and any relevant context."
              />
              <p className="mt-1 text-right text-xs text-slate-500">
                {reportDetails.length}/1000
              </p>
            </div>
            <Alert>
              For immediate danger, contact local emergency services. ButuanGo
              does not provide live emergency monitoring.
            </Alert>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={reportSaving}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={saveReport}
              disabled={reportSaving}
            >
              {reportSaving ? "Sending..." : "Send report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
