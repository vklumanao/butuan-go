import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Flag, LoaderCircle, ShieldBan } from "lucide-react";
import { toast } from "sonner";
import {
  listAdminAccountReports,
  resolveAdminAccountReport,
} from "@/services/adminService";
import { devLog } from "@/lib/errors";
import {
  ACCOUNT_REPORT_CATEGORY_LABELS,
  ACCOUNT_REPORT_STATUS_LABELS,
} from "@/lib/requestConstants";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const reportStatuses = ["OPEN", "ALL", "ACTIONED", "DISMISSED"];
const outcomeLabels = {
  ACTIONED: "Take action",
  DISMISSED: "Dismiss report",
};

function statusClass(status) {
  if (status === "OPEN") return "bg-amber-100 text-amber-900";
  if (status === "ACTIONED") return "bg-red-100 text-red-800";
  return "bg-slate-200 text-slate-800";
}

export function AdminReportsPage() {
  const [status, setStatus] = useState("OPEN");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [outcome, setOutcome] = useState("ACTIONED");
  const [resolutionNote, setResolutionNote] = useState("");
  const [restrictionDays, setRestrictionDays] = useState("0");
  const [resolutionError, setResolutionError] = useState("");
  const [resolving, setResolving] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: reportError } = await listAdminAccountReports({
      status,
    });
    if (reportError) {
      devLog("Admin safety report queue failed", reportError);
      setError("We could not load the protected safety-report queue.");
    } else {
      setReports(data || []);
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadReports, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadReports]);

  function openResolution(report) {
    setSelected(report);
    setOutcome("ACTIONED");
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
      setResolutionError("Enter a factual note with at least 5 characters.");
      return;
    }
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      setResolutionError("Restriction days must be from 0 to 365.");
      return;
    }
    if (outcome !== "ACTIONED" && days > 0) {
      setResolutionError("Only an actioned report can restrict the account.");
      return;
    }

    setResolving(true);
    const { error: resolveError } = await resolveAdminAccountReport({
      reportId: selected.id,
      outcome,
      resolutionNote: note,
      restrictReportedDays: days,
    });
    setResolving(false);
    if (resolveError) {
      devLog("Admin safety report resolution failed", resolveError);
      setResolutionError(
        resolveError.message || "The safety report could not be resolved.",
      );
      return;
    }

    setSelected(null);
    toast.success("The safety-report outcome was recorded.");
    loadReports();
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <AdminPageHeader
        title="Safety reports"
        description="Review private participant reports separately from payment and completion disputes. Apply restrictions only from documented findings."
        actions={
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-600"
            aria-label="Filter safety-report status"
          >
            {reportStatuses.map((item) => (
              <option key={item} value={item}>
                {item === "ALL"
                  ? "All safety reports"
                  : ACCOUNT_REPORT_STATUS_LABELS[item] || item}
              </option>
            ))}
          </select>
        }
      />

      <Alert className="mt-6 border-amber-200 bg-amber-50 text-amber-950">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="leading-6">
            A report is an allegation, not proof. Review the request record and
            document the reason for every outcome.
          </p>
        </div>
      </Alert>

      <div className="mt-6">
        {loading && <AdminLoadingState message="Loading safety reports..." />}
        {!loading && error && (
          <AdminErrorState message={error} onRetry={loadReports} />
        )}
        {!loading && !error && reports.length === 0 && (
          <AdminEmptyState
            title="No matching safety reports"
            description="There are no reports in the selected state."
          />
        )}
        {!loading && !error && reports.length > 0 && (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card
                key={report.id}
                className={report.status === "OPEN" ? "border-amber-200" : ""}
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusClass(report.status)}>
                          {ACCOUNT_REPORT_STATUS_LABELS[report.status] ||
                            report.status}
                        </Badge>
                        <Badge>
                          {ACCOUNT_REPORT_CATEGORY_LABELS[report.category] ||
                            report.category}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(report.created_at, "")}
                        </span>
                      </div>
                      <h2 className="mt-3 text-lg font-black text-slate-950">
                        {report.request_title}
                      </h2>
                      <p className="mt-3 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {report.details}
                      </p>
                      <p className="mt-2 break-all font-mono text-xs text-slate-400">
                        Request {report.request_id}
                      </p>
                    </div>
                    {report.status === "OPEN" && (
                      <Button onClick={() => openResolution(report)}>
                        <Flag className="h-4 w-4" />
                        Review report
                      </Button>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 border-t border-slate-200 pt-4 text-sm md:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Reporter
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {report.reporter_name}
                      </p>
                      <p className="mt-1 break-all text-slate-600">
                        {report.reporter_email}
                      </p>
                    </div>
                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-xs font-bold uppercase text-red-700">
                        Reported account
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {report.reported_name}
                      </p>
                      <p className="mt-1 break-all text-slate-600">
                        {report.reported_email}
                      </p>
                      {report.reported_restricted_until && (
                        <p className="mt-2 font-semibold text-red-800">
                          Restricted until{" "}
                          {formatDateTime(report.reported_restricted_until, "")}
                        </p>
                      )}
                    </div>
                  </div>

                  {report.resolution_note && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                      <p className="font-bold">
                        Outcome: {outcomeLabels[report.status] || report.status}
                      </p>
                      <p className="mt-1 leading-6">{report.resolution_note}</p>
                      <p className="mt-2 text-xs">
                        Reviewed by {report.reviewer_name || "Admin"} -{" "}
                        {formatDateTime(report.reviewed_at, "")}
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
            <DialogTitle>Resolve safety report</DialogTitle>
            <DialogDescription>
              This action is final, notifies the reporter, and creates an Admin
              audit event.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-bold text-slate-950">
                  {selected.request_title}
                </p>
                <p className="mt-1 leading-6 text-slate-700">
                  {selected.details}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Reported account: {selected.reported_name}
                </p>
              </div>

              {resolutionError && (
                <Alert variant="destructive">{resolutionError}</Alert>
              )}

              <div>
                <Label htmlFor="adminReportOutcome">Outcome</Label>
                <select
                  id="adminReportOutcome"
                  value={outcome}
                  onChange={(event) => {
                    setOutcome(event.target.value);
                    if (event.target.value !== "ACTIONED") {
                      setRestrictionDays("0");
                    }
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
                <Label htmlFor="adminReportNote">Resolution note</Label>
                <Textarea
                  id="adminReportNote"
                  value={resolutionNote}
                  onChange={(event) => setResolutionNote(event.target.value)}
                  className="mt-2 min-h-32"
                  maxLength={1500}
                  placeholder="Record the evidence reviewed, finding, and reason for this outcome."
                />
                <p className="mt-1 text-right text-xs text-slate-500">
                  {resolutionNote.length}/1500
                </p>
              </div>

              <div>
                <Label htmlFor="adminReportRestrictionDays">
                  Restrict reported account for days
                </Label>
                <div className="relative mt-2">
                  <ShieldBan className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="adminReportRestrictionDays"
                    type="number"
                    min="0"
                    max="365"
                    step="1"
                    className="pl-10"
                    value={restrictionDays}
                    onChange={(event) => setRestrictionDays(event.target.value)}
                    disabled={outcome !== "ACTIONED"}
                  />
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Use 0 for no restriction. Existing transaction
                  responsibilities remain accessible.
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
              {resolving ? "Recording..." : "Confirm outcome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
