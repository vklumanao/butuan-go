import { useCallback, useEffect, useState } from "react";
import { Activity, FileClock } from "lucide-react";
import { listAdminAuditEvents } from "@/services/adminService";
import { devLog } from "@/lib/errors";
import { formatDateTime } from "@/lib/requestUtils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/AdminState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const actionLabels = {
  DISPUTE_RESOLVED: "Dispute resolved",
  ACCOUNT_RESTRICTED: "Account restricted",
  ACCOUNT_RESTRICTION_UPDATED: "Restriction updated",
  ACCOUNT_RESTRICTION_CLEARED: "Restriction cleared",
  ACCOUNT_REPORT_RESOLVED: "Safety report resolved",
  ACCOUNT_ANONYMIZED: "Account anonymized",
  USER_FEEDBACK_UPDATED: "Product feedback updated",
};

export function AdminAuditPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: auditError } = await listAdminAuditEvents(100);
    if (auditError) {
      devLog("Admin audit retrieval failed", auditError);
      setError("We could not load the protected Admin audit trail.");
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadEvents, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadEvents]);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <AdminPageHeader
        title="Admin audit log"
        description="Review protected dispute, safety, feedback, account-control, and anonymization actions. Normal users cannot write to or read this operational trail."
      />

      <div className="mt-8">
        {loading && <AdminLoadingState message="Loading audit events…" />}
        {!loading && error && (
          <AdminErrorState message={error} onRetry={loadEvents} />
        )}
        {!loading && !error && events.length === 0 && (
          <AdminEmptyState
            title="No audit events yet"
            description="Resolving a review, changing an account control, or completing anonymization will create the first event."
          />
        )}
        {!loading && !error && events.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-200">
                {events.map((event) => (
                  <li key={event.id} className="flex gap-4 p-5 sm:p-6">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                      {event.action === "DISPUTE_RESOLVED" ? (
                        <FileClock className="h-5 w-5" />
                      ) : (
                        <Activity className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950">
                          {actionLabels[event.action] || event.action}
                        </p>
                        <Badge className="bg-slate-100 text-slate-700">
                          {event.entity_type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Performed by {event.admin_name} ({event.admin_email})
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-slate-400">
                        Entity: {event.entity_id}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {formatDateTime(event.created_at, "")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
