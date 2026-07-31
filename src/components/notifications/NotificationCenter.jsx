import { useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  BanknoteArrowUp,
  CheckCheck,
  ChevronRight,
  CircleCheckBig,
  CircleX,
  ClipboardCheck,
  KeyRound,
  MapPin,
  Flag,
  Scale,
  ShieldAlert,
  Star,
  Play,
  RefreshCw,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { getActiveRole, USER_ROLES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

const notificationVisuals = {
  REQUEST_ACCEPTED: {
    icon: UserCheck,
    iconClass: "bg-sky-100 text-sky-700 ring-sky-200",
  },
  REQUEST_STARTED: {
    icon: Play,
    iconClass: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  COMPLETION_SUBMITTED: {
    icon: ClipboardCheck,
    iconClass: "bg-violet-100 text-violet-700 ring-violet-200",
  },
  REQUEST_COMPLETED: {
    icon: CircleCheckBig,
    iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  LOCATION_UPDATED: {
    icon: MapPin,
    iconClass: "bg-teal-100 text-teal-700 ring-teal-200",
  },
  RUNNER_RELEASED: {
    icon: RotateCcw,
    iconClass: "bg-orange-100 text-orange-700 ring-orange-200",
  },
  REQUEST_CANCELLED: {
    icon: CircleX,
    iconClass: "bg-red-100 text-red-700 ring-red-200",
  },
  PRICE_CHANGE_REQUESTED: {
    icon: BanknoteArrowUp,
    iconClass: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  PRICE_CHANGE_APPROVED: {
    icon: CircleCheckBig,
    iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  PRICE_CHANGE_DECLINED: {
    icon: CircleX,
    iconClass: "bg-red-100 text-red-700 ring-red-200",
  },
  HANDOFF_VERIFIED: {
    icon: KeyRound,
    iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  PAYMENT_CONFIRMED: {
    icon: CircleCheckBig,
    iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  REQUEST_FAILED: {
    icon: CircleX,
    iconClass: "bg-red-100 text-red-700 ring-red-200",
  },
  FAILURE_ACKNOWLEDGED: {
    icon: ClipboardCheck,
    iconClass: "bg-sky-100 text-sky-700 ring-sky-200",
  },
  DISPUTE_OPENED: {
    icon: Scale,
    iconClass: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  DISPUTE_WITHDRAWN: {
    icon: Scale,
    iconClass: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  DISPUTE_RESOLVED: {
    icon: Scale,
    iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  ACCOUNT_RESTRICTED: {
    icon: ShieldAlert,
    iconClass: "bg-red-100 text-red-700 ring-red-200",
  },
  ACCOUNT_ACCESS_CHANGED: {
    icon: ShieldAlert,
    iconClass: "bg-red-100 text-red-700 ring-red-200",
  },
  RATING_RECEIVED: {
    icon: Star,
    iconClass: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  SAFETY_REPORT_RESOLVED: {
    icon: Flag,
    iconClass: "bg-violet-100 text-violet-700 ring-violet-200",
  },
};

const defaultVisual = {
  icon: Bell,
  iconClass: "bg-slate-100 text-slate-600 ring-slate-200",
};

function isSameCalendarDay(first, second) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getDateGroup(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameCalendarDay(date, today)) return "Today";
  if (isSameCalendarDay(date, yesterday)) return "Yesterday";
  return "Earlier";
}

function formatRelativeTime(value) {
  const date = new Date(value);
  const differenceInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(differenceInSeconds);

  if (absoluteSeconds < 10) return "just now";
  if (absoluteSeconds < 60) {
    return relativeTimeFormatter.format(differenceInSeconds, "second");
  }

  const differenceInMinutes = Math.round(differenceInSeconds / 60);
  if (Math.abs(differenceInMinutes) < 60) {
    return relativeTimeFormatter.format(differenceInMinutes, "minute");
  }

  const differenceInHours = Math.round(differenceInMinutes / 60);
  if (Math.abs(differenceInHours) < 24) {
    return relativeTimeFormatter.format(differenceInHours, "hour");
  }

  const differenceInDays = Math.round(differenceInHours / 24);
  if (Math.abs(differenceInDays) < 7) {
    return relativeTimeFormatter.format(differenceInDays, "day");
  }

  return dateFormatter.format(date);
}

function getNotificationPath(notification, role) {
  if (!notification.request_id) return null;
  if (role === "runner" && notification.type === "REQUEST_CANCELLED") {
    return "/runner/tasks";
  }
  return role === "runner"
    ? `/runner/tasks/${notification.request_id}`
    : `/requestor/requests/${notification.request_id}`;
}

function getNotificationRole(notification, fallbackRole) {
  if (notification.target_role) return notification.target_role;
  if (
    [
      "REQUEST_ACCEPTED",
      "REQUEST_STARTED",
      "COMPLETION_SUBMITTED",
      "RUNNER_RELEASED",
      "PRICE_CHANGE_REQUESTED",
    ].includes(notification.type)
  ) {
    return USER_ROLES.REQUESTOR;
  }
  if (
    [
      "REQUEST_COMPLETED",
      "LOCATION_UPDATED",
      "REQUEST_CANCELLED",
      "PRICE_CHANGE_APPROVED",
      "PRICE_CHANGE_DECLINED",
    ].includes(notification.type)
  ) {
    return USER_ROLES.RUNNER;
  }
  return fallbackRole;
}

export function NotificationCenter() {
  const { profile, switchRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [openingNotificationId, setOpeningNotificationId] = useState(null);
  const {
    notifications,
    unreadCount,
    loading,
    error,
    reload,
    markRead,
    markAllRead,
  } = useNotifications();

  const groupedNotifications = useMemo(() => {
    const visibleNotifications =
      filter === "unread"
        ? notifications.filter((notification) => !notification.read_at)
        : notifications;
    const groups = new Map();

    for (const notification of visibleNotifications) {
      const group = getDateGroup(notification.created_at);
      groups.set(group, [...(groups.get(group) || []), notification]);
    }

    return ["Today", "Yesterday", "Earlier"]
      .filter((group) => groups.has(group))
      .map((group) => ({ label: group, items: groups.get(group) }));
  }, [filter, notifications]);

  const visibleCount = groupedNotifications.reduce(
    (total, group) => total + group.items.length,
    0,
  );

  async function openNotification(notification) {
    if (openingNotificationId) return;
    setOpeningNotificationId(notification.id);

    if (!notification.read_at) {
      const markedRead = await markRead(notification.id);
      if (!markedRead) {
        setOpeningNotificationId(null);
        return;
      }
    }

    const activeRole = getActiveRole(profile);
    const targetRole = getNotificationRole(notification, activeRole);
    if (targetRole !== activeRole) {
      const { error: switchError } = await switchRole(targetRole);
      if (switchError) {
        toast.error("We could not switch to the notification's workspace.");
        setOpeningNotificationId(null);
        return;
      }
    }

    const path = getNotificationPath(notification, targetRole);
    if (path) {
      navigate(path);
      setOpen(false);
    }
    setOpeningNotificationId(null);
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    await markAllRead();
    setMarkingAll(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label={
            unreadCount
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-[26rem] max-w-[94vw] flex-col bg-slate-50 p-0">
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 pb-4 pt-5 pr-12 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl font-black tracking-tight">
                  Notifications
                </SheetTitle>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-800">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <SheetDescription className="mt-1 text-sm text-slate-500">
                Updates about your requests and tasks.
              </SheetDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                disabled={markingAll}
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {markingAll ? "Updating…" : "Mark all read"}
                </span>
              </Button>
            )}
          </div>

          <div
            className="mt-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1"
            aria-label="Notification filters"
          >
            <button
              type="button"
              aria-pressed={filter === "all"}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                filter === "all"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setFilter("all")}
            >
              All
              <span className="ml-2 text-xs text-slate-400">
                {notifications.length}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={filter === "unread"}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                filter === "unread"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setFilter("unread")}
            >
              Unread
              <span className="ml-2 text-xs text-slate-400">{unreadCount}</span>
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="space-y-3 p-4" aria-label="Loading notifications">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-red-50">
                <BellOff className="h-7 w-7 text-red-500" />
              </span>
              <p className="mt-4 font-bold text-slate-900">
                Notifications unavailable
              </p>
              <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
                {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={reload}
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && visibleCount === 0 && (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 ring-8 ring-brand-50/60">
                {filter === "unread" ? (
                  <CircleCheckBig className="h-8 w-8 text-brand-600" />
                ) : (
                  <Bell className="h-8 w-8 text-brand-600" />
                )}
              </span>
              <p className="mt-6 text-lg font-bold text-slate-900">
                {filter === "unread"
                  ? "You’re all caught up"
                  : "No notifications yet"}
              </p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                {filter === "unread"
                  ? "You have no unread updates right now."
                  : "Request and task updates will appear here."}
              </p>
            </div>
          )}

          {!loading && !error && visibleCount > 0 && (
            <div className="space-y-5 p-3 pb-5">
              {groupedNotifications.map((group) => (
                <section
                  key={group.label}
                  aria-labelledby={`group-${group.label}`}
                >
                  <h3
                    id={`group-${group.label}`}
                    className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400"
                  >
                    {group.label}
                  </h3>
                  <ul className="space-y-2">
                    {group.items.map((notification) => {
                      const visual =
                        notificationVisuals[notification.type] || defaultVisual;
                      const Icon = visual.icon;
                      const notificationRole = getNotificationRole(
                        notification,
                        getActiveRole(profile),
                      );
                      const path = getNotificationPath(
                        notification,
                        notificationRole,
                      );
                      const unread = !notification.read_at;

                      return (
                        <li key={notification.id}>
                          <button
                              type="button"
                              disabled={openingNotificationId !== null}
                              aria-busy={
                                openingNotificationId === notification.id
                              }
                              className={`group relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-3 rounded-xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:hover:translate-y-0 ${
                                unread
                                  ? "border-brand-200 bg-white ring-1 ring-brand-100"
                                  : "border-slate-200 bg-white/80 hover:border-slate-300"
                              }`}
                              onClick={() => openNotification(notification)}
                            >
                              {unread && (
                                <span
                                  className="absolute left-0 top-4 h-8 w-1 rounded-r-full bg-brand-600"
                                  aria-label="Unread"
                                />
                              )}
                              <span
                                className={`grid h-10 w-10 place-items-center rounded-full ring-1 ${visual.iconClass}`}
                              >
                                <Icon className="h-5 w-5" aria-hidden="true" />
                              </span>
                              <span className="min-w-0">
                                <span className="flex items-start justify-between gap-2">
                                  <span
                                    className={`block leading-5 ${
                                      unread
                                        ? "font-bold text-slate-950"
                                        : "font-semibold text-slate-800"
                                    }`}
                                  >
                                    {notification.title}
                                  </span>
                                  {unread && (
                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                                  )}
                                </span>
                                <span className="mt-1 block text-sm leading-5 text-slate-600">
                                  {notification.message}
                                </span>
                                <time
                                  className="mt-2 block text-xs font-medium text-slate-400"
                                  dateTime={notification.created_at}
                                  title={dateFormatter.format(
                                    new Date(notification.created_at),
                                  )}
                                >
                                  {formatRelativeTime(notification.created_at)}
                                </time>
                              </span>
                              {path && (
                                <ChevronRight className="mt-3 h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                              )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        {!loading && !error && notifications.length > 0 && (
          <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 text-center text-xs text-slate-400">
            Showing your latest {notifications.length} updates
          </footer>
        )}
      </SheetContent>
    </Sheet>
  );
}
