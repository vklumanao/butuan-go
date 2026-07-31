import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BriefcaseBusiness,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Scale,
  ShieldAlert,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getActiveRole, ROLE_LABELS, USER_ROLES } from "@/lib/constants";
import { getProfileAvatarUrl, getProfileInitials } from "@/lib/profileUtils";
import { Brand } from "./Brand";
import { RoleSwitcher } from "./RoleSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { AccountAccessNotice } from "./AccountAccessNotice";

const SIDEBAR_STORAGE_KEY = "butuango-desktop-sidebar-open";

function getInitialSidebarState() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function getPageTitle(pathname) {
  if (pathname === "/admin/dashboard") return "Operations Overview";
  if (pathname === "/admin/requests") return "Request Oversight";
  if (pathname === "/admin/users") return "Account Directory";
  if (pathname === "/admin/disputes") return "Dispute Review";
  if (pathname === "/admin/reports") return "Safety Reports";
  if (pathname === "/admin/audit") return "Admin Audit Log";
  if (pathname === "/admin/profile") return "Admin Profile";
  if (pathname.endsWith("/dashboard")) return "Dashboard";
  if (pathname.endsWith("/profile")) return "Profile";
  if (pathname === "/requestor/requests/new") return "Create Request";
  if (/^\/requestor\/requests\/[^/]+\/edit$/.test(pathname)) {
    return "Edit Request";
  }
  if (/^\/requestor\/requests\/[^/]+\/location$/.test(pathname)) {
    return "Request Location";
  }
  if (/^\/requestor\/requests\/[^/]+$/.test(pathname)) {
    return "Request Details";
  }
  if (pathname === "/requestor/requests") return "My Requests";
  if (/^\/runner\/requests\/[^/]+$/.test(pathname)) {
    return "Request Details";
  }
  if (pathname === "/runner/requests") return "Available Requests";
  if (/^\/runner\/tasks\/[^/]+$/.test(pathname)) return "Task Details";
  if (pathname === "/runner/tasks") return "My Tasks";
  return "Account";
}

export function AppShell() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(
    getInitialSidebarState,
  );
  const activeRole = getActiveRole(profile);
  const activeRoleLabel = ROLE_LABELS[activeRole] || "Account";
  const avatarUrl = getProfileAvatarUrl(profile, user);
  const pageTitle = getPageTitle(location.pathname);
  const base =
    activeRole === USER_ROLES.ADMIN
      ? "/admin"
      : activeRole === USER_ROLES.RUNNER
        ? "/runner"
        : "/requestor";
  const links =
    activeRole === USER_ROLES.ADMIN
      ? [
          { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
          { to: "/admin/requests", label: "Requests", icon: ClipboardList },
          { to: "/admin/disputes", label: "Disputes", icon: Scale },
          { to: "/admin/reports", label: "Safety Reports", icon: ShieldAlert },
          { to: "/admin/users", label: "Accounts", icon: UsersRound },
          { to: "/admin/audit", label: "Audit Log", icon: Activity },
          { to: "/admin/profile", label: "Profile", icon: UserRound },
        ]
      : [
          { to: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
          ...(activeRole === USER_ROLES.REQUESTOR
      ? [
          {
            to: "/requestor/requests",
            label: "My Requests",
            icon: ClipboardList,
          },
        ]
      : []),
          ...(activeRole === USER_ROLES.RUNNER
      ? [
          { to: "/runner/requests", label: "Available Requests", icon: Search },
          { to: "/runner/tasks", label: "My Tasks", icon: BriefcaseBusiness },
        ]
      : []),
          { to: `${base}/profile`, label: "Profile", icon: UserRound },
        ];
  async function handleLogout() {
    setLoggingOut(true);
    const { error } = await signOut();
    setLoggingOut(false);
    if (error) {
      toast.error("We could not log you out. Please try again.");
      return;
    }
    setLogoutOpen(false);
    navigate("/login", { replace: true });
  }

  function toggleDesktopSidebar() {
    setDesktopSidebarOpen((current) => {
      const nextState = !current;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextState));
      } catch {
        // The toggle still works for this page when storage is unavailable.
      }
      return nextState;
    });
  }

  function renderNavigation({ mobile = false } = {}) {
    return (
      <nav className="mt-8 space-y-1" aria-label="Account navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={mobile ? () => setMobileOpen(false) : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${isActive ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50">
      {desktopSidebarOpen && (
        <aside
          id="desktop-sidebar"
          className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white p-5 lg:block"
        >
          <Brand />
          {renderNavigation()}
          <div className="absolute inset-x-5 bottom-5">
            <div className="mb-3 flex items-center gap-3">
              <Avatar>
                {avatarUrl && (
                  <AvatarImage
                    src={avatarUrl}
                    alt={`${profile.full_name} profile photo`}
                    referrerPolicy="no-referrer"
                  />
                )}
                <AvatarFallback>
                  {getProfileInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {profile.full_name}
                </p>
                <Badge>{activeRoleLabel} mode</Badge>
              </div>
            </div>
            {activeRole !== USER_ROLES.ADMIN && (
              <RoleSwitcher className="mb-2 w-full" />
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </aside>
      )}
      <header
        className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md transition-[margin] duration-200 supports-[backdrop-filter]:bg-white/80 lg:px-8 ${
          desktopSidebarOpen ? "lg:ml-64" : "lg:ml-0"
        }`}
      >
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={toggleDesktopSidebar}
            aria-controls="desktop-sidebar"
            aria-expanded={desktopSidebarOpen}
            aria-label={desktopSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            title={desktopSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {desktopSidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </Button>
          {!desktopSidebarOpen && <Brand />}
          <div
            className="flex min-w-0 items-center gap-2 text-sm"
            aria-label={`${activeRoleLabel} workspace, ${pageTitle}`}
          >
            <Badge className="shrink-0">{activeRoleLabel} workspace</Badge>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate font-semibold text-slate-700">
              {pageTitle}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col overflow-y-auto">
              <SheetTitle className="pr-8 text-lg font-bold">
                Navigation
              </SheetTitle>
              <SheetDescription className="sr-only">
                Navigate your ButuanGo account
              </SheetDescription>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    {avatarUrl && (
                      <AvatarImage
                        src={avatarUrl}
                        alt={`${profile.full_name} profile photo`}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <AvatarFallback>
                      {getProfileInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {profile.full_name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Current workspace
                    </p>
                  </div>
                </div>
                <Badge className="mt-3">{activeRoleLabel} mode</Badge>
              </div>
              {renderNavigation({ mobile: true })}
              <div className="mt-auto border-t border-slate-200 pt-4">
                {activeRole !== USER_ROLES.ADMIN && (
                  <RoleSwitcher
                    className="w-full"
                    onSwitched={() => setMobileOpen(false)}
                  />
                )}
                <SheetClose asChild>
                  <Button
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => setLogoutOpen(true)}
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main
        className={`transition-[margin] duration-200 ${
          desktopSidebarOpen ? "lg:ml-64" : "lg:ml-0"
        }`}
      >
        {activeRole !== USER_ROLES.ADMIN && <AccountAccessNotice />}
        <Outlet />
      </main>
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out of ButuanGo?</DialogTitle>
            <DialogDescription>
              You’ll need to sign in again to access your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
