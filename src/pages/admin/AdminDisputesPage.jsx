import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, Scale, ShieldBan } from "lucide-react";
import { toast } from "sonner";
import {
  listAdminDisputes,
  resolveAdminDispute,
} from "@/services/adminService";
import { devLog } from "@/lib/errors";
import {
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_STATUS_LABELS,
} from "@/lib/requestConstants";
import { formatDateTime } from "@/lib/requestUtils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/AdminState";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const disputeStatuses = ["OPEN", "ALL", "RESOLVED", "DISMISSED", "WITHDRAWN"];
const outcomeLabels = {
  UPHELD: "Uphold the report",
  SETTLED: "Record as settled",
  DISMISSED: "Dismiss the report",
};

function statusClass(status) {
  if (status === "OPEN") return "bg-amber-100 text-amber-900";
  if (status === "RESOLVED") return "bg-emerald-100 text-emerald-800";
  if (status === "DISMISSED") return "bg-slate-200 text-slate-800";
  return "bg-slate-100 text-slate-700";
}

export function AdminDisputesPage() {
  const [status, setStatus] = useState("OPEN");
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [outcome, setOutcome] = useState("UPHELD");
  const [resolutionNote, setResolutionNote] = useState("");
  const [restrictionDays, setRestrictionDays] = useState("0");
  const [resolutionError, setResolutionError] = useState("");
  const [resolving, setResolving] = useState(false);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: disputeError } = await listAdminDisputes({ status });
    if (disputeError) {
      devLog("Admin dispute queue failed", disputeError);
      setError("We could not load the protected dispute queue.");
    } else {
      setDisputes(data || []);
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadDisputes, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDisputes]);

  function openResolution(dispute) {
    setSelected(dispute);
    setOutcome("UPHELD");
    setResolutionNote("");
    setRestrictionDays("0");
    setResolutionError("");
  }

  function changeDialog(open) {
    if (!open && !resolving) setSelected(null);
  }

  async function submitResolution() {
    const note = resolutionNote.trim();
    const days = Number(restrictionDays);
    setResolutionError("");
    if (note.length < 5) {
      setResolutionError(
        "Enter a factual resolution note with at least 5 characters.",
      );
      return;
    }
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      setResolutionError(
        "Restriction days must be a whole number from 0 to 365.",
      );
      return;
    }
    if (outcome !== "UPHELD" && days > 0) {
      setResolutionError(
        "Only an upheld dispute can restrict the reported account.",
      );
      return;
    }

    setResolving(true);
    const { error: resolveError } = await resolveAdminDispute({
      disputeId: selected.id,
      outcome,
      resolutionNote: note,
      restrictReportedDays: days,
    });
    setResolving(false);
    if (resolveError) {
      devLog("Admin dispute resolution failed", resolveError);
      setResolutionError(
        resolveError.message || "The dispute could not be resolved.",
      );
      return;
    }

    setSelected(null);
    toast.success(
      "The dispute resolution was recorded and participants were notified.",
    );
    loadDisputes();
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <AdminPageHeader
        title="Dispute review"
        description="Record a reasoned outcome after reviewing participant statements and available request evidence. ButuanGo does not guarantee fund recovery."
        actions={
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-600"
            aria-label="Filter dispute status"
          >
            {disputeStatuses.map((item) => (
              <option key={item} value={item}>
                {item === "ALL"
                  ? "All disputes"
                  : DISPUTE_STATUS_LABELS[item] || item}
              </option>
            ))}
          </select>
        }
      />

      <Alert className="mt-6 border-amber-200 bg-amber-50 text-amber-950">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="leading-6">
            Resolve only after reviewing the record. Restrictions prevent new
            marketplace activity but do not erase existing responsibilities or
            user data.
          </p>
        </div>
      </Alert>

      <div className="mt-6">
        {loading && <AdminLoadingState message="Loading dispute queue…" />}
        {!loading && error && (
          <AdminErrorState message={error} onRetry={loadDisputes} />
        )}
        {!loading && !error && disputes.length === 0 && (
          <AdminEmptyState
            title="No matching disputes"
            description="There are no disputes in the selected state."
          />
        )}
        {!loading && !error && disputes.length > 0 && (
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <Card
                key={dispute.id}
                className={dispute.status === "OPEN" ? "border-amber-200" : ""}
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusClass(dispute.status)}>
                          {DISPUTE_STATUS_LABELS[dispute.status] ||
                            dispute.status}
                        </Badge>
                        <RequestStatusBadge status={dispute.request_status} />
                        <span className="text-xs text-slate-500">
                          {formatDateTime(dispute.created_at, "")}
                        </span>
                      </div>
                      <h2 className="mt-3 text-lg font-black text-slate-950">
                        {dispute.request_title}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {DISPUTE_CATEGORY_LABELS[dispute.category] ||
                          dispute.category}
                      </p>
                      <p className="mt-3 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {dispute.description}
                      </p>
                    </div>
                    {dispute.status === "OPEN" && (
                      <Button onClick={() => openResolution(dispute)}>
                        <Scale className="h-4 w-4" />
                        Review and resolve
                      </Button>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 border-t border-slate-200 pt-4 text-sm md:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Opened by
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {dispute.opener_name}
                      </p>
                      <p className="mt-1 break-all text-slate-600">
                        {dispute.opener_email}
                      </p>
                    </div>
                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-xs font-bold uppercase text-red-700">
                        Reported account
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {dispute.reported_name}
                      </p>
                      <p className="mt-1 break-all text-slate-600">
                        {dispute.reported_email}
                      </p>
                      {dispute.reported_restricted_until && (
                        <p className="mt-2 font-semibold text-red-800">
                          Restricted until{" "}
                          {formatDateTime(
                            dispute.reported_restricted_until,
                            "",
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {dispute.resolution_note && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                      <p className="font-bold">
                        Outcome:{" "}
                        {outcomeLabels[dispute.resolution_outcome] ||
                          dispute.resolution_outcome}
                      </p>
                      <p className="mt-1 leading-6">
                        {dispute.resolution_note}
                      </p>
                      <p className="mt-2 text-xs">
                        Resolved by {dispute.resolver_name || "Admin"} ·{" "}
                        {formatDateTime(dispute.resolved_at, "")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={changeDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve participant dispute</DialogTitle>
            <DialogDescription>
              This protected action is final, notifies both participants, and
              creates an Admin audit event.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-bold text-slate-950">
                  {selected.request_title}
                </p>
                <p className="mt-1 leading-6 text-slate-700">
                  {selected.description}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Reported account: {selected.reported_name}
                </p>
              </div>

              {resolutionError && (
                <Alert variant="destructive">{resolutionError}</Alert>
              )}

              <div>
                <Label htmlFor="adminDisputeOutcome">Outcome</Label>
                <select
                  id="adminDisputeOutcome"
                  value={outcome}
                  onChange={(event) => {
                    setOutcome(event.target.value);
                    if (event.target.value !== "UPHELD")
                      setRestrictionDays("0");
                  }}
                  className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  {Object.entries(outcomeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="adminResolutionNote">Resolution note</Label>
                <Textarea
                  id="adminResolutionNote"
                  value={resolutionNote}
                  onChange={(event) => setResolutionNote(event.target.value)}
                  className="mt-2 min-h-32"
                  maxLength={1500}
                  placeholder="Record the evidence reviewed, factual finding, and reason for this outcome."
                />
                <p className="mt-1 text-right text-xs text-slate-500">
                  {resolutionNote.length}/1500
                </p>
              </div>

              <div>
                <Label htmlFor="adminRestrictionDays">
                  Restrict reported account for days
                </Label>
                <div className="relative mt-2">
                  <ShieldBan className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="adminRestrictionDays"
                    type="number"
                    min="0"
                    max="365"
                    step="1"
                    className="pl-10"
                    value={restrictionDays}
                    onChange={(event) => setRestrictionDays(event.target.value)}
                    disabled={outcome !== "UPHELD"}
                  />
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Use 0 for no restriction. Only an upheld dispute may apply
                  1–365 days.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={resolving}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={submitResolution} disabled={resolving}>
              {resolving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {resolving ? "Recording resolution…" : "Confirm resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
