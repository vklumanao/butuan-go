import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  ShieldBan,
  Users,
} from "lucide-react";
import {
  getAdminDashboardSummary,
  listAdminAuditEvents,
  listAdminDisputes,
} from "@/services/adminService";
import { devLog } from "@/lib/errors";
import { formatDateTime } from "@/lib/requestUtils";
import { DISPUTE_CATEGORY_LABELS } from "@/lib/requestConstants";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/AdminState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const auditLabels = {
  DISPUTE_RESOLVED: "Dispute resolved",
  ACCOUNT_RESTRICTED: "Account restricted",
  ACCOUNT_RESTRICTION_UPDATED: "Restriction updated",
  ACCOUNT_RESTRICTION_CLEARED: "Restriction cleared",
};

function StatCard({ label, value, helper, icon: Icon, to, tone }) {
  const tones = {
    brand: "bg-brand-100 text-brand-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <Link to={to} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
      <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:border-brand-200 group-hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-slate-600">{label}</p>
            <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone] || tones.slate}`}>
              <Icon className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="mt-4 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    const [summaryResult, disputesResult, auditResult] = await Promise.all([
      getAdminDashboardSummary(),
      listAdminDisputes({ status: "OPEN", limit: 5 }),
      listAdminAuditEvents(5),
    ]);
    const firstError =
      summaryResult.error || disputesResult.error || auditResult.error;
    if (firstError) {
      devLog("Admin dashboard retrieval failed", firstError);
      setError(
        "We could not load the protected operations summary. Confirm that migration 017 is installed and this profile is an Admin.",
      );
    } else {
      setSummary(summaryResult.data);
      setDisputes(disputesResult.data || []);
      setAuditEvents(auditResult.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadDashboard, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <AdminPageHeader
        title="Operations overview"
        description="Monitor marketplace activity and prioritize records that require human review. Counts are live from the protected Supabase backend."
        actions={
          <Button asChild>
            <Link to="/admin/disputes">Review disputes</Link>
          </Button>
        }
      />

      {loading && <div className="mt-8"><AdminLoadingState /></div>}
      {!loading && error && (
        <div className="mt-8">
          <AdminErrorState message={error} onRetry={loadDashboard} />
        </div>
      )}

      {!loading && !error && summary && (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Admin operations summary">
            <StatCard
              label="Accounts"
              value={summary.total_accounts}
              helper={`${summary.onboarded_accounts} completed onboarding`}
              icon={Users}
              to="/admin/users"
              tone="brand"
            />
            <StatCard
              label="Requests"
              value={summary.total_requests}
              helper={`${summary.open_requests} open · ${summary.active_requests} active`}
              icon={ClipboardList}
              to="/admin/requests"
              tone="slate"
            />
            <StatCard
              label="Open disputes"
              value={summary.open_disputes}
              helper="Waiting for Admin review"
              icon={AlertTriangle}
              to="/admin/disputes"
              tone="amber"
            />
            <StatCard
              label="Active restrictions"
              value={summary.active_restrictions}
              helper={`${summary.failed_requests} failed requests recorded`}
              icon={ShieldBan}
              to="/admin/users"
              tone="red"
            />
          </section>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Open dispute queue</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">Oldest unresolved operational risk should be reviewed first.</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/disputes">View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {disputes.length === 0 ? (
                  <AdminEmptyState title="No open disputes" description="Participant disputes will appear here when they require review." />
                ) : (
                  <ul className="space-y-3">
                    {disputes.map((dispute) => (
                      <li key={dispute.id}>
                        <Link to="/admin/disputes" className="block rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/40">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-amber-100 text-amber-900">Open</Badge>
                            <span className="text-xs text-slate-500">{formatDateTime(dispute.created_at, "")}</span>
                          </div>
                          <p className="mt-2 font-bold text-slate-950">{dispute.request_title}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {DISPUTE_CATEGORY_LABELS[dispute.category] || dispute.category} · {dispute.opener_name} reported {dispute.reported_name}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Recent Admin activity</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">Protected resolution and restriction events.</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/audit">Audit log</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {auditEvents.length === 0 ? (
                  <AdminEmptyState title="No Admin actions yet" description="Future dispute and restriction actions will create audit events." />
                ) : (
                  <ul className="space-y-3">
                    {auditEvents.map((event) => (
                      <li key={event.id} className="flex gap-3 rounded-xl border border-slate-200 p-4">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                          <Activity className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">{auditLabels[event.action] || event.action}</p>
                          <p className="mt-1 truncate text-sm text-slate-600">{event.admin_name} · {event.entity_type}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDateTime(event.created_at, "")}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
