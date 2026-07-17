import { useEffect, useState } from "react";
import {
  CalendarClock,
  ChevronRight,
  ClipboardList,
  MapPin,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { getMyRequests } from "@/services/requestService";
import { devLog } from "@/lib/errors";
import { REQUEST_STATUSES } from "@/lib/requestConstants";
import { formatCurrency, formatDateTime } from "@/lib/requestUtils";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const requestFilters = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "accepted", label: "Accepted" },
  { value: "in-progress", label: "In Progress" },
  { value: "awaiting-confirmation", label: "Needs Confirmation" },
  { value: "due-soon", label: "Due Soon" },
  { value: "completed-this-month", label: "Completed This Month" },
];

function matchesRequestFilter(request, filter) {
  const statusFilters = {
    open: REQUEST_STATUSES.OPEN,
    accepted: REQUEST_STATUSES.ACCEPTED,
    "in-progress": REQUEST_STATUSES.IN_PROGRESS,
    "awaiting-confirmation": REQUEST_STATUSES.AWAITING_CONFIRMATION,
  };
  if (filter === "all") return true;
  if (statusFilters[filter]) return request.status === statusFilters[filter];

  if (filter === "due-soon") {
    const activeStatuses = [
      REQUEST_STATUSES.OPEN,
      REQUEST_STATUSES.ACCEPTED,
      REQUEST_STATUSES.IN_PROGRESS,
      REQUEST_STATUSES.AWAITING_CONFIRMATION,
    ];
    if (!activeStatuses.includes(request.status) || !request.due_at)
      return false;
    const now = new Date();
    const dueAt = new Date(request.due_at);
    const dueSoonLimit = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    return dueAt > now && dueAt <= dueSoonLimit;
  }

  if (filter === "completed-this-month") {
    if (
      request.status !== REQUEST_STATUSES.COMPLETED ||
      !request.completed_at
    )
      return false;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(request.completed_at) >= monthStart;
  }

  return true;
}

export function RequestorRequestsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestedFilter = searchParams.get("filter") || "all";
  const activeFilter = requestFilters.some(
    (filter) => filter.value === requestedFilter,
  )
    ? requestedFilter
    : "all";
  const filteredRequests = requests.filter((request) =>
    matchesRequestFilter(request, activeFilter),
  );

  function selectFilter(filter) {
    setSearchParams(filter === "all" ? {} : { filter }, { replace: true });
  }
  async function loadRequests() {
    setLoading(true);
    setError("");
    const { data, error: requestError } = await getMyRequests(user.id);
    if (requestError) {
      devLog("Request list retrieval failed", requestError);
      setError(
        "We could not load your requests. Check your connection and try again.",
      );
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  }
  useEffect(() => {
    let active = true;
    getMyRequests(user.id).then(({ data, error: requestError }) => {
      if (!active) return;
      if (requestError) {
        devLog("Request list retrieval failed", requestError);
        setError(
          "We could not load your requests. Check your connection and try again.",
        );
      } else setRequests(data || []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user.id]);
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-semibold text-brand-600">Requestor workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            My Requests
          </h1>
          <p className="mt-2 text-slate-600">
            Review the errands you have posted and follow their progress.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/requestor/requests/new">
            <Plus className="h-5 w-5" />
            Create a Request
          </Link>
        </Button>
      </div>
      {error && (
        <Alert
          variant="destructive"
          className="mt-6 flex items-center justify-between gap-4"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadRequests}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </Alert>
      )}
      {!loading && !error && requests.length > 0 && (
        <div className="mt-6">
          <div
            className="flex flex-wrap gap-2"
            aria-label="Filter your requests"
          >
            {requestFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={activeFilter === filter.value}
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
                  activeFilter === filter.value
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                }`}
                onClick={() => selectFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-500" aria-live="polite">
            Showing {filteredRequests.length} of {requests.length} requests
          </p>
        </div>
      )}
      {loading ? (
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-4 h-7 w-2/3" />
                <Skeleton className="mt-4 h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? null : requests.length === 0 ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50">
              <ClipboardList className="h-7 w-7 text-brand-600" />
            </span>
            <h2 className="mt-5 text-xl font-bold">No requests yet</h2>
            <p className="mt-2 max-w-md text-slate-600">
              Create your first everyday errand request. It will appear here as
              soon as it is posted.
            </p>
            <Button asChild className="mt-6">
              <Link to="/requestor/requests/new">
                <Plus className="h-4 w-4" />
                Create your first request
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100">
              <ClipboardList className="h-6 w-6 text-slate-500" />
            </span>
            <h2 className="mt-5 text-lg font-bold">No matching requests</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
              There are no requests in this dashboard category right now.
            </p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => selectFilter("all")}
            >
              Show all requests
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredRequests.map((request) => (
            <Link
              key={request.id}
              to={`/requestor/requests/${request.id}`}
              className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              <Card className="transition hover:border-brand-200 hover:shadow-md">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <RequestStatusBadge status={request.status} />
                        <span className="text-xs font-medium text-slate-500">
                          {request.category?.name || "Uncategorized"}
                        </span>
                      </div>
                      <h2 className="mt-3 truncate text-xl font-bold text-slate-950">
                        {request.title}
                      </h2>
                    </div>
                    <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-slate-400" />
                  </div>
                  <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-brand-600" />
                      {request.area}
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-brand-600" />
                      {formatDateTime(request.due_at)}
                    </p>
                    <p className="font-semibold text-slate-800">
                      Total:{" "}
                      {formatCurrency(
                        Number(request.expense_budget) +
                          Number(request.service_fee),
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
