import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Minus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  Legend,
  LabelList,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAdminMonthlyAnalytics } from "@/services/adminService";
import { devLog } from "@/lib/errors";
import { REQUEST_STATUS_LABELS } from "@/lib/requestConstants";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/AdminState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const numberFormatter = new Intl.NumberFormat("en-PH");
const monthFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Manila",
});
const dayFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});

const statusColors = {
  OPEN: "#0f766e",
  ACCEPTED: "#0284c7",
  IN_PROGRESS: "#2563eb",
  AWAITING_CONFIRMATION: "#7c3aed",
  COMPLETED: "#16a34a",
  CANCELLED: "#64748b",
  FAILED: "#dc2626",
};

const funnelStages = {
  CREATED: { label: "Created", fill: "#0f766e" },
  ACCEPTED: { label: "Accepted", fill: "#0284c7" },
  STARTED: { label: "Started", fill: "#2563eb" },
  SUBMITTED: { label: "Submitted", fill: "#7c3aed" },
  COMPLETED: { label: "Completed", fill: "#16a34a" },
};

function manilaMonthValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Asia/Manila",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function shiftMonth(monthValue, offset) {
  const [year, month] = monthValue.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function count(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function localDate(date) {
  return new Date(`${date}T00:00:00+08:00`);
}

function comparisonChange(currentValue, previousValue, favorable = "up") {
  const current = count(currentValue);
  const previous = count(previousValue);
  const difference = current - previous;

  if (!difference) {
    return { direction: "same", label: "No change", tone: "slate" };
  }

  const direction = difference > 0 ? "up" : "down";
  const tone =
    favorable === "neutral"
      ? "slate"
      : direction === favorable
        ? "green"
        : "red";

  if (!previous) {
    return { direction, label: "New activity", tone };
  }

  const percentage = Math.round((Math.abs(difference) / previous) * 100);
  return {
    direction,
    label: `${direction === "up" ? "+" : "-"}${percentage}%`,
    tone,
  };
}

function ComparisonNote({ current, previous, favorable, periodLabel }) {
  const change = comparisonChange(current, previous, favorable);
  const Icon =
    change.direction === "up"
      ? ArrowUpRight
      : change.direction === "down"
        ? ArrowDownRight
        : Minus;
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold ${tones[change.tone]}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {change.label}
      </span>
      <span>vs {periodLabel}</span>
    </p>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  helper,
  tone,
  comparison,
}) {
  const tones = {
    brand: "bg-brand-100 text-brand-700",
    blue: "bg-sky-100 text-sky-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <span
            className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone] || tones.slate}`}
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
        </div>
        <p className="mt-4 text-3xl font-black text-slate-950">
          {numberFormatter.format(count(value))}
          {suffix}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        {comparison && <ComparisonNote {...comparison} />}
      </CardContent>
    </Card>
  );
}

function ActivityTooltip({ active, label, payload }) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="text-xs font-bold text-slate-500">
        {dayFormatter.format(localDate(label))}
      </p>
      <ul className="mt-2 space-y-1.5">
        {payload.map((item) => (
          <li
            key={item.dataKey}
            className="flex items-center justify-between gap-5 text-sm"
          >
            <span className="flex items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <span className="font-bold text-slate-950">
              {numberFormatter.format(count(item.value))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="text-sm font-bold text-slate-950">{item.label}</p>
      <p className="mt-1 text-sm text-slate-600">
        {numberFormatter.format(item.count)} request
        {item.count === 1 ? "" : "s"} created in the selected month
      </p>
    </div>
  );
}

function FunnelTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="text-sm font-bold text-slate-950">{item.label}</p>
      <p className="mt-1 text-sm text-slate-600">
        {numberFormatter.format(item.count)} request
        {item.count === 1 ? "" : "s"} reached this stage
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        {item.conversion}% of requests created
      </p>
    </div>
  );
}

export default function AdminMonthlyAnalytics() {
  const currentMonth = manilaMonthValue();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const requestSequence = useRef(0);

  const loadAnalytics = useCallback(async () => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setLoading(true);
    setError("");
    const { data, error: analyticsError } = await getAdminMonthlyAnalytics(
      `${selectedMonth}-01`,
    );

    if (sequence !== requestSequence.current) return;

    if (analyticsError) {
      devLog("Admin monthly analytics retrieval failed", analyticsError);
      setError(
        "We could not load analytics for this month. Confirm that migrations 021 and 022 are installed and this profile is an Admin.",
      );
    } else if (
      !data?.comparison?.summary ||
      !Array.isArray(data?.request_funnel)
    ) {
      setError(
        "Monthly comparisons are not available yet. Apply migration 022, then try again.",
      );
    } else {
      setAnalytics(data);
      setUpdatedAt(new Date());
    }
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadAnalytics, 0);
    return () => {
      window.clearTimeout(timeoutId);
      requestSequence.current += 1;
    };
  }, [loadAnalytics]);

  const selectMonth = useCallback(
    (nextMonth) => {
      if (!nextMonth || nextMonth > currentMonth) return;
      setAnalytics(null);
      setError("");
      setSelectedMonth(nextMonth);
    },
    [currentMonth],
  );

  const summary = analytics?.summary || {};
  const previousSummary = analytics?.comparison?.summary || {};
  const dailyActivity = useMemo(
    () =>
      (analytics?.daily_activity || []).map((day) => ({
        date: day.date,
        new_users: count(day.new_users),
        requests_created: count(day.requests_created),
        requests_completed: count(day.requests_completed),
      })),
    [analytics],
  );
  const requestStatuses = useMemo(
    () =>
      (analytics?.request_statuses || []).map((status) => ({
        status: status.status,
        label: REQUEST_STATUS_LABELS[status.status] || status.status,
        count: count(status.count),
      })),
    [analytics],
  );
  const requestFunnel = useMemo(() => {
    const stages = analytics?.request_funnel || [];
    const created = count(
      stages.find((stage) => stage.stage === "CREATED")?.count,
    );

    return stages.map((stage) => ({
      stage: stage.stage,
      label: funnelStages[stage.stage]?.label || stage.stage,
      count: count(stage.count),
      conversion: created
        ? Math.round((count(stage.count) / created) * 100)
        : 0,
      fill: funnelStages[stage.stage]?.fill || "#64748b",
    }));
  }, [analytics]);

  const newUsers = count(summary.new_users);
  const onboardedUsers = count(summary.onboarded_users);
  const pendingOnboarding = count(summary.pending_onboarding);
  const requestsCreated = count(summary.requests_created);
  const requestsCompleted = count(summary.requests_completed);
  const requestsCancelled = count(summary.requests_cancelled);
  const requestsFailed = count(summary.requests_failed);
  const disputesOpened = count(summary.disputes_opened);
  const reportsSubmitted = count(summary.reports_submitted);
  const restrictionsApplied = count(summary.restrictions_applied);
  const previousNewUsers = count(previousSummary.new_users);
  const previousOnboardedUsers = count(previousSummary.onboarded_users);
  const previousRequestsCreated = count(previousSummary.requests_created);
  const previousRequestsCompleted = count(previousSummary.requests_completed);
  const previousCancelledOrFailed =
    count(previousSummary.requests_cancelled) +
    count(previousSummary.requests_failed);
  const previousSafetySignals =
    count(previousSummary.disputes_opened) +
    count(previousSummary.reports_submitted) +
    count(previousSummary.restrictions_applied);
  const onboardingRate = newUsers
    ? Math.round((onboardedUsers / newUsers) * 100)
    : 0;
  const previousOnboardingRate = previousNewUsers
    ? Math.round((previousOnboardedUsers / previousNewUsers) * 100)
    : 0;
  const hasDailyActivity = dailyActivity.some(
    (day) => day.new_users || day.requests_created || day.requests_completed,
  );
  const hasRequestStatuses = requestStatuses.some((status) => status.count);
  const hasRequestFunnel = requestFunnel.some(
    (stage) => stage.stage === "CREATED" && stage.count > 0,
  );
  const monthLabel = analytics?.period?.month_start
    ? monthFormatter.format(localDate(analytics.period.month_start))
    : "Current month";
  const comparisonMonthLabel = analytics?.comparison?.period?.month_start
    ? monthFormatter.format(localDate(analytics.comparison.period.month_start))
    : "previous month";
  const comparisonPeriodLabel = analytics?.comparison?.period?.is_partial
    ? `same period in ${comparisonMonthLabel}`
    : comparisonMonthLabel;
  const onboardingChartData = [
    {
      name: "Onboarding completed",
      value: onboardingRate,
      fill: "#009688",
    },
  ];

  return (
    <section className="mt-8" aria-labelledby="monthly-analytics-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="monthly-analytics-title"
              className="text-2xl font-black tracking-tight text-slate-950"
            >
              Monthly analytics
            </h2>
            <Badge variant="secondary">{monthLabel}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Asia/Manila activity totals and trends from protected aggregate
            marketplace data.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Label htmlFor="admin-analytics-month">Reporting month</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={loading}
              aria-label="Show previous month"
              onClick={() => selectMonth(shiftMonth(selectedMonth, -1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <div className="relative min-w-48 flex-1 sm:flex-none">
              <CalendarDays
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <Input
                id="admin-analytics-month"
                type="month"
                value={selectedMonth}
                max={currentMonth}
                disabled={loading}
                className="pl-9"
                onChange={(event) => selectMonth(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={loading || selectedMonth >= currentMonth}
              aria-label="Show next month"
              onClick={() => selectMonth(shiftMonth(selectedMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={loadAnalytics}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Refresh
            </Button>
          </div>
          {updatedAt && (
            <p className="text-xs text-slate-500">
              Updated {dateTimeFormatter.format(updatedAt)}
            </p>
          )}
        </div>
      </div>

      {loading && !analytics && (
        <div className="mt-5">
          <AdminLoadingState message="Loading monthly analytics..." />
        </div>
      )}
      {!loading && error && (
        <div className="mt-5">
          <AdminErrorState message={error} onRetry={loadAnalytics} />
        </div>
      )}

      {analytics && !error && (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="New users"
              value={newUsers}
              helper={`${onboardedUsers} completed onboarding`}
              icon={Users}
              tone="brand"
              comparison={{
                current: newUsers,
                previous: previousNewUsers,
                favorable: "up",
                periodLabel: comparisonPeriodLabel,
              }}
            />
            <MetricCard
              label="Onboarding progress"
              value={onboardingRate}
              suffix="%"
              helper={`${pendingOnboarding} registration${pendingOnboarding === 1 ? "" : "s"} still pending`}
              icon={CheckCircle2}
              tone="blue"
              comparison={{
                current: onboardingRate,
                previous: previousOnboardingRate,
                favorable: "up",
                periodLabel: comparisonPeriodLabel,
              }}
            />
            <MetricCard
              label="Requests created"
              value={requestsCreated}
              helper="Requests posted during the selected month"
              icon={ClipboardList}
              tone="slate"
              comparison={{
                current: requestsCreated,
                previous: previousRequestsCreated,
                favorable: "up",
                periodLabel: comparisonPeriodLabel,
              }}
            />
            <MetricCard
              label="Requests completed"
              value={requestsCompleted}
              helper="Completion events during the selected month"
              icon={Activity}
              tone="green"
              comparison={{
                current: requestsCompleted,
                previous: previousRequestsCompleted,
                favorable: "up",
                periodLabel: comparisonPeriodLabel,
              }}
            />
            <MetricCard
              label="Cancelled or failed"
              value={requestsCancelled + requestsFailed}
              helper={`${requestsCancelled} cancelled · ${requestsFailed} failed`}
              icon={AlertTriangle}
              tone="amber"
              comparison={{
                current: requestsCancelled + requestsFailed,
                previous: previousCancelledOrFailed,
                favorable: "down",
                periodLabel: comparisonPeriodLabel,
              }}
            />
            <MetricCard
              label="Safety signals"
              value={disputesOpened + reportsSubmitted + restrictionsApplied}
              helper={`${disputesOpened} disputes · ${reportsSubmitted} reports · ${restrictionsApplied} restrictions`}
              icon={ShieldCheck}
              tone="red"
              comparison={{
                current:
                  disputesOpened + reportsSubmitted + restrictionsApplied,
                previous: previousSafetySignals,
                favorable: "down",
                periodLabel: comparisonPeriodLabel,
              }}
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Daily marketplace activity</CardTitle>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Registrations and request events by calendar day. Completed
                  requests may have been created before this month.
                </p>
              </CardHeader>
              <CardContent>
                {hasDailyActivity ? (
                  <div
                    className="h-80 w-full"
                    aria-label="Daily activity chart"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={dailyActivity}
                        accessibilityLayer
                        margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="analyticsUsers"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#0284c7"
                              stopOpacity={0.28}
                            />
                            <stop
                              offset="95%"
                              stopColor="#0284c7"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="analyticsRequests"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#009688"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#009688"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="analyticsCompleted"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#16a34a"
                              stopOpacity={0.24}
                            />
                            <stop
                              offset="95%"
                              stopColor="#16a34a"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="#e2e8f0"
                          strokeDasharray="4 4"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) =>
                            dayFormatter.format(localDate(date))
                          }
                          minTickGap={24}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                          tickLine={false}
                          axisLine={{ stroke: "#cbd5e1" }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<ActivityTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="new_users"
                          name="New users"
                          stroke="#0284c7"
                          fill="url(#analyticsUsers)"
                          strokeWidth={2}
                          activeDot={{ r: 5 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="requests_created"
                          name="Requests created"
                          stroke="#009688"
                          fill="url(#analyticsRequests)"
                          strokeWidth={2}
                          activeDot={{ r: 5 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="requests_completed"
                          name="Requests completed"
                          stroke="#16a34a"
                          fill="url(#analyticsCompleted)"
                          strokeWidth={2}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <AdminEmptyState
                    title="No monthly activity yet"
                    description={`Daily registration and request trends will appear after the first activity in ${monthLabel}.`}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Onboarding progress</CardTitle>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Completion among accounts registered during {monthLabel}.
                </p>
              </CardHeader>
              <CardContent>
                {newUsers ? (
                  <div className="relative mx-auto h-64 max-w-sm">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        data={onboardingChartData}
                        accessibilityLayer
                        cx="50%"
                        cy="50%"
                        innerRadius="68%"
                        outerRadius="92%"
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis
                          type="number"
                          domain={[0, 100]}
                          tick={false}
                        />
                        <RadialBar
                          dataKey="value"
                          fill="#009688"
                          background={{ fill: "#e2e8f0" }}
                          cornerRadius={12}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                      <div>
                        <p className="text-4xl font-black text-slate-950">
                          {onboardingRate}%
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {onboardedUsers} of {newUsers} onboarded
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <AdminEmptyState
                    title="No registrations yet"
                    description={`Onboarding progress will appear after the first non-Admin account registers in ${monthLabel}.`}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Request fulfillment funnel</CardTitle>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                Progress reached by requests created during {monthLabel}, based
                on lifecycle events recorded before the selected period ended.
              </p>
            </CardHeader>
            <CardContent>
              {hasRequestFunnel ? (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-center">
                  <div
                    className="h-80 min-w-0"
                    aria-label="Request fulfillment funnel chart"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <FunnelChart
                        accessibilityLayer
                        margin={{ top: 12, right: 20, bottom: 12, left: 20 }}
                      >
                        <Tooltip content={<FunnelTooltip />} />
                        <Funnel
                          data={requestFunnel}
                          dataKey="count"
                          nameKey="label"
                          lastShapeType="rectangle"
                          isAnimationActive={false}
                        >
                          <LabelList
                            dataKey="count"
                            position="inside"
                            fill="#ffffff"
                            fontSize={13}
                            fontWeight={800}
                          />
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  </div>
                  <ol className="space-y-2" aria-label="Funnel stage summary">
                    {requestFunnel.map((stage, index) => (
                      <li
                        key={stage.stage}
                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black text-white"
                            style={{ backgroundColor: stage.fill }}
                            aria-hidden="true"
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900">
                              {stage.label}
                            </p>
                            <p className="text-xs text-slate-500">
                              {stage.conversion}% of requests created
                            </p>
                          </div>
                        </div>
                        <span className="text-xl font-black text-slate-950">
                          {numberFormatter.format(stage.count)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <AdminEmptyState
                  title="No request funnel yet"
                  description={`Requests created during ${monthLabel} will appear here as they progress through fulfillment.`}
                />
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Request status distribution</CardTitle>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Current status of requests created during {monthLabel}.
              </p>
            </CardHeader>
            <CardContent>
              {hasRequestStatuses ? (
                <div className="h-96 w-full" aria-label="Request status chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={requestStatuses}
                      layout="vertical"
                      accessibilityLayer
                      margin={{ top: 4, right: 24, left: 14, bottom: 4 }}
                    >
                      <CartesianGrid
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: "#cbd5e1" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={132}
                        tick={{ fill: "#475569", fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        content={<StatusTooltip />}
                      />
                      <Bar
                        dataKey="count"
                        name="Requests"
                        radius={[0, 8, 8, 0]}
                      >
                        {requestStatuses.map((status) => (
                          <Cell
                            key={status.status}
                            fill={statusColors[status.status] || "#64748b"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <AdminEmptyState
                  title={`No requests created in ${monthLabel}`}
                  description="The status distribution will appear after the first request is posted."
                />
              )}
            </CardContent>
          </Card>

          <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
            <summary className="cursor-pointer font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
              View daily analytics table
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <caption className="sr-only">
                  Daily registrations and request activity for {monthLabel}
                </caption>
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-3 font-bold">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">
                      New users
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">
                      Requests created
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">
                      Requests completed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyActivity.map((day) => (
                    <tr key={day.date}>
                      <th
                        scope="row"
                        className="px-3 py-3 font-semibold text-slate-700"
                      >
                        {dayFormatter.format(localDate(day.date))}
                      </th>
                      <td className="px-3 py-3 text-right text-slate-600">
                        {day.new_users}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600">
                        {day.requests_created}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600">
                        {day.requests_completed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
