import { AlertCircle, Inbox, LoaderCircle, RefreshCw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function AdminLoadingState({ message = "Loading operations data…" }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <div>
        <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-brand-600" />
        <p className="mt-3 text-sm font-semibold text-slate-600">{message}</p>
      </div>
    </div>
  );
}

export function AdminErrorState({ message, onRetry }) {
  return (
    <Alert variant="destructive">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold">Admin data unavailable</p>
          <p className="mt-1 leading-6">{message}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onRetry}
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}

export function AdminEmptyState({
  title = "Nothing to review",
  description = "No matching operational records were found.",
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <Inbox className="mx-auto h-8 w-8 text-slate-400" />
      <h2 className="mt-3 font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}
