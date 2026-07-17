import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle, LogOut, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  releaseAcceptedRequest,
  startRequest,
  submitRequestCompletion,
} from "@/services/requestService";
import { releaseTaskSchema } from "@/validation/requestSchema";
import { REQUEST_STATUSES } from "@/lib/requestConstants";
import { devLog } from "@/lib/errors";
import { getFriendlyRequestError } from "@/lib/requestUtils";
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
      "Submit after arriving at the meetup or delivery location and presenting the completed errand and applicable receipts. The Requestor will then review the result and settle payment directly with you in person.",
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
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Releasing…" : "Release task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RunnerTaskActions({ request, onChanged, hasLocation = true }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState("");
  const config = actionConfig[request.status];
  const cannotStart =
    request.status === REQUEST_STATUSES.ACCEPTED && !hasLocation;

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
        Completion has been submitted. The Requestor must confirm it before
        this task is marked completed.
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
          ? "The Requestor must add complete private location details before you can start this task. You may release it if you cannot wait."
          : request.status === REQUEST_STATUSES.ACCEPTED
          ? "Start the task when you are ready to begin the errand."
          : "Submit the task when the requested errand has been completed."}
      </p>
      <Button
        className="mt-5 w-full"
        disabled={cannotStart}
        title={cannotStart ? "Complete private location details are required." : undefined}
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
    </>
  );
}
