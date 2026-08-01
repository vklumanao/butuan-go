import { useCallback, useEffect, useState } from "react";
import { Search, ShieldAlert } from "lucide-react";
import { listAdminRequests } from "@/services/adminService";
import { devLog } from "@/lib/errors";
import {
  PAYMENT_ARRANGEMENT_LABELS,
  REQUEST_STATUS_LABELS,
} from "@/lib/requestConstants";
import { formatCurrency, formatDateTime } from "@/lib/requestUtils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/AdminState";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const statuses = [
  "ALL",
  "OPEN",
  "ACCEPTED",
  "IN_PROGRESS",
  "AWAITING_CONFIRMATION",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
];

export function AdminRequestsPage() {
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: requestError } = await listAdminRequests({
      status,
      search: submittedSearch,
    });
    if (requestError) {
      devLog("Admin request list failed", requestError);
      setError("We could not load the protected request directory.");
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  }, [status, submittedSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadRequests, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRequests]);

  function handleSearch(event) {
    event.preventDefault();
    setSubmittedSearch(search.trim());
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <AdminPageHeader
        title="Request oversight"
        description="Review marketplace status and participants without exposing exact private pickup or delivery addresses in this directory."
      />

      <Card className="mt-8">
        <CardContent className="p-4 sm:p-5">
          <form
            onSubmit={handleSearch}
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
                placeholder="Search title, area, user, or request ID"
                aria-label="Search requests"
              />
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-600"
              aria-label="Filter request status"
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL"
                    ? "All statuses"
                    : REQUEST_STATUS_LABELS[item] || item}
                </option>
              ))}
            </select>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6">
        {loading && <AdminLoadingState message="Loading request oversight…" />}
        {!loading && error && (
          <AdminErrorState message={error} onRetry={loadRequests} />
        )}
        {!loading && !error && requests.length === 0 && (
          <AdminEmptyState
            title="No matching requests"
            description="Change the search or status filter to review other records."
          />
        )}
        {!loading && !error && requests.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-500">
              Showing up to 50 newest matching requests
            </p>
            {requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <RequestStatusBadge status={request.status} />
                        {request.has_open_dispute && (
                          <Badge className="bg-amber-100 text-amber-900">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Open dispute
                          </Badge>
                        )}
                        <span className="text-xs text-slate-500">
                          {request.category_name}
                        </span>
                      </div>
                      <h2 className="mt-3 break-words text-lg font-black text-slate-950">
                        {request.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {request.area}
                      </p>
                      <p className="mt-2 break-all font-mono text-xs text-slate-400">
                        {request.id}
                      </p>
                    </div>
                    <div className="grid shrink-0 gap-2 text-sm sm:grid-cols-2 lg:min-w-[360px]">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Requestor
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {request.requestor_name}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Runner
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {request.runner_name || "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Payment arrangement
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {PAYMENT_ARRANGEMENT_LABELS[
                          request.payment_arrangement
                        ] ||
                          request.payment_arrangement ||
                          "Not recorded"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Budget and fee
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatCurrency(request.expense_budget)} +{" "}
                        {formatCurrency(request.service_fee)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Created
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatDateTime(request.created_at, "")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Last updated
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatDateTime(request.updated_at, "")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
