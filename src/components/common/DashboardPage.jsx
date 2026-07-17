import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  CircleCheckBig,
  Clock3,
  Construction,
  ListChecks,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getActiveRole, ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/requestUtils";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const statToneStyles = {
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-sky-100 text-sky-700 ring-sky-200",
  brand: "bg-brand-100 text-brand-700 ring-brand-200",
  amber: "bg-amber-100 text-amber-700 ring-amber-200",
  violet: "bg-violet-100 text-violet-700 ring-violet-200",
  red: "bg-red-100 text-red-700 ring-red-200",
  emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

function DashboardStatCard({ stat }) {
  const Icon = stat.icon || Clock3;
  const iconClass = statToneStyles[stat.tone] || statToneStyles.slate;
  const card = (
    <Card
      className={`h-full transition duration-200 ${
        stat.to
          ? "group-hover:-translate-y-0.5 group-hover:border-brand-200 group-hover:shadow-md"
          : ""
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold leading-5 text-slate-600">
            {stat.label}
          </p>
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${iconClass}`}
          >
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
        </div>
        {stat.loading ? (
          <Skeleton className="mt-4 h-9 w-16" />
        ) : (
          <p className="mt-4 text-3xl font-black text-slate-950">
            {stat.value}
          </p>
        )}
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs leading-5 text-slate-500">
            {stat.helper || "Live account data"}
          </p>
          {stat.to && (
            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-600" />
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!stat.to) return card;
  return (
    <Link
      to={stat.to}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      aria-label={`View ${stat.label}`}
    >
      {card}
    </Link>
  );
}

export function DashboardPage({
  title,
  stats,
  actionLabel,
  actionTo,
  emptyTitle,
  emptyDescription,
  emptyBadge = "Ready when you are",
  nextActions = [],
  nextActionsLoading = false,
  nextActionsError = "",
  onReloadNextActions,
  workspaceNotice = null,
  paymentSummary = null,
}) {
  const { profile } = useAuth();

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge>{ROLE_LABELS[getActiveRole(profile)]}</Badge>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Welcome, {profile.full_name?.split(" ")[0]}!
          </h1>
          <p className="mt-2 text-slate-600">{title}</p>
        </div>
        {actionTo ? (
          <Button size="lg" asChild>
            <Link to={actionTo}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button
            disabled
            size="lg"
            title="Coming in the next development phase"
          >
            {actionLabel}
            <Construction className="h-4 w-4" />
          </Button>
        )}
      </div>

      {workspaceNotice && (
        <Alert className="mt-6 border-amber-200 bg-amber-50 text-amber-900">
          <p className="font-semibold">{workspaceNotice.title}</p>
          <p className="mt-1 leading-6">{workspaceNotice.description}</p>
          {workspaceNotice.to && (
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to={workspaceNotice.to}>{workspaceNotice.linkLabel}</Link>
            </Button>
          )}
        </Alert>
      )}

      <section
        className={`mt-8 grid gap-4 sm:grid-cols-2 ${
          stats.length > 4 ? "lg:grid-cols-3" : "xl:grid-cols-4"
        }`}
        aria-label="Account summary"
      >
        {stats.map((item) => {
          const stat =
            typeof item === "string"
              ? { label: item, value: 0, helper: "No activity yet" }
              : item;
          return <DashboardStatCard key={stat.label} stat={stat} />;
        })}
      </section>

      {paymentSummary && (
        <Card className="mt-8 overflow-hidden border-brand-100">
          <CardHeader className="border-b border-brand-100 bg-gradient-to-r from-brand-50 via-white to-accent-50 p-5 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>{paymentSummary.title}</CardTitle>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  {paymentSummary.description}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {paymentSummary.items.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl border p-4 ${
                    item.highlight
                      ? "border-brand-200 bg-brand-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  {paymentSummary.loading ? (
                    <Skeleton className="mt-3 h-7 w-28" />
                  ) : (
                    <p className="mt-2 text-xl font-black text-slate-950">
                      {item.value}
                    </p>
                  )}
                  {item.helper && (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {item.helper}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {paymentSummary.note && (
              <p className="mt-4 text-xs leading-5 text-slate-500">
                {paymentSummary.note}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mt-8 overflow-hidden border-brand-100 shadow-md shadow-brand-900/5">
        <CardHeader className="relative overflow-hidden border-b border-brand-100 bg-gradient-to-r from-brand-50 via-white to-accent-50 p-5 sm:p-6">
          <span className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-brand-200/30 blur-2xl" />
          <span className="absolute right-16 top-5 h-16 w-16 rounded-full bg-accent-200/30 blur-xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-700/20">
                <ListChecks className="h-6 w-6" />
              </span>
              <div>
                <CardTitle id="next-actions-title" className="text-xl">
                  Your Next Actions
                </CardTitle>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  Focus on the requests and tasks that need your attention
                  first.
                </p>
              </div>
            </div>
            {!nextActionsLoading &&
              !nextActionsError &&
              nextActions.length > 0 && (
                <Badge className="hidden shrink-0 bg-white text-brand-800 shadow-sm ring-1 ring-brand-200 sm:inline-flex">
                  {nextActions.length}{" "}
                  {nextActions.length === 1 ? "priority" : "priorities"}
                </Badge>
              )}
          </div>
        </CardHeader>
        <CardContent className="bg-slate-50/70 p-3 sm:p-5">
          {nextActionsLoading && (
            <div className="space-y-3" aria-label="Loading next actions">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                    <div className="w-full space-y-2.5">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                    <Skeleton className="hidden h-9 w-24 sm:block" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!nextActionsLoading && nextActionsError && (
            <Alert variant="destructive" className="bg-white shadow-sm">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Next actions unavailable</p>
                  <p className="mt-1 leading-6">{nextActionsError}</p>
                  {onReloadNextActions && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={onReloadNextActions}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try again
                    </Button>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {!nextActionsLoading &&
            !nextActionsError &&
            nextActions.length > 0 && (
              <ul className="space-y-3" aria-labelledby="next-actions-title">
                {nextActions.map((item, index) => (
                  <li key={item.id}>
                    <Link
                      to={item.to}
                      className="group grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-5"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-sm font-black text-brand-700 ring-1 ring-brand-100">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <RequestStatusBadge status={item.status} />
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <CalendarClock className="h-3.5 w-3.5" />
                            Updated {formatDateTime(item.updatedAt, "")}
                          </span>
                        </span>
                        <span className="mt-2 block break-words font-bold text-slate-950 transition-colors group-hover:text-brand-800">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-slate-600">
                          {item.description}
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm font-semibold text-brand-700 sm:border-0 sm:pt-0">
                        {item.linkLabel}
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

          {!nextActionsLoading &&
            !nextActionsError &&
            nextActions.length === 0 && (
              <div className="rounded-xl border border-dashed border-brand-200 bg-white px-5 py-10 text-center shadow-sm sm:py-12">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
                  <CircleCheckBig className="h-7 w-7 text-emerald-600" />
                </span>
                <h2 className="mt-6 text-xl font-bold text-slate-950">
                  {emptyTitle}
                </h2>
                <p className="mx-auto mt-2 max-w-lg leading-6 text-slate-600">
                  {emptyDescription}
                </p>
                <Badge
                  variant="secondary"
                  className="mt-5 ring-1 ring-accent-200"
                >
                  {emptyBadge}
                </Badge>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
