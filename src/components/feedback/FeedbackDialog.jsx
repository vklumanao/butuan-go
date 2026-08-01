import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquarePlus, LoaderCircle, MapPin } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { submitUserFeedback } from "@/services/feedbackService";
import { feedbackSchema } from "@/validation/feedbackSchema";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
} from "@/lib/feedbackConstants";
import { devLog } from "@/lib/errors";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const defaultValues = {
  category: FEEDBACK_CATEGORIES.CONFUSING_EXPERIENCE,
  message: "",
  includePageContext: true,
};

function friendlyFeedbackError(error) {
  const message = error?.message?.toLowerCase() || "";
  if (message.includes("several feedback entries")) {
    return "You have sent several feedback entries recently. Please try again later.";
  }
  if (message.includes("daily feedback limit")) {
    return "You have reached today's feedback limit. Please try again tomorrow.";
  }
  if (message.includes("feedback must contain")) {
    return "Describe your experience using 10 to 2,000 characters.";
  }
  if (message.includes("fetch") || message.includes("network")) {
    return "We could not reach the server. Check your connection and try again.";
  }
  return "We could not send your feedback. Please try again.";
}

export function FeedbackDialog({ pagePath, pageTitle }) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(feedbackSchema),
    defaultValues,
  });
  const message = useWatch({ control, name: "message" });
  const includePageContext = useWatch({
    control,
    name: "includePageContext",
  });

  function changeOpen(nextOpen) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset(defaultValues);
      setSubmitError("");
    }
  }

  async function submitFeedback(values) {
    setSubmitError("");
    const { error } = await submitUserFeedback({
      category: values.category,
      message: values.message,
      pagePath: values.includePageContext ? pagePath : null,
      pageTitle: values.includePageContext ? pageTitle : null,
    });

    if (error) {
      devLog("User feedback submission failed", error);
      setSubmitError(friendlyFeedbackError(error));
      return;
    }

    changeOpen(false);
    toast.success("Thank you. Your feedback was sent to the ButuanGo team.");
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 px-3"
          aria-label="Send feedback"
          title="Send feedback"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span className="hidden sm:inline">Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Tell us about a bug, an idea, or anything that felt confusing. Do
            not include passwords, OTPs, PINs, or payment credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submitFeedback)} noValidate>
          <div className="space-y-5">
            <FormField
              id="feedbackCategory"
              label="What type of feedback is this?"
              error={errors.category?.message}
            >
              <select
                id="feedbackCategory"
                className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
                aria-invalid={Boolean(errors.category)}
                aria-describedby={
                  errors.category ? "feedbackCategory-error" : undefined
                }
                {...register("category")}
              >
                {Object.entries(FEEDBACK_CATEGORY_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </FormField>

            <FormField
              id="feedbackMessage"
              label="What happened or what should we improve?"
              error={errors.message?.message}
            >
              <Textarea
                id="feedbackMessage"
                className="min-h-36"
                maxLength={2000}
                placeholder="Describe what you were trying to do, what happened, and what you expected."
                aria-invalid={Boolean(errors.message)}
                aria-describedby={
                  errors.message ? "feedbackMessage-error" : undefined
                }
                {...register("message")}
              />
              <p className="text-right text-xs text-slate-500">
                {message.length}/2000
              </p>
            </FormField>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                {...register("includePageContext")}
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <MapPin className="h-4 w-4 text-brand-700" />
                  Include current page
                </span>
                <span className="mt-1 block break-all text-xs leading-5 text-slate-600">
                  {pageTitle} ({pagePath})
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  This helps the Admin identify where you experienced the
                  problem. It does not capture a screenshot or your form data.
                </span>
              </span>
            </label>

            {!includePageContext && (
              <Alert className="border-slate-200 bg-slate-50 text-slate-700">
                Page context will not be included with this feedback.
              </Alert>
            )}

            {submitError && <Alert variant="destructive">{submitError}</Alert>}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Sending..." : "Send feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
